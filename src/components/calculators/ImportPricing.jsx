import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowRight, Calculator, Check, ChevronDown, ChevronRight, DollarSign, FileText, Globe, Loader2, Package, Search, Settings, ShieldCheck, Trash2, Truck, UploadCloud, X, AlertCircle, Percent, Plane, LogIn, FileScan, CheckCircle2, ChevronUp, AlertTriangle, Info, Copy, ExternalLink, RefreshCw, XCircle, ChevronsRight, PackagePlus, Scale, MessageSquare } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import * as pdfjs from 'pdfjs-dist';
// import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { extractImportProducts } from '../../services/aiService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { StockService } from '../../services/stockService';
import { getProductImage } from '../../lib/data/iphoneData';

// --- Internal UI Utilities (Hoisted) ---
const Card = ({ children, className }) => (
    <div className={cn("bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden", className)}>
        {children}
    </div>
);

const CardHeader = ({ children, className }) => <div className={cn("p-6", className)}>{children}</div>;
const CardTitle = ({ children, className }) => <h3 className={cn("text-xl font-bold text-slate-800 tracking-tight", className)}>{children}</h3>;
const CardDescription = ({ children, className }) => <p className={cn("text-sm text-slate-400 font-medium", className)}>{children}</p>;
const CardContent = ({ children, className }) => <div className={cn("p-6 pt-0 font-medium", className)}>{children}</div>;

const Button = ({ children, onClick, variant = "primary", className, disabled, type = "button", size = "md" }) => {
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100",
        outline: "bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 hover:text-indigo-600",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-50",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100",
        secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-100"
    };
    const sizes = {
        sm: "px-4 py-2 text-[10px] font-black uppercase tracking-widest",
        md: "px-6 py-3.5 text-xs font-black uppercase tracking-widest",
        lg: "px-8 py-4 text-sm font-black uppercase tracking-widest"
    };

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2",
                variants[variant],
                sizes[size],
                disabled && "opacity-50 cursor-not-allowed grayscale",
                className
            )}
        >
            {children}
        </button>
    );
}

const TableCom = ({ children, className }) => <div className="overflow-x-auto custom-scrollbar"><table className={cn("w-full text-left border-collapse", className)}>{children}</table></div>;
const TableHeader = ({ children, className }) => <thead className={cn("bg-slate-50/50 border-b border-slate-100", className)}>{children}</thead>;
const TableBody = ({ children }) => <tbody className="divide-y divide-slate-50">{children}</tbody>;
const TableRow = ({ children, className }) => <tr className={cn("hover:bg-slate-50/30 transition-colors", className)}>{children}</tr>;
const TableHead = ({ children, className }) => <th className={cn("p-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] py-5 px-6", className)}>{children}</th>;
const TableCell = ({ children, className }) => <td className={cn("p-4 text-sm text-slate-600 px-6", className)}>{children}</td>;
const TableFooter = ({ children }) => <tfoot className="bg-slate-50/50 border-t border-slate-100 font-bold">{children}</tfoot>;

const Input = ({ ...props }) => (
    <input
        {...props}
        className={cn(
            "w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-800 placeholder-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all",
            props.className
        )}
    />
);

const Label = ({ children, className }) => <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block", className)}>{children}</label>;

const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
    }).format(value);
};

// pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Schemas ---
const importSettingsSchema = z.object({
    dollarRate: z.coerce.number().positive("A cotação do dólar deve ser positiva."),
    taxRate: z.coerce.number().nonnegative("A taxa não pode ser negativa."),
    stateTaxRate: z.coerce.number().nonnegative("A taxa não pode ser negativa.").optional().default(0),
    insuranceDollarRate: z.coerce.number().positive("A cotação do seguro deve ser positiva."),






    insuranceRate: z.coerce.number().nonnegative("A taxa do seguro não pode ser negativa."),
    usaShippingCostUSD: z.coerce.number().nonnegative("O frete não pode ser negativo."),
    paraguayShippingCostBRL: z.coerce.number().nonnegative("O frete não pode ser negativo."),
});

const ProductFormSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório."),
    cost: z.number(),
    sellingPrice: z.number().optional(),
    quantity: z.coerce.number().int().min(1),
    categoryId: z.string().optional(),
    condition: z.string().default('new'),
    sku: z.string().optional().default(''),
    imei: z.string().optional().default(''),
    storage: z.string().optional().default(''),
    color: z.string().optional().default(''),
    batteryHealth: z.coerce.number().int().min(0).max(100).optional().default(100),
    description: z.string().optional().default(''),
    isPublic: z.boolean().default(true),
});

const RefinementTableSchema = z.object({
    products: z.array(ProductFormSchema),
});

// --- Constants ---
const DEFAULT_GATEWAY_FEES = {
    pix: 0.99,
    credit12x: 12.49
};

