import { useState, useEffect, useMemo } from 'react';
import {
    DollarSign,
    CreditCard,
    Percent,
    Gift,
    Truck,
    Share2,
    ArrowLeftRight,
    Globe,
    Tags,
    FileText,
    Copy,
    Plus,
    Minus,
    Package,
    ShoppingCart,
    MessageCircle,
    Check,
    TrendingUp,
    Tag,
    Smartphone,
    Wallet,
    Scale
} from 'lucide-react';
import { cn, formatBRL, formatCurrency } from '../../lib/utils';
import { IPHONE_DATA } from '../../lib/data/iphoneData';
import { useToast } from '../ui/Toast';

export function SmartPricing({ settings, initialValues, customRates, onAddToProposal, isSalesMode }) {
    const { showToast } = useToast();
    // 1. Calculation Modes
    const [mode, setMode] = useState(initialValues?.mode || 'brl');

    // 2. Primary Inputs
    const [selectedCategoryId, setSelectedCategoryId] = useState(initialValues?.categoryId || '');
    const [cost, setCost] = useState(initialValues?.cost || '');
    const [usdCost, setUsdCost] = useState(initialValues?.usdCost || '');
    const [exchangeRate, setExchangeRate] = useState(initialValues?.exchangeRate || '5.50');
    const [shipping, setShipping] = useState(initialValues?.shipping || '');
    const [entryValue, setEntryValue] = useState(initialValues?.entryValue || ''); // New: Entry/Trade-In

    // Import Mode Specifics
    const [weight, setWeight] = useState(initialValues?.weight || '');
    const [weightCostPerKg, setWeightCostPerKg] = useState(initialValues?.weightCostPerKg || '5.00');
    const [importTaxRate, setImportTaxRate] = useState(initialValues?.importTaxRate || '');

    // 3. Margin & Logic
    const [margin, setMargin] = useState(initialValues?.marginPercent || '');
    const [marginType, setMarginType] = useState(initialValues?.marginType || 'percent');
    const [selectedGifts, setSelectedGifts] = useState(initialValues?.selectedGifts || []); // Track IDs of selected gifts

    const giftsCost = useMemo(() => {
        if (!selectedGifts.length || !settings?.gifts?.gifts) return 0;
        return selectedGifts.reduce((acc, id) => {
            const g = settings.gifts.gifts.find(x => x.id === id);
            return acc + (g?.cost || 0);
        }, 0);
    }, [selectedGifts, settings]);


    // 4. Manual Overrides
    const [reversePrice, setReversePrice] = useState(initialValues?.reversePrice || '');
    const [stateTaxRate, setStateTaxRate] = useState(initialValues?.stateTaxRate || '');


    // 5. Metadata
    const [name, setName] = useState(initialValues?.name || '');
    const [details, setDetails] = useState(initialValues?.details || '');

    // 6. iPhone Selection State
    const [selectedModelName, setSelectedModelName] = useState('');
    const [selectedStorage, setSelectedStorage] = useState('');
    const [selectedColor, setSelectedColor] = useState('');

    // Display metric state
    const [selectedMetric, setSelectedMetric] = useState(null);

    // Condition State (New vs Used)
    const [condition, setCondition] = useState('used');

    const selectedModelData = useMemo(() =>
        IPHONE_DATA.find(i => i.model === selectedModelName),
        [selectedModelName]);



    // 7. Derived State
    const category = useMemo(() =>
        settings?.categories?.find(c => c.id === selectedCategoryId),
        [selectedCategoryId, settings]);

    const activeGateway = useMemo(() => {
        const gatewayId = category?.gatewayId || settings?.financial?.activeGatewayId;
        return settings?.financial?.gateways?.find(g => g.id === gatewayId) || settings?.financial?.gateways?.[0];
    }, [category, settings]);

    // Auto-detect condition (NOW SAFE TO ACCESS category)
    useEffect(() => {
        if (category || selectedModelName) {
            const isSealed = category?.name?.toLowerCase().includes('lacrado') ||
                category?.name?.toLowerCase().includes('novo') ||
                selectedModelName?.toLowerCase().includes('lacrado');
            setCondition(isSealed ? 'new' : 'used');
        }
    }, [category, selectedModelName]);

    const isMacbook = category?.name?.toLowerCase().includes('macbook');

    const rates = customRates || activeGateway?.rates || {};
    // NF Rate should come from settings regardless of category, applied via toggle
    const nfRate = parseFloat(settings?.financial?.notaFiscalRate) || 0;

    useEffect(() => {
        if (category && !initialValues) {
            setMargin(category.margin || 20);
            setMarginType(category.marginType || 'percent');
        }
    }, [category, initialValues]);

    const [applyNfe, setApplyNfe] = useState(false);
    useEffect(() => {
        if (category) {
            setApplyNfe(category.requiresNotaFiscal);
        }
    }, [category]);

    // Helper for BRL parsing
    const parseNumber = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        // Check for BRL format (dotted thousands, comma decimal)
        if (val.includes(',') && !val.includes('.')) return parseFloat(val.replace(',', '.')); // "1234,56" -> 1234.56
        if (val.includes('.') && val.includes(',')) return parseFloat(val.replace(/\./g, '').replace(',', '.')); // "1.234,56" -> 1234.56
        return parseFloat(val);
    };

    // CORE CALCULATION
    const results = useMemo(() => {
        const c = mode === 'usd'
            ? (parseNumber(usdCost) * parseNumber(exchangeRate) || 0)
            : (parseNumber(cost) || 0);

        const s = parseNumber(shipping) || 0;
        const g = parseFloat(giftsCost) || 0;

        // State Tax (Added to Cost)
        const stTax = parseNumber(stateTaxRate) || 0;
        const stateTaxAmount = c * (stTax / 100);

        // Import Costs (Only in USD mode AND Macbook)
        let importCostBRL = 0;
        let weightCostBRL = 0;
        let importTaxBRL = 0;

        if (mode === 'usd' && isMacbook) {
            const usdRate = parseNumber(exchangeRate) || 0;
            const w = parseNumber(weight) || 0;
            const wCost = parseNumber(weightCostPerKg) || 0;
            const iTax = parseNumber(importTaxRate) || 0;

            const weightCostUSD = w * wCost;
            weightCostBRL = weightCostUSD * usdRate;

            // Import Tax is usually applied on (Optionally Cost + Shipping + Weight Cost)
            // Assuming tax is on the Base Product Cost + Weight Cost for now
            const baseForTaxUSD = parseNumber(usdCost) + weightCostUSD;
            const importTaxUSD = baseForTaxUSD * (iTax / 100);
            importTaxBRL = importTaxUSD * usdRate;

            importCostBRL = weightCostBRL + importTaxBRL;
        }

        const totalBaseCost = c + s + g + stateTaxAmount + importCostBRL;

        let finalSellingPrice = 0;
        let calculatedNetProfit = 0;
        let effectiveMargin = 0;

        const effectiveNfRate = applyNfe ? nfRate : 0;
        const pixRate = parseFloat(rates.pix) || 0;

        // Total Tax Load (Pix + NF) - Used to derive the Base PIX Price
        const totalTaxRate = (pixRate + effectiveNfRate) / 100;
        const taxDivisor = 1 - totalTaxRate; // We divide by this to "gross up" the net amount

        if (mode === 'reverse') {
            const inputPrice = parseNumber(reversePrice) || 0;

            // In reverse, input IS the selling price.
            finalSellingPrice = inputPrice;

            // Net = Price - Taxes - Cost
            calculatedNetProfit = finalSellingPrice - (finalSellingPrice * totalTaxRate) - totalBaseCost;

            // Margin % = (Profit / Price) * 100 (Profit Margin)
            effectiveMargin = finalSellingPrice > 0 ? (calculatedNetProfit / finalSellingPrice) * 100 : 0;

        } else {
            // Forward Calculation (Cost -> Price)
            const mVal = parseNumber(margin) || 0;

            let targetNetProfit = 0;

            if (marginType === 'fixed') {
                // Fixed Profit: Net = Cost + FixedValue
                targetNetProfit = mVal;
            } else {
                // Percent Markup: Net = Cost * (1 + %) 
                // OR Profit Margin: Price = Cost / (1 - %) ???
                // Standard Retail "Margem" usually implies Markup on Cost in simple tools, 
                // BUT financial standard is Gross Margin (Profit / Revenue).
                // Let's stick to MARKUP (Cost + X%) as it's more predictable for small biz 
                // unless "Margin" is explicitly requested as (Profit/Rev).
                // User complaint "margens erradas" usually means they put 30% and want 30% profit on top of cost.

                // Let's use Markup logic: Profit = Cost * (Margin / 100)
                targetNetProfit = totalBaseCost * (mVal / 100);
            }

            const targetNetReceive = totalBaseCost + targetNetProfit;

            // Gross up to cover Taxes + Gateway
            if (taxDivisor > 0) {
                finalSellingPrice = targetNetReceive / taxDivisor;
            } else {
                finalSellingPrice = targetNetReceive; // Fallback
            }

            calculatedNetProfit = targetNetProfit;
            // Effective Margin for display: (Profit / Revenue) * 100 (Standard GAAP Margin)
            // effectiveMargin = finalSellingPrice > 0 ? (calculatedNetProfit / finalSellingPrice) * 100 : 0;

            // Actually, if user inputs "30%", let's keep showing "30%" if it matches their input type logic.
            effectiveMargin = marginType === 'percent' ? mVal : (finalSellingPrice > 0 ? (calculatedNetProfit / finalSellingPrice) * 100 : 0);
        }

        return {
            totalBaseCost,
            sellingPrice: finalSellingPrice,
            netProfit: calculatedNetProfit,
            marginPercent: effectiveMargin,
            nfAmount: finalSellingPrice * (effectiveNfRate / 100),
            pixFee: finalSellingPrice * ((parseFloat(rates.pix) || 0) / 100),
            effectiveNfRate,
            stateTaxAmount,
            importCostBRL, // Export for debug/display if needed
            weightCostBRL,
            importTaxBRL
        };
    }, [mode, cost, usdCost, exchangeRate, shipping, giftsCost, margin, marginType, reversePrice, rates, nfRate, applyNfe, stateTaxRate, weight, weightCostPerKg, importTaxRate, isMacbook]);

    // Financial Table - Full Pricing Table (Pix, Debit, Credit 1x-12x)
    const installments = useMemo(() => {
        if (!results.sellingPrice || results.sellingPrice <= 0) return [];

        const max = activeGateway?.rates?.maxInstallments || 12;
        const list = [];
        const isNfe = results.effectiveNfRate > 0;

        // Base Calculations
        const entry = parseFloat(entryValue) || 0;

        // The "Selling Price" from results is the Full PIX Price.
        // We need to determine the "Net Amount" the seller wants to pocket (Cost + Profit).
        // This Net Amount must be preserved across all payment methods.
        // Net = Price * (1 - Tax - GatewayFee)
        // So, TargetNet = PixPrice * (1 - NF - PixFee)

        const pixRate = parseFloat(rates.pix) || 0;
        const pixTaxLoad = (pixRate + results.effectiveNfRate) / 100;

        // This is the amount the seller effectively "receives" to cover cost + profit
        const targetNetReceive = results.sellingPrice * (1 - pixTaxLoad);

        // Now we calculate Financing on the remaining balance AFTER entry
        const financePortionRatio = Math.max(0, results.sellingPrice - entry) / results.sellingPrice;

        // The Net amount we need to cover for the financed portion
        const netToFinance = targetNetReceive * financePortionRatio;

        // Helper to Calculate Price for a given Rate to ensure we get 'netToFinance' back
        const getFinalPriceForRate = (gatewayRate) => {
            // Price = Net / (1 - NF - GatewayRate)
            const totalLoad = (gatewayRate + results.effectiveNfRate) / 100;
            const divisor = 1 - totalLoad;

            if (divisor <= 0) return 0; // Prevent div by zero
            return netToFinance / divisor;
        };

        // 1. PIX (Remaining Balance)
        // Logic: The "Pix Price" is already the baseline. 
        // If entry > 0, the "Saldo Pix" is just Price - Entry.
        // We don't recalculate because Price was derived from Pix Rate.
        const finalPixPrice = Math.max(0, results.sellingPrice - entry);
        const pixCardFee = finalPixPrice * (pixRate / 100);
        const pixNfFee = isNfe ? finalPixPrice * (results.effectiveNfRate / 100) : 0;

        list.push({
            x: 'pix',
            label: 'Saldo Pix',
            total: finalPixPrice,
            parcela: finalPixPrice,
            fees: pixCardFee + pixNfFee,
            cardFee: pixCardFee,
            nfFee: pixNfFee,
            isNfe
        });

        // 2. DEBIT
        const debitRate = parseFloat(rates.debit) || 0;
        const finalDebitPrice = getFinalPriceForRate(debitRate);
        const debitCardFee = finalDebitPrice * (debitRate / 100);
        const debitNfFee = isNfe ? finalDebitPrice * (results.effectiveNfRate / 100) : 0;

        list.push({
            x: 'debit',
            label: 'Débito',
            total: finalDebitPrice,
            parcela: finalDebitPrice,
            fees: debitCardFee + debitNfFee,
            cardFee: debitCardFee,
            nfFee: debitNfFee,
            isNfe
        });

        // Rate Interpolation Baselines for Credit
        const rate1x = parseFloat(rates.credit1x) || 0;
        const rate12x = parseFloat(rates.credit12x) || 0;
        const rateStep = (rate12x > rate1x) ? (rate12x - rate1x) / 11 : 0;

        for (let i = 1; i <= max; i++) {
            let label = `${i}x`;
            let rate = 0;

            if (i === 1) {
                rate = rate1x;
            } else if (i === 12 && rate12x > 0) {
                rate = rate12x;
            } else {
                const exactRate = rates[`credit${i}x`];
                if (exactRate !== undefined && exactRate !== null && exactRate !== '') {
                    rate = parseFloat(exactRate);
                } else {
                    rate = rate1x + (rateStep * (i - 1));
                }
            }

            if (rate > 99) rate = 99; // Safety

            const finalPrice = getFinalPriceForRate(rate);
            const cardFeeAmount = finalPrice * (rate / 100);
            const nfFeeAmount = isNfe ? finalPrice * (results.effectiveNfRate / 100) : 0;
            const totalFees = cardFeeAmount + nfFeeAmount;

            list.push({
                x: i,
                label,
                total: finalPrice,
                parcela: finalPrice / i,
                fees: totalFees,
                cardFee: cardFeeAmount,
                nfFee: nfFeeAmount,
                isNfe
            });
        }

        return list;
    }, [results.sellingPrice, rates, activeGateway, results.effectiveNfRate, entryValue, results.effectiveNfRate]);



    return (
        <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

                {/* LHS: Inputs */}
                {/* LHS: Inputs */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 1. CATEGORY SELECTION (Mini Cards) - MOVED TO TOP */}
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Tags className="w-5 h-5 text-indigo-600" />
                                Categoria
                            </h2>
                            {/* NFE Toggle (Compact) */}
                            <button
                                onClick={() => setApplyNfe(!applyNfe)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all select-none",
                                    applyNfe ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-400 opacity-80"
                                )}
                            >
                                <span className={cn("w-2 h-2 rounded-full", applyNfe ? "bg-emerald-500" : "bg-slate-300")} />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    Nota Fiscal {applyNfe ? `(${nfRate}%)` : 'OFF'}
                                </span>
                            </button>
                        </div>

                        {/* Mini Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {settings?.categories?.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCategoryId(c.id)}
                                    className={cn(
                                        "px-3 py-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden group min-h-[80px]",
                                        selectedCategoryId === c.id
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]"
                                            : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-200"
                                    )}
                                >
                                    <Package className={cn("w-5 h-5", selectedCategoryId === c.id ? "text-white" : "text-slate-400 group-hover:text-indigo-400")} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight truncate w-full px-1">{c.name}</span>
                                    {selectedCategoryId === c.id && <div className="absolute inset-0 bg-white dark:bg-white/10" />}
                                </button>
                            ))}
                        </div>

                        {/* State Tax (Advanced) */}
                        {!isSalesMode && mode !== 'reverse' && (
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <ArrowLeftRight className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Difa (Imp. Interestadual)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={stateTaxRate}
                                        onChange={e => setStateTaxRate(e.target.value)}
                                        className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 text-center"
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-bold text-slate-400">%</span>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* 2. PRODUCT DATA & QUICK FILL */}
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10 relative overflow-hidden">

                        {/* Header with Toggle */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4 text-slate-400" />
                                Dados do Produto
                            </h3>
                            {/* Mode Toggles */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button onClick={() => setMode('brl')} className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all", mode === 'brl' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600")}>R$</button>
                                <button onClick={() => setMode('usd')} className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all", mode === 'usd' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600")}>USD</button>
                                <button onClick={() => setMode('reverse')} className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all", mode === 'reverse' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600")}>REV</button>
                            </div>
                        </div>

                        {/* iPhone Quick Fill - ONLY IF CATEGORY IS IPHONE */}
                        {selectedCategoryId?.toLowerCase().includes('iphone') && (
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mb-6 animate-in fade-in slide-in-from-top-4">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" /> Seleção Rápida Apple
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <select
                                        value={selectedModelName}
                                        onChange={(e) => {
                                            setSelectedModelName(e.target.value);
                                            setSelectedStorage('');
                                            setSelectedColor('');
                                        }}
                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-select"
                                    >
                                        <option value="">Modelo...</option>
                                        {IPHONE_DATA.map(i => <option key={i.model} value={i.model}>{i.model}</option>)}
                                    </select>
                                    <select
                                        value={selectedStorage}
                                        onChange={(e) => {
                                            setSelectedStorage(e.target.value);
                                            setSelectedColor('');
                                        }}
                                        disabled={!selectedModelName}
                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                                    >
                                        <option value="">Gigass...</option>
                                        {selectedModelData?.storage.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select
                                        value={selectedColor}
                                        onChange={(e) => {
                                            const color = e.target.value;
                                            setSelectedColor(color);
                                            if (selectedModelName && selectedStorage && color) {
                                                setName(`${selectedModelName} ${selectedStorage}`);
                                                setDetails(`Cor: ${color} | ${selectedModelName}`);
                                            }
                                        }}
                                        disabled={!selectedStorage}
                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                                    >
                                        <option value="">Cor...</option>
                                        {selectedModelData?.colors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Critical Inputs (Cost & Margin) - NEW CLEAN DESIGN */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                            {/* CUSTO */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo ({mode === 'usd' ? 'USD' : 'R$'})</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                        {mode === 'usd' ? '$' : 'R$'}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        readOnly={mode === 'reverse'}
                                        value={mode === 'usd' ? usdCost : cost}
                                        onChange={mode === 'usd' ? (e) => setUsdCost(e.target.value) : (e) => setCost(e.target.value)}
                                        className={cn(
                                            "w-full h-12 rounded-xl pl-9 pr-3 text-sm font-black text-slate-700 outline-none transition-all placeholder:text-slate-300",
                                            mode === 'reverse'
                                                ? "bg-slate-100 border border-slate-200 cursor-not-allowed text-slate-400"
                                                : "bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        )}
                                        placeholder={mode === 'reverse' ? "Bloqueado" : "0,00"}
                                    />
                                </div>
                            </div>

                            {/* Additional Import Inputs (Only in USD Mode) */}
                            {mode === 'usd' && isMacbook && (
                                <>
                                    {/* PESO */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peso (Kg)</label>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                                <Scale className="w-3.5 h-3.5" />
                                            </div>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 text-sm font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300"
                                                placeholder="0.0"
                                            />
                                        </div>
                                    </div>

                                    {/* TAXA IMPORTAÇÃO */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Import (%)</label>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                                <Globe className="w-3.5 h-3.5" />
                                            </div>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={importTaxRate}
                                                onChange={(e) => setImportTaxRate(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 text-sm font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300"
                                                placeholder="0%"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* MARGEM */}
                            <div className="space-y-1">
                                <div className="flex justify-between ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {mode === 'reverse' ? 'Margem (Calc.)' : `Margem (${marginType === 'percent' ? '%' : 'R$'})`}
                                    </label>
                                    <button
                                        onClick={() => setMarginType(m => m === 'percent' ? 'fixed' : 'percent')}
                                        disabled={mode === 'reverse'}
                                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors uppercase disabled:opacity-50"
                                    >
                                        {marginType === 'percent' ? '%' : 'R$'}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none group-focus-within:text-emerald-500 transition-colors">
                                        {marginType === 'percent' ? '%' : 'R$'}
                                    </div>
                                    <input
                                        type="number"
                                        readOnly={mode === 'reverse'}
                                        value={mode === 'reverse'
                                            ? (marginType === 'percent' ? results.marginPercent.toFixed(2) : results.netProfit.toFixed(2))
                                            : margin
                                        }
                                        onChange={(e) => setMargin(e.target.value)}
                                        className={cn(
                                            "w-full h-12 rounded-xl pl-9 pr-3 text-sm font-black outline-none border transition-all placeholder:text-emerald-300",
                                            mode === 'reverse'
                                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                                : "bg-emerald-50/30 border-emerald-100/50 text-emerald-700 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                        )}
                                        placeholder="0"
                                    />
                                    {mode === 'reverse' && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 rounded-full bg-slate-300" title="Calculado automaticamente" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CONDIÇÃO (New) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condição</label>
                                <div className="flex bg-slate-50 dark:bg-slate-950 rounded-xl p-1 border border-slate-100 h-12">
                                    <button
                                        onClick={() => setCondition('new')}
                                        className={cn(
                                            "flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                            condition === 'new' ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        Novo
                                    </button>
                                    <button
                                        onClick={() => setCondition('used')}
                                        className={cn(
                                            "flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                            condition === 'used' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        Usado
                                    </button>
                                </div>
                            </div>

                            {/* ENTRADA */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrada / Troca</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none group-focus-within:text-blue-500 transition-colors">
                                        <Wallet className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">R$</div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={entryValue}
                                        onChange={(e) => setEntryValue(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-xl pl-16 pr-3 text-sm font-black text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Gift Selection (Styled as Buttons) */}
                        {settings?.gifts?.gifts?.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {settings.gifts.gifts.map(gift => (
                                    <button
                                        key={gift.id}
                                        onClick={() => {
                                            const isSelected = selectedGifts.includes(gift.id);
                                            const newSelected = isSelected
                                                ? selectedGifts.filter(id => id !== gift.id)
                                                : [...selectedGifts, gift.id];

                                            setSelectedGifts(newSelected);
                                        }}
                                        className={cn(
                                            "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shadow-sm active:scale-95",
                                            selectedGifts.includes(gift.id)
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                                        )}
                                    >
                                        <Plus className={cn("w-3 h-3 transition-transform", selectedGifts.includes(gift.id) && "rotate-45")} />
                                        {gift.name} (+{formatBRL(gift.cost)})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reverse Mode Input Alternative */}
                    {mode === 'reverse' && (
                        <div className="mb-4">
                            <InputGroup
                                label="Preço de Venda Alvo (Cliente)"
                                icon={CreditCard}
                                value={reversePrice}
                                onChange={setReversePrice}
                                prefix="R$"
                            />
                        </div>
                    )}

                    {/* Exchange Rate if USD */}
                    {mode === 'usd' && (
                        <div className="mt-4 flex items-center gap-3 bg-amber-50 p-2 rounded-lg border border-amber-100 w-fit">
                            <span className="text-[10px] font-black text-amber-600 uppercase">Cotação:</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-amber-700">R$</span>
                                <input
                                    value={exchangeRate}
                                    onChange={e => setExchangeRate(e.target.value)}
                                    className="w-14 bg-transparent border-b border-amber-300 text-xs font-black text-amber-800 outline-none text-center"
                                />
                            </div>
                        </div>
                    )}

                    {/* Weight Cost Settings (Hidden/Advanced or just visible in USD mode?) */}
                    {mode === 'usd' && isMacbook && (
                        <div className="mt-2 flex items-center gap-3 bg-indigo-50 p-2 rounded-lg border border-indigo-100 w-fit">
                            <span className="text-[10px] font-black text-indigo-600 uppercase">Custo Kg:</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-indigo-700">US$</span>
                                <input
                                    value={weightCostPerKg}
                                    onChange={e => setWeightCostPerKg(e.target.value)}
                                    className="w-10 bg-transparent border-b border-indigo-300 text-xs font-black text-indigo-800 outline-none text-center"
                                />
                            </div>
                        </div>
                    )}

                </div>

                {/* RHS: Summary & Actions & Table */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 h-fit">

                    {/* Main Price Card */}
                    {/* Main Price Card - REFINED UI */}
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[350px]">

                        {/* Decorative Background Blur */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-indigo-500" />
                                    Preço Final Sugerido
                                </h3>
                                {results.marginPercent > 0 && (
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border",
                                        results.marginPercent >= 20 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                            results.marginPercent >= 10 ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                "bg-red-100 text-red-700 border-red-200"
                                    )}>
                                        Roi {results.marginPercent.toFixed(1)}%
                                    </span>
                                )}
                            </div>

                            {/* Main Price Display */}
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg md:text-xl font-bold text-slate-400">R$</span>
                                    <span className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-800 dark:text-slate-100 dark:text-white tracking-tighter">
                                        {(selectedMetric ? selectedMetric.value : results.sellingPrice) > 0
                                            ? formatBRL(selectedMetric ? selectedMetric.value : results.sellingPrice).replace('R$', '').trim()
                                            : '0,00'}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-400 mt-1 pl-1">
                                    {selectedMetric ? selectedMetric.label : 'À Vista (Pix)'}
                                </p>
                            </div>

                            {!isSalesMode && (
                                <div className="space-y-6">
                                    {/* Profit Highlight Card */}
                                    <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100/50 flex items-center justify-between backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm dark:shadow-slate-900/50">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600/70">Lucro Líquido</p>
                                                <p className="text-xl font-black text-emerald-700">{formatBRL(results.netProfit)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-emerald-600 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm dark:shadow-slate-900/50">
                                                {results.marginPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Breakdown List */}
                                    <div className="space-y-3 px-1">
                                        <div className="flex justify-between text-sm group">
                                            <span className="text-slate-400 font-medium group-hover:text-slate-600 dark:text-slate-300 transition-colors">Custo Total Base</span>
                                            <span className="font-bold text-slate-600 dark:text-slate-300">{formatBRL(results.totalBaseCost)}</span>
                                        </div>

                                        {/* Macbook Cost Breakdown */}
                                        {mode === 'usd' && isMacbook && (
                                            <div className="pl-2 space-y-1 mb-2 border-l-2 border-slate-100 my-1">
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>+ Peso ({weight}kg)</span>
                                                    <span>{formatBRL(results.weightCostBRL)}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>+ Taxa Import ({importTaxRate}%)</span>
                                                    <span>{formatBRL(results.importTaxBRL)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-sm group">
                                            <span className="text-slate-400 font-medium flex items-center gap-1.5 group-hover:text-slate-600 dark:text-slate-300 transition-colors">
                                                Taxa Pix ({rates.pix || 0}%)
                                            </span>
                                            <span className="font-bold text-rose-500 bg-rose-50 px-1.5 rounded">
                                                - {formatBRL(results.pixFee)}
                                            </span>
                                        </div>

                                        {(applyNfe || Number(results.nfAmount) > 0) && (
                                            <div className="flex justify-between text-sm group">
                                                <span className="text-slate-400 font-medium flex items-center gap-1.5 group-hover:text-slate-600 dark:text-slate-300 transition-colors">
                                                    Imposto NF
                                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 rounded font-bold">{nfRate}%</span>
                                                </span>
                                                <span className="font-bold text-rose-500 bg-rose-50 px-1.5 rounded">
                                                    - {formatBRL(results.nfAmount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEPARATOR & TABLE */}
                        <div className="mt-8 pt-6 border-t border-slate-100 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tabela de Parcelamento</span>
                            </div>


                            <div className="bg-slate-50 dark:bg-slate-950 dark:bg-slate-950/50 rounded-xl border border-slate-100 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 shadow-sm dark:shadow-slate-900/50 z-10">
                                        <tr className="text-slate-400 font-bold border-b border-slate-100">
                                            <th className="p-2.5 text-left pl-4">Met</th>
                                            <th className="p-2.5 text-right">Parcela</th>
                                            <th className="p-2.5 text-right pr-4">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {installments.map(inst => (
                                            <tr
                                                key={inst.x}
                                                onClick={() => {
                                                    const txt = `${inst.label} de ${formatBRL(inst.parcela)} = ${formatBRL(inst.total)}`;
                                                    navigator.clipboard.writeText(txt);
                                                    showToast("Copiado!", "success");
                                                    setSelectedMetric({ label: inst.label, value: inst.total });
                                                }}
                                                className={cn(
                                                    "cursor-pointer transition-colors group",
                                                    selectedMetric?.label === inst.label ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-white dark:hover:bg-white/5"
                                                )}
                                            >
                                                <td className="p-2.5 pl-4 font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600">{inst.x === 'pix' ? 'Pix' : inst.x + 'x'}</td>
                                                <td className="p-2.5 text-right font-medium text-slate-500 group-hover:text-indigo-600">{inst.x === 'pix' ? '-' : formatBRL(inst.parcela)}</td>
                                                <td className="p-2.5 pr-4 text-right font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600">{formatBRL(inst.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-2 relative z-10">
                            <button
                                onClick={() => {
                                    // Fix: Pix value in message should be the REMAINING amount if entry value exists
                                    const remainingPixValue = Math.max(0, results.sellingPrice - (parseFloat(entryValue) || 0));
                                    const pix = formatBRL(remainingPixValue);

                                    // Helper to get installment value for specific count
                                    const getInstVal = (count) => {
                                        const inst = installments.find(i => i.x === count);
                                        return inst ? formatBRL(inst.parcela) : 'N/A';
                                    };

                                    // Variables
                                    const entryFormatted = entryValue > 0 ? formatBRL(entryValue) : '';
                                    const warrantyText = category?.warranty || '3 Meses';
                                    const nfText = applyNfe ? '✅ Com Nota Fiscal' : '🚫 SEM NOTA FISCAL';

                                    // Condition Logic (Now uses state)
                                    const isSealed = condition === 'new';
                                    const conditionText = isSealed ? 'Lacrado' : 'Seminovo';

                                    // Trade-In Info
                                    let entryInfo = '';
                                    if (entryValue > 0) {
                                        entryInfo = `\n🔄 *Abatimento de Troca:* -${entryFormatted}`;
                                    }

                                    // Gifts Info
                                    const activeGifts = settings?.gifts?.gifts?.filter(g => selectedGifts.includes(g.id)) || [];
                                    const giftsText = activeGifts.length > 0 ? `\n🎁 *Brindes:* ${activeGifts.map(g => g.name).join(' + ')}` : '';

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
{entrada_info}
{brindes}

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
{entrada_info}
{brindes}

📍 *Loja Física / Entrega Rápida*`;

                                    const defaultTemplate = isSealed ? sealedTemplate : usedTemplate;

                                    // Get template from settings or use fallback
                                    let message = settings?.messages?.[category?.id]?.pricing ||
                                        settings?.messages?.iphone?.pricing ||
                                        defaultTemplate;

                                    // Clean old entry patterns if present (Legacy support)
                                    if (entryValue <= 0) {
                                        message = message.replace(/Entrada de %?\{entrada\}( \+ )?/gi, '');
                                        // More robust cleanup for empty lines if variables are missing
                                        message = message.replace(/\n\n+/g, '\n\n');
                                    }

                                    // Replacements
                                    message = message
                                        .replace(/%?\{produto\}/g, name || 'Produto')
                                        .replace(/%?\{modelo\}/g, `${name || 'Produto'} ${selectedColor || ''}`.trim())
                                        .replace(/%?\{preco\}/g, pix)
                                        .replace(/%?\{pix\}/g, pix)
                                        .replace(/%?\{parcela\}/g, getInstVal(12))
                                        .replace(/%?\{card12x\}/g, getInstVal(12))
                                        .replace(/%?\{capacidade\}/g, selectedStorage || '')
                                        .replace(/%?\{cor\}/g, selectedColor || '')
                                        .replace(/%?\{condicao\}/g, conditionText)
                                        .replace(/%?\{entrada\}/g, entryFormatted)
                                        .replace(/%?\{valor_entrada\}/g, entryFormatted)
                                        .replace(/%?\{garantia\}/g, warrantyText)
                                        .replace(/%?\{nota_fiscal\}/g, nfText)
                                        .replace(/%?\{entrada_info\}/g, entryInfo)
                                        .replace(/%?\{brindes\}/g, giftsText)
                                        // Specific Installments
                                        .replace(/%?\{parcela_10x\}/g, getInstVal(10))
                                        .replace(/%?\{parcela_12x\}/g, getInstVal(12))
                                        .replace(/%?\{parcela_18x\}/g, getInstVal(18))
                                        .replace(/%?\{parcela_21x\}/g, getInstVal(21));

                                    navigator.clipboard.writeText(message);
                                    showToast("Copiado!", "success");
                                }}
                                className="py-4 px-4 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95 flex flex-col md:flex-row items-center justify-center gap-2 group"
                            >
                                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-xs uppercase tracking-wider">Copiar Zap</span>
                            </button>

                            <button
                                onClick={() => onAddToProposal({
                                    name: name || 'Produto Personalizado',
                                    cost: parseFloat(cost) || 0,
                                    price: results.sellingPrice,
                                    pixPrice: results.sellingPrice,
                                    installmentPrice: installments.find(i => i.x === 12 || i.x === (installments.length - 2))?.total || 0,
                                    quantity: 1,
                                    details: name ? `${name} | ${formatBRL(results.sellingPrice)}` : 'Cálculo avulso'
                                })}
                                className="py-4 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xl dark:shadow-slate-900/50 shadow-indigo-200 active:scale-95 flex flex-col md:flex-row items-center justify-center gap-2 group"
                            >
                                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-xs uppercase tracking-wider text-center">Add. Orçamento</span>
                            </button>
                        </div>
                    </div>



                </div>
            </div>
        </div>
    );
}

const Row = ({ label, value, color = "text-white", small }) => (
    <div className={cn("flex justify-between", small ? "text-xs" : "text-sm")}>
        <span className="text-slate-400">{label}</span>
        <span className={cn("font-medium", color)}>{value}</span>
    </div>
);

function InputGroup({ label, icon: Icon, value, onChange, placeholder, prefix, suffix, compactLabel }) {
    return (
        <div className="space-y-1.5 flex-1">
            {!compactLabel && <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>}
            {compactLabel && <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">{label}</label>}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Icon className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                </div>
                {prefix && (
                    <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none border-r border-slate-200 dark:border-white/10 pr-2 my-2">
                        <span className="text-slate-400 text-xs font-bold">{prefix}</span>
                    </div>
                )}
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                        onChange(val);
                    }}
                    className={cn(
                        "block w-full rounded-2xl border-slate-200 dark:border-white/10 border-2 bg-slate-50 dark:bg-slate-950 p-3.5 text-slate-900 dark:text-white placeholder-slate-300 font-bold text-sm shadow-sm transition-all hover:bg-slate-50/80 focus:border-indigo-500 focus:ring-0 focus:bg-white dark:focus:bg-slate-900",
                        prefix ? "pl-20" : "pl-11",
                        suffix ? "pr-12" : "pr-4"
                    )}
                    placeholder={placeholder}
                />
                {suffix && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold">{suffix}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
