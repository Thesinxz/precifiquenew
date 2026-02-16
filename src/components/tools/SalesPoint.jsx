import { useState, useEffect, useMemo } from 'react';
import { StockService } from '../../services/stockService';
import { ClientService } from '../../services/clientService';
import { SalesService } from '../../services/salesService';
import { useToast } from '../ui/Toast';
import {
    Search, ShoppingCart, Plus, Minus, Trash2,
    CreditCard, Banknote, Smartphone, Check,
    User, Loader2, DollarSign, Box
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { TradeInService } from '../../services/tradeInService';
import { RefreshCw } from 'lucide-react'; // Icon for Trade-In

export function SalesPoint({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    // Data
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cart
    const [cart, setCart] = useState([]);

    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Checkout
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('pix'); // pix, card, cash
    const [installments, setInstallments] = useState(1);
    const [discount, setDiscount] = useState(0);

    // Trade-In State
    const [isTradeInModalOpen, setIsTradeInModalOpen] = useState(false);
    const [tradeInItem, setTradeInItem] = useState(null); // { name, capacity, battery, condition, cost }
    const [tradeInData, setTradeInData] = useState({
        name: 'iPhone ',
        capacity: '128GB',
        battery: '100',
        condition: 'Seminovo',
        cost: 0
    });

    useEffect(() => {
        if (orgId) loadData();
    }, [orgId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [stockData, clientsData] = await Promise.all([
                StockService.getStock(orgId),
                ClientService.getClients(user.uid)
            ]);
            setProducts(stockData);
            setClients(clientsData);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar dados.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                if (existing.quantity >= product.quantity) {
                    showToast("Estoque insuficiente.", "error");
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...product, quantity: 1, originalPrice: product.cost * 1.2 }]; // Mock price logic if not set
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(1, p.quantity + delta);
                const stockItem = products.find(prod => prod.id === id);
                if (stockItem && newQty > stockItem.quantity) {
                    showToast("Limite de estoque atingido.", "error");
                    return p;
                }
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!selectedClientId) return showToast("Selecione um cliente.", "error");

        setIsCheckingOut(true);
        try {
            const client = clients.find(c => c.id === selectedClientId);
            const tradeInValue = tradeInItem ? parseFloat(tradeInItem.cost) : 0;
            const subtotal = cart.reduce((acc, p) => acc + (p.originalPrice * p.quantity), 0);
            const total = Math.max(0, subtotal - discount - tradeInValue);

            const saleData = {
                client,
                items: cart,
                total,
                subtotal,
                discount,
                paymentMethod,
                installments,
                type: 'sale',
                hasTradeIn: !!tradeInItem,
                settings: settings
            };

            if (tradeInItem) {
                // Prepare Trade-In Stock Item Data
                const newStockItem = {
                    name: tradeInItem.name,
                    category: 'iPhone Seminovos', // Default category
                    details: `${tradeInItem.capacity} | Saúde Bateria: ${tradeInItem.battery}% | ${tradeInItem.condition}`,
                    cost: parseFloat(tradeInItem.cost),
                    pixPrice: parseFloat(tradeInItem.cost) * 1.3, // 30% markup default suggestion
                    quantity: 1
                };
                await TradeInService.processTradeInSale(user.uid, orgId, saleData, newStockItem);
            } else {
                await SalesService.createSale(user.uid, orgId, saleData);
            }

            showToast("Venda finalizada com sucesso!", "success");
            setCart([]);
            setDiscount(0);
            setTradeInItem(null);
            setSelectedClientId('');
            loadData();
        } catch (error) {
            console.error(error);
            showToast("Erro ao finalizar venda.", "error");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleAddTradeIn = (e) => {
        e.preventDefault();
        setTradeInItem(tradeInData);
        setIsTradeInModalOpen(false);
        showToast("Trade-In adicionado!", "success");
    };

    // --- Filtering ---
    const categories = ['Todos', ...new Set(products.map(p => p.category))];
    const filteredProducts = products.filter(p =>
        (selectedCategory === 'Todos' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.details?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const cartTotal = cart.reduce((acc, p) => acc + (p.originalPrice * p.quantity), 0);
    const tradeInValue = tradeInItem ? parseFloat(tradeInItem.cost) : 0;
    const finalTotal = Math.max(0, cartTotal - discount - tradeInValue);

    return (
        <div className="h-[calc(100vh-2rem)] flex gap-6 overflow-hidden animate-in fade-in">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Box className="w-6 h-6 text-indigo-600" />
                            PDV / Vendas
                        </h2>
                        <div className="relative group w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar produtos..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                    selectedCategory === cat ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={product.quantity <= 0}
                                    className="bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-100 border border-slate-100 p-4 rounded-2xl transition-all text-left flex flex-col group relative disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md", product.quantity > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                            {product.quantity > 0 ? `Estoque: ${product.quantity}` : 'Esgotado'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium line-clamp-1 mb-3">{product.details || 'Sem detalhes'}</p>
                                    <div className="mt-auto">
                                        <p className="text-[10px] uppercase font-black text-slate-400">Preço Sugerido</p>
                                        <p className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {formatCurrency(product.cost * 1.2)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Checkout */}
            <div className="w-96 flex flex-col bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-900 text-white">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-400" />
                        Carrinho ({cart.length})
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {cart.map(item => (
                        <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{item.name}</h4>
                                <p className="text-[10px] font-bold text-indigo-600">{formatCurrency(item.originalPrice)}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus className="w-3 h-3" /></button>
                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="ml-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <ShoppingCart className="w-12 h-12 mb-2" />
                            <p className="text-xs font-bold uppercase">Carrinho Vazio</p>
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                    {/* Client Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Cliente</label>
                        <select
                            value={selectedClientId}
                            onChange={e => setSelectedClientId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                        >
                            <option value="">Selecione...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-red-500">
                            <span>Desconto</span>
                            <input
                                type="number"
                                value={discount}
                                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-16 text-right bg-red-50 rounded-lg px-1 outline-none text-red-600"
                            />
                        </div>

                        {/* Trade-In Row */}
                        {tradeInItem && (
                            <div className="flex justify-between text-xs font-bold text-emerald-600">
                                <div className="flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Troca (Trade-In)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-normal line-through">{tradeInItem.name}</span>
                                    <span>- {formatCurrency(tradeInItem.cost)}</span>
                                    <button onClick={() => setTradeInItem(null)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        )}

                        {!tradeInItem && (
                            <button
                                onClick={() => setIsTradeInModalOpen(true)}
                                className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 w-full text-right py-1"
                            >
                                + Adicionar Troca
                            </button>
                        )}
                        <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-slate-100">
                            <span>Total</span>
                            <span>{formatCurrency(finalTotal)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isCheckingOut}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Finalizar Venda
                    </button>
                </div>
            </div>


            {/* Trade In Modal */}
            {
                isTradeInModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
                        <form onSubmit={handleAddTradeIn} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <RefreshCw className="w-6 h-6 text-indigo-600" />
                                    Adicionar Troca
                                </h3>
                                <button type="button" onClick={() => setIsTradeInModalOpen(false)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Modelo</label>
                                    <input
                                        required
                                        value={tradeInData.name}
                                        onChange={e => setTradeInData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        placeholder="Ex: iPhone 11"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Capacidade</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none"
                                            value={tradeInData.capacity}
                                            onChange={e => setTradeInData(prev => ({ ...prev, capacity: e.target.value }))}
                                        >
                                            {['64GB', '128GB', '256GB', '512GB', '1TB'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Bateria %</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none"
                                            value={tradeInData.battery}
                                            onChange={e => setTradeInData(prev => ({ ...prev, battery: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Valor de Avaliação (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-black text-emerald-700 outline-none text-xl"
                                        value={tradeInData.cost}
                                        onChange={e => setTradeInData(prev => ({ ...prev, cost: e.target.value }))}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-lg">
                                Confirmar Avaliação
                            </button>
                        </form>
                    </div>
                )
            }
        </div >
    );
}
