import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Tags, Filter, CheckSquare, Search, Copy, Download,
    Smartphone, Plus, Minus, Tag, Phone
} from 'lucide-react';
import { StockService } from '../../services/stockService';
import { useToast } from '../ui/Toast';
import { cn, formatCurrency, parsePrice } from '../../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function PriceListGenerator({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    const orgId = userProfile?.organizationId || user?.uid;

    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Filters from Params
    const initialQuery = searchParams.get('q') || '';
    const initialCondition = searchParams.get('cond') || 'Todos';

    // State: Configuration / Filters
    const [selectedSegment, setSelectedSegment] = useState(settings?.categories?.[0]?.id || 'todos');
    const [selectedBrands, setSelectedBrands] = useState([]); // Empty = All
    const [selectedCondition, setSelectedCondition] = useState(initialCondition); // Todos, Lacrado, Seminovo, Usado
    const [searchTerm, setSearchTerm] = useState(initialQuery);

    // Installments Configuration
    // Available numbers 1 to maxInstallments. Will be derived from gateway.
    const [selectedInstallments, setSelectedInstallments] = useState([12, 18]);

    // Text Customization
    const defaultStoreName = settings?.branding?.appName || settings?.company?.name || 'Minha Loja';
    const defaultPhone = settings?.company?.whatsapp || settings?.company?.phone || '(00) 00000-0000';
    
    const [headerText, setHeaderText] = useState(`📱 ${defaultStoreName} — Lista de Preços`);
    const [footerText, setFooterText] = useState(`💬 Chame no WhatsApp: ${defaultPhone}`);
    const [showTotal, setShowTotal] = useState(true);
    const [showCondition, setShowCondition] = useState(true);

    const [previewCopied, setPreviewCopied] = useState(false);

    // 1. Data Loading
    useEffect(() => {
        if (orgId) {
            StockService.getStock(orgId).then(data => {
                const stockItems = data.filter(i => i.type !== 'part');
                setItems(stockItems);
                setIsLoading(false);
            });
        }
    }, [orgId]);

    // 2. Gateway Calculation Logic
    const activeGateway = useMemo(() => {
        const seg = settings?.categories?.find(c => c.id === selectedSegment);
        const gId = seg?.gatewayId || settings?.financial?.activeGatewayId;
        return settings?.financial?.gateways?.find(g => g.id === gId) || settings?.financial?.gateways?.[0] || null;
    }, [settings, selectedSegment]);

    const maxInstallments = activeGateway?.rates?.maxInstallments || 12;

    const getRateForInstallment = (i, rates) => {
        const r1 = parseFloat(rates.credit1x) || 0;
        const r12 = parseFloat(rates.credit12x) || 0;
        if (i === 1) return r1;
        if (i === 12 && r12 > 0) return r12;
        const exact = rates[`credit${i}x`];
        if (exact !== undefined && exact !== null && exact !== '') return parseFloat(exact);
        
        const step = (r12 > r1) ? (r12 - r1)/11 : 0;
        return r1 + (step * (i - 1));
    };

    const nfRate = parseFloat(settings?.financial?.notaFiscalRate) || 0;
    const isNFe = settings?.categories?.find(c => c.id === selectedSegment)?.requiresNotaFiscal;
    const effectiveNfRate = isNFe ? nfRate : 0;

    const calculateInstallment = (pixPrice, installments, rates) => {
        if (!pixPrice) return { total: 0, parcela: 0 };
        const rate = getRateForInstallment(installments, rates);
        const pixRateLoaded = parseFloat(rates.pix || 0);

        // SmartPricing Logic: Target net
        const targetNet = pixPrice * (1 - (pixRateLoaded + effectiveNfRate)/100);
        const divisor = 1 - ((rate + effectiveNfRate)/100);
        
        if (divisor <= 0) return { total: 0, parcela: 0 };
        const total = targetNet / divisor;
        return { total, parcela: total / installments };
    };

    // 3. Filtering
    const availableBrands = useMemo(() => {
        const brands = new Set();
        items.forEach(i => {
            const b = i.name?.split(' ')[0]; // Basic brand extraction
            if (b) brands.add(b.toUpperCase());
        });
        return Array.from(brands).sort();
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Segment filter
            if (selectedSegment !== 'todos') {
                const seg = settings?.categories?.find(c => c.id === selectedSegment);
                // Simple matching based on name/category
                const cName = (item.category || '').toLowerCase();
                if (seg && cName !== seg.name.toLowerCase() && cName !== seg.id.toLowerCase() && !cName.includes(seg.id.toLowerCase())) {
                    // Try to match by product name if category is empty
                    const pName = (item.name || '').toLowerCase();
                    if (seg.id === 'iphone' && !pName.includes('iphone')) return false;
                    if (seg.id === 'xiaomi' && !pName.match(/xiaomi|poco|redmi/)) return false;
                }
            }

            // Brand filter
            if (selectedBrands.length > 0) {
                const b = item.name?.split(' ')[0]?.toUpperCase();
                if (!selectedBrands.includes(b)) return false;
            }

            // Condition filter
            if (selectedCondition !== 'Todos') {
                const c = (item.condition || '').toLowerCase();
                const req = selectedCondition.toLowerCase();
                if (req === 'lacrado' && c !== 'lacrado' && c !== 'novo') return false;
                if (req === 'seminovo' && c !== 'seminovo' && c !== 'vitrine') return false;
                if (req === 'usado' && c !== 'usado') return false;
            }

            // Search filter
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                if (!(item.name || '').toLowerCase().includes(q) && !(item.storage || '').toLowerCase().includes(q)) return false;
            }
            
            // Stock > 0
            if ((item.quantity || 0) <= 0) return false;

            return true;
        }).sort((a, b) => (parsePrice(b.price) || 0) - (parsePrice(a.price) || 0)); // Sort by price desc
    }, [items, selectedSegment, selectedBrands, selectedCondition, searchTerm, settings]);

    // Format helpers
    const fMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // 4. Generate Text Preview
    const previewText = useMemo(() => {
        let text = `${headerText}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

        filteredItems.forEach(item => {
            const price = parsePrice(item.price);
            let conditionStr = '';
            if (showCondition) {
                const c = item.condition || 'Seminovo';
                conditionStr = ` — ${c.charAt(0).toUpperCase() + c.slice(1)}`;
            }

            let nameStr = item.name;
            if (item.storage) nameStr += ` ${item.storage}`;

            text += `📦 *${nameStr}*${conditionStr}\n`;
            text += `✅ À vista: ${fMoney(price)}\n`;

            if (activeGateway?.rates) {
                const sortedInst = [...selectedInstallments].sort((a, b) => a - b);
                sortedInst.forEach(inst => {
                    const res = calculateInstallment(price, inst, activeGateway.rates);
                    if (showTotal) {
                        text += `💳 ${inst}x: ${fMoney(res.parcela)} (total ${fMoney(res.total)})\n`;
                    } else {
                        text += `💳 ${inst}x: ${fMoney(res.parcela)}\n`;
                    }
                });
            }
            text += `\n`;
        });

        text += `━━━━━━━━━━━━━━━━━━━━━\n${footerText}`;
        return text;
    }, [filteredItems, headerText, footerText, showTotal, showCondition, selectedInstallments, activeGateway]);

    const handleCopy = () => {
        navigator.clipboard.writeText(previewText);
        setPreviewCopied(true);
        setTimeout(() => setPreviewCopied(false), 2000);
        showToast("Copiado com sucesso!", "success");
    };

    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF();
            
            // Header
            if (settings?.company?.name) {
                doc.setFontSize(18);
                doc.text(settings.company.name, 14, 20);
            }
            doc.setFontSize(14);
            doc.text("Lista de Preços", 14, 30);
            
            const today = new Date().toLocaleDateString('pt-BR');
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Lista válida em: ${today}`, 14, 38);

            const segName = settings?.categories?.find(c => c.id === selectedSegment)?.name || 'Todos os Produtos';
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Segmento: ${segName}`, 14, 48);

            // Table Data
            const sortedInst = [...selectedInstallments].sort((a, b) => a - b);
            const head = [['Produto', showCondition ? 'Condição' : null, 'À vista', ...sortedInst.map(i => `${i}x`)].filter(Boolean)];
            
            const body = filteredItems.map(item => {
                const price = parsePrice(item.price);
                const nameStr = item.name + (item.storage ? ` ${item.storage}` : '');
                const row = [nameStr];
                
                if (showCondition) {
                    const c = item.condition || 'Seminovo';
                    row.push(c.charAt(0).toUpperCase() + c.slice(1));
                }

                row.push(fMoney(price));

                if (activeGateway?.rates) {
                    sortedInst.forEach(inst => {
                        const res = calculateInstallment(price, inst, activeGateway.rates);
                        row.push(fMoney(res.parcela));
                    });
                }
                return row;
            });

            doc.autoTable({
                startY: 55,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
                styles: { fontSize: 9 },
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(footerText, 14, doc.internal.pageSize.height - 10);
                doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
            }

            // Save
            const safeName = (settings?.company?.name || 'Loja').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const dateStr = today.replace(/\//g, '');
            doc.save(`lista-precos-${safeName}-${dateStr}.pdf`);
            showToast("PDF gerado com sucesso!", "success");

        } catch (e) {
            console.error(e);
            showToast("Erro ao gerar PDF", "error");
        }
    };

    const toggleBrand = (brand) => {
        if (selectedBrands.includes(brand)) {
            setSelectedBrands(selectedBrands.filter(b => b !== brand));
        } else {
            setSelectedBrands([...selectedBrands, brand]);
        }
    };

    const toggleInstallment = (inst) => {
        if (selectedInstallments.includes(inst)) {
            setSelectedInstallments(selectedInstallments.filter(i => i !== inst));
        } else {
            setSelectedInstallments([...selectedInstallments, inst]);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-64"><span className="animate-pulse font-bold text-slate-400 uppercase tracking-widest text-xs">Carregando estoque...</span></div>;
    }

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 mt-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter mb-2 flex items-center gap-3">
                        <Tags className="w-8 h-8 text-indigo-500" />
                        Lista de Preços
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Gere tabelas padronizadas para WhatsApp ou PDF.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Settings (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Filters */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-indigo-500" />
                            1. Filtrar Produtos
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Segmento</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all"
                                    value={selectedSegment}
                                    onChange={(e) => setSelectedSegment(e.target.value)}
                                >
                                    <option value="todos">Todos os Segmentos</option>
                                    {settings?.categories?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Condição</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Todos', 'Lacrado', 'Seminovo'].map(cond => (
                                        <button
                                            key={cond}
                                            onClick={() => setSelectedCondition(cond)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                                                selectedCondition === cond 
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10 hover:border-indigo-300"
                                            )}
                                        >
                                            {cond}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Busca Manual</label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Ex: iPhone 13 128gb"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Installments */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-purple-500" />
                            2. Parcelas
                        </h2>
                        
                        <div className="text-[10px] font-bold text-slate-400 mb-3 border-b border-slate-100 dark:border-white/10 pb-2">
                            Gateway Ativo: {activeGateway?.name || 'Nenhum'}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto no-scrollbar">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 opacity-70 flex items-center justify-center gap-1 cursor-not-allowed">
                                <CheckSquare className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase">À vista</span>
                            </div>
                            
                            {Array.from({ length: maxInstallments }).map((_, i) => {
                                const n = i + 1;
                                if (n === 1) return null; // credit 1x mostly confused with pix à vista
                                const isSelected = selectedInstallments.includes(n);
                                return (
                                    <button
                                        key={n}
                                        onClick={() => toggleInstallment(n)}
                                        className={cn(
                                            "p-2 rounded-xl border flex items-center justify-center gap-1 transition-colors",
                                            isSelected 
                                                ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400" 
                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:border-purple-300"
                                        )}
                                    >
                                        <div className={cn("w-3 h-3 rounded box-border border flex items-center justify-center", isSelected ? "bg-purple-500 border-purple-500" : "border-slate-300")}>
                                            {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-[10px] font-bold">{n}x</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Text Customization */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-500" />
                            3. Personalizar Texto
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Cabeçalho</label>
                                <input 
                                    type="text" 
                                    value={headerText}
                                    onChange={(e) => setHeaderText(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Rodapé</label>
                                <input 
                                    type="text" 
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={showTotal} onChange={() => setShowTotal(!showTotal)} className="sr-only" />
                                        <div className={cn("block w-10 h-6 rounded-full transition-colors", showTotal ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}></div>
                                        <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", showTotal && "transform translate-x-4")}></div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                                        Mostrar preço total parcelado
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={showCondition} onChange={() => setShowCondition(!showCondition)} className="sr-only" />
                                        <div className={cn("block w-10 h-6 rounded-full transition-colors", showCondition ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700")}></div>
                                        <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", showCondition && "transform translate-x-4")}></div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                                        Mostrar condição do produto
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm relative sticky top-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Phone className="w-4 h-4 text-emerald-500" />
                                Preview WhatsApp
                            </h2>
                            <span className="text-xs font-bold text-slate-400 px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full">
                                {filteredItems.length} produtos
                            </span>
                        </div>

                        <div className="bg-[#e8f5e9] dark:bg-[#1f2c25] rounded-3xl p-6 shadow-inner relative overflow-hidden group">
                            {/* Copy button overlay */}
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "absolute top-4 right-4 z-10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2",
                                    previewCopied ? "bg-emerald-500 text-white" : "bg-white text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100"
                                )}
                            >
                                {previewCopied ? <CheckSquare className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {previewCopied ? 'Copiado ✓' : 'Copiar'}
                            </button>

                            <pre className="text-black dark:text-emerald-50 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                                {previewText}
                            </pre>
                        </div>

                        {/* Generate actions */}
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 border",
                                    previewCopied
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-white/10 shadow-emerald-500/20"
                                )}
                            >
                                <Copy className="w-4 h-4" /> 
                                {previewCopied ? '✓ Copiado' : 'Copiar para WhatsApp'}
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="bg-slate-900 border border-slate-800 hover:bg-black text-white py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                            >
                                <Download className="w-4 h-4" /> 
                                Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PriceListGenerator;
