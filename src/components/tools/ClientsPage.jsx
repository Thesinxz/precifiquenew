import { useState, useEffect } from 'react';
import { ClientService } from '../../services/clientService';
import { SalesService } from '../../services/salesService';
import { useToast } from '../ui/Toast';
import {
    Users,
    Search,
    Plus,
    Phone,
    Mail,
    Edit2,
    Trash2,
    X,
    Save,
    User,
    MessageCircle,
    ShoppingBag,
    Calendar,
    ArrowUpRight,
    History,
    Wallet,
    RotateCcw
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, onSnapshot, where, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Headset, Send, Instagram } from 'lucide-react';
import { ClientFormModal } from './ClientFormModal';
import { ServiceOrderWizard } from './ServiceOrderWizard';
import { ClientTimeline } from './ClientTimeline';

const clientSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    phone: z.string().min(10, "Telefone inválido").optional().or(z.literal('')),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    cpf: z.string().optional(),
    birthDate: z.string().optional(), // YYYY-MM-DD
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    address: z.string().optional(),
    instagram: z.string().optional(),
    notes: z.string().optional()
});

export function ClientsPage({ user, userProfile, settings }) {
    const { showToast } = useToast();
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);
    const [clientWallet, setClientWallet] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // View Mode: 'list' or 'details'
    const [viewMode, setViewMode] = useState('list');
    const [selectedClient, setSelectedClient] = useState(null);

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(clientSchema)
    });

    // Leads & Requests States
    const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'leads' | 'inbox'
    const [leads, setLeads] = useState([]);

    // Inbox / Chat States
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [listeningToChat, setListeningToChat] = useState(false);

    // Sound Notification
    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple Pop Sound
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed', e));
        } catch (e) { console.error(e); }
    };

    const orgId = userProfile?.organizationId || user?.uid;

    useEffect(() => {
        if (user) {
            if (activeTab === 'customers') loadClients();
            if (activeTab === 'leads') loadLeads();
            // Inbox is realtime, handled by separate effect
        }
    }, [user, activeTab]);

    // Realtime Chats Listener
    useEffect(() => {
        if (!orgId || activeTab !== 'inbox') return;

        const q = query(collection(db, 'chats'), where('organizationId', '==', orgId), orderBy('lastUpdated', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Check for new messages (simple check: if first load, ignore. If update, notify)
            // We can track changes via snapshot.docChanges()
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified' || change.type === 'added') {
                    const chat = change.doc.data();
                    const lastMsg = chat.messages?.[chat.messages.length - 1];
                    // If last message is NOT from agent, notify
                    if (lastMsg && lastMsg.sender !== 'agent' && (change.type === 'modified' || chats.length > 0)) {
                        // Avoid sound on initial load (heuristic)
                        if (Date.now() - (chat.lastUpdated?.toMillis() || 0) < 5000) {
                            playNotificationSound();
                            // Optional: showToast(`Nova mensagem de ${chat.customerName}`, "info");
                        }
                    }
                }
            });

            setChats(chatsData);

            if (selectedChat) {
                const updated = chatsData.find(c => c.id === selectedChat.id);
                if (updated) setSelectedChat(updated);
            }
        });

        return () => unsubscribe();
    }, [orgId, activeTab, selectedChat?.id, chats.length]); // selectedChat.id dependency might cause re-renders but necessary to sync

    // Close modal on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isInternalModalOpen) {
                setIsInternalModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInternalModalOpen]);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            const data = await ClientService.getClients(orgId);
            setClients(data);
        } catch (error) {
            showToast("Erro ao carregar clientes", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const loadClientHistory = async (client) => {
        setIsLoadingHistory(true);
        try {
            // Load sales
            const sales = await SalesService.getSalesByClient(orgId, client.id);
            const salesEvents = sales.map(sale => ({ ...sale, type: 'sale' }));

            // Load service orders
            const osQuery = query(
                collection(db, 'technical_lab'),
                where('organizationId', '==', orgId),
                where('clientId', '==', client.id),
                orderBy('createdAt', 'desc')
            );
            const osSnapshot = await getDocs(osQuery);
            const serviceOrders = osSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'service_order'
            }));

            // Load chat messages (if any)
            const chatQuery = query(
                collection(db, 'chats'),
                where('organizationId', '==', orgId),
                where('customerPhone', '==', client.phone),
                orderBy('createdAt', 'desc')
            );
            const chatSnapshot = await getDocs(chatQuery);
            const messages = chatSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'message',
                message: doc.data().messages?.[0]?.text || 'Mensagem de suporte'
            }));

            // Merge and sort all events by date
            const allEvents = [...salesEvents, ...serviceOrders, ...messages].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA; // Most recent first
            });

            setClientHistory(allEvents);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar histórico", "error");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const loadLeads = async () => {
        setIsLoading(true);
        try {
            // Fetch VIP List
            const leadsRef = collection(db, 'leads');
            // Fetch Product Requests
            const requestsRef = collection(db, 'product_requests');

            const [leadsSnap, requestsSnap] = await Promise.all([
                getDocs(query(leadsRef, orderBy('createdAt', 'asc'))),
                getDocs(query(requestsRef, orderBy('createdAt', 'asc')))
            ]);

            const vipList = leadsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'vip'
            })).filter(l => l.organizationId === orgId || !l.organizationId);

            const requestList = requestsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'request'
            })).filter(l => l.organizationId === orgId || !l.organizationId);

            // Merge and Sort
            const combined = [...vipList, ...requestList].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });

            setLeads(combined);
        } catch (error) {
            console.error("Error loading leads:", error);
            showToast("Erro ao carregar leads.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLead = async (id, collectionName) => {
        if (!confirm("Remover este lead da lista?")) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            setLeads(prev => prev.filter(l => l.id !== id));
            showToast("Lead removido.", "success");
        } catch (error) {
            showToast("Erro ao remover.", "error");
        }
    };

    const handleOpenModal = (client = null) => {
        setEditingClient(client);
        if (client) {
            reset({
                ...client,
                cep: client.cep || '',
                street: client.street || '',
                number: client.number || '',
                neighborhood: client.neighborhood || '',
                city: client.city || '',
                state: client.state || '',
                address: client.address || ''
            });
        } else {
            reset({ name: '', phone: '', email: '', cpf: '', address: '', instagram: '', notes: '', cep: '', street: '', number: '', neighborhood: '', city: '', state: '' });
        }
        setIsInternalModalOpen(true);
    };

    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setViewMode('details');
        setClientWallet(null);
        loadClientHistory(client);

        import('../../services/loyaltyService').then(({ LoyaltyService }) => {
            LoyaltyService.getWallet(client.id, orgId).then(setClientWallet);
        });
    };

    const handleCepBlur = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setValue('street', data.logradouro);
                setValue('neighborhood', data.bairro);
                setValue('city', data.localidade);
                setValue('state', data.uf);
                showToast("Endereço encontrado!", "success");
            } else {
                showToast("CEP não encontrado.", "error");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP", error);
            showToast("Erro ao buscar CEP.", "error");
        }
    };

    const handleBackToList = () => {
        setSelectedClient(null);
        setViewMode('list');
        setClientHistory([]);
    };

    const onSubmit = async (data) => {
        try {
            if (editingClient) {
                await ClientService.updateClient(editingClient.id, data);
                showToast("Cliente atualizado!", "success");
                // Update local list
                setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...data } : c));
                if (selectedClient && selectedClient.id === editingClient.id) {
                    setSelectedClient({ ...selectedClient, ...data });
                }
            } else {
                const newClient = await ClientService.addClient(user.uid, data, orgId);
                showToast("Cliente cadastrado!", "success");
                setClients(prev => [newClient, ...prev]);
            }
            setIsInternalModalOpen(false);
        } catch (error) {
            showToast("Erro ao salvar cliente", "error");
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await ClientService.deleteClient(id);
                setClients(prev => prev.filter(c => c.id !== id));
                if (selectedClient?.id === id) handleBackToList();
                showToast("Cliente removido.", "success");
            } catch (error) {
                showToast("Erro ao excluir.", "error");
            }
        }
    };

    const handleAdminSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedChat) return;

        const text = chatInput.trim();
        setChatInput('');

        try {
            await updateDoc(doc(db, 'chats', selectedChat.id), {
                messages: arrayUnion({
                    sender: 'agent',
                    text: text,
                    timestamp: Date.now()
                }),
                lastUpdated: serverTimestamp(),
                readBy: ['agent'],
                unreadCount: 0
            });
        } catch (error) {
            showToast("Erro ao enviar mensagem", "error");
        }
    };

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation();
        if (confirm('Excluir esta conversa e histórico?')) {
            try {
                await deleteDoc(doc(db, 'chats', chatId));
                if (selectedChat?.id === chatId) setSelectedChat(null);
                showToast("Conversa excluída", "success");
            } catch (error) {
                showToast("Erro ao excluir", "error");
            }
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER HELPERS ---

    const renderClientList = () => (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Clientes
                    </h2>
                    <p className="text-slate-500 font-medium">Gerencie sua carteira de clientes ({clients.length}).</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (!confirm("Isso irá verificar todas as suas vendas e cadastrar automaticamente clientes que não estão na lista. Continuar?")) return;
                            setIsLoading(true);
                            try {
                                const allSales = await SalesService.getSales(orgId);
                                let addedCount = 0;

                                // Create a map of existing clients for fast lookup
                                const existingMap = new Map();
                                clients.forEach(c => {
                                    if (c.name) existingMap.set(c.name.toLowerCase().trim(), true);
                                    if (c.phone) existingMap.set(c.phone.replace(/\D/g, ''), true);
                                });

                                const promises = [];

                                for (const sale of allSales) {
                                    // Extract client info from sale
                                    const cName = sale.client?.name || sale.customerName;
                                    const cPhone = sale.client?.phone || sale.customerPhone;

                                    if (!cName) continue;

                                    const normalizedName = cName.toLowerCase().trim();
                                    const normalizedPhone = cPhone ? cPhone.replace(/\D/g, '') : null;

                                    // Check if exists
                                    const nameExists = existingMap.has(normalizedName);
                                    const phoneExists = normalizedPhone && existingMap.has(normalizedPhone);

                                    if (!nameExists && !phoneExists) {
                                        // New Client found in sales!
                                        const newClientData = {
                                            name: cName,
                                            phone: cPhone || '',
                                            email: sale.client?.email || '',
                                            cpf: sale.client?.cpf || '',
                                            address: sale.client?.address || '',
                                            notes: 'Importado automaticamente via Histórico de Vendas'
                                        };

                                        // Add to DB
                                        promises.push(ClientService.addClient(orgId, newClientData));

                                        // Add to local map to prevent duplicates within this loop
                                        existingMap.set(normalizedName, true);
                                        if (normalizedPhone) existingMap.set(normalizedPhone, true);
                                        addedCount++;
                                    }
                                }

                                await Promise.all(promises);

                                if (addedCount > 0) {
                                    showToast(`${addedCount} clientes recuperados das vendas!`, "success");
                                    loadClients(); // Refresh list
                                } else {
                                    showToast("Todos os clientes das vendas já estão cadastrados.", "info");
                                }

                            } catch (e) {
                                console.error(e);
                                showToast("Erro ao sincronizar clientes.", "error");
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        className="bg-white dark:bg-slate-900 text-indigo-600 border border-indigo-100 px-4 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                        title="Recuperar clientes de vendas antigas"
                    >
                        <RotateCcw className="w-4 h-4" /> Sincronizar
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Search (Only for Clients Tab for now) */}
            {activeTab === 'customers' && (
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none font-medium transition-all shadow-sm dark:shadow-slate-900/50"
                    />
                </div>
            )}

            {/* Content Switch */}
            {activeTab === 'customers' ? (
                /* CLIENTS LIST (Previously Existing) */
                isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />)}
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Nenhum cliente encontrado</h3>
                        <p className="text-slate-400">Comece adicionando seu primeiro cliente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                        {filteredClients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => handleSelectClient(client)}
                                className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 hover:border-indigo-300 transition-all group flex flex-col cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold uppercase text-slate-500">
                                        Detalhes
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{client.name}</h3>

                                <div className="space-y-2 mt-2 mb-4">
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <Phone className="w-4 h-4 text-emerald-500" />
                                            {client.phone}
                                        </div>
                                    )}
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            {client.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : activeTab === 'leads' ? (
                /* LEADS LIST (New) */
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {leads.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                                <ArrowUpRight className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Nenhum lead novo</h3>
                            <p className="text-slate-400">Sua Lista VIP e solicitações aparecerão aqui.</p>
                        </div>
                    ) : (
                        leads.map(lead => (
                            <div key={lead.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm dark:shadow-slate-900/50 border border-slate-100 hover:border-amber-300 transition-all flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                                {lead.type === 'vip' && <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Lista VIP</div>}
                                {lead.type === 'request' && <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Produto Aguardando</div>}

                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0", lead.type === 'vip' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600")}>
                                    {lead.type === 'vip' ? '👑' : '🔔'}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg">{lead.name}</h4>
                                    <div className="flex flex-col md:flex-row gap-2 mt-1 justify-center md:justify-start">
                                        <a href={`https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}`} target="_blank" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 justify-center md:justify-start">
                                            <Phone className="w-4 h-4" /> {lead.phone}
                                        </a>
                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1 justify-center md:justify-start">
                                            <Calendar className="w-3 h-3" />
                                            {lead.createdAt?.toDate ? format(lead.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'Recentemente'}
                                        </span>
                                    </div>
                                    {lead.type === 'request' && (
                                        <div className="mt-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-xs inline-block border border-slate-100">
                                            Interesse em: <strong>{lead.productName}</strong> <span className="text-slate-400">({lead.color}, {lead.storage})</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={`https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(lead.type === 'vip' ? `Olá ${lead.name}! Vi que você entrou na nossa Lista VIP. Tenho uma oferta especial pra você!` : `Olá ${lead.name}! Tenho novidades sobre o ${lead.productName} que você procurou!`)}`}
                                        target="_blank"
                                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-600 transition-colors shadow-lg dark:shadow-slate-900/50 shadow-emerald-200"
                                    >
                                        Chamar
                                    </a>
                                    <button
                                        onClick={() => handleDeleteLead(lead.id, lead.type === 'vip' ? 'leads' : 'product_requests')}
                                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                        title="Arquivar Lead"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* INBOX / CHAT VIEW */
                /* INBOX / CHAT VIEW */
                <div className="flex flex-col lg:flex-row h-[calc(100dvh-180px)] lg:h-[calc(100vh-200px)] gap-4 lg:gap-6 animate-in fade-in">
                    {/* Chat List */}
                    <div className={cn("w-full lg:w-1/3 flex flex-col gap-4 border-r border-slate-200 pr-0 lg:pr-4 overflow-y-auto shrink-0", selectedChat ? "hidden lg:flex" : "flex")}>
                        {chats.length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <Headset className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>Nenhuma conversa iniciada.</p>
                            </div>
                        ) : (
                            chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={cn(
                                        "p-4 rounded-2xl cursor-pointer transition-all border text-left group",
                                        selectedChat?.id === chat.id
                                            ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                            : "bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{chat.customerName || 'Visitante'}</h4>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {chat.lastUpdated?.seconds ? format(new Date(chat.lastUpdated.seconds * 1000), "HH:mm", { locale: ptBR }) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-slate-500 truncate max-w-[180px]">
                                            {chat.messages?.[chat.messages.length - 1]?.text || 'Iniciou o chat'}
                                        </p>
                                        <button onClick={(e) => handleDeleteChat(chat.id, e)} className="p-1 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Conversation View */}
                    <div className={cn("flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden", !selectedChat ? "hidden lg:flex items-center justify-center bg-slate-50" : "flex")}>
                        {!selectedChat ? (
                            <div className="text-center opacity-40 p-8">
                                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Suporte Online</h3>
                                <p className="text-sm">Selecione uma conversa para atender.</p>
                            </div>
                        ) : (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:bg-slate-950 dark:bg-slate-950/50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedChat(null)} className="lg:hidden p-2 hover:bg-white dark:bg-slate-900 rounded-xl"><ArrowUpRight className="w-5 h-5 rotate-180" /></button>
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                            {(selectedChat.customerName || 'C')[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{selectedChat.customerName}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {selectedChat.customerPhone}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={`https://wa.me/55${selectedChat.customerPhone.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors" title="Abrir no WhatsApp">
                                            <MessageCircle className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50 dark:bg-slate-950 relative">
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 10px 10px, currentColor 2px, transparent 0)`, backgroundSize: '24px 24px' }} />

                                    {(selectedChat.messages || []).map((msg, idx) => (
                                        <div key={idx} className={cn("flex gap-3 max-w-[85%] md:max-w-[80%]", msg.sender === 'agent' ? "ml-auto flex-row-reverse" : "")}>
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", msg.sender === 'agent' ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600")}>
                                                {msg.sender === 'agent' ? 'VC' : (selectedChat.customerName?.[0] || 'C')}
                                            </div>
                                            <div className={cn("p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words", msg.sender === 'agent' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none")}>
                                                {msg.text}
                                                <p className={cn("text-[9px] mt-2 font-medium opacity-50 text-right", msg.sender === 'agent' ? "text-indigo-200" : "text-slate-400")}>
                                                    {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div id="messages-end" />
                                </div>

                                {/* Input */}
                                <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 shrink-0 safe-pb">
                                    <form onSubmit={handleAdminSendMessage} className="flex gap-2 items-center">
                                        <input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Digite sua resposta..."
                                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:bg-slate-900 outline-none transition-all font-medium text-sm md:text-base"
                                        />
                                        <button type="submit" disabled={!chatInput.trim()} className="px-4 md:px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0">
                                            <Send className="w-5 h-5" /> <span className="hidden md:inline">Enviar</span>
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    const renderClientDetails = () => (
        <div className="animate-in slide-in-from-right fade-in duration-300">
            {/* Header Detail */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackToList}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 dark:hover:bg-white dark:bg-slate-900/5 transition-colors shadow-sm dark:shadow-slate-900/50"
                    >
                        <ArrowUpRight className="w-5 h-5 rotate-[-135deg] text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedClient.name}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] uppercase font-black tracking-wider">Cliente Ativo</span>
                            <span>• Cadastrado em {selectedClient.createdAt?.toDate ? format(selectedClient.createdAt.toDate(), "MM/yyyy") : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleOpenModal(selectedClient)}
                        className="px-5 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all"
                    >
                        Editar Dados
                    </button>
                    <button
                        onClick={() => handleDelete(selectedClient.id)}
                        className="px-5 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl hover:border-red-500 hover:text-red-500 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick Communication Hub - NEW FEATURE */}
            <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Central de Comunicação Rápida
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[
                        {
                            label: 'Olá Sumido!',
                            icon: '👋',
                            bg: 'bg-amber-50 border-amber-100 text-amber-700',
                            msg: `Olá ${selectedClient.name.split(' ')[0]}! Tudo bem? Faz tempo que não te vemos por aqui. Chegaram muitas novidades que são a sua cara!`
                        },
                        {
                            label: 'Pedido Pronto',
                            icon: '📦',
                            bg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                            msg: `Olá ${selectedClient.name.split(' ')[0]}, boa notícia! Seu pedido/serviço já está pronto e disponível para retirada. 🚀`
                        },
                        {
                            label: 'Cobrança Amigável',
                            icon: '💰',
                            bg: 'bg-blue-50 border-blue-100 text-blue-700',
                            msg: `Oi ${selectedClient.name.split(' ')[0]}, tudo certo? Passando só para lembrar sobre aquele pagamento pendente. Qualquer dúvida, me avise!`
                        },
                        {
                            label: 'Feliz Aniversário',
                            icon: '🎂',
                            bg: 'bg-pink-50 border-pink-100 text-pink-700',
                            msg: `Parabéns ${selectedClient.name.split(' ')[0]}! 🥳 Desejamos um dia incrível e cheio de alegrias. Passe aqui na loja para ganhar um brinde especial!`
                        },
                        {
                            label: 'Instagram',
                            icon: '📸',
                            bg: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-pink-500/20',
                            isInsta: true,
                            msg: ''
                        },
                        {
                            label: 'Feedback',
                            icon: '⭐',
                            bg: 'bg-purple-50 border-purple-100 text-purple-700',
                            msg: `Oi ${selectedClient.name.split(' ')[0]}! O que achou do nosso atendimento/produto? Seu feedback é muito importante pra gente evoluir! 🙏`
                        },
                        {
                            label: 'Nova OS',
                            icon: '🛠️',
                            bg: 'bg-blue-50 border-blue-100 text-blue-700',
                            isOS: true
                        },
                    ].map((action, idx) => (
                        action.isInsta ? (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (selectedClient.instagram) {
                                        let handle = selectedClient.instagram.replace('@', '').trim();
                                        window.open(`https://instagram.com/${handle}`, '_blank');
                                    } else {
                                        showToast("Instagram não cadastrado", "error");
                                    }
                                }}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-md flex flex-col gap-2 cursor-pointer relative group",
                                    action.bg
                                )}
                            >
                                <span className="text-2xl drop-shadow-sm dark:shadow-slate-900/50">{action.icon}</span>
                                <span className="text-[11px] font-black uppercase tracking-wide opacity-90">{action.label}</span>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </button>
                        ) : action.isOS ? (
                            <button
                                key={idx}
                                onClick={() => setIsWizardOpen(true)}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-md flex flex-col gap-2 cursor-pointer relative group",
                                    action.bg
                                )}
                            >
                                <span className="text-2xl drop-shadow-sm dark:shadow-slate-900/50">{action.icon}</span>
                                <span className="text-[11px] font-black uppercase tracking-wide opacity-90">{action.label}</span>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </button>
                        ) : (
                            <a
                                key={idx}
                                href={`https://wa.me/55${selectedClient.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(action.msg)}`}
                                target="_blank"
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-md flex flex-col gap-2 cursor-pointer relative group",
                                    action.bg
                                )}
                            >
                                <span className="text-2xl">{action.icon}</span>
                                <span className="text-[11px] font-black uppercase tracking-wide opacity-80">{action.label}</span>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </a>
                        )
                    ))}
                </div>
            </div >

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10">
                        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black mb-6">
                            {selectedClient.name.charAt(0)}
                        </div>

                        {/* Loyalty Wallet */}
                        {clientWallet && (
                            <div className="mb-6 p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl text-white shadow-lg dark:shadow-slate-900/50 shadow-indigo-200">
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <Wallet className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Saldo Cashback</span>
                                </div>
                                <div className="text-3xl font-black">
                                    {formatCurrency(clientWallet.balance || 0)}
                                </div>
                                <div className="mt-2 text-[10px] font-medium opacity-60">
                                    Total Acumulado: {formatCurrency(clientWallet.lifetimeEarned || 0)}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contato</label>
                                <div className="mt-2 space-y-2">
                                    {selectedClient.phone && (
                                        <a href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors">
                                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Phone className="w-3 h-3" /></div>
                                            {selectedClient.phone}
                                        </a>
                                    )}
                                    {selectedClient.email && (
                                        <div className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg"><Mail className="w-3 h-3" /></div>
                                            {selectedClient.email}
                                        </div>
                                    )}
                                    {selectedClient.instagram && (
                                        <div className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:text-pink-600 transition-colors" onClick={() => window.open(`https://instagram.com/${selectedClient.instagram.replace('@', '')}`, '_blank')}>
                                            <div className="p-1.5 bg-pink-50 text-pink-500 rounded-lg"><Instagram className="w-3 h-3" /></div>
                                            {selectedClient.instagram}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedClient.cpf && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">CPF/CNPJ</label>
                                <p className="font-bold text-slate-700 dark:text-slate-200 mt-1">{selectedClient.cpf}</p>
                            </div>
                        )}

                        {(selectedClient.street || selectedClient.address || selectedClient.cep) && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Endereço</label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                        {selectedClient.street && `${selectedClient.street}${selectedClient.number ? `, ${selectedClient.number}` : ''}`}
                                        {!selectedClient.street && selectedClient.address}
                                    </p>
                                    {(selectedClient.neighborhood || selectedClient.city) && (
                                        <p className="text-xs text-slate-500 font-medium">
                                            {selectedClient.neighborhood && `${selectedClient.neighborhood} • `}
                                            {selectedClient.city}{selectedClient.state ? `/${selectedClient.state}` : ''}
                                        </p>
                                    )}
                                    {selectedClient.cep && (
                                        <p className="text-[10px] text-slate-400 font-bold mt-1">CEP: {selectedClient.cep}</p>
                                    )}
                                    {selectedClient.street && selectedClient.address && (
                                        <p className="text-[10px] text-slate-400 font-medium mt-2 italic border-t border-slate-200 dark:border-white/10 pt-2">
                                            Obs: {selectedClient.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedClient.notes && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Observações</label>
                                <p className="font-medium text-slate-600 dark:text-slate-300 mt-1 text-sm italic p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/20">{selectedClient.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: History */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10 min-h-[500px]">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        Linha do Tempo do Cliente
                    </h3>

                    <ClientTimeline events={clientHistory} isLoading={isLoadingHistory} />
                </div>
            </div>
        </div >
    );

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {viewMode === 'list' ? renderClientList() : selectedClient ? renderClientDetails() : renderClientList()}

            {/* Modal */}
            <ClientFormModal
                open={isInternalModalOpen}
                onClose={() => setIsInternalModalOpen(false)}
                onSaved={(client) => {
                    if (editingClient) {
                        setClients(prev => prev.map(c => c.id === editingClient.id ? client : c));
                        if (selectedClient && selectedClient.id === editingClient.id) {
                            setSelectedClient(client);
                        }
                    } else {
                        setClients(prev => [client, ...prev]);
                    }
                }}
                editingClient={editingClient}
                user={user}
                userProfile={userProfile}
            />

            <ServiceOrderWizard
                open={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                initialClient={selectedClient}
                user={user}
                userProfile={userProfile}
                settings={settings}
                onSaved={(os) => {
                    showToast("Ordem de serviço criada!", "success");
                }}
            />
        </div>
    );
}