// --- Helper Functions ---
function parseLine(line) {
    if (!line.trim()) return null;

    console.log(`[DEBUG] Parsing Line: "${line}"`);

    const lowerLine = line.toLowerCase().trim();
    // 0. Ignore Summary/Footer lines only if they are EXPLICITLY just summary
    // A product line in these invoices often has "iPhone", "Watch", etc.
    const productKeywords = ['iphone', 'watch', 'ipad', 'samsung', 'moto', 'gala', 'pro', 'max', 'mini', 'plus', 'poly', 'apple', 'node'];
    const hasProductKeyword = productKeywords.some(k => lowerLine.includes(k));

    // Summary lines usually don't have product details and are shorter
    const isShort = line.length < 100;
    const isSummaryKeywords =
        lowerLine.startsWith('total') ||
        lowerLine.startsWith('subtotal') ||
        lowerLine.startsWith('balance') ||
        lowerLine.includes('amount due') ||
        lowerLine.includes('balance due') ||
        lowerLine.includes('freight') ||
        lowerLine.includes('shipping') ||
        (lowerLine.includes('total') && lowerLine.includes('tax')) ||
        (lowerLine.includes('fees') && (lowerLine.includes('total') || lowerLine.includes('subtotal')));

    if (isSummaryKeywords && !hasProductKeyword && isShort) {
        console.log(`[DEBUG] Explicitly Skipping Summary/Info Line: "${line}"`);
        return null;
    }

    // Header line recognition
    if (lowerLine.includes('item #') || lowerLine.includes('description') || lowerLine.includes('ext price')) {
        console.log(`[DEBUG] Skipping Header Line: "${line}"`);
        return null;
    }

    // 1. Price Extraction
    // Stop parsing the line if we hit a total/summary keyword (prevents picking up footer prices)
    const summaryMatch = line.match(/\b(Subtotal|Freight|Fees|Tax|Total|Payment|Account|ACH|Routing)\b/i);
    let parsingLine = line;
    if (summaryMatch) {
        parsingLine = line.substring(0, summaryMatch.index);
        console.log(`[DEBUG] Clipping line at summary keyword "${summaryMatch[0]}": "${parsingLine}"`);
    }

    // Robust Regex: handles $, R$, USD, and common OCR artifacts like "S" at start.
    // Updated to handle cases where the symbol might be missing or misread as 'S' or '5' in some contexts.
    const priceRegex = /((?:US\$|USD|\$|U\$|R\$|S\$|S|5\$)\s?\d+(?:,\d{3})*[.,]\d{2}(?!\d))/gi;
    let match;
    const allPriceMatches = []; // Store full matched strings for later removal from name
    const possibleCosts = [];

    while ((match = priceRegex.exec(parsingLine)) !== null) {
        const valStr = match[0];
        if (!valStr) continue;
        allPriceMatches.push(valStr); // Store the full matched string

        let clean = valStr.replace(/[^\d.,]/g, '');
        // Smart separator detection
        if (clean.includes(',') && clean.includes('.')) {
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastDot > lastComma) {
                // US Format: 1,020.00 -> remove comma
                clean = clean.replace(/,/g, '');
            } else {
                // EU Format: 1.020,00 -> remove dot, replace comma with dot
                clean = clean.replace(/\./g, '').replace(',', '.');
            }
        } else if (clean.includes(',')) {
            const parts = clean.split(',');
            if (parts[parts.length - 1].length === 2) clean = clean.replace(',', '.');
            else clean = clean.replace(',', '');
        }
        const val = parseFloat(clean);
        if (val > 0) possibleCosts.push(val);
    }

    console.log(`[DEBUG] Price Matches found: ${allPriceMatches.length}`, allPriceMatches);
    console.log(`[DEBUG] Possible Costs:`, possibleCosts);

    let cost = 0;
    if (possibleCosts.length > 0) {
        cost = possibleCosts[0]; // Strictly prioritize the first price found
    } else {
        // Fallback: look for naked numbers like 350.00 at the end of parts
        const numericPrices = parsingLine.match(/(\d{2,}[.,]\d{2})(?!\d)/g);
        if (numericPrices) {
            numericPrices.forEach(p => {
                let clean = p.replace(/[^\d.,]/g, '').replace(',', '.');
                const val = parseFloat(clean);
                if (val > 10) possibleCosts.push(val);
            });
        }
        if (possibleCosts.length > 0) {
            cost = possibleCosts[0];
        }
    }

    // 2. Quantity Extraction
    let quantity = 1;
    const lineWithoutStorage = parsingLine.replace(/\b\d+\s?(GB|TB|MB)\b/gi, "");

    // Priority 1: Explicit indicators (2x, x2, 2un, etc)
    const qtyRegexExplicit = /(?:^|\s|[\(\[])([1-9]\d*)\s*(?:un|pcs|und|u\.|unid|x|vias)|(?:x)\s*([1-9]\d*)(?=\s|$)/i;
    const qtyMatchExplicit = lineWithoutStorage.match(qtyRegexExplicit);

    if (qtyMatchExplicit) {
        quantity = parseInt(qtyMatchExplicit[1] || qtyMatchExplicit[2]);
        console.log(`[DEBUG] Qty Found (Explicit): ${quantity}`);
    } else {
        // Priority 2: Columnar (look for standalone number before the FIRST price)
        // Re-run price regex to get index of first match
        priceRegex.lastIndex = 0; // Reset regex for new exec calls
        const firstPriceMatch = priceRegex.exec(parsingLine);
        const priceIndex = firstPriceMatch ? firstPriceMatch.index : parsingLine.length;
        const prePriceSegment = lineWithoutStorage.substring(0, priceIndex).trim();

        console.log(`[DEBUG] prePriceSegment for Qty: "${prePriceSegment}"`);

        // Look for the quantity. In RecirQ invoices: Ord Qty | Canc Qty | Ship Qty
        // Example: "... Blue 2 -- 0 $280.00"
        // We want the '2' (Ord Qty), not the '0'.
        const pieces = prePriceSegment.split(/\s+/).filter(p => p.length > 0);
        if (pieces.length > 0) {
            // Traverse backwards from the price, limited to reasonable quantities
            for (let i = pieces.length - 1; i >= 0; i--) {
                const piece = pieces[i];
                if (piece.match(/^[1-9]\d*$/)) {
                    const val = parseInt(piece);
                    if (val > 0 && val < 100) { // Limit to 1-99 to avoid account numbers/SKUs
                        quantity = val;
                        console.log(`[DEBUG] Qty Found (Smart traversal): ${quantity} at piece "${piece}"`);
                        break;
                    }
                }
            }
        }
    }

    // 3. Name Extraction
    let name = parsingLine;
    for (const matchedPriceString of allPriceMatches) {
        name = name.replace(matchedPriceString, "");
    }
    if (qtyMatchExplicit) name = name.replace(qtyMatchExplicit[0], "");
    if (!qtyMatchExplicit && quantity > 1) {
        // If we found implicit quantity at end of name, remove it
        name = name.replace(new RegExp(`\\s${quantity}\\s*$`), "");
    }

    name = name
        .replace(/[=/:.\-,;:\s]+$/, "")
        .replace(/^[=/:.\-,;:\s]+/, "")
        .replace(/\b\d{4,6}\b/g, "") // Remove item codes (4-6 digits)
        .replace(/\d+\s*(?:--|-)\s*\d+/g, "") // Remove patterns like "2 -- 0"
        .replace(/\b[12]\/[12]\b/g, "") // Remove page markers like 1/2 or 2/2
        .replace(/\b(?:Subtotal|Total|Freight|Fees|Tax|Payment|ACH|Account|Title|Routing|Checking|ARA|Group|ext price)\b.*/gi, "") // Clip any footer leftovers
        .replace(/[<>]/g, "") // Remove potential XML-like tags from OCR artifacts
        .replace(/\s{2,}/g, " ")
        .trim();

    // Sanitize specifically for React rendering safety
    if (name.includes("<") || name.includes(">")) {
        name = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    if (name.length > 1 && cost > 0) {
        // Remove Item # if it's at the start (4 digits followed by space)
        name = name.replace(/^\d{4,5}\s+/, "");

        const result = { productName: name.trim(), cost, quantity };
        console.log(`[DEBUG] SUCCESS creating object:`, result);
        return result;
    }
    console.log(`[DEBUG] FAILED Line: "${line}" | Name: "${name}" | Cost: ${cost} | Qty: ${quantity}`);
    return null;
}

// --- Main Component ---
export function ImportPricing({ user, userProfile, settings, onAddToProposal, isSalesMode }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [files, setFiles] = useState([]);
    const [pastedText, setPastedText] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState("setup");
    const [isAddingToStock, setIsAddingToStock] = useState(false);

    // Gateway Selection
    const [selectedGatewayId, setSelectedGatewayId] = useState(''); // Default to empty, will load from settings

    useEffect(() => {
        if (settings?.financial?.activeGatewayId && !selectedGatewayId) {
            setSelectedGatewayId(settings.financial.activeGatewayId);
        }
    }, [settings]);

    const [rawExtractedList, setRawExtractedList] = useState([]); // Base prices without taxes/freight
    const [pricingProducts, setPricingProducts] = useState([]); // List with margins
    const [refinementProducts, setRefinementProducts] = useState([]); // Final stock list
    const [selectedProducts, setSelectedProducts] = useState([]); // Selected IDs for processing
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');

    const form = useForm({
        resolver: zodResolver(importSettingsSchema),
        defaultValues: {
            dollarRate: settings?.financial?.dollarRate || 5.40,
            taxRate: 0.5,
            stateTaxRate: 0,
            insuranceDollarRate: (settings?.financial?.dollarRate || 5.40) + 0.10, // Small spread
            insuranceRate: 7.5,
            usaShippingCostUSD: 86.00,
            paraguayShippingCostBRL: 60.00,
        },
    });

    const { control, register } = form;
    const currentSettings = useWatch({ control });

    // Sync with global settings if they change
    useEffect(() => {
        if (settings?.financial?.dollarRate) {
            form.setValue('dollarRate', settings.financial.dollarRate);
            form.setValue('insuranceDollarRate', settings.financial.dollarRate + 0.10);
        }
    }, [settings?.financial?.dollarRate, form]);

    // Dynamic Recalculation: Whenever settings OR raw list changes, update extractedProducts
    const extractedProducts = useMemo(() => {
        if (rawExtractedList.length === 0) return [];

        const { dollarRate, taxRate, stateTaxRate, insuranceDollarRate, insuranceRate, insuranceTotalOverride, usaShippingCostUSD, paraguayShippingCostBRL } = currentSettings || {};

        // Expand and Calculate total cost basis first if needed for distribution
        const expandedPreCalc = [];
        let totalCostSumUSD = 0;

        rawExtractedList.forEach(p => {
            const qty = p.quantity || 1;
            for (let i = 0; i < qty; i++) {
                const stableId = `${p.id}-u${i}`;
                const item = {
                    ...p,
                    id: stableId,
                    quantity: 1,
                    productName: qty > 1 ? `${p.productName} (Unid. ${i + 1}/${qty})` : p.productName
                };
                expandedPreCalc.push(item);
                totalCostSumUSD += (item.cost || 0);
            }
        });

        const totalQty = expandedPreCalc.length;

        return expandedPreCalc.map(p => {
            const costUSD = p.cost || 0;
            const shippingUSD = totalQty > 0 ? (usaShippingCostUSD / totalQty) : 0;
            const partialUSD = costUSD + shippingUSD;
            const isMacbook = p.productName.toLowerCase().includes('macbook');

            // Weight Cost (USD)
            const weightCostUSD = 0;

            const costplusWeightUSD = costUSD + weightCostUSD;

            const baseBRL = (partialUSD + weightCostUSD) * (dollarRate || 0);

            // Round each component to 2 decimal places to match spreadsheet summing behavior
            const taxBRL = Math.round(baseBRL * ((taxRate || 0) / 100) * 100) / 100;
            const stateTaxBRL = Math.round(baseBRL * ((stateTaxRate || 0) / 100) * 100) / 100;

            // Insurance Logic: Calculated
            const insuranceBRL = Math.round((costUSD * (insuranceRate || 0) / 100) * (insuranceDollarRate || 0) * 100) / 100;

            const shipPYBRL = totalQty > 0 ? Math.round(((paraguayShippingCostBRL || 0) / totalQty) * 100) / 100 : 0;

            const finalBRL = Math.round((baseBRL + taxBRL + stateTaxBRL + insuranceBRL + shipPYBRL) * 100) / 100;

            return {
                ...p,
                costUSD,
                shippingCostUSD: shippingUSD,
                partialCostUSD: partialUSD,
                taxBRL,
                stateTaxBRL,
                insuranceBRL,
                shippingCostBRL: shipPYBRL,
                finalCostBRL: finalBRL
            };
        });
    }, [rawExtractedList, currentSettings]);

    // Sync Pricing Data: Whenever extractedProducts changes, update pricingProducts while PRESERVING margins
    useEffect(() => {
        if (extractedProducts.length === 0) {
            setPricingProducts([]);
            return;
        }

        setPricingProducts(prev => {
            return extractedProducts.map(p => {
                const existing = prev.find(old => old.id === p.id);

                // 1. Auto-detect category
                let detectedCategoryId = existing?.categoryId || '';
                if (!detectedCategoryId && settings?.categories) {
                    const lowerName = p.productName.toLowerCase();
                    const foundCat = settings.categories.find(c => lowerName.includes(c.name.toLowerCase()));
                    if (foundCat) detectedCategoryId = foundCat.id;
                    else if (lowerName.includes('iphone')) detectedCategoryId = settings.categories.find(c => c.name.toLowerCase().includes('iphone'))?.id;
                    else if (lowerName.includes('ipad')) detectedCategoryId = settings.categories.find(c => c.name.toLowerCase().includes('ipad'))?.id;
                    else if (lowerName.includes('watch') || lowerName.includes('series') || lowerName.includes('ultra')) detectedCategoryId = settings.categories.find(c => c.name.toLowerCase().includes('watch') || c.name.toLowerCase().includes('apple watch'))?.id;
                    else if (lowerName.includes('macbook') || lowerName.includes('mac') || lowerName.includes('air')) detectedCategoryId = settings.categories.find(c => c.name.toLowerCase().includes('macbook'))?.id;

                    if (!detectedCategoryId && settings.categories.length > 0) detectedCategoryId = settings.categories[0].id;
                }

                const category = settings?.categories?.find(c => c.id === detectedCategoryId);

                // 2. Determine margin and type (Prefer existing user adjust, fallback to category, fallback to global)
                const marginType = existing?.marginType || category?.marginType || 'percent';
                const marginValue = existing?.marginValue !== undefined ? existing.marginValue : (category?.margin || 20);

                // 3. NFe Toggle
                const applyNfe = existing?.applyNfe !== undefined ? existing.applyNfe : (category?.requiresNotaFiscal || false);

                // Calculate Pix Price (Markup Logic)
                let pixPrice = 0;
                if (marginType === 'percent') {
                    pixPrice = p.finalCostBRL * (1 + (marginValue / 100));
                } else {
                    pixPrice = p.finalCostBRL + marginValue;
                }

                return {
                    ...p,
                    categoryId: detectedCategoryId,
                    categoryName: category?.name || '',
                    isSemiNovo: category?.type === 'semi-novo' || category?.isUsed || false,
                    marginValue,
                    marginType,
                    applyNfe,
                    pixPrice,
                    profit: pixPrice - p.finalCostBRL,
                    twelveMonthPrice: pixPrice * (1 + (DEFAULT_GATEWAY_FEES.credit12x / 100))
                };
            });
        });

        if (selectedProducts.length === 0 && extractedProducts.length > 0) {
            setSelectedProducts(extractedProducts.map(p => p.id));
        }
    }, [extractedProducts, settings]);

    const handleUpdateMargin = (id, updates) => {
        setPricingProducts(prev => prev.map(p => {
            if (p.id !== id) return p;
            const updated = { ...p, ...updates };

            // Calculate Pix Price
            let pixPrice = 0;
            if (updated.marginType === 'percent') {
                // Markup Logic: Cost * (1 + %)
                pixPrice = updated.finalCostBRL * (1 + (updated.marginValue / 100));
            } else {
                pixPrice = updated.finalCostBRL + updated.marginValue;
            }
            updated.pixPrice = pixPrice;
            updated.profit = pixPrice - updated.finalCostBRL;
            updated.twelveMonthPrice = pixPrice * (1 + (DEFAULT_GATEWAY_FEES.credit12x / 100));

            return updated;
        }));
    };


    const onDrop = useCallback((acceptedFiles) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.png', '.jpg', '.webp'],
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
    });

    const removeFile = (fileToRemove) => {
        setFiles(prev => prev.filter(f => f !== fileToRemove));
    };

    const handleReset = () => {
        setFiles([]);
        setPastedText("");
        setRawExtractedList([]);
        setPricingProducts([]);
        setRefinementProducts([]);
        setSelectedProducts([]);
        setActiveTab("setup");
    };

    const handleAnalysisAndPricing = async () => {
        if (files.length === 0 && pastedText.trim() === "") {
            showToast("Insira dados ou faça upload de arquivos.", "warning");
            return;
        }

        setIsExtracting(true);
        setProgress(10);
        setProgressMessage('Iniciando OCR local (Tesseract)...');

        try {
            let parsedItems = [];
            let combinedText = pastedText;

            // 1. Process Images with Local Tesseract (No API Cost)
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    setProgressMessage(`Lendo imagem: ${file.name}...`);
                    const { data: { text } } = await Tesseract.recognize(file, 'por+eng', {
                        logger: m => {
                            if (m.status === 'recognizing text') setProgress(10 + (m.progress * 40));
                        }
                    });
                    combinedText += `\n${text}`;
                }
            }

            // 2. Process PDFs (Local text extraction)
            for (const file of files) {
                if (file.name.endsWith('.pdf')) {
                    setProgressMessage(`Extraindo texto do PDF: ${file.name}...`);
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        let pdfText = "";
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            pdfText += content.items.map(item => item.str).join(" ") + "\n";
                        }
                        combinedText += `\n${pdfText}`;
                    } catch (pdfErr) {
                        console.warn("PDF extraction failed", pdfErr);
                    }
                }
            }

            // 3. Process Excel
            for (const file of files) {
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
                    try {
                        const data = await file.arrayBuffer();
                        const workbook = XLSX.read(data);
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        let startRow = 0;
                        let colMap = { name: 0, cost: 1, qty: 2 };
                        rows.some((row, idx) => {
                            const rowStr = row.join(" ").toLowerCase();
                            if (rowStr.includes("produto") || rowStr.includes("nome") || rowStr.includes("item")) {
                                startRow = idx + 1;
                                row.forEach((cell, cellIdx) => {
                                    const c = String(cell).toLowerCase();
                                    if (c.includes("nome")) colMap.name = cellIdx;
                                    if (c.includes("custo") || c.includes("valor")) colMap.cost = cellIdx;
                                    if (c.includes("qtd")) colMap.qty = cellIdx;
                                });
                                return true;
                            }
                            return false;
                        });
                        for (let i = startRow; i < rows.length; i++) {
                            const row = rows[i];
                            if (!row || !row[colMap.name]) continue;
                            const costStr = String(row[colMap.cost] || "").replace(/[^0-9.,]/g, "").replace(",", ".");
                            parsedItems.push({ productName: String(row[colMap.name]).trim(), cost: parseFloat(costStr), quantity: parseInt(row[colMap.qty]) || 1, id: uuidv4() });
                        }
                    } catch (err) {
                        console.error("Excel error", err);
                    }
                }
            }

            // 4. Parse all combined text
            if (combinedText.trim()) {
                console.log("[DEBUG] Full Combined Text:", combinedText);

                // Normalize the text instead of splitting. Aggressive splitting was cutting off multi-page PDFs.
                const cleanText = combinedText
                    .replace(/\t/g, " ")
                    .replace(/\s{3,}/g, "  ");

                let lines = cleanText.split('\n');
                // Heuristic: If we have very few lines but a lot of text (common in bad OCR or certain PDFs),
                // try to split by product identifiers or recurring price patterns.
                if (lines.length < 20 && cleanText.length > 150) {
                    console.log("[DEBUG] Potential giant block detected. Attempting heuristic splits.");

                    // Strategy A: Split by Brand Identifiers (added case-insensitive and more brands)
                    const brandRegex = /(\d{3,}\s+(?:Apple|Samsung|Xiaomi|iPhone|Watch|Pixel|Google|MacBook|iPad|Galaxy|Moto|Sony|Nikon|Canon|DJI|Meta|Oculus|Zebra|Honeywell|Poly|Jabra|Dell|HP|Lenovo|Asus|Acer|Nothing|Beat|AirPod))/gi;
                    const brandChunks = cleanText.split(brandRegex).filter(c => c.trim().length > 0);
                    let rebuilt = [];
                    if (brandChunks.length > 2) {
                        for (let i = 0; i < brandChunks.length; i++) {
                            const chunk = brandChunks[i];
                            // If chunk starts with an ID/Brand (the capture group), combine with the next chunk
                            if (chunk.match(/^\d{3,}\s+/)) {
                                rebuilt.push(chunk + (brandChunks[i + 1] || ""));
                                i++;
                            } else {
                                rebuilt.push(chunk); // Add chunks that are not identifiers directly
                            }
                        }
                    }

                    // Strategy B: ONLY if Strategy A failed, use Price-based splitting
                    if (rebuilt.length < 3) {
                        console.log("[DEBUG] Strategy A found few items. Trying Strategy B (Price Split).");
                        const priceRegexSplit = /((?:US\$|USD|\$|U\$|R\$|S\$|S)\s?\d+(?:,\d{3})*[.,]\d{2}(?!\d))/gi;
                        const parts = cleanText.split(priceRegexSplit);
                        if (parts.length > 4) {
                            let current = "";
                            let priceCount = 0;
                            let bRebuilt = [];
                            for (let i = 0; i < parts.length; i++) {
                                current += parts[i];
                                if (i > 0) {
                                    priceCount++;
                                    if (priceCount % 2 === 0) { // Group by 2 prices (Unit and Ext)
                                        bRebuilt.push(current);
                                        current = "";
                                    }
                                }
                            }
                            if (current.length > 20) bRebuilt.push(current);
                            rebuilt = bRebuilt;
                        }
                    }

                    if (rebuilt.length > 0) {
                        const validRebuilt = rebuilt.filter(l => l.includes('$') || l.includes('USD'));
                        if (validRebuilt.length > 0) {
                            console.log(`[DEBUG] Heuristic split successful: ${validRebuilt.length} items found. Replacing raw lines.`);
                            lines = validRebuilt;
                        }
                    }
                }

                // Deduplicate or filter lines that are obviously partials if we added extra
                const seen = new Set();
                const filteredLines = lines.filter(l => {
                    const trimmed = l.trim();
                    if (!trimmed || trimmed.length < 5) return false;
                    if (seen.has(trimmed)) return false;
                    seen.add(trimmed);
                    return true;
                });

                filteredLines.forEach((line, idx) => {
                    const lowerLine = line.toLowerCase().trim();
                    if (!lowerLine) return;

                    const extracted = parseLine(line);
                    if (extracted) {
                        console.log(`[DEBUG] SUCCESS extracting line ${idx}:`, extracted);
                        parsedItems.push({ ...extracted, id: uuidv4() });
                    } else {
                        console.log(`[DEBUG] SKIPPED/FAILED line ${idx}: "${line}"`);
                    }
                });
            }

            if (parsedItems.length === 0 && combinedText.trim()) {
                console.log("[DEBUG] Fallback: Trying to parse combinedText as a single monster line.");
                const singleLineExtract = parseLine(combinedText);
                if (singleLineExtract) {
                    parsedItems.push({ ...singleLineExtract, id: uuidv4() });
                }
            }

            if (parsedItems.length === 0) {
                console.error("[DEBUG] Zero products in:", combinedText);
                throw new Error(`Nenhum produto identificado. O leitor viu: "${combinedText.substring(0, 100)}...". Tente colar o texto ou verifique a imagem.`);
            }

            console.log("[DEBUG] --- FINAL EXTRACTION RESULTS ---");
            console.table(parsedItems);
            console.log("[DEBUG] ---------------------------------");

            setProgress(90);
            setProgressMessage('Finalizando processamento...');

            // This triggers the useMemo calculation
            setRawExtractedList(parsedItems);

            showToast(`${parsedItems.length} produtos identificados!`, "success");
            setActiveTab("pricing");
        } catch (e) {
            console.error(e);
            showToast(e.message || "Erro no processamento.", "error");
        } finally {
            setIsExtracting(false);
            setProgress(0);
        }
    };

    const handleGoToRefinement = (productsToRefine) => {
        if (productsToRefine.length === 0) {
            showToast("Nenhum produto selecionado.", "error");
            return;
        }

        const refinement = productsToRefine.map(p => {
            const nameLower = p.productName.toLowerCase();
            // Basic color extraction (expand list as needed)
            const colors = ['midnight', 'starlight', 'silver', 'gold', 'space gray', 'space black', 'deep purple', 'blue', 'green', 'pink', 'yellow', 'product red', 'titanium', 'natural', 'azul', 'preto', 'branco', 'dourado', 'cinza', 'roxo', 'verde', 'rosa'];
            const foundColor = colors.find(c => nameLower.includes(c)) || '';

            // Storage extraction
            const foundStorage = p.productName.match(/(\d{2,4})\s*(gb|tb)/i)?.[0]?.toUpperCase().replace(/\s/g, '') || '';

            return {
                id: p.id,
                name: p.productName,
                cost: p.finalCostBRL,
                sellingPrice: p.pixPrice,
                twelveMonthPrice: p.twelveMonthPrice,
                quantity: 1,
                categoryId: p.categoryId || (settings?.categories?.[0]?.id || ''),
                category: '',
                condition: 'new',
                description: `Importado via calculadora - Custo Unit: ${formatCurrency(p.finalCostBRL)}`,
                sku: '',
                imei: '', // User will input this in refinement
                storage: foundStorage,
                color: foundColor.charAt(0).toUpperCase() + foundColor.slice(1), // Capitalize
                batteryHealth: 100,
                isPublic: true
            };
        });

        setRefinementProducts(refinement);
        setActiveTab("refinement");
    }

    const handleConfirmAddToStock = async (data) => {
        setIsAddingToStock(true);
        try {
            const batchPromises = data.products.map((item, index) => {
                const original = refinementProducts[index] || {};
                const finalProduct = { ...original, ...item };

                // Construct clean payload for StockService
                // Signature: (orgId, userId, itemData)
                const orgId = userProfile?.organizationId || user.uid;
                return StockService.addItem(orgId, user.uid, {
                    name: finalProduct.name,
                    details: finalProduct.details || finalProduct.name,
                    cost: parseFloat(finalProduct.cost) || 0,
                    price: parseFloat(finalProduct.sellingPrice) || 0, // PIX
                    price12x: parseFloat(finalProduct.twelveMonthPrice) || 0,
                    category: finalProduct.categoryId || 'import',
                    condition: finalProduct.condition || 'novo',
                    quantity: 1, // Individual items
                    storage: finalProduct.storage || '',
                    color: finalProduct.color || '',
                    imageUrl: getProductImage(finalProduct.name, finalProduct.color) || '',
                    imei: finalProduct.imei || '',
                    batteryHealth: finalProduct.batteryHealth || 100
                });
            });

            await Promise.all(batchPromises);

            showToast(`${data.products.length} itens adicionados ao estoque!`, "success");
            handleReset();
        } catch (e) {
            console.error("Error saving to stock:", e);
            showToast("Erro ao salvar no estoque.", "error");
        } finally {
            setIsAddingToStock(false);
        }
    }

    const handleRefinementConfirm = async (data) => {
        if (isSalesMode) {
            const newItems = data.products.map(p => ({
                id: uuidv4(),
                name: p.name,
                cost: parseFloat(p.cost) || 0,
                price: parseFloat(p.sellingPrice) || 0,
                pixPrice: parseFloat(p.sellingPrice) || 0,
                quantity: 1,
                details: p.name,
                image: ''
            }));

            if (onAddToProposal) {
                onAddToProposal(prev => [...(Array.isArray(prev) ? prev : []), ...newItems]);
                showToast(`${newItems.length} itens enviados para o Orçamento!`, "success");
                navigate('/dashboard/proposals');
            } else {
                showToast("Erro: Função de orçamento não conectada.", "error");
            }
        } else {
            await handleConfirmAddToStock(data);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 shadow-lg shadow-indigo-100 rounded-2xl">
                        <ChevronsRight className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Calculadora de Importação</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Regras personalizadas para desembarque internacional.</p>
                    </div>
                </div>

                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto">
                    {[
                        { id: 'setup', label: '1. Custos', icon: Settings },
                        { id: 'pricing', label: '2. Precificação', icon: DollarSign, disabled: extractedProducts.length === 0 },
                        { id: 'refinement', label: '3. Adicionar', icon: PackagePlus, disabled: refinementProducts.length === 0 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            disabled={tab.disabled}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600",
                                tab.disabled && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === 'setup' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Data Input Card */}
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileScan className="w-5 h-5 text-indigo-500" />
                                    Entrada de Dados
                                </CardTitle>
                                <CardDescription>Faça upload de orçamentos ou cole a lista de custos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 flex-1 flex flex-col">
                                <div {...getRootProps()} className={cn(
                                    "relative group flex flex-col items-center justify-center p-12 border-4 border-dashed rounded-[2rem] transition-all cursor-pointer",
                                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-slate-50 hover:border-indigo-300"
                                )}>
                                    <input {...getInputProps()} />
                                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="h-10 w-10 text-indigo-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 text-center">Arraste comprovantes ou planilhas</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">PNG, JPG, PDF, XLSX</p>
                                </div>

                                {files.length > 0 && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {files.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(file)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-2 flex-1 flex flex-col">
                                    <Label>Lista Manual</Label>
                                    <textarea
                                        placeholder="Ex: iPhone 15 Pro Max - $950 x 2"
                                        rows={6}
                                        value={pastedText}
                                        onChange={e => setPastedText(e.target.value)}
                                        className="w-full flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <Button onClick={handleReset} variant="outline" className="flex-1">Limpar Tudo</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cost Parameters Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-indigo-500" />
                                    Regras de Desembarque
                                </CardTitle>
                                <CardDescription>Defina as taxas e fretes para o cálculo de BRL.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Câmbio Comercial (R$)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Globe className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <Input type="number" step="0.01" {...form.register('dollarRate')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Taxa Especial (%)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Percent className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <Input type="number" step="0.001" {...form.register('taxRate')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ICMS Interestadual (%)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Percent className="w-4 h-4 text-rose-500" />
                                                </div>
                                                <Input type="number" step="0.001" {...form.register('stateTaxRate')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Seguro: Câmbio (R$)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <Input type="number" step="0.01" {...form.register('insuranceDollarRate')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Seguro: Taxa (%)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Percent className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <Input type="number" step="0.001" {...form.register('insuranceRate')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                    </div>



                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                        <div className="space-y-2">
                                            <Label>Frete EUA (USD)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Plane className="w-4 h-4 text-sky-500" />
                                                </div>
                                                <Input type="number" step="0.01" {...form.register('usaShippingCostUSD')} className="pl-14 h-14 text-lg" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Frete Local (R$)</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                    <Truck className="w-4 h-4 text-amber-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {isExtracting && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                    </div>
                                    <span className="font-bold text-slate-800 tracking-tight">{progressMessage}</span>
                                </div>
                                <span className="text-sm font-black text-indigo-600">{progress}%</span>
                            </div>
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <CostAnalysisTable
                        products={extractedProducts}
                        isLoading={isExtracting && progress < 100}
                    />

                    <div className="flex justify-end pt-4">
                        <Button size="lg" onClick={handleAnalysisAndPricing} disabled={isExtracting || (!pastedText && files.length === 0)}>
                            {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            Processar Desembarque
                        </Button>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'pricing' && (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <ImportPricingTable
                            costProducts={extractedProducts}
                            selectedIds={selectedProducts}
                            onSelectionChange={setSelectedProducts}
                            onGoToRefinement={handleGoToRefinement}
                            settings={settings}
                            selectedGatewayId={selectedGatewayId}
                            onGatewayChange={setSelectedGatewayId}
                            showToast={showToast}
                        />
                    </div>
                )
            }

            {
                activeTab === 'refinement' && (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <ImportRefinementTable
                            initialProducts={refinementProducts}
                            onConfirm={handleRefinementConfirm}
                            isSaving={isAddingToStock}
                            settings={settings}
                            showToast={showToast}
                            isSalesMode={isSalesMode}
                        />
                    </div>
                )
            }


        </div >
    );
}

// --- Sub-Components ---

function CostAnalysisTable({ products, isLoading }) {
    const totals = useMemo(() => {
        return products.reduce((acc, p) => {
            acc.totalBRL += p.finalCostBRL;
            acc.totalUSD += p.costUSD;
            acc.totalTaxBRL += (p.taxBRL || 0);
            acc.totalInsuranceBRL += (p.insuranceBRL || 0);
            acc.totalShippingBRL += (p.shippingCostBRL || 0);
            acc.totalShippingUSD += (p.shippingCostUSD || 0);
            acc.qty += 1;
            return acc;
        }, {
            totalBRL: 0,
            totalUSD: 0,
            totalTaxBRL: 0,
            totalInsuranceBRL: 0,
            totalShippingBRL: 0,
            totalShippingUSD: 0,
            qty: 0
        });
    }, [products]);

    if (isLoading) return null; // Logic handled by progress bar
    if (products.length === 0) return null;

    return (
        <Card className="p-0 overflow-hidden border-indigo-100 ring-1 ring-indigo-50 shadow-xl shadow-indigo-100/20">
            <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg">Análise de Desembarque Detalhada</CardTitle>
                <CardDescription>Breakdown unitário após câmbio, impostos e logística internacional.</CardDescription>
            </CardHeader>
            <TableCom>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Custo (USD)</TableHead>
                        <TableHead>Frete USA</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Seguro</TableHead>
                        <TableHead>Logística Local</TableHead>
                        <TableHead className="text-right">Custo Final (BRL)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-bold text-slate-800">
                                {p.productName}
                                {p.isMacbook && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full uppercase tracking-wider">Macbook Rules</span>}
                            </TableCell>
                            <TableCell>
                                {formatCurrency(p.costUSD, 'USD')}
                            </TableCell>
                            <TableCell>{formatCurrency(p.shippingCostUSD, 'USD')}</TableCell>
                            <TableCell>
                                {formatCurrency(p.taxBRL || 0)}
                                {p.isMacbook && <div className="text-[10px] text-indigo-500 font-bold">7.5%</div>}
                            </TableCell>
                            <TableCell>{formatCurrency(p.insuranceBRL || 0)}</TableCell>
                            <TableCell>{formatCurrency(p.shippingCostBRL || 0)}</TableCell>
                            <TableCell className="text-right font-black text-indigo-600 text-lg">
                                {formatCurrency(p.finalCostBRL)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <TableCell className="text-slate-500 py-4 uppercase text-[10px] tracking-wider">Subtotais ({totals.qty} itens)</TableCell>
                        <TableCell className="text-slate-600 font-medium">{formatCurrency(totals.totalUSD, 'USD')}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{formatCurrency(totals.totalShippingUSD, 'USD')}</TableCell>
                        <TableCell className="text-slate-600 font-medium text-emerald-600">{formatCurrency(totals.totalTaxBRL)}</TableCell>
                        <TableCell className="text-slate-600 font-medium text-emerald-600">{formatCurrency(totals.totalInsuranceBRL)}</TableCell>
                        <TableCell className="text-slate-600 font-medium text-amber-600">{formatCurrency(totals.totalShippingBRL)}</TableCell>
                        <TableCell className="text-right text-slate-400 font-medium italic">---</TableCell>
                    </TableRow>
                    <TableRow className="bg-indigo-600">
                        <TableCell colSpan={6} className="text-white py-6 pl-8 uppercase tracking-[0.2em] text-[11px] font-black">Investimento Total Estimado</TableCell>
                        <TableCell className="text-right pr-8 text-3xl text-white font-black tracking-tighter drop-shadow-sm">
                            {formatCurrency(totals.totalBRL)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </TableCom>
        </Card>
    );
}

function ImportPricingTable({ costProducts, selectedIds, onSelectionChange, onGoToRefinement, settings, showToast, selectedGatewayId, onGatewayChange }) {
    const [localPricing, setLocalPricing] = useState([]);
    const [viewingTableId, setViewingTableId] = useState(null);

    // Shared Calculation Logic
    const calculateProductPrices = useCallback((product, marginVal, marginType, settings) => {
        const gateway = settings?.financial?.gateways?.find(g => g.id === selectedGatewayId) ||
            settings?.financial?.gateways?.find(g => g.id === settings?.financial?.activeGatewayId) ||
            settings?.financial?.gateways?.[0];

        const rates = gateway?.rates || {};

        const costBRL = parseFloat(product.finalCostBRL) || 0;

        // 1. Calculate Target Net (Markup Logic)
        let targetNetProfit = 0;
        if (marginType === 'percent') {
            // Markup: Profit = Cost * %
            targetNetProfit = costBRL * (parseFloat(marginVal || 0) / 100);
        } else {
            // Fixed: Profit = Value
            targetNetProfit = parseFloat(marginVal || 0);
        }

        const targetNetReceive = costBRL + targetNetProfit;

        // 2. Base Selling Price (Pix Price)
        // ALIGNMENT FIX: Use simple Cost + Margin logic for Pix Price to avoid "Gross Up" confusion/explosions.
        // We assume the user wants the "Pix Price" to be exactly what they set as their target receive amount.
        const sellingPrice = targetNetReceive;

        const max = rates.maxInstallments || 12;
        const priceList = [];

        // We use the same baseReceiveAmount logic as SmartPricing for consistency
        const baseReceiveAmount = targetNetReceive;

        const nfRate = parseFloat(settings?.financial?.notaFiscalRate) || 0;
        const effectiveNfRate = product.applyNfe ? nfRate : 0;
        const pixRate = parseFloat(rates.pix) || 0;

        // Base Calc Helper - Gross Up logic (Same as SmartPricing)
        // This ensures that for card/debit, we receive EXACTLY the targetNetReceive
        const getFinalPrice = (rate) => {
            const totalLoad = ((rate || 0) + effectiveNfRate) / 100;
            const divisor = 1 - totalLoad;
            if (divisor <= 0) return targetNetReceive;
            return targetNetReceive / divisor;
        };

        // 1. Pix - Simplified Logic as requested (Cost + Margin = Price)
        const finalPixPrice = targetNetReceive;
        const pixCardFee = finalPixPrice * (pixRate / 100);

        // NF Fee - ONLY apply if product.applyNfe is true
        const nfFee = product.applyNfe ? (finalPixPrice * (nfRate / 100)) : 0;

        const actualProfit = finalPixPrice - pixCardFee - nfFee - costBRL;

        priceList.push({
            label: 'Pix / Dinheiro',
            value: finalPixPrice,
            parcela: finalPixPrice,
            cardFee: pixCardFee + nfFee
        });

        // 2. Debit
        const debitRate = parseFloat(rates.debit) || 0;
        const finalDebitPrice = getFinalPrice(debitRate);
        const debitCardFee = finalDebitPrice * (debitRate / 100);
        priceList.push({ label: 'Débito', value: finalDebitPrice, parcela: finalDebitPrice, cardFee: debitCardFee });

        // 3. Credit
        const rate1x = parseFloat(rates.credit1x) || 0;
        const rate12x = parseFloat(rates.credit12x || rates[`credit${max}x`]) || 0;
        const rateStep = max > 1 ? (rate12x - rate1x) / (max - 1) : 0;

        for (let i = 1; i <= max; i++) {
            let r = 0;
            if (i === 1) r = rate1x;
            else if (rates[`credit${i}x`]) r = parseFloat(rates[`credit${i}x`]);
            else r = rate1x + (rateStep * (i - 1));

            if (r > 99) r = 99;

            const val = getFinalPrice(r);
            const cFee = val * (r / 100);
            priceList.push({ label: `${i}x Crédito`, value: val, parcela: val / i, cardFee: cFee });
        }

        return {
            ...product,
            marginValue: parseFloat(marginVal) || 0,
            marginType,
            pixPrice: finalPixPrice,
            profit: parseFloat(actualProfit.toFixed(2)), // REAL profit after all deductions
            twelveMonthPrice: priceList.find(p => p.label.includes(`${max}x`))?.value || 0,
            fullPriceTable: priceList
        };
    }, [selectedGatewayId]); // Re-calc when gateway changes

    useEffect(() => {
        if (costProducts.length === 0) {
            setLocalPricing([]);
            return;
        }
        setLocalPricing(prev => {
            return costProducts.map(p => {
                const existing = prev.find(old => old.id === p.id);
                const category = settings?.categories?.find(c => c.id === p.categoryId);

                const marginValue = existing?.marginValue !== undefined ? existing.marginValue : (category?.margin || 20);
                const marginType = existing?.marginType || category?.marginType || 'percent';
                const applyNfe = existing?.applyNfe !== undefined ? existing.applyNfe : (category?.requiresNotaFiscal || false);
                const isSemiNovo = category?.type === 'semi-novo' || category?.isUsed || p.productName.toLowerCase().includes('grade') || false;

                return calculateProductPrices({ ...p, applyNfe, isSemiNovo }, marginValue, marginType, settings);
            });
        });
    }, [costProducts, settings, calculateProductPrices]);

    const handleUpdate = (id, updates) => {
        setLocalPricing(prev => prev.map(p => {
            if (p.id !== id) return p;

            // If category changed, pull new defaults
            let categoryUpdates = {};
            if (updates.categoryId) {
                const cat = settings?.categories?.find(c => c.id === updates.categoryId);
                if (cat) {
                    categoryUpdates = {
                        marginValue: cat.margin || 20,
                        marginType: cat.marginType || 'percent',
                        applyNfe: cat.requiresNotaFiscal || false,
                        isSemiNovo: cat.type === 'semi-novo' || cat.isUsed || false
                    };
                }
            }

            const current = { ...p, ...categoryUpdates, ...updates };
            // Pass the updated product so any changes to quantity/cost/margin are reflected
            return calculateProductPrices(current, current.marginValue, current.marginType, settings);
        }));
    };

    const toggleSelection = (id) => {
        onSelectionChange(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        onSelectionChange(e.target.checked ? localPricing.map(p => p.id) : []);
    };

    const handleCopyCosts = () => {
        const text = localPricing
            .filter(p => selectedIds.includes(p.id))
            .map(p => `${p.productName}: ${formatCurrency(p.finalCostBRL)}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        showToast("Custos copiados!", "success");
    };

    const handleCopyMessage = () => {
        const selected = localPricing.filter(p => selectedIds.includes(p.id));
        const text = selected.map(p => {
            const name = p.productName;
            const isIphone = name.toLowerCase().includes('iphone');

            // Check if category or name indicates semi-novo
            const isSemiNovo = p.isSemiNovo ||
                name.toLowerCase().includes('semi') ||
                name.toLowerCase().includes('vitrine') ||
                name.toLowerCase().includes('usado') ||
                name.toLowerCase().includes('grade');

            let warranty = isIphone ? (isSemiNovo ? '6 Meses Garantia VeloCell' : '1 Ano Apple') : '3 Meses de Garantia';

            const getPriceByInstallment = (n) => {
                const found = p.fullPriceTable?.find(item => item.label === `${n}x Crédito`);
                return found ? formatCurrency(found.parcela) : null;
            };

            const price10x = getPriceByInstallment(10);
            const price12x = getPriceByInstallment(12);
            const price18x = getPriceByInstallment(18);

            return `📱 *${name}*\n` +
                `🔒 Garantia: ${warranty}\n` +
                `${p.applyNfe ? '🧾 COM NOTA FISCAL' : '🚫 SEM NOTA FISCAL'}\n\n` +
                `💰 *Valores e formas de pagamento:*\n` +
                `À vista (PIX ou dinheiro): *${formatCurrency(p.pixPrice)}*\n` +
                (price10x ? `💳 10x de *${price10x}*\n` : '') +
                (price12x ? `💳 12x de *${price12x}*\n` : '') +
                (price18x ? `💳 18x de *${price18x}*\n` : '') +
                `----------------------------`;
        }).join('\n\n');

        const header = `*TELA DE OFERTAS VELOCELL* 🚀\n\n`;
        const footer = `\n\n✅ Parcelamento em até 18x com as melhores taxas\n✅ Envio imediato ou retirada em mãos`;

        navigator.clipboard.writeText(header + text + footer);
        showToast("Mensagem de oferta copiada!", "success");
    };

    return (
        <Card className="shadow-2xl border-indigo-100 overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-white border-b border-slate-50">
                <div>
                    <CardTitle className="text-2xl">Precificação Proposta</CardTitle>
                    <CardDescription>Defina suas margens para cada item desembarcado.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={handleCopyMessage} variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" disabled={selectedIds.length === 0}>
                        <MessageSquare className="w-4 h-4" /> Copiar Mensagem
                    </Button>
                    <Button onClick={handleCopyCosts} variant="outline" size="sm" disabled={selectedIds.length === 0}>
                        <DollarSign className="w-4 h-4" /> Copiar Custos
                    </Button>
                    <Button onClick={() => onGoToRefinement(localPricing.filter(p => selectedIds.includes(p.id)))} size="sm" disabled={selectedIds.length === 0}>
                        <ArrowRight className="w-4 h-4" /> Refinar Seleção ({selectedIds.length})
                    </Button>
                </div>
                {/* Gateway Selector */}
                <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 md:border-t-0 md:bg-transparent md:p-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:block">Perfil de Taxas:</label>
                    <select
                        value={selectedGatewayId}
                        onChange={(e) => onGatewayChange(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-2 outline-none focus:border-indigo-500 shadow-sm"
                    >
                        {settings?.financial?.gateways?.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <TableCom>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 pl-8">
                            <input type="checkbox" checked={selectedIds.length === localPricing.length && localPricing.length > 0} onChange={handleSelectAll} className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" />
                        </TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Custo Desembarque</TableHead>
                        <TableHead className="min-w-[200px]">Margem Alvo</TableHead>
                        <TableHead className="font-bold text-emerald-600">Lucro Líquido</TableHead>
                        <TableHead className="text-right pr-8">Preço PIX (À Vista)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(() => {
                        const gateway = settings?.financial?.gateways?.find(g => g.id === selectedGatewayId) ||
                            settings?.financial?.gateways?.find(g => g.id === settings?.financial?.activeGatewayId) ||
                            settings?.financial?.gateways?.[0];
                        const rates = gateway?.rates || {};

                        return localPricing.map(p => (
                            <TableRow key={p.id} className={cn(selectedIds.includes(p.id) ? "bg-indigo-50/20" : "")}>
                                <TableCell className="pl-8">
                                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelection(p.id)} className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" />
                                </TableCell>
                                <TableCell className="font-black text-slate-800 py-6">
                                    {p.productName}
                                    <div className="mt-2">
                                        <button onClick={() => setViewingTableId(p.id)} className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg transition-colors">
                                            Ver Tabela Completa
                                        </button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <select
                                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 w-32"
                                        value={p.categoryId}
                                        onChange={(e) => handleUpdate(p.id, { categoryId: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {settings?.categories?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </TableCell>
                                <TableCell className="font-medium text-slate-500">{formatCurrency(p.finalCostBRL)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={p.marginValue}
                                            onChange={e => handleUpdate(p.id, { marginValue: parseFloat(e.target.value) || 0 })}
                                            className="h-11 w-20 px-3 text-sm font-black border-2 border-slate-100 rounded-xl bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                        />
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                            <button onClick={() => handleUpdate(p.id, { marginType: 'percent' })} className={cn("px-3 py-1.5 text-[10px] font-black rounded-lg transition-all", p.marginType === 'percent' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>%</button>
                                            <button onClick={() => handleUpdate(p.id, { marginType: 'fixed' })} className={cn("px-3 py-1.5 text-[10px] font-black rounded-lg transition-all", p.marginType === 'fixed' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>R$</button>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-emerald-600 font-black text-sm">{formatCurrency(p.profit)}</TableCell>
                                <TableCell className="text-right pr-8">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs font-bold text-slate-400">R$</span>
                                            <PixPriceInput
                                                value={p.pixPrice}
                                                finalCostBRL={p.finalCostBRL}
                                                settings={settings}
                                                rates={rates}
                                                marginType={p.marginType}
                                                applyNfe={p.applyNfe}
                                                onUpdate={(updates) => handleUpdate(p.id, updates)}
                                            />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou 12x de {formatCurrency(p.twelveMonthPrice / 12)}</div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    })()}
                </TableBody>
            </TableCom>

            {
                viewingTableId && (() => {
                    const product = localPricing.find(p => p.id === viewingTableId);
                    if (!product) return null;
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
                                <button onClick={() => setViewingTableId(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><XCircle className="w-5 h-5" /></button>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{product.name}</h3>
                                <p className="text-xs text-slate-500 font-medium mb-6">Tabela completa de preços e parcelamento.</p>

                                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-100 sticky top-0 z-10">
                                            <tr className="text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                                <th className="p-3 text-left">Método</th>
                                                <th className="p-3 text-right">Parcela</th>
                                                <th className="p-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {product.fullPriceTable && product.fullPriceTable.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    onClick={() => {
                                                        const txt = `${row.label} de ${formatCurrency(row.parcela)} = ${formatCurrency(row.value)}`;
                                                        navigator.clipboard.writeText(txt);
                                                        showToast("Copiado!", "success");
                                                    }}
                                                    className="hover:bg-indigo-50 transition-colors cursor-pointer active:bg-indigo-100"
                                                >
                                                    <td className="p-3 font-bold text-slate-700">{row.label}</td>
                                                    <td className="p-3 text-right font-medium text-slate-500">{row.label.includes('x') ? formatCurrency(row.parcela) : '-'}</td>
                                                    <td className="p-3 text-right font-bold text-indigo-600">{formatCurrency(row.value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => {
                                            const isSealed = product.productName.toLowerCase().includes('lacrado') || product.productName.toLowerCase().includes('novo');

                                            const sealedTemplate = `🚀 *OFERTA ESPECIAL (NOVO)*
📱 *{modelo}*

✨ *Detalhes:*
💾 {capacidade} • {cor}
💎 {condicao}
🔒 Garantia: {garantia}
{nota_fiscal}

💰 *VALORES:*
✅ *{pix}* (À vista/Pix)

💳 *Parcelamento:*
• 10x de {parcela_10x}
• 12x de {parcela_12x}
• 18x de {parcela_18x}

📍 *Loja Física / Entrega Rápida*`;

                                            const usedTemplate = `♻️ *OPORTUNIDADE (SEMINOVO)*
📱 *{modelo}*

✨ *Detalhes do Aparelho:*
💾 {capacidade} • {cor}
💎 {condicao}
🔋 Saúde Bateria: 100% (ou a consultar)
🔒 Garantia: {garantia}
{nota_fiscal}

💰 *VALORES:*
✅ *{pix}* (À vista/Pix)

💳 *Parcelamento:*
• 10x de {parcela_10x}
• 12x de {parcela_12x}
• 18x de {parcela_18x}

📍 *Loja Física / Entrega Rápida*`;

                                            let message = isSealed ? sealedTemplate : usedTemplate;

                                            const getVal = (label) => {
                                                const item = product.fullPriceTable.find(x => x.label.includes(label));
                                                return item ? formatCurrency(item.parcela) : 'N/A';
                                            };

                                            message = message
                                                .replace(/{modelo}/g, product.productName)
                                                .replace(/{capacidade}/g, "Consultar")
                                                .replace(/{cor}/g, "Consultar")
                                                .replace(/{condicao}/g, isSealed ? "Novo (Lacrado)" : "Seminovo")
                                                .replace(/{garantia}/g, isSealed ? "1 Ano Apple" : "3 Meses")
                                                .replace(/{nota_fiscal}/g, "✅ Com Nota Fiscal")
                                                .replace(/{pix}/g, formatCurrency(product.pixPrice))
                                                .replace(/{parcela_10x}/g, getVal('10x'))
                                                .replace(/{parcela_12x}/g, getVal('12x'))
                                                .replace(/{parcela_18x}/g, getVal('18x'));

                                            navigator.clipboard.writeText(message);
                                            showToast("Mensagem Copiada!", "success");
                                        }}
                                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-4 h-4" /> Copiar Zap
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const user = auth.currentUser;
                                            if (user) {
                                                try {
                                                    await StockService.addItem(user.uid, user.uid, {
                                                        name: product.name,
                                                        category: product.category || 'Importado',
                                                        cost: product.cost,
                                                        quantity: 1,
                                                        condition: 'novo',
                                                        minQuantity: 5,
                                                        details: product.name,
                                                        color: product.color || '',
                                                        imageUrl: getProductImage(product.name, product.color) || ''
                                                    });
                                                    showToast("Adicionado ao Estoque!", "success");
                                                    setViewingTableId(null);
                                                } catch (e) {
                                                    console.error(e);
                                                    showToast("Erro ao adicionar.", "error");
                                                }
                                            }
                                        }}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                    >
                                        <Package className="w-4 h-4" /> Add Estoque
                                    </button>
                                    <button onClick={() => setViewingTableId(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200">
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
        </Card >
    );
}

function ImportRefinementTable({ initialProducts, onConfirm, isSaving, settings, isSalesMode }) {
    const { register, handleSubmit } = useForm({
        defaultValues: { products: initialProducts }
    });

    if (initialProducts.length === 0) return null;

    return (
        <Card className="animate-in slide-in-from-bottom-4 shadow-2xl border-indigo-100">
            <CardHeader className="p-8 border-b border-slate-50 bg-white">
                <CardTitle className="text-2xl">Refinar & Enviar ao Estoque</CardTitle>
                <CardDescription>Complete os detalhes técnicos para cada unidade identificada.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit(onConfirm)}>
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <TableCom className="mb-0">
                            <TableHeader className="sticky top-0 bg-white z-20">
                                <TableRow>
                                    <TableHead className="pl-8">Modelo</TableHead>
                                    <TableHead>Custo</TableHead>
                                    <TableHead>Venda (Pix)</TableHead>
                                    <TableHead>Cor</TableHead>
                                    <TableHead>Capacidade</TableHead>
                                    <TableHead>IMEI / Serial</TableHead>
                                    <TableHead className="pr-8">Saúde Bateria</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialProducts.map((p, index) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="pl-8 py-5">
                                            <Input {...register(`products.${index}.name`)} className="font-bold text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
                                                <Input type="number" step="0.01" {...register(`products.${index}.cost`)} className="pl-6 w-24 text-xs font-medium" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold">R$</span>
                                                <Input type="number" step="0.01" {...register(`products.${index}.sellingPrice`)} className="pl-6 w-24 text-xs font-black text-emerald-600" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input {...register(`products.${index}.color`)} placeholder="Titanium, Black..." className="text-xs" />
                                        </TableCell>
                                        <TableCell>
                                            <Input {...register(`products.${index}.storage`)} placeholder="256GB, 512GB..." className="text-xs font-bold" />
                                        </TableCell>
                                        <TableCell>
                                            <Input {...register(`products.${index}.imei`)} placeholder="IMEI ou Serial" className="text-xs font-mono" />
                                        </TableCell>
                                        <TableCell className="pr-8">
                                            <div className="relative">
                                                <Input type="number" {...register(`products.${index}.batteryHealth`)} className="pr-8 w-24 text-center font-black" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </TableCom>
                    </div>
                    <div className="p-8 flex justify-end bg-slate-50 rounded-b-[2.5rem] border-t border-slate-100">
                        <Button type="submit" disabled={isSaving} size="lg" className={cn("h-16 px-10", isSalesMode ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "")}>
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : (isSalesMode ? <ShoppingCart className="w-5 h-5 mr-3" /> : <PackagePlus className="w-5 h-5 mr-3" />)}
                            {isSalesMode ? `Adicionar ${initialProducts.length} Itens ao Orçamento` : `Adicionar ${initialProducts.length} Itens ao Estoque`}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
/**
 * Enhanced Input for Pix Price with local state for better UX
 */
function PixPriceInput({ value, finalCostBRL, settings, rates, marginType, applyNfe, onUpdate }) {
    const [localValue, setLocalValue] = useState((value || 0).toFixed(2));

    useEffect(() => {
        setLocalValue((value || 0).toFixed(2));
    }, [value]);

    const handleChange = (e) => {
        setLocalValue(e.target.value);
    };

    const handleBlur = () => {
        const newPrice = parseFloat(localValue) || 0;
        if (newPrice > 0 && finalCostBRL > 0) {
            // Simplest logic: Margin = Price - Cost
            const marginAmount = newPrice - finalCostBRL;
            const newMargin = (marginAmount / finalCostBRL) * 100;

            if (marginType === 'fixed') {
                onUpdate({
                    marginValue: parseFloat(marginAmount.toFixed(2)),
                    marginType: 'fixed'
                });
            } else {
                onUpdate({
                    marginValue: parseFloat(newMargin.toFixed(2)),
                    marginType: 'percent'
                });
            }
        }
    };

    return (
        <input
            type="number"
            step="0.01"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleBlur();
            }}
            className="w-32 text-right font-black text-xl bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none text-slate-900 placeholder-slate-300 transition-colors bg-white/50"
        />
    );
}

// Bottom of file cleaned up. Helper components moved to top.
