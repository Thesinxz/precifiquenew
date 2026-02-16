
import { useState, useEffect, useRef } from 'react';
import { StockService } from '../../services/stockService';
import { SalesService } from '../../services/salesService';
import { CashierService } from '../../services/cashierService';
import { useToast } from '../ui/Toast';
import {
    Search, ShoppingCart, Plus, Minus, Trash2,
    Check, Loader2, Box, Zap, Printer, Lock, Unlock,
    ArrowUpCircle, ArrowDownCircle, AlertCircle, Building2,
    QrCode, PenTool, History, Coffee, CreditCard, Wallet, UserCheck, Smile, Gift, Save,
    Shield, Headphones, Smartphone, X, DollarSign
} from 'lucide-react';
import { formatCurrency, cn, generateReferenceCode, parsePrice } from '../../lib/utils';
import { doc, getDoc, updateDoc as firestoreUpdateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';


export function QuickPOS({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    // --- State ---
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState(null); // Active Cashier Session

    // Data
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [parkedCarts, setParkedCarts] = useState(JSON.parse(localStorage.getItem('pos_parked_carts') || '[]'));

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showUpsellModal, setShowUpsellModal] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signature, setSignature] = useState(null);

    // Transaction Data
    const [paymentEntries, setPaymentEntries] = useState([{ method: 'pix', amount: 0, installments: 1 }]);
    const [discount, setDiscount] = useState(0);
    const [clientName, setClientName] = useState('');
    const [clientInstagram, setClientInstagram] = useState('');
    const [receivedAmount, setReceivedAmount] = useState(''); // For change calculation
    const [selectedCostCenterId, setSelectedCostCenterId] = useState(null);

    // Modals
    const [isCashierModalOpen, setIsCashierModalOpen] = useState(false); // Open/Close
    const [cashierAction, setCashierAction] = useState('open'); // 'open', 'close', 'sangria', 'supply'
    const [cashierAmount, setCashierAmount] = useState('');
    const [cashierNote, setCashierNote] = useState('');

    const searchInputRef = useRef(null);
    const signatureCanvasRef = useRef(null);

    // --- Effects ---

    useEffect(() => {
        if (orgId) {
            loadInitialData();
        }
    }, [orgId]);

    useEffect(() => {
        if (settings?.costCenters?.length > 0 && !selectedCostCenterId) {
            const firstActive = settings.costCenters.find(cc => cc.active);
            if (firstActive) setSelectedCostCenterId(firstActive.id);
        }
    }, [settings]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F5' && cart.length > 0 && session) {
                e.preventDefault();
                handleCheckout();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, session]);

    // --- Loaders ---

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadProducts(),
                checkSession()
            ]);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar sistema.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const loadProducts = async () => {
        const data = await StockService.getStock(orgId);
        setProducts(data);
    };

    const checkSession = async () => {
        const activeSession = await CashierService.getCurrentSession(user.uid, orgId);
        setSession(activeSession);
    };

    // --- Actions ---

    // Cart Logic relative to simple implementation
    const addToCart = (product) => {
        if (!session) return showToast("Abra o caixa primeiro!", "warning");

        const price = parsePrice(product.price || (product.cost * 1.2));

        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                if (existing.quantity >= (Number(product.quantity) || 0)) {
                    showToast("Estoque insuficiente.", "error");
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, {
                ...product,
                quantity: 1,
                sellingPrice: price,
                originalStock: Number(product.quantity) || 0,
                selectedIMEI: '' // Added for serialized tracking
            }];
        });

        // --- Feature 1: Upselling Sugerido ---
        const isPhone = (product.category || "").toLowerCase().includes("iphone") || (product.name || "").toLowerCase().includes("iphone");
        if (isPhone && cart.length === 0) { // Suggested only on first phone to avoid spam
            setShowUpsellModal(true);
        }

        setSearchTerm('');
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(p => p.id !== id));

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const stockItem = products.find(prod => prod.id === id);
                if (delta > 0 && stockItem && p.quantity >= stockItem.quantity) {
                    return p;
                }
                return { ...p, quantity: Math.max(1, p.quantity + delta) };
            }
            return p;
        }));
    };

    // --- Feature 4: Carrinho Salvo ---
    const parkCart = () => {
        if (cart.length === 0) return;
        const name = prompt("Identifique este carrinho (ex: Nome do Cliente):");
        if (!name) return;

        const newParked = [...parkedCarts, { id: Date.now(), name, cart, discount, clientName, clientInstagram, date: new Date() }];
        setParkedCarts(newParked);
        localStorage.setItem('pos_parked_carts', JSON.stringify(newParked));

        setCart([]);
        setDiscount(0);
        setClientName('');
        setClientInstagram('');
        showToast("Carrinho estacionado!", "success");
    };

    const resumeCart = (parked) => {
        setCart(parked.cart);
        setDiscount(parked.discount || 0);
        setClientName(parked.clientName || '');
        setClientInstagram(parked.clientInstagram || '');

        const newParked = parkedCarts.filter(p => p.id !== parked.id);
        setParkedCarts(newParked);
        localStorage.setItem('pos_parked_carts', JSON.stringify(newParked));
        showToast("Carrinho retomado!", "success");
    };

    // --- Computed ---
    // Helper for robust search
    const normalize = (s) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

    const categories = ['Todos', ...new Set(products.map(p => p.category))];

    const filteredProducts = products.filter(p => {
        // 1. Category Filter
        if (selectedCategory !== 'Todos' && p.category !== selectedCategory) return false;

        // 2. Search Text Filter (Fuzzy-like)
        if (!searchTerm) return true;

        const term = normalize(searchTerm);
        const tokens = term.split(/\s+/).filter(t => t.length > 0);

        // Combine all searchable fields into one normalized string
        const searchableText = normalize(`${p.name} ${p.category} ${p.details || ''} ${p.barcode || ''} ${p.imei || ''} ${p.color || ''} ${p.storage || ''}`);

        // Check if ALL tokens exist in the product text (AND logic)
        // This allows searching "iphone 13 pro" and finding "iPhone 13 Pro Max" even if words are out of order or partial
        return tokens.every(token => searchableText.includes(token));
    });

    const cartTotal = cart.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
    const finalTotal = Math.max(0, cartTotal - discount);
    const hasCash = paymentEntries.some(e => e.method === 'cash');
    const cashEntry = paymentEntries.find(e => e.method === 'cash');
    const change = (hasCash && receivedAmount) ? Math.max(0, parseFloat(receivedAmount) - (cashEntry?.amount || 0)) : 0;

    // --- POS SYNC: Auto-update payment if single entry ---
    useEffect(() => {
        if (paymentEntries.length === 1 && cart.length > 0) {
            setPaymentEntries([{ ...paymentEntries[0], amount: finalTotal }]);
        }
    }, [finalTotal]);

    // --- Feature 2: Múltiplos Pagamentos ---
    const totalRemaining = () => {
        const subtotal = cart.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
        const total = Math.max(0, subtotal - discount);
        const paid = paymentEntries.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
        return Math.max(0, total - paid);
    };

    const addPaymentEntry = () => {
        const remaining = totalRemaining();
        if (remaining <= 0) return showToast("Valor total já atingido.", "info");
        setPaymentEntries([...paymentEntries, { method: 'pix', amount: remaining, installments: 1 }]);
    };

    const removePaymentEntry = (idx) => {
        if (paymentEntries.length === 1) return;
        setPaymentEntries(paymentEntries.filter((_, i) => i !== idx));
    };

    const updatePaymentEntry = (idx, field, value) => {
        setPaymentEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    // --- Feature 3: Digital Signature ---
    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature(null);
    };

    const saveSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (canvas) setSignature(canvas.toDataURL());
        setShowSignatureModal(false);
    };

    const setupSignatureCanvas = (canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let drawing = false;
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX || e.touches[0].clientX) - rect.left,
                y: (e.clientY || e.touches[0].clientY) - rect.top
            };
        };

        const start = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
        const move = (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
        const end = () => { drawing = false; };

        canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end;
        canvas.ontouchstart = (e) => { e.preventDefault(); start(e); };
        canvas.ontouchmove = (e) => { e.preventDefault(); move(e); };
        canvas.ontouchend = end;
    };

    // Cashier Management
    const handleCashierAction = async (e) => {
        e.preventDefault();
        try {
            if (cashierAction === 'open') {
                await CashierService.openSession(user.uid, orgId, cashierAmount || 0);
                showToast("Caixa Aberto!", "success");
            } else if (cashierAction === 'close') {
                await CashierService.closeSession(session.id, {
                    declaredCash: 0, // In a real app, user inputs this. Simplified for now.
                    notes: cashierNote
                });
                showToast("Caixa Fechado!", "success");
                setSession(null);
            } else {
                // Sangria / Supply
                await CashierService.addMovement(
                    session.id,
                    user.uid,
                    orgId,
                    cashierAction,
                    cashierAmount,
                    cashierNote
                );
                showToast("Movimentação registrada!", "success");
            }
            setIsCashierModalOpen(false);
            checkSession();
            setCashierAmount('');
            setCashierNote('');
        } catch (error) {
            showToast("Erro na operação de caixa.", "error");
        }
    };

    const handleCheckout = async () => {
        if (!session) return;
        if (cart.length === 0) return;

        const remaining = totalRemaining();
        if (remaining > 0.01) return showToast(`Falta receber ${formatCurrency(remaining)}`, "warning");

        setIsCheckingOut(true);
        try {
            const client = { name: clientName || 'Consumidor Final', instagram: clientInstagram, id: 'quick-pos' };
            const subtotal = cart.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
            const total = Math.max(0, subtotal - discount);

            // --- Feature 10: Comissão em Tempo Real ---
            const commissionRate = settings?.business?.defaultCommission || 5;
            const estimatedProfit = cart.reduce((acc, p) => acc + ((p.sellingPrice - (p.cost || 0)) * p.quantity), 0) - discount;
            const commission = estimatedProfit > 0 ? (estimatedProfit * (commissionRate / 100)) : 0;

            const saleData = {
                client,
                code: generateReferenceCode('SALE'),
                items: cart,
                total,
                subtotal,
                discount,
                paymentEntries, // Feature 2: Múltiplos
                signature, // Feature 3: Digital
                installments: Math.max(...paymentEntries.map(e => e.installments || 1)),
                status: 'completed',
                isQuickSale: true,
                sessionId: session.id,
                costCenterId: selectedCostCenterId || null,
                costCenterName: settings?.costCenters?.find(cc => cc.id === selectedCostCenterId)?.name || null,
                settings: settings, // Crucial for accurate fee calculation
                commissionValue: commission
            };

            // 1. Create Sale
            await SalesService.createSale(user.uid, orgId, saleData);

            // 2. Register Cashier Movements for each entry
            for (const entry of paymentEntries) {
                let movementType = `sale_${entry.method}`;
                await CashierService.addMovement(session.id, user.uid, orgId, movementType, entry.amount, `Venda Rápida #${saleData.code.slice(-4)} (${entry.method.toUpperCase()})`);
            }

            // 3. Print Receipt
            printReceipt(saleData, receivedAmount);

            showToast(`Venda Finalizada! Comissão: ${formatCurrency(commission)}`, "success");

            // Reset state
            setCart([]);
            setDiscount(0);
            setClientName('');
            setClientInstagram('');
            setReceivedAmount('');
            setPaymentEntries([{ method: 'pix', amount: 0, installments: 1 }]);
            setSignature(null);
            loadProducts(); // Refresh stock
        } catch (error) {
            console.error(error);
            showToast("Erro ao finalizar venda.", "error");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const printReceipt = (saleData, received) => {
        const win = window.open('', '', 'width=300,height=600');
        if (!win) return;

        const date = new Date().toLocaleString('pt-BR');
        const hasCash = saleData.paymentEntries.some(e => e.method === 'cash');
        const cashEntry = saleData.paymentEntries.find(e => e.method === 'cash');
        const change = hasCash && received ? (parseFloat(received) - cashEntry.amount).toFixed(2) : '0.00';

        win.document.write(`
            <html>
                <head>
                    <title>Recibo</title>
                    <style>
                        @page { margin: 0; }
                        body { font-family: monospace; font-size: 11px; width: 58mm; margin: 0; padding: 5px; color: #000; }
                        .center { text-align: center; }
                        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                        .flex { display: flex; justify-content: space-between; }
                        .bold { font-weight: bold; }
                        .items { margin: 10px 0; }
                        .footer { margin-top: 15px; font-size: 10px; }
                        .sig { margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
                        img.signature { max-width: 150px; height: auto; display: block; margin: 5px auto; }
                    </style>
                </head>
                <body>
                    <div class="center bold">PRECIFICA.AI</div>
                    <div class="center">Assistencia & Acessórios</div>
                    <div class="line"></div>
                    <div>Data: ${date}</div>
                    <div>Ref: #${saleData.code}</div>
                    <div>Cliente: ${saleData.client.name}</div>
                    <div class="line"></div>
                    <div class="items">
                        ${saleData.items.map(i => `
                            <div>${i.name.toUpperCase()}</div>
                            <div class="flex">
                                <span>${i.quantity}x ${formatCurrency(i.sellingPrice)}</span>
                                <span>${formatCurrency(i.quantity * i.sellingPrice)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="line"></div>
                    <div class="flex"><span>Subtotal:</span><span>${formatCurrency(saleData.subtotal)}</span></div>
                    <div class="flex"><span>Desconto:</span><span>-${formatCurrency(saleData.discount)}</span></div>
                    <div class="flex bold" style="font-size: 13px;"><span>TOTAL:</span><span>${formatCurrency(saleData.total)}</span></div>
                    <div class="line"></div>
                    <div class="bold">FORMA DE PAGAMENTO:</div>
                    ${saleData.paymentEntries.map(e => `
                        <div class="flex">
                            <span>${e.method.toUpperCase()} ${e.installments > 1 ? `(${e.installments}x)` : ''}:</span>
                            <span>${formatCurrency(e.amount)}</span>
                        </div>
                    `).join('')}
                    ${hasCash ? `
                        <div class="flex"><span>Dinheiro Recebido:</span><span>${formatCurrency(parseFloat(received || 0))}</span></div>
                        <div class="flex bold"><span>Troco:</span><span>${formatCurrency(parseFloat(change))}</span></div>
                    ` : ''}
                    
                    ${saleData.signature ? `
                        <div class="sig">
                            <img src="${saleData.signature}" class="signature" />
                            <div>Assinatura do Cliente</div>
                            <div style="font-size: 8px; margin-top: 2px;">Concordo com os termos de garantia.</div>
                        </div>
                    ` : ''}

                    <div class="line"></div>
                    <div class="center footer">
                        Obrigado pela preferência!<br/>
                        www.precifica.ai
                    </div>
                </body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 800);
    };


    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 p-2 overflow-hidden items-stretch text-slate-700 dark:text-slate-200">

            {/* COLUMN 1: CATEGORY SIDEBAR (SLIM) */}
            <div className="hidden lg:flex w-20 flex-col items-center py-6 gap-6 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/10/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm dark:shadow-slate-900/50">
                <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg dark:shadow-slate-900/50 shadow-amber-500/20">
                    <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar py-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            title={cat}
                            className={cn(
                                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative group",
                                selectedCategory === cat
                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-110"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-amber-500/10 hover:text-amber-500"
                            )}
                        >
                            <Box className="w-5 h-5" />
                            <div className="absolute left-16 px-3 py-1 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {cat}
                            </div>
                            {selectedCategory === cat && <div className="absolute -right-2 w-1.5 h-6 bg-amber-500 rounded-full" />}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setIsCashierModalOpen(true)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm dark:shadow-slate-900/50"
                    title="Gestão de Caixa"
                >
                    <Wallet className="w-5 h-5" />
                </button>
            </div>

            {/* COLUMN 2: SEARCH & PRODUCT GRID */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Search Header */}
                <div className="flex gap-4 items-center bg-white dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-200 dark:border-white/10/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm dark:shadow-slate-900/50">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        </div>
                        <input
                            ref={searchInputRef}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar produto ou bipar código (F1)..."
                            className="w-full bg-white dark:bg-slate-900 dark:bg-slate-800 border-none rounded-2xl pl-14 pr-4 py-5 text-lg font-bold text-slate-700 dark:text-slate-200 dark:text-white outline-none ring-2 ring-slate-100 dark:ring-slate-800 focus:ring-4 focus:ring-amber-500/20 transition-all shadow-sm dark:shadow-slate-900/50"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center gap-3">
                            {parkedCarts.length > 0 && (
                                <button
                                    onClick={() => setCashierAction('parked')}
                                    className="flex items-center gap-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-amber-200/50 dark:border-amber-500/20 animate-pulse"
                                >
                                    <History className="w-4 h-4" /> {parkedCarts.length} Carrinhos
                                </button>
                            )}
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Modo Rápido
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={parkCart}
                        title="Estacionar (Pausar Venda)"
                        className="p-5 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-400 hover:text-amber-500 rounded-2xl border border-slate-200 dark:border-white/10/50 dark:border-slate-800 transition-all hover:scale-105 active:scale-95 shadow-sm dark:shadow-slate-900/50"
                    >
                        <Coffee className="w-6 h-6" />
                    </button>

                    <div className={cn(
                        "flex items-center gap-4 pl-6 border-l dark:border-slate-800",
                        !session && "opacity-50"
                    )}>
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operador</p>
                            <p className="text-sm font-black dark:text-white">{userProfile?.name || 'Vendedor'}</p>
                        </div>
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border-2",
                            session ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/30 text-emerald-600" : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/30 text-red-600"
                        )}>
                            {session ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                        </div>
                    </div>
                </div>

                {/* Mobile Categories (Small screen only) */}
                <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-all",
                                selectedCategory === cat ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10/50 dark:border-slate-800/50 shadow-sm dark:shadow-slate-900/50 backdrop-blur-md overflow-hidden">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                                <Loader2 className="w-12 h-12 animate-spin text-amber-500 mb-4" />
                                <p className="font-black uppercase tracking-widest text-xs">Carregando Vitrine...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-30">
                                <Box className="w-20 h-20 mb-4" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhum produto encontrado</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {filteredProducts.map(product => {
                                    const sellingPrice = parseFloat(product.price || product.cost * 1.2);
                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            disabled={product.quantity <= 0 || !session}
                                            className="group relative bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl p-4 transition-all hover:scale-[1.02] active:scale-100 hover:shadow-xl dark:shadow-slate-900/50 hover:shadow-amber-500/10 border border-slate-100 dark:border-slate-700/50 text-left flex flex-col h-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className={cn(
                                                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                    product.quantity > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {product.quantity > 0 ? `${product.quantity} Disponível` : 'Esgotado'}
                                                </div>
                                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 dark:bg-slate-700 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <h4 className="font-black text-slate-800 dark:text-slate-100 dark:text-white text-xs leading-5 line-clamp-2 uppercase tracking-tight mb-1">{product.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{product.category}</p>
                                            </div>
                                            <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                                                <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                                    {formatCurrency(sellingPrice)}
                                                </p>
                                                {product.storage && (
                                                    <span className="text-[9px] font-black text-slate-400">{product.storage}GB</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* COLUMN 3: POS TICKET / CART SIDEBAR */}
            <div className="w-full lg:w-[440px] flex flex-col h-full bg-slate-950 rounded-[3rem] shadow-2xl dark:shadow-slate-900/50 relative overflow-hidden border-4 border-slate-900">
                {/* Status Overlay */}
                {!session && (
                    <div className="absolute inset-0 bg-slate-950/80 z-[60] flex flex-col items-center justify-center p-10 text-center backdrop-blur-md">
                        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mb-6 border border-red-500/30">
                            <Lock className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Terminal Bloqueado</h3>
                        <p className="text-slate-400 text-sm mb-10 font-medium">Você precisa iniciar uma sessão de caixa para realizar vendas.</p>
                        <button
                            onClick={() => { setCashierAction('open'); setIsCashierModalOpen(true); }}
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl dark:shadow-slate-900/50 shadow-emerald-500/20 transition-all hover:scale-105"
                        >
                            Abrir Caixa Agora
                        </button>
                    </div>
                )}

                {/* Ticket Header */}
                <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-900">
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-amber-500" />
                            CUPOM FISCAL
                        </h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Smart v1.0 • Checkout Rápido</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens</p>
                        <p className="text-xl font-black text-amber-500">{cart.length}</p>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 custom-scrollbar-dark">
                    {cart.map((item, idx) => (
                        <div key={item.id} className="group relative">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    <h4 className="font-black text-sm text-slate-200 leading-tight uppercase group-hover:text-amber-400 transition-colors">{item.name}</h4>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest">{item.category}</p>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 bg-slate-900 rounded-xl px-2 py-1">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 text-slate-500 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                                    <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 text-slate-500 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">{formatCurrency(item.sellingPrice)} un</p>
                                    <p className="font-black text-white text-md tracking-tight">{formatCurrency(item.quantity * item.sellingPrice)}</p>
                                </div>
                            </div>
                            <div className="mt-2 border-b border-slate-900 border-dashed" />
                        </div>
                    ))}

                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20 group">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                <Box className="w-10 h-10 text-white" />
                            </div>
                            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Aguardando Itens</p>
                        </div>
                    )}
                </div>

                {/* Checkout Summary Panel */}
                <div className="bg-slate-900 p-8 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-slate-800/50">
                    <div className="space-y-4 mb-8">
                        {/* Searchable Client Input */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center">
                                <UserCheck className="w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                            </div>
                            <input
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="Cliente (Ex: João ou @instagram)"
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-500/50 placeholder:text-slate-700 dark:text-slate-200 transition-all shadow-inner"
                            />
                        </div>

                        {/* Totals Breakdown */}
                        <div className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800/50 space-y-3 shadow-inner">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-widest">
                                <span>Subtotal</span>
                                <span>{formatCurrency(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-3 h-3 text-red-500" />
                                    <span className="text-[10px] font-black uppercase text-red-500/50 tracking-widest">Desconto</span>
                                </div>
                                <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                                    <span className="text-[10px] text-red-500 font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={discount}
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                        className="w-16 bg-transparent text-right outline-none font-black text-red-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-800/50 flex justify-between items-end">
                                <div className="flex flex-col uppercase tracking-tighter">
                                    <span className="text-[10px] font-black text-slate-500 leading-none">Venda Total</span>
                                    <span className="text-3xl font-black text-amber-500 italic leading-none">R$</span>
                                </div>
                                <div className="text-4xl font-black text-white italic tracking-tighter">
                                    {formatCurrency(finalTotal).replace('R$', '')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Sections */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] ml-1">Forma de Pagamento</p>
                            <button
                                onClick={addPaymentEntry}
                                className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                            >
                                + Múltiplos
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                            {paymentEntries.map((entry, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 group relative transition-all hover:bg-slate-950 focus-within:ring-2 focus-within:ring-amber-500/30">
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-slate-900 rounded-xl px-3 flex items-center gap-2">
                                            {entry.method === 'pix' && <QrCode className="w-4 h-4 text-emerald-500" />}
                                            {entry.method === 'card' && <CreditCard className="w-4 h-4 text-blue-500" />}
                                            {entry.method === 'cash' && <DollarSign className="w-4 h-4 text-amber-500" />}
                                            <select
                                                value={entry.method}
                                                onChange={e => updatePaymentEntry(idx, 'method', e.target.value)}
                                                className="flex-1 bg-transparent text-white border-none outline-none font-black text-[10px] uppercase py-2 cursor-pointer"
                                            >
                                                <option value="pix">PIX Instantâneo</option>
                                                <option value="card">Cartão (Débito/Crédito)</option>
                                                <option value="cash">Dinheiro em Espécie</option>
                                                <option value="transfer">T. Bancária / TED</option>
                                                <option value="store_credit">Crédito Interno</option>
                                            </select>
                                        </div>
                                        <div className="w-1/3 bg-slate-900 rounded-xl px-3 py-2 flex items-center">
                                            <input
                                                type="number"
                                                value={entry.amount}
                                                onChange={e => updatePaymentEntry(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent text-white border-none outline-none font-black text-xs text-right"
                                            />
                                        </div>
                                        {paymentEntries.length > 1 && (
                                            <button onClick={() => removePaymentEntry(idx)} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </div>

                                    {entry.method === 'card' && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-xl">
                                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Parcelas:</span>
                                            <select
                                                value={entry.installments}
                                                onChange={e => updatePaymentEntry(idx, 'installments', parseInt(e.target.value))}
                                                className="bg-transparent text-[10px] font-black text-blue-400 outline-none uppercase"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}x Sem Juros</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {entry.method === 'cash' && (
                                        <div className="grid grid-cols-2 gap-3 px-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter mb-1">Valor Recebido</span>
                                                <input
                                                    type="number"
                                                    value={receivedAmount}
                                                    onChange={e => setReceivedAmount(e.target.value)}
                                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-black text-xs outline-none focus:border-emerald-500/50"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter mb-1">Troco à Devolver</span>
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-emerald-500 font-black text-xs">
                                                    {formatCurrency(change)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Serial/IMEI Picker if applicable */}
                                    {paymentEntries.length < 2 && cart.some(i => i.imeis?.length > 0) && (
                                        <div className="px-1 border-t border-slate-900/50 pt-2 mt-1">
                                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Vincular IMEIs/Seriais:</p>
                                            <div className="space-y-1">
                                                {cart.filter(i => i.imeis?.length > 0).map(item => (
                                                    <div key={item.id} className="flex items-center justify-between gap-2">
                                                        <span className="text-[9px] text-slate-400 truncate max-w-[120px] font-bold">{item.name}</span>
                                                        <select
                                                            value={item.selectedIMEI || ''}
                                                            onChange={(e) => {
                                                                setCart(prev => prev.map(p => p.id === item.id ? { ...p, selectedIMEI: e.target.value } : p));
                                                            }}
                                                            className="bg-slate-900 text-[10px] font-black text-amber-500 border-none outline-none py-1 rounded"
                                                        >
                                                            <option value="">Selecionar Serial...</option>
                                                            {item.imeis.map(imei => (
                                                                <option key={imei} value={imei}>{imei}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Final Actions */}
                    <div className="mt-8 space-y-4">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSignatureModal(true)}
                                className={cn(
                                    "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex flex-col items-center gap-1",
                                    signature ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10" : "bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400"
                                )}
                            >
                                <PenTool className="w-5 h-5 mb-1" />
                                {signature ? 'Assinado' : 'Contrato/Garantia'}
                            </button>
                            <button
                                onClick={() => showToast("PIX Dinâmico com Webhook...", "info")}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-950 border border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-all flex flex-col items-center gap-1"
                            >
                                <QrCode className="w-5 h-5 mb-1 text-indigo-500" />
                                Pix Dinâmico
                            </button>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || isCheckingOut || totalRemaining() > 0.01}
                            className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl dark:shadow-slate-900/50 shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                        >
                            {isCheckingOut ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span className="text-xl">Finalizar Venda</span>
                                    <div className="bg-slate-950/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                                        <Printer className="w-6 h-6" />
                                    </div>
                                </>
                            )}
                        </button>
                        <p className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-50">Atalho rápido: pressione F5 para finalizar</p>
                    </div>
                </div>
            </div>

            {/* Modals & Overlays (Unchanged Logic, styled) */}
            {isCashierModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center backdrop-blur-xl p-6">
                    <form onSubmit={handleCashierAction} className="bg-white dark:bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
                            <Wallet className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
                            {cashierAction === 'open' ? 'Abrir Caixa' :
                                cashierAction === 'close' ? 'Fechar Turno' :
                                    cashierAction === 'sangria' ? 'Sangria (Saída)' : 'Suprimento (Entrada)'}
                        </h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium">Informe o valor para registro no fluxo de caixa da unidade.</p>

                        <div className="space-y-6">
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-white dark:bg-slate-900 dark:bg-slate-950 px-2 text-[10px] font-black text-amber-500 uppercase tracking-widest z-10">Valor de Abertura (R$)</label>
                                <input
                                    type="number" step="0.01" required autoFocus
                                    value={cashierAmount} onChange={e => setCashierAmount(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-5 text-3xl font-black outline-none focus:border-amber-500 transition-all"
                                    placeholder="0,00"
                                />
                            </div>
                            {cashierAction !== 'open' && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Motivo / Observação</label>
                                    <textarea
                                        value={cashierNote} onChange={e => setCashierNote(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-amber-500 transition-all h-24 resize-none"
                                        placeholder="Ex: Pagamento de fornecedor, almoço, troca..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-10">
                            <button type="button" onClick={() => setIsCashierModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 dark:bg-slate-900 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-800">Voltar</button>
                            <button type="submit" className="flex-1 py-5 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl dark:shadow-slate-900/50 shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95">Confirmar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Upsell Modal */}
            {showUpsellModal && (
                <div className="fixed inset-0 bg-slate-950/80 z-[250] flex items-center justify-center backdrop-blur-md p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl dark:shadow-slate-900/50 border-4 border-amber-500 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <Zap className="w-40 h-40" />
                        </div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-amber-500 rounded-2xl text-white shadow-xl dark:shadow-slate-900/50 shadow-amber-500/30">
                                <Smile className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Oportunidade de Upsell!</h3>
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">Aumente o Ticket desta Venda</p>
                            </div>
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                            O cliente está levando um smartphone. Que tal oferecer:
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {[
                                { icon: Shield, label: 'Proteção Nano', price: '99', color: 'indigo' },
                                { icon: Smartphone, label: 'Capa Premium', price: '59', color: 'pink' },
                                { icon: Headphones, label: 'AirPods Gen 3', price: '249', color: 'blue' },
                                { icon: Zap, label: 'Carga Rápida', price: '129', color: 'amber' }
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        addToCart({ id: `upsell-${i}`, name: item.label, category: 'Acessórios', cost: 10, price: item.price, quantity: 100 });
                                        setShowUpsellModal(false);
                                    }}
                                    className="p-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left bg-slate-50 dark:bg-slate-950 dark:bg-slate-800/50 flex flex-col items-start gap-2 active:scale-95"
                                >
                                    <item.icon className={`w-6 h-6 text-${item.color}-500 mb-1`} />
                                    <p className="font-black text-xs uppercase tracking-tight dark:text-white">{item.label}</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(item.price)}</p>
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setShowUpsellModal(false)} className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Pular Ofertas</button>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center backdrop-blur-xl p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl dark:shadow-slate-900/50 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg dark:shadow-slate-900/50">
                                    <PenTool className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Assinatura Digital</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Formalização de Garantia e Entrega</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSignatureModal(false)} className="p-2 text-slate-300 hover:text-slate-600 dark:text-slate-300 transition-colors"><X className="w-8 h-8" /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 rounded-[2rem] p-4 mb-4">
                            <canvas
                                ref={el => {
                                    if (el) {
                                        signatureCanvasRef.current = el;
                                        setupSignatureCanvas(el);
                                    }
                                }}
                                width={600} height={300}
                                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-inner cursor-crosshair h-[300px]"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button onClick={clearSignature} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Limpar</button>
                            <button onClick={saveSignature} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl dark:shadow-slate-900/50 shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">Confirmar Assinatura</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Feature 4: Parked Carts Modal */}
            {cashierAction === 'parked' && (
                <div className="fixed inset-0 bg-slate-950/90 z-[400] flex items-center justify-center backdrop-blur-xl p-6">
                    <div className="bg-white dark:bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
                            <History className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Carrinhos Estacionados</h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium">Retome uma venda pausada anteriormente.</p>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-dark">
                            {parkedCarts.length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <Coffee className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma pausa ativa</p>
                                </div>
                            )}
                            {parkedCarts.map(p => (
                                <div key={p.id} className="bg-slate-50 dark:bg-slate-950 dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-amber-500/50 transition-all">
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.cart.length} itens • {formatCurrency(p.cart.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0) - (p.discount || 0))}</p>
                                    </div>
                                    <button
                                        onClick={() => resumeCart(p)}
                                        className="bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-amber-500/20 hover:scale-105 transition-all"
                                    >
                                        Retomar
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setCashierAction('open')} className="w-full mt-8 py-5 bg-slate-100 dark:bg-slate-800 dark:bg-slate-900 dark:text-slate-400 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
