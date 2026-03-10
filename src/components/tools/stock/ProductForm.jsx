import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Save, Loader2, Camera, Smartphone, Tag,
    Smartphone as DeviceIcon, Wrench as PartIcon,
    DollarSign, Package, ShieldCheck, Info, Calculator, CreditCard, Store
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { StockService } from '../../../services/stockService';
import { getSmartImage } from '../../../data/smartAssets';
import { IPHONE_DATA, getProductImage } from '../../../lib/data/iphoneData';
import { generateProductCopy } from '../../../services/aiService';

// Helper to visualize colors from names
const getColorHex = (name) => {
    const n = name?.toLowerCase() || ''; // Added safe check
    if (n.includes('preto') || n.includes('black') || n.includes('meia-noite')) return '#1c1c1e';
    if (n.includes('branco') || n.includes('white') || n.includes('estelar')) return '#f5f5f7';
    if (n.includes('natural') || n.includes('cinza') || n.includes('grafite')) return '#6e6e73';
    if (n.includes('dourado') || n.includes('gold')) return '#fae7cf';
    if (n.includes('azul') || n.includes('blue')) return '#aebcd4';
    if (n.includes('verde') || n.includes('green')) return '#e2f4df';
    if (n.includes('rosa') || n.includes('rose') || n.includes('pink')) return '#fcebd3';
    if (n.includes('roxo') || n.includes('purple')) return '#e5ddea';
    if (n.includes('vermelho') || n.includes('red')) return '#ff0033';
    if (n.includes('amarelo') || n.includes('yellow')) return '#fbf7cd';
    if (n.includes('laranja') || n.includes('orange')) return '#ffdac5';
    if (n.includes('titânio') && n.includes('deserto')) return '#cba98a';
    if (n.includes('titânio')) return '#b6b2ad'; // Generic titanium
    return '#dddddd';
};

