import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import {
    Image, Download, Palette, Type, Smartphone, Instagram, Share2, Layout, Sparkles, Check, Search, Package, Megaphone, Users, Send, Zap, Copy, MessageSquare, Loader2
} from 'lucide-react';
import { StockService } from '../../services/stockService';
import { ClientService } from '../../services/clientService'; // Assuming this exists or I'll stub it
import { formatCurrency, cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { WhatsappService } from '../../services/whatsappService';

export function MarketingPage({ user, userProfile }) {
    const { showToast } = useToast();
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('social'); // 'social' | 'broadcast'

    // --- Social Card State ---
    const [product, setProduct] = useState({
        name: 'iPhone 15 Pro Max',
        storage: '256GB',
        color: 'Natural Titanium',
        pixPrice: 7499,
        twelvePrice: 8299,
        condition: 'Grade A+'
    });
    const [theme, setTheme] = useState('modern');
    const [showStockSearch, setShowStockSearch] = useState(false);
    const [stock, setStock] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Broadcast State ---
    const [audience, setAudience] = useState('all'); // all, leads, recent
    const [messageText, setMessageText] = useState("Olá {nome}! 📱\n\nChegou reposição de iPhones aqui na loja! 🥳\n\nDá uma olhada no nosso catálogo atualizado.\nSe tiver interesse, me chama!");
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [broadcastQueue, setBroadcastQueue] = useState([]);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    useEffect(() => {
        if (user) {
            loadStock();
            loadClients();
        }
    }, [user]);

    // Use effects for filtering
    useEffect(() => {
        filterClients();
    }, [audience, clients]);

    const loadStock = async () => {
        try {
            const data = await StockService.getStock(user.uid);
            setStock(data);
        } catch (e) { console.error(e); }
    };

    const loadClients = async () => {
        setIsLoadingClients(true);
        try {
            // Simplified fetch for now - in real app, use pagination or specific queries
            const q = query(collection(db, 'clients'), where('organizationId', '==', userProfile?.organizationId || user?.uid));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClients(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingClients(false);
        }
    };

    const filterClients = () => {
        let filtered = [...clients];
        if (audience === 'leads') {
            filtered = filtered.filter(c => !c.lastPurchase); // Assuming clients w/o purchase are leads
        } else if (audience === 'recent') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            filtered = filtered.filter(c => c.lastPurchase?.toDate() > thirtyDaysAgo);
        }
        setFilteredClients(filtered);
    };

    // --- Social Card Functions ---
    const themes = {
        modern: { bg: 'bg-white', text: 'text-slate-900', sub: 'text-slate-500', card: 'bg-slate-50 border-slate-100', accent: 'bg-indigo-600' },
        midnight: { bg: 'bg-slate-900', text: 'text-white', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', accent: 'bg-indigo-500' },
        glass: { bg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', text: 'text-white', sub: 'text-indigo-100', card: 'bg-white/20 backdrop-blur-xl border-white/30', accent: 'bg-white text-indigo-600' },
        neon: { bg: 'bg-black', text: 'text-white', sub: 'text-emerald-400', card: 'bg-black border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]', accent: 'bg-emerald-500' },
        royal: { bg: 'bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500', text: 'text-slate-900', sub: 'text-amber-900', card: 'bg-white/40 backdrop-blur-md border-white/50 shadow-xl', accent: 'bg-slate-900 text-white' },
        ocean: { bg: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900', text: 'text-white', sub: 'text-blue-200', card: 'bg-white/10 backdrop-blur-lg border-white/20', accent: 'bg-cyan-400 text-slate-900' }
    };
    const currentTheme = themes[theme];

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, cacheBust: true });
            download(dataUrl, `post-${product.name.replace(/\s+/g, '-').toLowerCase()}.png`);
            showToast("Arte gerada com sucesso!", "success");
        } catch (err) { showToast("Erro ao gerar imagem.", "error"); } finally { setIsGenerating(false); }
    };

    const importFromStock = (item) => {
        setProduct({
            name: item.name, storage: item.storage || '', color: item.color || '',
            pixPrice: item.price || 0, twelvePrice: item.price12x || (item.price * 1.15),
            condition: item.condition === 'new' ? 'Lacrado' : 'Seminovo'
        });
        setShowStockSearch(false);
    };

    const filteredStock = stock.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- Broadcast Functions ---
    const startBroadcast = () => {
        setIsBroadcasting(true);
        sendNext(filteredClients[0], filteredClients.slice(1));
    };

    const sendNext = async (client, remaining) => {
        if (!client) {
            setIsBroadcasting(false);
            showToast("Campanha finalizada!", "success");
            return;
        }

        setBroadcastQueue([client, ...remaining]);

        const phone = client.phone?.replace(/\D/g, '');
        if (!phone) {
            sendNext(remaining[0], remaining.slice(1));
            return;
        }

        const msg = messageText.replace('{nome}', client.name?.split(' ')[0] || 'Cliente');
        const orgId = userProfile?.organizationId || user?.uid;

        const result = await WhatsappService.sendMessage(orgId, phone, msg);

        if (result.success && result.method === 'api') {
            // API Auto-Advance
            const nextClient = remaining[0];
            const nextRemaining = remaining.slice(1);
            setTimeout(() => {
                sendNext(nextClient, nextRemaining);
            }, Math.random() * 2000 + 1000);
        } else {
            // Manual Fallback Link
            if (result.link) window.open(result.link, '_blank');
        }
    };

    const handleNextBroadcast = () => {
        const remaining = broadcastQueue.slice(1);
        if (remaining.length === 0) {
            setIsBroadcasting(false);
            showToast("Campanha finalizada!", "success");
            return;
        }
        sendNext(remaining[0], remaining.slice(1));
    };

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-pink-500 fill-pink-500" />
                        Central de Marketing
                    </h1>
                    <p className="text-slate-500 font-medium">Crie campanhas e artes para vender mais.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-slate-900/50 inline-flex">
                    <button
                        onClick={() => setActiveTab('social')}
                        className={cn("px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === 'social' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600")}
                    >
                        <Instagram className="w-4 h-4" /> Artes Instagram
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={cn("px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === 'broadcast' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "text-slate-400 hover:text-slate-600")}
                    >
                        <MessageSquare className="w-4 h-4" /> Campanha WhatsApp
                    </button>
                </div>
            </header>

            {activeTab === 'social' ? (
                // --- Social Editor ---
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Editor Content */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Palette className="w-4 h-4" /> Estilo Visual</h3>
                                <button onClick={() => setShowStockSearch(true)} className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:underline">Importar Produto</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.keys(themes).map(t => (
                                    <button key={t} onClick={() => setTheme(t)} className={cn("p-4 rounded-2xl border-2 transition-all text-center", theme === t ? "border-indigo-600 bg-indigo-50" : "border-slate-100")}>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Type className="w-4 h-4" /> Detalhes</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-sm" placeholder="Nome" />
                                <input type="text" value={product.storage} onChange={e => setProduct({ ...product, storage: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-sm" placeholder="GB" />
                                <input type="number" value={product.pixPrice} onChange={e => setProduct({ ...product, pixPrice: parseFloat(e.target.value) })} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-sm" placeholder="Pix" />
                                <input type="number" value={product.twelvePrice} onChange={e => setProduct({ ...product, twelvePrice: parseFloat(e.target.value) })} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-sm" placeholder="12x" />
                            </div>
                        </div>

                        <button onClick={handleDownload} disabled={isGenerating} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-all shadow-xl dark:shadow-slate-900/50">
                            {isGenerating ? 'Gerando...' : 'Baixar Arte'}
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="flex justify-center sticky top-8">
                        <div ref={cardRef} className={cn("w-[400px] h-[400px] shadow-2xl overflow-hidden flex flex-col p-10 relative", currentTheme.bg)}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] -ml-32 -mb-32" />
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-auto">
                                    <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]", currentTheme.accent)}>{product.condition}</div>
                                    <Smartphone className={cn("w-6 h-6 opacity-30", currentTheme.text)} />
                                </div>
                                <div className="space-y-2 mb-8">
                                    <h4 className={cn("text-3xl font-black tracking-tighter leading-none", currentTheme.text)}>{product.name}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-sm font-bold opacity-60", currentTheme.text)}>{product.storage}</span>
                                        <div className={cn("w-1 h-1 rounded-full", currentTheme.accent)} />
                                        <span className={cn("text-sm font-bold opacity-60", currentTheme.text)}>{product.color}</span>
                                    </div>
                                </div>
                                <div className={cn("p-8 rounded-[2.5rem] border", currentTheme.card)}>
                                    <div className="space-y-1 mb-6">
                                        <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-50", currentTheme.text)}>À Vista no Pix</p>
                                        <p className={cn("text-5xl font-black tracking-tighter", currentTheme.text)}>{formatCurrency(product.pixPrice)}</p>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100/10 flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className={cn("text-[9px] font-black uppercase tracking-widest opacity-40", currentTheme.text)}>Ou parcelado</p>
                                            <p className={cn("text-lg font-black tracking-tight", currentTheme.text)}>12x de {formatCurrency(product.twelvePrice / 12)}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className={cn("mt-auto text-[10px] font-bold text-center opacity-30 tracking-[0.3em] uppercase", currentTheme.text)}>Oferta Especial</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- Broadcast Campaign ---
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        {/* Audience Selector */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4" /> Definir Público</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setAudience('all')} className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all", audience === 'all' ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-400")}>Todos ({clients.length})</button>
                                <button onClick={() => setAudience('leads')} className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all", audience === 'leads' ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-400")}>Leads</button>
                                <button onClick={() => setAudience('recent')} className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all", audience === 'recent' ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-400")}>Recentes</button>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Público Selecionado</span>
                                <span className="text-lg font-black text-slate-800 dark:text-slate-100">{filteredClients.length} contatos</span>
                            </div>
                        </div>

                        {/* Message Editor */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Megaphone className="w-4 h-4" /> Mensagem da Campanha</h3>
                            <textarea
                                value={messageText}
                                onChange={e => setMessageText(e.target.value)}
                                className="w-full h-40 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-sm outline-none focus:border-emerald-500 transition-all resize-none"
                                placeholder="Digite sua mensagem aqui..."
                            />
                            <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400">
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded cursor-pointer hover:bg-slate-200" onClick={() => setMessageText(prev => prev + ' {nome}')}>{'{nome}'}</span>
                                <span>Variáveis disponíveis para personalizar</span>
                            </div>
                        </div>
                    </div>

                    {/* Preview & Action */}
                    <div className="space-y-8">
                        <div className="bg-emerald-900 rounded-[3rem] p-8 relative overflow-hidden text-white min-h-[500px] flex flex-col items-center">
                            {/* WhatsApp Screen Simulation */}
                            <div className="w-12 h-1 bg-white dark:bg-slate-900/20 rounded-full mb-6 mx-auto" />
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-8">Pré-visualização</p>

                            <div className="w-full max-w-sm bg-[#e5ddd5] text-black p-4 rounded-2xl shadow-xl dark:shadow-slate-900/50 flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]" />
                                <div className="relative z-10 flex flex-col gap-2">
                                    <div className="self-end bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm dark:shadow-slate-900/50 max-w-[85%]">
                                        <p className="text-sm whitespace-pre-wrap">{messageText.replace('{nome}', 'Bruna')}</p>
                                        <p className="text-[10px] text-gray-500 text-right mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={startBroadcast}
                                disabled={filteredClients.length === 0}
                                className="w-full mt-8 py-5 rounded-3xl bg-white dark:bg-slate-900 text-emerald-900 font-black uppercase text-sm tracking-widest hover:scale-[1.02] transition-all shadow-xl dark:shadow-slate-900/50 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Zap className="w-5 h-5 inline mr-2 text-emerald-500" />
                                Iniciar Disparo ({filteredClients.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Broadcast Overlay */}
            {isBroadcasting && broadcastQueue.length > 0 && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] max-w-md w-full text-center border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-slate-900/50 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-t-[2rem] overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((filteredClients.length - broadcastQueue.length) / filteredClients.length) * 100}%` }} />
                        </div>
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4 mt-4" />
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Enviando Campanha 🚀</h3>
                        <p className="text-slate-500 mb-6">Não feche esta janela.</p>

                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-8">
                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Próximo da Lista</p>
                            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{broadcastQueue[0]?.name}</p>
                            <p className="text-sm text-slate-500">{broadcastQueue[0]?.phone}</p>
                        </div>

                        <button onClick={handleNextBroadcast} className="w-full py-4 rounded-xl font-black bg-emerald-500 text-white shadow-lg dark:shadow-slate-900/50 shadow-emerald-500/30 hover:bg-emerald-600 transition-all">
                            Enviar ({broadcastQueue.length} restantes)
                        </button>
                        <button onClick={() => setIsBroadcasting(false)} className="mt-4 text-xs font-bold text-slate-400 uppercase hover:text-rose-500">Cancelar Campanha</button>
                    </div>
                </div>
            )}

            {/* Stock Search Modal (Same as before) */}
            {showStockSearch && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStockSearch(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl dark:shadow-slate-900/50 overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">Importar Produto</h3>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
                            {filteredStock.map(item => (
                                <button key={item.id} onClick={() => importFromStock(item)} className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 rounded-2xl flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600">{item.name}</h4>
                                        <p className="text-xs text-slate-400">{item.storage} • {item.color}</p>
                                    </div>
                                    <span className="font-black text-emerald-500">{formatCurrency(item.price)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
