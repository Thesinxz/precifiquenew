import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Loader2, Phone, Headset } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';

export function SalesChatbot({ products, storeName = "Loja", contactPhone, organizationId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // User Data / Session
    const [userData, setUserData] = useState(null); // { name, phone }
    const [sessionId, setSessionId] = useState(null);
    const [isClosed, setIsClosed] = useState(false);

    // UI State
    const scrollRef = useRef(null);
    const [isFormView, setIsFormView] = useState(true);

    // Initialize/Load Session
    useEffect(() => {
        const storedSession = localStorage.getItem(`precifica_chat_session_${organizationId}`);
        if (storedSession) {
            setSessionId(storedSession);
            setIsFormView(false);
            // Optionally fetch user data if needed, but we mostly just need the ID to listen
        }
    }, [organizationId]);

    // Listen to Chat
    useEffect(() => {
        if (!sessionId || isFormView) return;

        const chatRef = doc(db, 'chats', sessionId);
        const unsubscribe = onSnapshot(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setUserData({ name: data.customerName, phone: data.customerPhone });
                if (data.status === 'closed') setIsClosed(true);

                // Format messages
                const history = (data.messages || []).map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    text: m.text,
                    timestamp: m.timestamp
                }));

                // If empty history, show welcome
                if (history.length === 0) {
                    setMessages([{
                        role: 'assistant',
                        text: `Olá ${data.customerName}! Em que posso ajudar hoje? Um de nossos atendentes entrará em contato em breve.`
                    }]);
                } else {
                    setMessages(history);
                }
            } else {
                // Session valid locally but doc missing (maybe deleted by admin)
                // We should probably reset or allow starting new
            }
        });

        return () => unsubscribe();
    }, [sessionId, isFormView]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isFormView]);

    const handleStartChat = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const phone = formData.get('phone');

        if (!name || !phone) return;

        setIsLoading(true);
        try {
            // Generate or Reuse ID (Using phone as part of ID avoids dupes slightly, but random is safer for privacy collisions. Let's use Random)
            // Actually, linking to phone is nice for history retrieval. 
            // Let's use a consistent ID if possible? No, privacy. Random ID + localStorage.
            let storedSessionId = localStorage.getItem(`precifica_chat_session_${organizationId}`);
            const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const finalId = storedSessionId || newSessionId;

            // Create/Update Doc
            await setDoc(doc(db, 'chats', finalId), {
                id: finalId,
                organizationId,
                status: 'open',
                customerName: name,
                customerPhone: phone,
                lastUpdated: serverTimestamp(),
                createdAt: serverTimestamp(), // If sending twice, merge true prevents overwrite?
                messages: arrayUnion({
                    sender: 'system',
                    text: 'Chat iniciado pelo cliente.',
                    timestamp: Date.now()
                }),
                unreadCount: 1, // for admin
                readBy: ['customer']
            }, { merge: true });

            localStorage.setItem(`precifica_chat_session_${organizationId}`, finalId);
            setSessionId(finalId);
            setUserData({ name, phone });
            setIsFormView(false);

            // Send initial "I'm here" message?
            // Optional.
        } catch (error) {
            console.error("Error creating chat", error);
            alert("Erro ao iniciar chat. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !sessionId) return;

        const text = input.trim();
        setInput('');

        try {
            await updateDoc(doc(db, 'chats', sessionId), {
                messages: arrayUnion({
                    sender: 'user',
                    text: text,
                    timestamp: Date.now()
                }),
                lastMessage: text,
                lastUpdated: serverTimestamp(),
                unreadCount: 1, // Increment logic ideally, but setting to 1 ensures admin sees it
                readBy: ['customer'] // resets admin read status
            });
        } catch (error) {
            console.error("Error sending message", error);
            // Optimistic rollback could go here
        }
    };

    const handleResetChat = () => {
        setIsClosed(false);
        setIsFormView(true);
        setMessages([]);
        setSessionId(null);
        localStorage.removeItem(`precifica_chat_session_${organizationId}`);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">

            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 bg-white w-80 md:w-96 rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col h-[500px]">

                    {/* Header */}
                    <div className="bg-primary p-4 flex items-center justify-between text-white shadow-lg shadow-primary">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full">
                                <Headset className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Suporte {storeName}</h3>
                                <div className="flex items-center gap-1.5 opacity-80">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <p className="text-[10px] uppercase font-bold tracking-widest">{isFormView ? 'Online' : 'Chat ao Vivo'}</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {isFormView ? (
                        // FORM VIEW
                        <div className="flex-1 p-6 flex flex-col justify-center bg-slate-50 relative">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-indigo-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-8 h-8" />
                                </div>
                                <h3 className="font-black text-slate-800 text-lg mb-2">Como podemos ajudar?</h3>
                                <p className="text-sm text-slate-500">Preencha seus dados para falar com um de nossos consultores agora mesmo.</p>
                            </div>

                            <form onSubmit={handleStartChat} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Seu Nome</label>
                                    <input name="name" required placeholder="Nome completo" className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all font-medium text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">WhatsApp / Telefone</label>
                                    <input name="phone" required placeholder="(00) 00000-0000" className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all font-medium text-sm" />
                                </div>
                                <button disabled={isLoading} className="w-full py-4 bg-primary text-white font-black uppercase rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-70 flex justify-center">
                                    {isLoading ? <Loader2 className="animate-spin" /> : "Iniciar Atendimento"}
                                </button>
                            </form>
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                <p className="text-[10px] text-slate-400">Ao continuar, você concorda com nossos termos.</p>
                            </div>
                        </div>
                    ) : (
                        // CHAT VIEW
                        <>
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 10px 10px, currentColor 2px, transparent 0)`, backgroundSize: '24px 24px' }} />

                                {messages.map((msg, idx) => (
                                    <div key={idx} className={cn("flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm", msg.role === 'user' ? "bg-white border-slate-100 text-slate-600" : "bg-primary border-primary text-white")}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Headset className="w-4 h-4" />}
                                        </div>
                                        <div className={cn("p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm break-words", msg.role === 'user' ? "bg-white text-slate-700 rounded-tr-none border border-slate-100" : "bg-primary text-white rounded-tl-none")}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer / Input Area */}
                            {isClosed ? (
                                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
                                    <p className="text-xs font-bold text-slate-500 mb-3">Atendimento encerrado</p>
                                    <button
                                        onClick={handleResetChat}
                                        className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95 shadow-sm"
                                    >
                                        Iniciar Novo Chat
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 bg-white border-t border-slate-100">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-50 p-1.5 pr-2 rounded-2xl border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20 transition-all">
                                        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 bg-transparent px-4 py-2 text-sm font-bold text-slate-700 outline-none" />
                                        <button type="submit" disabled={!input.trim()} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary transition-all hover:scale-105 active:scale-95 disabled:opacity-50"><Send className="w-4 h-4" /></button>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Floating Bubble */}
            {!isOpen && (
                <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-primary hover:bg-opacity-90 text-white rounded-full shadow-2xl shadow-primary flex items-center justify-center transition-all hover:-translate-y-1 active:scale-95 group relative">
                    <Headset className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                </button>
            )}
        </div>
    );
}