export function ProductForm({ open, onClose, item, onSaved, orgId, userId, settings, showToast }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedOfficialModel, setSelectedOfficialModel] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        type: 'device',
        storage: '',
        color: '',
        condition: 'seminovo',
        batteryHealth: '100',
        cost: '',
        price: '',
        imei: '',
        barcode: '',
        minQuantity: '1',
        quantity: '1',
        description: '',
        imageUrl: '',
        showInCatalog: true,
        // Fiscal Data
        ncm: '',
        cest: '',
        origin: '0',
        cfop: '5102'
    });

    useEffect(() => {
        if (item) setFormData({ ...formData, ...item, showInCatalog: item.showInCatalog ?? true });
        else setFormData({
            name: '',
            category: settings?.categories?.[0]?.name || '',
            type: 'device',
            storage: '',
            color: '',
            condition: 'seminovo',
            batteryHealth: '100',
            cost: '',
            price: '',
            imei: '',
            barcode: '',
            minQuantity: '1',
            quantity: '1',
            description: '',
            imageUrl: '',
            showInCatalog: true,
            ncm: '',
            cest: '',
            origin: '0',
            cfop: '5102'
        });
    }, [item, open, settings]);

    // Live Asset Preview
    const smartImagePreview = useMemo(() => {
        if (formData.imageUrl) return null;
        return getProductImage(formData.name, formData.color);
    }, [formData.name, formData.color, formData.imageUrl]);

    // Intelligent Pricing Calculation
    const pricingDetails = useMemo(() => {
        if (!formData.price || !settings) return null;

        const category = settings.categories?.find(c => c.name === formData.category) || settings.categories?.[0];
        const gateway = settings.financial?.gateways?.find(g => g.id === category?.gatewayId) || settings.financial?.gateways?.[0];

        const pixPrice = parseFloat(formData.price || 0);
        const costPrice = parseFloat(formData.cost || 0);

        if (!gateway) return { pixPrice, total12x: pixPrice * 1.15, installment12x: pixPrice * 1.15 / 12, netProfit: pixPrice - costPrice, margin: costPrice ? ((pixPrice - costPrice) / costPrice) * 100 : 0 };

        const rates = gateway.rates || {};
        const pixRate = parseFloat(rates.pix || 0);
        const nfRate = (category?.requiresNotaFiscal || category?.requiresNf) ? (parseFloat(settings.financial?.notaFiscalRate) || 0) : 0;

        // Final receive amount from Pix (Net)
        const netPix = pixPrice * (1 - (pixRate + nfRate) / 100);

        // Calculate 12x price to receive the same as Pix (if possible) or use a standard formula
        const targetRate12x = parseFloat(rates.credit12x || 15);
        const totalTargetLoad = (targetRate12x + nfRate) / 100;

        const total12x = totalTargetLoad < 1 ? netPix / (1 - totalTargetLoad) : pixPrice * 1.15;
        const installment12x = total12x / 12;

        const netProfit = netPix - costPrice;
        const margin = costPrice ? (netProfit / costPrice) * 100 : 0;

        return {
            netPix,
            total12x,
            installment12x,
            netProfit,
            margin
        };
    }, [formData.price, formData.cost, formData.category, settings]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let dataToSave = { ...formData };

            // Smart Asset Auto-Fill
            if (!dataToSave.imageUrl || dataToSave.imageUrl.trim() === '') {
                const smart = getProductImage(dataToSave.name, dataToSave.color);
                if (smart) dataToSave.imageUrl = smart;
            }

            if (item?.id) {
                // Correct order: orgId, userId, itemId, updates
                await StockService.updateItem(orgId, userId, item.id, dataToSave);
                showToast?.("Alterações salvas!", "success");
            } else {
                await StockService.addItem(orgId, userId, dataToSave);
                showToast?.("Produto registrado!", "success");
            }
            if (onSaved) await onSaved();
            if (onClose) onClose();
        } catch (error) {
            console.error(error);
            showToast?.("Erro ao salvar alterações", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
                                {item ? 'Editar Produto' : 'Adicionar ao Inventário'}
                            </h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Gestão de Ativos Pro</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-7 space-y-10">

                            {/* Section 1: Identification */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Identificação Básica</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto / Modelo</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Ex: iPhone 15 Pro Max 256GB"
                                                value={formData.name}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, name: val });
                                                    if (val.length >= 2) {
                                                        const matches = IPHONE_DATA.filter(m => m.model.toLowerCase().includes(val.toLowerCase()));
                                                        setSuggestions(matches);
                                                    } else {
                                                        setSuggestions([]);
                                                        setSelectedOfficialModel(null);
                                                    }
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black text-slate-700 dark:text-white"
                                                required
                                            />

                                            {suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-2">
                                                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Modelos Disponíveis</div>
                                                    {suggestions.map((m, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({
                                                                    ...formData,
                                                                    name: m.model,
                                                                    category: 'Smartphones',
                                                                    type: 'device',
                                                                    color: '',
                                                                    storage: '',
                                                                    imageUrl: ''
                                                                });
                                                                setSelectedOfficialModel(m);
                                                                setSuggestions([]);
                                                            }}
                                                            className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl flex items-center justify-between transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                                    <Smartphone className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-700 dark:text-white group-hover:text-indigo-600 transition-colors">{m.model}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{m.year}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                                            <select
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black text-slate-700 dark:text-white appearance-none"
                                            >
                                                {settings?.categories?.map(cat => (
                                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                                )) || <option value="">Sem categorias</option>}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Item</label>
                                            <div className="flex p-1.5 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'device' })}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                                                        formData.type === 'device' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    <Smartphone className="w-3.5 h-3.5" /> Aparelho
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'part' })}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                                                        formData.type === 'part' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    <PartIcon className="w-3.5 h-3.5" /> Peça/Acess.
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show inside Catalog Switch */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                formData.showInCatalog ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                            )}>
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wide">Vitrine Pública</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Exibir no catálogo online</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, showInCatalog: !formData.showInCatalog })}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-all relative",
                                                formData.showInCatalog ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                                formData.showInCatalog ? "left-6" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Technical Specs */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Especificações e Detalhes</h3>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Armaz.</label>
                                        {selectedOfficialModel ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOfficialModel.storage.map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, storage: s })}
                                                        className={cn(
                                                            "px-3 py-3 rounded-2xl text-xs font-black transition-all border flex-1",
                                                            formData.storage === s
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-200"
                                                        )}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Ex: 512GB"
                                                value={formData.storage}
                                                onChange={e => setFormData({ ...formData, storage: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black text-slate-700 dark:text-white"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor Principal</label>
                                        {selectedOfficialModel ? (
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                {selectedOfficialModel.colors.map(colorName => (
                                                    <button
                                                        key={colorName}
                                                        type="button"
                                                        onClick={() => {
                                                            const finalImg = getProductImage(selectedOfficialModel.model, colorName);
                                                            setFormData({
                                                                ...formData,
                                                                color: colorName,
                                                                imageUrl: finalImg || ''
                                                            });
                                                        }}
                                                        className={cn(
                                                            "p-2 rounded-xl flex items-center gap-2 transition-all border text-left group",
                                                            formData.color === colorName
                                                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500"
                                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm shrink-0" style={{ backgroundColor: getColorHex(colorName) }} />
                                                        <span className={cn("text-[10px] font-bold leading-tight", formData.color === colorName ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400")}>{colorName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Ex: Titânio"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black text-slate-700 dark:text-white"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condição</label>
                                        <select
                                            value={formData.condition}
                                            onChange={e => setFormData({ ...formData, condition: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-700 dark:text-white appearance-none"
                                        >
                                            <option value="lacrado">Lacrado</option>
                                            <option value="novo">Novo (Sem Caixa)</option>
                                            <option value="vitrine">Vitrine</option>
                                            <option value="seminovo">Seminovo</option>
                                            <option value="usado">Usado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saúde Bateria</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                placeholder="100"
                                                value={formData.batteryHealth}
                                                onChange={e => setFormData({ ...formData, batteryHealth: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 pr-10 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-700 dark:text-white"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Traceability */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Rastreabilidade</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IMEI / Serial Number</label>
                                        <input
                                            type="text"
                                            placeholder="Escaneie ou digite o IMEI"
                                            value={formData.imei}
                                            onChange={e => setFormData({ ...formData, imei: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-mono font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Barcode (EAN)</label>
                                        <input
                                            type="text"
                                            placeholder="Escaneie o código de barras"
                                            value={formData.barcode}
                                            onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-mono font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Fiscal Data */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Dados Fiscais (NFe/NFCe)</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NCM</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 8517.13.00"
                                            value={formData.ncm || ''}
                                            onChange={e => setFormData({ ...formData, ncm: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all font-mono font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEST</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 21.053.01"
                                            value={formData.cest || ''}
                                            onChange={e => setFormData({ ...formData, cest: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all font-mono font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origem</label>
                                        <select
                                            value={formData.origin || '0'}
                                            onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all font-bold text-slate-700 dark:text-white active:scale-[0.98]"
                                        >
                                            <option value="0">0 - Nacional</option>
                                            <option value="1">1 - Estrangeira (Imp. Direta)</option>
                                            <option value="2">2 - Estrangeira (Adq. no M. Interno)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CFOP Padrão</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 5102"
                                            value={formData.cfop || ''}
                                            onChange={e => setFormData({ ...formData, cfop: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all font-mono font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Ad & Notes */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anúncio & Observações</label>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!formData.name) return showToast("Defina o nome do produto primeiro", "warning");
                                            setIsGeneratingCopy(true);
                                            try {
                                                const copy = await generateProductCopy(formData);
                                                setFormData({ ...formData, description: copy });
                                                showToast("Anúncio gerado com sucesso!", "success");
                                            } catch (e) {
                                                showToast("Erro ao gerar anúncio: " + e.message, "error");
                                            } finally {
                                                setIsGeneratingCopy(false);
                                            }
                                        }}
                                        disabled={isGeneratingCopy || !formData.name}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all disabled:opacity-50 border border-indigo-100 dark:border-indigo-800"
                                    >
                                        {isGeneratingCopy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Info className="w-3 h-3 text-indigo-500 animate-pulse" />}
                                        ✨ Mágico AI
                                    </button>
                                </div>
                                <textarea
                                    placeholder="Use o Mágico AI para gerar um anúncio impossível de ignorar ou digite observações aqui..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all text-[11px] font-medium text-slate-600 dark:text-slate-400 resize-none h-48 custom-scrollbar shadow-inner"
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-5 space-y-10">

                            {/* Section 5: Intelligence */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 space-y-8">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Inteligência Financeira</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo de Aquisição (Unitário)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                placeholder="0,00"
                                                value={formData.cost}
                                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-5 pl-12 rounded-2xl outline-none focus:border-emerald-500 transition-all font-black text-emerald-600 text-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço de Venda (À Vista / PIX)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                placeholder="0,00"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-5 pl-12 rounded-2xl outline-none focus:border-blue-500 transition-all font-black text-blue-600 text-lg"
                                            />
                                        </div>
                                    </div>

                                    {pricingDetails && (
                                        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                                            <div className="flex justify-between items-center group bg-indigo-50/50 dark:bg-indigo-500/5 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">Sugerido p/ Cartão 12x</span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">(Cobre taxas do gateway)</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-indigo-600 dark:text-indigo-400 text-lg">12x de {formatCurrency(pricingDetails.installment12x)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total: {formatCurrency(pricingDetails.total12x)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Lucro Líquido</p>
                                                    <p className="text-lg font-black text-emerald-600">{formatCurrency(pricingDetails.netProfit)}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Livre de taxas</p>
                                                </div>
                                                <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-right">
                                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">ROI / Margem</p>
                                                    <p className="text-lg font-black text-blue-600">+{pricingDetails.margin.toFixed(1)}%</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Sobre o custo</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 6: Inventory & Media */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calculator className="w-5 h-5 text-indigo-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Controle de Estoque</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd. Atual</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/5 font-black text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd. Mínima</label>
                                        <input
                                            type="number"
                                            value={formData.minQuantity}
                                            onChange={e => setFormData({ ...formData, minQuantity: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-red-500/5 font-black text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mídia do Produto</label>
                                    <div className="flex gap-4">
                                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all cursor-pointer group shadow-inner">
                                            {formData.imageUrl ? (
                                                <img src={formData.imageUrl} className="w-full h-full object-contain p-2 animate-in fade-in" alt="Preview" />
                                            ) : smartImagePreview ? (
                                                <>
                                                    <img src={smartImagePreview} className="w-full h-full object-contain p-2 opacity-90 animate-in zoom-in" alt="Smart Preview" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-indigo-900/50 to-transparent p-2 flex justify-center">
                                                        <span className="bg-indigo-500 text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm backdrop-blur-md">Auto</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[8px] font-black uppercase">Foto</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Link da imagem (URL)"
                                                value={formData.imageUrl}
                                                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                                className="w-full h-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 font-medium text-xs text-slate-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Fixed */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950 flex justify-end items-center gap-6">
                    <button
                        onClick={onClose}
                        className="px-10 py-5 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-14 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 group"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                {item ? 'Salvar Alterações' : 'Registrar Produto'}
                            </>
                        )}
                    </button>
                </div>
            </div >
        </div >
    );
}
