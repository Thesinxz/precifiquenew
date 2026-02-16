import { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Send,
    Search,
    User,
    Clock,
    CheckCheck,
    MoreVertical,
    Phone,
    ShoppingCart,
    Filter,
    ChevronLeft,
    Trash2,
    CheckCircle,
    XCircle,
    Check
} from 'lucide-react';
import { db } from '../../lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    serverTimestamp
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '../../lib/utils';

export function InboxPage({ user, userProfile }) {
    const [chats, setChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'leads'
    const [leads, setLeads] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef(null);

    const organizationId = userProfile?.organizationId || user.uid;

    // Listen to Chats
    useEffect(() => {
        if (!organizationId) return;

        // Query chats for this organization, ordered by last update
        const q = query(
            collection(db, 'chats'),
            where('organizationId', '==', organizationId),
            orderBy('lastUpdated', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatsData);
        }, (err) => {
            console.error("Error fetching chats:", err);
        });

        return () => unsubscribe();
    }, [organizationId]);

    // Listen to Leads
    useEffect(() => {
        if (!organizationId || activeTab !== 'leads') return;

        const q = query(
            collection(db, 'leads'),
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLeads(leadsData);
        }, (err) => {
            console.error("Error fetching leads:", err);
        });

        return () => unsubscribe();
    }, [organizationId, activeTab]);

    // Derived State
    const selectedChat = chats.find(c => c.id === selectedChatId);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedChat?.messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChatId) return;

        const text = messageInput.trim();
        setMessageInput('');

        try {
            const chatRef = doc(db, 'chats', selectedChatId);

            const newMessage = {
                id: Date.now().toString(),
                text,
                sender: 'agent', // 'agent' = CRM user
                senderName: userProfile?.name || 'Atendente',
                timestamp: Date.now()
            };

            await updateDoc(chatRef, {
                messages: arrayUnion(newMessage),
                lastMessage: text,
                lastUpdated: serverTimestamp(),
                readBy: ['agent'] // Reset read status
            });
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Erro ao enviar mensagem.");
        }
    };

    const filteredChats = chats.filter(chat =>
        (chat.customerName || 'Visitante').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLeads = leads.filter(lead =>
        (lead.customerData?.name || lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.productName || lead.modelInterest || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpdateLead = async (leadId, updates) => {
        try {
            const leadRef = doc(db, 'leads', leadId);
            await updateDoc(leadRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (!confirm("Excluir este lead permanentemente?")) return;
        try {
            await deleteDoc(doc(db, 'leads', leadId));
        } catch (error) {
            console.error("Error deleting lead:", error);
        }
    };

    const handleEndChat = async () => {
        if (!selectedChatId || !confirm("Deseja finalizar este atendimento? O cliente será notificado.")) return;
        try {
            await updateDoc(doc(db, 'chats', selectedChatId), {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: userProfile?.name || 'Atendente'
            });
            // Optional: Send a system message
            await updateDoc(doc(db, 'chats', selectedChatId), {
                messages: arrayUnion({
                    id: Date.now().toString(),
                    text: 'Atendimento encerrado pelo operador.',
                    sender: 'system',
                    timestamp: Date.now()
                })
            });
            setSelectedChatId(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[85vh] md:h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-slate-900/50 overflow-hidden border border-slate-100 max-w-full">
            {/* Sidebar List */}
            <div className={cn("w-full md:w-80 border-r border-slate-100 flex-col bg-slate-50", selectedChatId ? "hidden md:flex" : "flex")}>
                <div className="p-4 border-b border-slate-100 space-y-4">
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", activeTab === 'chats' ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}
                        >
                            Chats
                        </button>
                        <button
                            onClick={() => setActiveTab('leads')}
                            className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", activeTab === 'leads' ? "bg-amber-500 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}
                        >
                            Checkouts
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={activeTab === 'chats' ? "Buscar conversa..." : "Buscar leads..."}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm dark:shadow-slate-900/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'chats' ? (
                        filteredChats.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p className="text-sm">Nenhuma conversa encontrada.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredChats.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChatId(chat.id)}
                                        className={`w-full p-4 text-left hover:bg-white transition-colors flex gap-3 ${selectedChatId === chat.id ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                    {chat.customerName || `Visitante #${chat.id.slice(-4)}`}
                                                </span>
                                                {chat.lastUpdated && (
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                        {format(chat.lastUpdated?.toDate ? chat.lastUpdated.toDate() : new Date(), 'HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate font-medium">
                                                {chat.lastMessage || 'Nova conversa iniciada'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        /* LEADS LIST */
                        leads.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhum checkout abandonado.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredLeads.map(lead => (
                                    <div key={lead.id} className="p-4 bg-white dark:bg-slate-900 border-b border-slate-50 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {lead.customerData?.name || lead.name || 'Interessado'}
                                                </span>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-wider w-fit px-1.5 py-0.5 rounded mt-1",
                                                    lead.status === 'contatado' ? "bg-blue-100 text-blue-600" :
                                                        lead.status === 'vendido' ? "bg-emerald-100 text-emerald-600" :
                                                            lead.status === 'perdido' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                                )}>
                                                    {lead.status || 'Novo'}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleUpdateLead(lead.id, { status: lead.status === 'vendido' ? 'novo' : 'vendido' })}
                                                    className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg"
                                                    title="Marcar como Vendido"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-lg"
                                                    title="Excluir Lead"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                                            {[
                                                { label: "Opa! Vi que gostou...", msg: (name, prod) => `Olá ${name}! Vi que você se interessou pelo ${prod}. Ainda tem interesse?` },
                                                { label: "10% de desconto!", msg: (name, prod) => `Oi ${name}! Só hoje o ${prod} está com 10% OFF se fecharmos agora! Topa?` },
                                                { label: "Dúvidas?", msg: (name, prod) => `Olá ${name}! Ficou com alguma dúvida sobre o ${prod}? Me avise!` }
                                            ].map((tpl, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        const name = lead.customerData?.name || lead.name || 'Cliente';
                                                        const phone = (lead.customerData?.phone || lead.phone || '').replace(/\D/g, '');
                                                        const product = lead.productName || lead.modelInterest || 'nosso produto';
                                                        const text = tpl.msg(name, product);
                                                        handleUpdateLead(lead.id, { status: 'contatado' });
                                                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded text-[8px] font-black uppercase tracking-wider whitespace-nowrap transition-colors"
                                                >
                                                    {tpl.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            <p className="text-xs text-slate-500 font-bold">
                                                📱 {lead.customerData?.phone || lead.phone || 'S/ Tel'}
                                            </p>
                                            <p className="text-xs text-indigo-500 font-black">
                                                📦 {lead.productName || lead.modelInterest || 'Produto s/ nome'}
                                            </p>
                                            {lead.updatedAt && (
                                                <p className="text-[9px] text-slate-400">
                                                    Última ação: {format(lead.updatedAt.toDate ? lead.updatedAt.toDate() : new Date(lead.updatedAt), 'HH:mm dd/MM', { locale: ptBR })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const name = lead.customerData?.name || lead.name || 'Cliente';
                                                    const phone = (lead.customerData?.phone || lead.phone || '').replace(/\D/g, '');
                                                    const product = lead.productName || lead.modelInterest || 'nosso produto';
                                                    handleUpdateLead(lead.id, { status: 'contatado' });
                                                    window.open(`https://wa.me/55${phone}?text=Olá ${name}! Vimos que você se interessou pelo ${product} em nossa vitrine. Ficou com alguma dúvida?`, '_blank');
                                                }}
                                                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm dark:shadow-slate-900/50 active:scale-95 transition-all"
                                            >
                                                <Phone className="w-3 h-3" /> Recuperar Lead
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={cn("flex-1 flex-col bg-[#FDFDFD] relative", !selectedChatId ? "hidden md:flex" : "flex")}>
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 -ml-2 text-slate-400">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {selectedChat.customerName || `Visitante #${selectedChat.id.slice(-4)}`}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <p className="text-xs text-slate-500">Ativo na loja</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedChat.customerPhone && (
                                    <button
                                        onClick={() => window.open(`https://wa.me/${selectedChat.customerPhone}`, '_blank')}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Abrir WhatsApp"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleEndChat}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" /> Encerrar
                                </button>
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                            {selectedChat.messages?.map((msg, idx) => {
                                const isMe = msg.sender === 'agent';
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] md:max-w-[60%] rounded-2xl p-3 md:p-4 shadow-sm break-words ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                            }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {format(new Date(msg.timestamp), 'HH:mm')}
                                                {isMe && <CheckCheck className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies Bar */}
                        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-black text-slate-400 uppercase flex items-center shrink-0">Respostas Rápidas:</span>
                            {[
                                "Olá! Como posso te ajudar hoje?",
                                "Qual seria o modelo do seu interesse?",
                                "Temos esse produto em estoque! Deseja reservar?",
                                "O fechamento pode ser feito via PIX com desconto.",
                                "Pode me enviar uma foto do seu aparelho?"
                            ].map((text, i) => (
                                <button
                                    key={i}
                                    onClick={() => setMessageInput(text)}
                                    className="px-3 py-1 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border border-slate-100 hover:border-indigo-100"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 flex gap-3">
                            <input
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Digite sua resposta..."
                                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!messageInput.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 transition-all flex items-center justify-center aspect-square"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-400">Nenhuma conversa selecionada</h3>
                        <p className="max-w-xs text-center mt-2">Selecione um cliente na lista ao lado para iniciar o atendimento.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
