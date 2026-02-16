import { useState, useMemo, useEffect } from 'react';
import { Upload, UploadCloud, FileText, Check, AlertCircle, RefreshCw, Calculator, DollarSign, Percent, ArrowRight, Save, LayoutGrid, List, Filter, Box, Copy, Printer, MessageSquare, Wand2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StockService } from '../../services/stockService';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useToast } from '../ui/Toast';
import { auth } from '../../lib/firebase';

// Set worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export function MassPricing({ user, userProfile, settings, onAddToProposal, isSalesMode }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [currency, setCurrency] = useState('BRL');
    const [exchangeRate, setExchangeRate] = useState('5.50');
    const [defaultCondition, setDefaultCondition] = useState('lacrado');

    // Default to Gemini 2.5 Flash-Lite per user request (Backend Configured)
    const [model] = useState('gemini-2.5-flash-lite');

    // API Key (Backend Configured)
    const [apiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY);

    // Images for API
    const [apiImages, setApiImages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Progress State
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [currentStatus, setCurrentStatus] = useState('');

    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // --- HELPER: Save Key (Kept for backend logic if needed, but unused in UI) ---
    const handleKeyChange = (e) => {
        // No-op or log warning in backend mode
        console.warn("API Key is backend managed.");
    }

    // --- HELPER: File to Base64 for Gemini ---
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove data:image/jpeg;base64, prefix for API
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    // --- HELPER: PDF to Images (Gemini prefers images over raw PDF bytes for inline) ---
    const pdfToImages = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const images = [];

        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 2.0 }); // Good quality for OCR
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            images.push(base64);
        }
        return images;
    };

    const processFiles = async (files) => {
        setIsProcessing(true);
        // setApiImages([]); // REMOVED: Do not clear previous images to allow appending
        setStage('preparing');
        setCurrentStatus('Preparando arquivos para a IA...');
        const collectedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCurrentStatus(`Processando arquivo ${i + 1}/${files.length}...`);

            if (file.type.startsWith('image/')) {
                const b64 = await fileToBase64(file);
                collectedImages.push(b64);
            } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                setCurrentStatus(`Convertendo PDF ${i + 1}/${files.length} em imagens...`);
                const pdfImages = await pdfToImages(file);
                collectedImages.push(...pdfImages);
            }
        }

        setApiImages(prev => [...prev, ...collectedImages]); // Append new images
        setIsProcessing(false);
        setCurrentStatus('');
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input to allow submitting same file again if needed
        }
    };

    // --- PASTE SUPPORT ---
    useEffect(() => {
        const handlePaste = (e) => {
            if (step !== 1 || isProcessing) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    files.push(items[i].getAsFile());
                }
            }
            if (files.length > 0) processFiles(files);
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [step, isProcessing]);

    const handleExtract = async () => {
        if (apiImages.length === 0) return;
        if (!apiKey) { alert("Chave de API não configurada no sistema. Contate o suporte."); return; }

        setIsProcessing(true);
        setStage('ai_analyzing');
        setProgress(30);
        setCurrentStatus(`Enviando para Inteligência Artificial (Backend)...`);

        try {
            // Construct Payload
            const parts = apiImages.map(img => ({
                inline_data: { mime_type: "image/jpeg", data: img }
            }));

            // Smart Prompt
            const prompt = `
            Analyze these invoice images and extract product information into a clean JSON array.
            
            Rules:
            1. Extract ALL individual line items.
            2. For each item, return an object with:
               - "name": Full product name (clean up system codes).
               - "cost": Unit cost (numeric).
               - "quantity": Quantity (numeric).
               - "color": Extract color if visible (e.g. 'Deep Purple', 'Preto', 'Azul', 'Titanium').
               - "storage": Extract capacity if visible (e.g. '128GB', '256GB', '1TB').
               - "imei": Extract IMEI or Serial Number if visible (usually 15 digits or alphanumeric serial).
               - "condition": infer from text ('lacrado', 'seminovo', 'vitrine'). Default to 'lacrado' if new/unspecified.
               - "category": infer type (iphone, samsung, xiaomi, motorola, accessories, perfumes, electronics, jbl, fone).
            3. IGNORE summary lines.
            4. PAY ATTENTION to inverted color lines.
            5. Return ONLY the JSON Array.
            `;

            parts.push({ text: prompt });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }]
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Sem resposta da IA");

            // Clean JSON (remove markdown if Gemini adds it)
            const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(jsonString);

            // Normalize for App
            const normalizedItems = parsedData.map((p, idx) => {
                const lowerName = (p.name || '').toLowerCase();
                const lowerCat = (p.category || '').toLowerCase();

                // 1. Smart Category Matching

                // Helper to find category ID by name
                const findCat = (token) => settings?.categories?.find(c => c.name.toLowerCase().includes(token))?.id;

                let categoryId = null;

                // Priority 1: Explicit Accessory Keywords (Overrules Brand)
                if (lowerName.match(/fone|buds|airdots|earbuds|headphone|watch|band|smartwatch|pulseira|capa|case|pelicula|vidro|carregador|cabo|fonte|suporte|microfone|lark|lapela/)) {
                    categoryId = findCat('acess');
                }

                // Priority 2: Explicit Perfume Keywords
                else if (lowerName.includes('perfume') || lowerCat.includes('perfume')) {
                    categoryId = findCat('perfume');
                }

                // Priority 3: Phone Brands (Only if not caught above)
                else if (lowerName.includes('iphone') || lowerCat.includes('iphone')) {
                    categoryId = findCat('iphone');
                }
                else if (lowerName.match(/samsung|galaxy/)) {
                    categoryId = findCat('samsung');
                }
                else if (lowerName.match(/motorola|moto/)) {
                    categoryId = findCat('motorola');
                }
                // Xiaomi Rule: Only Phones/Tablets (Redmi, Poco, Mi, Pad) - Accessories already caught in Priority 1
                else if (lowerName.match(/xiaomi|redmi|poco|pad|mi /)) {
                    categoryId = findCat('xiaomi');
                }

                // Fallback: If AI returned a category name that matches a system category
                if (!categoryId) {
                    categoryId = settings?.categories?.find(c => lowerCat.includes(c.name.toLowerCase()))?.id;
                }

                // Final Fallback
                if (!categoryId) categoryId = settings?.categories?.[0]?.id;

                // 3. Inherit Settings from Category
                const matchedCategory = settings?.categories?.find(c => c.id === categoryId);
                const isPhone = matchedCategory?.name?.toLowerCase().match(/iphone|xiaomi|samsung|motorola|celular|smartphone/);

                // Financial Defaults
                const defaultMarginType = matchedCategory?.marginType || 'percent'; // respect 'fixed'
                const defaultMarginValue = parseFloat(matchedCategory?.margin || 20);
                const requiresNfe = matchedCategory?.requiresNotaFiscal || false;

                return {
                    id: Date.now() + idx,
                    name: p.color ? `${p.name} - ${p.color}` : p.name,
                    cost: parseFloat(p.cost) || 0,
                    quantity: parseInt(p.quantity) || 1,
                    category: categoryId,
                    condition: isPhone ? (p.condition || defaultCondition) : 'novo',
                    marginType: defaultMarginType,
                    marginValue: defaultMarginValue,
                    applyNfe: requiresNfe,
                    storage: p.storage || '',
                    imei: p.imei || '',
                    color: p.color || ''
                };
            });

            setItems(normalizedItems);
            setSelectedItems(new Set(normalizedItems.map(i => i.id)));
            setStep(2);

        } catch (error) {
            console.error("Gemini Error:", error);
            alert(`Erro na Extração: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setStage('');
            setCurrentStatus('');
            setProgress(0);
        }
    };

    const updateItem = (id, field, value) => {
        setItems(p => p.map(i => {
            if (i.id !== id) return i;

            const updated = { ...i, [field]: value };

            // Special handling when Category changes
            if (field === 'category') {
                const newCat = settings?.categories?.find(c => c.id === value);
                if (newCat) {
                    // 1. Auto-update NFE based on category settings
                    updated.applyNfe = newCat.requiresNotaFiscal || false;

                    // 2. Auto-update Margin Settings (Critical for Perfume R$ vs %)
                    updated.marginType = newCat.marginType || 'percent';
                    updated.marginValue = parseFloat(newCat.margin || 20);

                    // 3. Auto-update Condition based on category type
                    const isPhone = newCat.name.toLowerCase().match(/iphone|xiaomi|samsung|motorola|celular|smartphone/);
                    if (!isPhone) {
                        updated.condition = 'novo'; // Reset to 'novo' for non-phones
                    } else if (updated.condition === 'novo') {
                        updated.condition = 'lacrado'; // Default to 'lacrado' if switching back to phone
                    }
                }
            }
            return updated;
        }));
    };
    const removeItem = (id) => { setItems(p => p.filter(i => i.id !== id)); setSelectedItems(prev => { const n = new Set(prev); n.delete(id); return n; }); };
    const toggleSelect = (id) => setSelectedItems(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleSelectAll = () => setSelectedItems(selectedItems.size === items.length ? new Set() : new Set(items.map(i => i.id)));

    const calculatedData = useMemo(() => {
        return items.map(item => {
            const cat = settings?.categories?.find(c => c.id === item.category);
            // Fix: Ensure category margin is parsed as float, as it may be string in settings
            const defaultMargin = parseFloat(cat?.margin ?? 20);
            const itemMargin = parseFloat(item.marginValue);
            // Use item margin if it's a valid number (even 0), otherwise use default
            const marginValue = !isNaN(itemMargin) ? itemMargin : defaultMargin;
            const mType = item.marginType || cat?.marginType || 'percent';
            const gatewayId = cat?.gatewayId || settings?.financial?.activeGatewayId;
            const gw = settings?.financial?.gateways?.find(g => g.id === gatewayId) || settings?.financial?.gateways?.[0];
            const rates = gw?.rates || {};
            const nfRate = (item.applyNfe && cat?.requiresNotaFiscal) ? (parseFloat(settings?.financial?.notaFiscalRate) || 0) : 0;
            const pixRate = parseFloat(rates.pix) || 0;
            const debitRate = parseFloat(rates.debit) || 0;
            // Helper: Robust money parsing handling BR and US formats
            const parseMoney = (value) => {
                if (typeof value === 'number') return value;
                if (!value) return 0;
                let str = value.toString().trim();
                if (str.includes(',')) {
                    // Assume BR format (1.000,00) -> remove dots, replace comma
                    str = str.replace(/\./g, '').replace(',', '.');
                }
                // Else assume standard JS/US format (1000.00) or plain integer
                return parseFloat(str) || 0;
            };

            const itemCost = parseMoney(item.cost);
            const exRate = parseMoney(exchangeRate);

            // 1. Calculate Base Cost in BRL
            const baseCost = currency === 'USD' ? (itemCost * (exRate || 1)) : itemCost;

            // 2. Calculate Final Selling Price
            // We use the same engine as SmartPricing:
            // Fixed: Price = (Cost + Margin) / (1 - Tax)
            // Percent: Price = Cost / (1 - Tax - Margin%) ... (Gross Margin)
            // Safety: If Gross Margin formula breaks (negative divisor), we fallback to Markup logic.

            const taxRate = (pixRate + nfRate) / 100;
            let sellingPrice = 0;

            if (mType === 'fixed') {
                const targetNet = baseCost + marginValue;
                const divisor = 1 - taxRate;
                sellingPrice = divisor > 0 ? targetNet / divisor : targetNet;
            } else {
                const marginRate = marginValue / 100;

                // UNIFIED MARKUP LOGIC:
                // Always use Markup: Target = Cost * (1 + Margin)
                // This ensures consistency. 50% margin means Profit = 50% of Cost.
                // Price = (Cost * (1+Margin)) / (1 - Tax)

                const targetNet = baseCost * (1 + marginRate);
                const taxDivisor = 1 - taxRate;
                sellingPrice = taxDivisor > 0 ? targetNet / taxDivisor : targetNet;
            }

            // Generate Full Price Table (Pix, Debit, Credit 1x-Max)
            const max = rates.maxInstallments || 12;
            const priceList = [];

            // "sellingPrice" calculated above ALREADY includes the Pix Rate and NF Rate markup (via taxDivisor).
            // So "sellingPrice" IS the final Pix Price the customer pays.
            // We need to find the "Base Amount" (Cost + Profit) to calculate other methods.
            const totalLoadPix = (pixRate + nfRate) / 100;
            const baseReceiveAmount = sellingPrice * (1 - totalLoadPix);

            const getPriceForRate = (targetRate) => {
                const totalLoad = ((targetRate || 0) + nfRate) / 100;
                return baseReceiveAmount / (1 - totalLoad);
            };

            // Pix
            // We use sellingPrice directly to avoid rounding errors, but mathematically it equals getPriceForRate(pixRate)
            const finalPixPrice = sellingPrice;
            const pixCardFee = finalPixPrice * (pixRate / 100);
            const pixNfFee = item.applyNfe && cat?.requiresNotaFiscal ? finalPixPrice * (nfRate / 100) : 0;

            priceList.push({
                label: 'Pix / Dinheiro',
                value: finalPixPrice,
                parcela: finalPixPrice,
                cardFee: pixCardFee,
                nfFee: pixNfFee
            });

            // Debit
            const finalDebitPrice = getPriceForRate(debitRate);
            const debitCardFee = finalDebitPrice * (debitRate / 100);
            const debitNfFee = item.applyNfe && cat?.requiresNotaFiscal ? finalDebitPrice * (nfRate / 100) : 0;

            priceList.push({
                label: 'Débito',
                value: finalDebitPrice,
                parcela: finalDebitPrice,
                cardFee: debitCardFee,
                nfFee: debitNfFee
            });

            // Credit Interpolation
            const rate1x = parseFloat(rates.credit1x) || 0;
            const rate12x = parseFloat(rates.credit12x || rates[`credit${max}x`]) || 0;
            const rateStep = max > 1 ? (rate12x - rate1x) / (max - 1) : 0;

            for (let i = 1; i <= max; i++) {
                let r = 0;
                if (i === 1) r = rate1x;
                else if (rates[`credit${i}x`]) r = parseFloat(rates[`credit${i}x`]);
                else r = rate1x + (rateStep * (i - 1));

                if (r > 99) r = 99;

                const val = getPriceForRate(r);
                const cFee = val * (r / 100);
                const nFee = item.applyNfe && cat?.requiresNotaFiscal ? val * (nfRate / 100) : 0;

                priceList.push({
                    label: `${i}x Crédito`,
                    value: val,
                    parcela: val / i,
                    cardFee: cFee,
                    nfFee: nFee
                });
            }

            return {
                ...item,
                baseCost,
                prices: {
                    pix: sellingPrice,
                    debit: finalDebitPrice,
                    credit12x: priceList.find(p => p.label.includes(`${max}x`))?.value || 0
                },
                fullPriceTable: priceList,
                profit: sellingPrice - (sellingPrice * ((pixRate + nfRate) / 100)) - baseCost,
                actualMargin: mType === 'percent' ? marginValue : (sellingPrice > 0 ? ((sellingPrice - (sellingPrice * ((pixRate + nfRate) / 100)) - baseCost) / sellingPrice) * 100 : 0),
            };
        });
    }, [items, settings, currency, exchangeRate]);

    const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const handleCopyList = () => {
        const selected = calculatedData.filter(i => selectedItems.has(i.id));

        const text = selected.map(i => {
            // Logic to construct full name (Name + Color) exactly like Stock Add
            let finalName = i.name;
            if (i.color && !finalName.toLowerCase().includes(i.color.toLowerCase())) {
                finalName = `${finalName} - ${i.color}`;
            }

            return `*${finalName}*\nQtd: ${i.quantity}\nCusto: ${formatBRL(i.baseCost)}\nÀ vista: ${formatBRL(i.prices.pix)}\n12x de ${formatBRL(i.prices.credit12x / 12)}`;
        }).join('\n\n');

        navigator.clipboard.writeText(text);
        showToast(`${selected.length} itens copiados!`, 'success');
    };

    const handleAddToStock = async () => {
        const selected = calculatedData.filter(i => selectedItems.has(i.id));
        if (selected.length === 0) return alert('Selecione itens para adicionar ao estoque.');

        // Allow fallback to user.uid if organizationId is missing (legacy support)
        const orgId = userProfile?.organizationId || user?.uid;
        // if (!orgId) return alert("Erro de identificação da loja. Atualize seu perfil.");

        setIsProcessing(true);
        try {
            let addedCount = 0;
            for (const item of selected) {
                // Final Name Construction: "Name - Color" (if color exists and isn't already in name)
                let finalName = item.name;
                if (item.color && !finalName.toLowerCase().includes(item.color.toLowerCase())) {
                    finalName = `${finalName} - ${item.color}`;
                }

                // If input currency was USD, 'baseCost' has the BRL converted value. 
                // We should save the BRL cost to stock so reports work in BRL.
                // calculatedData items have 'baseCost' computed.
                const costToSave = item.baseCost || item.cost;

                await StockService.addItem(orgId, user.uid, {
                    name: finalName,
                    cost: costToSave,
                    price: item.prices.pix, // Suggested Sale Price (Pix)
                    quantity: parseInt(item.quantity) || 1,
                    category: item.category,
                    condition: item.condition,
                    minStock: 1,
                    storage: item.storage,
                    color: item.color,
                    imei: item.imei,
                    description: `Importado via OCR em ${new Date().toLocaleDateString()}`,
                });
                addedCount++;
            }
            showToast(`${addedCount} produtos adicionados ao estoque!`, "success");
            // Optional: Remove added items from list to prevent duplicate add?
            setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
            setSelectedItems(new Set());
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar no estoque.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // State for viewing full table
    const [viewingTableId, setViewingTableId] = useState(null);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Calculadora IA (Gemini)</h2>
                    <p className="text-slate-500 font-medium">Extração Visual Avançada com Google Gemini Flash-Lite.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", step === s ? "bg-white shadow-lg text-indigo-600 ring-1 ring-slate-200" : "text-slate-400", step > s ? "text-emerald-600" : "")}>{s === 1 && "1. Upload"}{s === 2 && `2. Check (${items.length})`}{s === 3 && `3. Done (${selectedItems.size})`}{step > s && <Check className="w-4 h-4" />}</div>
                    ))}
                </div>
            </div>
            {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <Card title="Configuração">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Moeda de Origem</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setCurrency('BRL')} className={cn("p-3 rounded-xl border-2 font-bold text-sm transition-all", currency === 'BRL' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400")}>R$ Real</button>
                                        <button onClick={() => setCurrency('USD')} className={cn("p-3 rounded-xl border-2 font-bold text-sm transition-all", currency === 'USD' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400")}>$ Dólar</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Condição Padrão</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setDefaultCondition('lacrado')} className={cn("p-3 rounded-xl border-2 font-bold text-sm transition-all", defaultCondition === 'lacrado' ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-slate-50 text-slate-400")}>Lacrado</button>
                                        <button onClick={() => setDefaultCondition('vitrine')} className={cn("p-3 rounded-xl border-2 font-bold text-sm transition-all", defaultCondition === 'vitrine' ? "border-amber-600 bg-amber-50 text-amber-700" : "border-slate-100 bg-slate-50 text-slate-400")}>Seminovo</button>
                                    </div>
                                </div>
                                {currency === 'USD' && <InputGroup label="Cotação do Dólar" icon={DollarSign} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} prefix="R$" />}
                            </div>
                        </Card>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10">
                            <div className="h-64 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-all cursor-pointer relative overflow-hidden" onClick={() => !isProcessing && document.getElementById('mass-upload-input').click()}>
                                <input type="file" id="mass-upload-input" multiple accept="image/*, .txt, .pdf, .csv" className="hidden" onChange={handleFileChange} />
                                {isProcessing ? (
                                    <div className="w-full max-w-md space-y-4 relative z-10 text-center">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"><span>{stage === 'preparing' ? 'Preparando...' : 'Analisando...'}</span><span>{stage === 'ai_analyzing' ? 'IA' : Math.round((apiImages.length / (apiImages.length || 1)) * 100)}%</span></div>
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 mb-2"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300 ease-out" style={{ width: `${isProcessing ? 100 : 0}%` }} /></div>
                                        <div className="text-[10px] font-mono text-slate-400 h-4 truncate animate-pulse">{currentStatus}</div>
                                    </div>
                                ) : (
                                    <><UploadCloud className="w-10 h-10 text-indigo-600 mb-4" /><h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Clique para enviar faturas (PDF/IMG)</h3><p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Suporta múltiplas páginas. Powered by <b>Gemini {model.replace('gemini-', '').replace('-flash', ' Flash').toUpperCase()}</b>.</p></>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end gap-4 items-center">
                                <div className="text-xs text-slate-400 font-medium">{apiImages.length > 0 ? `${apiImages.length} páginas prontas` : 'Aguardando'}</div>
                                {apiImages.length > 0 && !isProcessing && (
                                    <button onClick={() => setApiImages([])} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">
                                        Limpar
                                    </button>
                                )}
                                <button onClick={handleExtract} disabled={apiImages.length === 0 || isProcessing || !apiKey} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><Wand2 className="w-4 h-4" /> Extrair com IA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {step === 2 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10 animate-in slide-in-from-right-4">
                    <div className="flex items-center justify-between mb-8">
                        <div><h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Revisão IA</h3><p className="text-sm text-slate-500">Resultados da Análise Gemini ({items.length} itens).</p></div>
                        <button onClick={() => setStep(3)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg dark:shadow-slate-900/50 shadow-emerald-100"><RefreshCw className="w-4 h-4" /> Confirmar Preços</button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="p-4 pl-6">Produto</th><th className="p-4">Categoria</th><th className="p-4">Condição</th><th className="p-4">Custo</th><th className="p-4 text-center">NFE</th><th className="p-4 w-16 text-center"></th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(item => (
                                    <tr key={item.id} className={cn("group hover:bg-indigo-50/20 transition-colors")}>
                                        <td className="p-4 pl-6"><input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white dark:bg-slate-900 rounded-none px-0 py-1 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" /></td>
                                        <td className="p-4"><select value={item.category || ''} onChange={e => updateItem(item.id, 'category', e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-32"><option value="">Manual...</option>{settings?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                                        <td className="p-4">
                                            {(() => {
                                                const catName = settings?.categories?.find(c => c.id === item.category)?.name?.toLowerCase() || '';
                                                const isPhone = catName.match(/iphone|xiaomi|samsung|motorola|celular|smartphone/);

                                                if (!isPhone) {
                                                    return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">NOVO</span>;
                                                }

                                                return (
                                                    <select
                                                        value={item.condition || 'lacrado'}
                                                        onChange={e => updateItem(item.id, 'condition', e.target.value)}
                                                        className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none border-none cursor-pointer", item.condition === 'lacrado' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}
                                                    >
                                                        <option value="lacrado">Lacrado</option>
                                                        <option value="vitrine">Seminovo</option>
                                                        <option value="novo">Novo</option>
                                                    </select>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4">
                                            <input type="number" value={item.cost} onChange={e => updateItem(item.id, 'cost', e.target.value)} className="w-20 bg-transparent border-b border-transparent focus:border-indigo-500 text-sm font-bold text-slate-700 dark:text-slate-200 text-right outline-none" />
                                            {currency === 'USD' && (
                                                <div className="text-[10px] text-slate-400 font-medium text-right mt-1">
                                                    ≈ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(item.cost?.toString().replace(',', '.') || 0) * parseFloat(exchangeRate?.toString().replace(',', '.') || 1))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center"><div onClick={() => updateItem(item.id, 'applyNfe', !item.applyNfe)} className={cn("w-8 h-5 rounded-full p-0.5 transition-colors cursor-pointer mx-auto", item.applyNfe ? "bg-emerald-500" : "bg-slate-200")}><div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform transform", item.applyNfe ? "translate-x-3" : "translate-x-0")} /></div></td>
                                        <td className="p-4 text-center"><button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                            <ActionButton icon={Box} label="Adicionar ao Estoque" color="bg-emerald-500" onClick={handleAddToStock} loading={isProcessing} />
                            <ActionButton icon={Copy} label="Copiar Lista" color="bg-emerald-600" onClick={handleCopyList} />
                            <ActionButton
                                icon={MessageSquare}
                                label="WhatsApp"
                                color="bg-green-500 hover:bg-green-600"
                                onClick={() => {
                                    const selected = calculatedData.filter(i => selectedItems.has(i.id));
                                    if (selected.length === 0) return alert('Selecione itens para compartilhar.');

                                    let text = `🚀 *OFERTAS ESPECIAIS*\n\n👇 *Confira os modelos selecionados:*`;

                                    selected.forEach((i, idx) => {
                                        const isSealed = i.condition === 'lacrado' || i.condition === 'novo';

                                        text += `\n\n${idx + 1}️⃣ *${i.name}*`;
                                        if (i.color || i.storage) text += `\n   ✨ ${[i.color, i.storage].filter(Boolean).join(' • ')}`;
                                        if (!isSealed) text += `\n   💎 ${i.condition}`;
                                        text += `\n   💰 *${formatBRL(i.prices.pix)}* (Pix)`;
                                        text += `\n   💳 12x de ${formatBRL(i.prices.credit12x / 12)}`;
                                    });

                                    text += `\n\n📍 *Loja Física / Entrega Rápida*`;
                                    text += `\n📲 *Consulte disponibilidade!*`;

                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                            />
                            <ActionButton
                                icon={Printer}
                                label="PDF"
                                color="bg-white border text-slate-600 hover:bg-slate-50"
                                onClick={() => {
                                    const selected = calculatedData.filter(i => selectedItems.has(i.id));
                                    if (selected.length === 0) return alert('Selecione itens para gerar PDF.');

                                    const printWindow = window.open('', '', 'width=800,height=900');
                                    printWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>Tabela de Preços</title>
                                                <style>
                                                    body { font-family: sans-serif; padding: 20px; }
                                                    table { w-full; border-collapse: collapse; margin-top: 20px; width: 100%; }
                                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                                                    th { background-color: #f2f2f2; }
                                                </style>
                                            </head>
                                            <body>
                                                <h2>Tabela de Preços</h2>
                                                <table>
                                                    <thead><tr><th>Produto</th><th>À Vista</th><th>12x Crédito</th></tr></thead>
                                                    <tbody>
                                                        ${selected.map(i => `
                                                            <tr>
                                                                <td>${i.name} (${i.condition})</td>
                                                                <td>${formatBRL(i.prices.pix)}</td>
                                                                <td>12x de ${formatBRL(i.prices.credit12x / 12)} = ${formatBRL(i.prices.credit12x)}</td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                                <script>window.onload = () => window.print();</script>
                                            </body>
                                        </html>
                                    `);
                                    printWindow.document.close();
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}><div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", selectedItems.size === items.length && items.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}>{selectedItems.size === items.length && items.length > 0 && <Check className="w-3.5 h-3.5" strokeWidth={3} />}</div><span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Selecionar Todos</span></div>
                    </div>
                    <div className="space-y-4">
                        {calculatedData.map(item => (
                            <div key={item.id} className={cn("bg-white rounded-[1.5rem] p-6 border transition-all", selectedItems.has(item.id) ? "border-emerald-500 ring-1 ring-emerald-500 shadow-md" : "border-slate-200 hover:border-slate-300")}>
                                <div className="flex flex-col md:flex-row gap-6 mb-6">
                                    {/* Selection & Name/Color Refinement */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div onClick={() => toggleSelect(item.id)} className={cn("mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all", selectedItems.has(item.id) ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white hover:border-emerald-400")}>{selectedItems.has(item.id) && <Check className="w-4 h-4" strokeWidth={3} />}</div>
                                        <div className="flex-1 space-y-3">
                                            {/* Name Edit */}
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Produto</label>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                    className="w-full font-bold text-slate-900 dark:text-white text-lg bg-transparent border-b border-dashed border-slate-300 dark:border-white/20 focus:border-emerald-500 focus:ring-0 p-0 pb-1 transition-colors"
                                                    placeholder="Nome do Produto"
                                                />
                                            </div>

                                            {/* Quantity & Color & Storage & IMEI Row */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-200 text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cor</label>
                                                    <input
                                                        type="text"
                                                        value={item.color || ''}
                                                        onChange={(e) => updateItem(item.id, 'color', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200"
                                                        placeholder="Ex: Azul"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Armaz.</label>
                                                    <input
                                                        type="text"
                                                        value={item.storage || ''}
                                                        onChange={(e) => updateItem(item.id, 'storage', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200"
                                                        placeholder="Ex: 128GB"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">IMEI</label>
                                                    <input
                                                        type="text"
                                                        value={item.imei || ''}
                                                        onChange={(e) => updateItem(item.id, 'imei', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 text-sm font-mono text-slate-700 dark:text-slate-200"
                                                        placeholder="Serial/IMEI"
                                                    />
                                                </div>
                                            </div>

                                            {/* Tags (Condition + Profit) */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{item.condition}</span>
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Lucro Estimado: {formatBRL(item.profit)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* NFE Toggle */}
                                    <div className="flex flex-col items-end gap-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">NFE?</label>
                                        <div onClick={() => updateItem(item.id, 'applyNfe', !item.applyNfe)} className={cn("w-10 h-6 rounded-full p-1 transition-colors cursor-pointer", item.applyNfe ? "bg-emerald-500" : "bg-slate-200")}><div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform transform", item.applyNfe ? "translate-x-4" : "translate-x-0")} /></div>
                                    </div>
                                </div>

                                {/* Financials (Cost, Margin, Prices) - Unchanged layout essentially, just wrapped */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 border-t border-slate-100">
                                    <div className="md:col-span-4 bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-100">
                                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Margem</h5>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Custo</label>
                                                <input type="number" value={item.cost} onChange={e => updateItem(item.id, 'cost', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {item.marginType === 'fixed' || (!item.marginType && settings?.categories?.find(c => c.id === item.category)?.marginType === 'fixed') ? 'Margem (R$)' : 'Margem (%)'}
                                                    </label>
                                                </div>
                                                <input type="number" value={item.marginValue} placeholder={item.actualMargin} onChange={e => updateItem(item.id, 'marginValue', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-8 flex flex-col justify-between">
                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 overflow-hidden mb-2">
                                            <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><div>Método</div><div className="text-right">Parcela</div><div className="text-right">Total</div></div>
                                            <div className="divide-y divide-slate-50 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                <PriceRow label="PIX" price={item.prices.pix} bold />
                                                <PriceRow label="Débito" price={item.prices.debit} />
                                                <PriceRow label="Crédito 12x" price={item.prices.credit12x} installments={12} highlight />
                                            </div>
                                        </div>
                                        <button onClick={() => setViewingTableId(item.id)} className="w-full py-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-indigo-100 transition-colors">Ver Tabela Completa</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Full Table */}
            {viewingTableId && (() => {
                const product = calculatedData.find(p => p.id === viewingTableId);
                if (!product) return null;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl dark:shadow-slate-900/50 p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
                            <button onClick={() => setViewingTableId(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><XCircle className="w-5 h-5" /></button>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{product.name}</h3>
                            <p className="text-xs text-slate-500 font-medium mb-6">Tabela completa de preços e parcelamento.</p>

                            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                                        <tr className="text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                            <th className="p-3 text-left">Método</th>
                                            <th className="p-3 text-right">Parcela</th>
                                            <th className="p-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {product.fullPriceTable.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                onClick={() => {
                                                    const txt = `${row.label} de ${formatBRL(row.parcela)} = ${formatBRL(row.value)}`;
                                                    navigator.clipboard.writeText(txt);
                                                    showToast("Copiado!", "success");
                                                }}
                                                className="hover:bg-indigo-50 transition-colors cursor-pointer active:bg-indigo-100"
                                            >
                                                <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{row.label}</td>
                                                <td className="p-3 text-right font-medium text-slate-500">{row.label.includes('x') ? formatBRL(row.parcela) : '-'}</td>
                                                <td className="p-3 text-right font-bold text-indigo-600">{formatBRL(row.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        const isSealed = (product.condition === 'lacrado' || product.condition === 'novo');

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
                                            return item ? formatBRL(item.parcela) : 'N/A';
                                        };

                                        message = message
                                            .replace(/{modelo}/g, product.name)
                                            .replace(/{capacidade}/g, "Consultar")
                                            .replace(/{cor}/g, product.color || "Consultar")
                                            .replace(/{condicao}/g, isSealed ? "Novo (Lacrado)" : product.condition)
                                            .replace(/{garantia}/g, isSealed ? "1 Ano Apple" : "3 Meses")
                                            .replace(/{nota_fiscal}/g, product.applyNfe ? "✅ Com Nota Fiscal" : "")
                                            .replace(/{pix}/g, formatBRL(product.prices.pix))
                                            .replace(/{parcela_10x}/g, getVal('10x'))
                                            .replace(/{parcela_12x}/g, getVal('12x'))
                                            .replace(/{parcela_18x}/g, getVal('18x'));

                                        navigator.clipboard.writeText(message);
                                        showToast("Mensagem Copiada!", "success");
                                    }}
                                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-600 shadow-lg dark:shadow-slate-900/50 shadow-emerald-200 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" /> Copiar Zap
                                </button>
                                <button
                                    onClick={() => {
                                        onAddToProposal({
                                            name: product.name,
                                            details: `${product.condition} | Lucro: ${formatBRL(product.profit)}`,
                                            pixPrice: product.prices.pix,
                                            installmentPrice: product.prices.credit12x / 12
                                        });
                                        setViewingTableId(null);
                                    }}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-500 shadow-lg dark:shadow-slate-900/50 shadow-emerald-200 flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-4 h-4" /> Add Orçamento
                                </button>
                                <button
                                    onClick={async () => {
                                        const user = auth.currentUser;
                                        if (user) {
                                            try {
                                                await StockService.addItem(user.uid, {
                                                    name: product.name,
                                                    category: product.category,
                                                    cost: product.cost,
                                                    quantity: product.quantity || 1,
                                                    condition: product.condition || 'lacrado',
                                                    minQuantity: 5,
                                                    details: product.name // Use name as details fallback
                                                });
                                                showToast("Adicionado ao Estoque!", "success");
                                                setViewingTableId(null);
                                            } catch (e) {
                                                console.error(e);
                                                showToast("Erro ao adicionar.", "error");
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Package className="w-4 h-4" /> Add Estoque
                                </button>
                                <button onClick={() => setViewingTableId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10 h-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><div className="w-1 h-4 bg-indigo-500 rounded-full" />{title}</h3>{children}
        </div>
    );
}

function InputGroup({ label, icon: Icon, prefix, value, onChange, placeholder, type = 'text' }) {
    return (
        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{label}</label><div className="relative group"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">{prefix ? <span className="font-bold text-xs">{prefix}</span> : <Icon className="w-4 h-4" />}</div><input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e)} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-900 transition-all shadow-sm dark:shadow-slate-900/50" /></div></div>
    );
}

function ActionButton({ icon: Icon, label, color, onClick }) {
    return <button onClick={onClick} className={cn("px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 whitespace-nowrap shadow-sm text-white hover:opacity-90 transition-all", color)}><Icon className="w-3.5 h-3.5" /> {label}</button>;
}

function PriceRow({ label, price, installments, bold, highlight }) {
    const format = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    return <div className={cn("grid grid-cols-3 p-3 hover:bg-slate-50 transition-colors", highlight ? "bg-emerald-50/50" : "")}><div className={cn(bold ? "font-black text-slate-800" : "")}>{label}</div><div className="text-right">{installments > 1 ? format(price / installments) : '-'}</div><div className={cn("text-right font-bold", bold ? "text-emerald-600 text-sm" : "text-slate-800")}>{format(price)}</div></div>;
}
