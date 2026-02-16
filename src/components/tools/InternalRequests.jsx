import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import { ClientService } from '../../services/clientService';
import {
    MessageSquarePlus, CheckCircle2,
    Plus, Filter, User,
    Trash2, Edit3, CheckCircle, ArrowRight,
    FileText, ShoppingCart, Phone,
    Send, X, MessageCircle
} from 'lucide-react';
import { deleteDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

export function InternalRequests({ user, userProfile }) {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [requests, setRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('pending'); // 'pending', 'completed', 'all'
    const [editingId, setEditingId] = useState(null);
    const [clients, setClients] = useState([]);
    const [activeStep, setActiveStep] = useState(0);

    const initialRequest = {
        type: 'purchase',
        title: '',
        description: '',
        priority: 'normal',
        clientName: '',
        clientPhone: ''
    };

    const [formData, setFormData] = useState(initialRequest);
    const [responseRequest, setResponseRequest] = useState(null);
    const [responseText, setResponseText] = useState("");

    useEffect(() => {
        if (!user) return;
        const orgId = userProfile?.organizationId || user.uid;
        ClientService.getClients(orgId).then(setClients).catch(console.error);

        const q = query(
            collection(db, 'internal_requests'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubscribe();
    }, [user, userProfile]);

    useEffect(() => {
        if (location.state?.requestId && requests.length > 0) {
            const req = requests.find(r => r.id === location.state.requestId);
            if (req) {
                handleOpenModal(req);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, requests, navigate, location.pathname]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'internal_requests', editingId), {
                    ...formData,
                    updatedAt: new Date()
                });
                showToast("Solicitação atualizada!", "success");
            } else {
                await addDoc(collection(db, 'internal_requests'), {
                    ...formData,
                    organizationId: userProfile?.organizationId || user.uid,
                    requesterId: user.uid,
                    requesterName: userProfile?.name || user.email || 'Funcionário',
                    status: 'pending',
                    createdAt: new Date(),
                    comments: [],
                    viewedByAdmin: (userProfile?.role === 'owner' || userProfile?.role === 'admin'),
                    hasUnreadResponse: false
                });
                showToast("Solicitação enviada!", "success");
            }
            handleCloseModal();
        } catch (error) {
            console.error(error);
            showToast("Erro ao processar solicitação.", "error");
        }
    };

    const handleOpenModal = (req = null) => {
        if (req) {
            setFormData({
                type: req.type || 'purchase',
                title: req.title || '',
                description: req.description || '',
                priority: req.priority || 'normal',
                clientName: req.clientName || '',
                clientPhone: req.clientPhone || ''
            });
            setEditingId(req.id);
            if (!req.viewedByAdmin && (userProfile?.role === 'owner' || userProfile?.role === 'admin')) {
                updateDoc(doc(db, 'internal_requests', req.id), { viewedByAdmin: true }).catch(console.error);
            }
            if (req.hasUnreadResponse && req.requesterId === user.uid) {
                updateDoc(doc(db, 'internal_requests', req.id), { hasUnreadResponse: false }).catch(console.error);
            }
            setActiveStep(0);
        } else {
            setFormData(initialRequest);
            setEditingId(null);
            setActiveStep(0);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(initialRequest);
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta solicitação?")) return;
        try {
            await deleteDoc(doc(db, 'internal_requests', id));
            showToast("Solicitação excluída.", "success");
        } catch (e) {
            showToast("Erro ao excluir.", "error");
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'internal_requests', id), {
                status: newStatus,
                viewedByAdmin: true
            });
            showToast("Status atualizado!", "success");
        } catch (e) {
            showToast("Erro ao atualizar.", "error");
        }
    };

    const handleSaveResponse = async () => {
        if (!responseRequest || !responseText) return showToast("Digite uma resposta.", "error");
        try {
            await updateDoc(doc(db, 'internal_requests', responseRequest.id), {
                adminResponse: responseText,
                responseAt: new Date(),
                hasUnreadResponse: true
            });
            showToast("Resposta enviada!", "success");
            setResponseRequest(null);
            setResponseText("");
        } catch (e) {
            console.error(e);
            showToast("Erro ao enviar resposta.", "error");
        }
    };

    const filteredRequests = requests.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    const getPriorityColor = (p) => {
        switch (p) {
            case 'urgent': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/30';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/30';
            default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-white/10';
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/30';
            case 'working': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/30';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/30';
            default: return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-white/10';
        }
    };

    return (
        <div className="w-full p-4 md:p-8 pb-32">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Solicitações & Tarefas</h1>
                    <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
                        Gerencie compras, tarefas e avisos da equipe em um só lugar.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span>Nova Solicitação</span>
                </button>
            </div>

            {/* Quick Stats & Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="lg:col-span-3 bg-white dark:bg-slate-900/50 p-2 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex flex-wrap md:flex-nowrap gap-2">
                    {['pending', 'working', 'completed', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 min-w-[120px] py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2",
                                filter === f
                                    ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-lg scale-[1.02]"
                                    : "bg-white dark:bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500 hover:border-slate-100 dark:hover:border-white/10"
                            )}
                        >
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-80">
                                {f === 'pending' ? 'Pendentes' : f === 'working' ? 'Em Andamento' : f === 'completed' ? 'Concluídos' : 'Total'}
                            </span>
                            <span className={cn("text-xl font-black", filter === f ? "text-white" : "text-slate-700")}>
                                {f === 'all' ? requests.length : requests.filter(r => r.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6">
                {filteredRequests.map(req => (
                    <div
                        key={req.id}
                        className={cn(
                            "bg-white dark:bg-slate-900/40 dark:border-white/5 rounded-3xl p-6 border-2 flex flex-col gap-4 relative group transition-all hover:-translate-y-1 hover:shadow-xl dark:shadow-none",
                            req.status === 'completed' ? "border-emerald-100/50 dark:border-emerald-900/20 opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100" : "border-slate-100 dark:border-white/5 shadow-sm"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border",
                                req.type === 'purchase' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/20" :
                                    req.type === 'task' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 border-blue-100 dark:border-blue-900/20" :
                                        req.type === 'budget' ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-500 border-purple-100 dark:border-purple-900/20" :
                                            "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/10"
                            )}>
                                {req.type === 'purchase' && <ShoppingCart className="w-5 h-5" />}
                                {req.type === 'task' && <CheckCircle2 className="w-5 h-5" />}
                                {req.type === 'budget' && <FileText className="w-5 h-5" />}
                                {req.type === 'other' && <MessageSquarePlus className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                    getPriorityColor(req.priority)
                                )}>
                                    {req.priority === 'urgent' ? 'Urgente' : req.priority === 'high' ? 'Alta' : 'Normal'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300">
                                    {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                                </span>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1">
                            {req.clientName && (
                                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 w-fit rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                    <User className="w-3 h-3 text-indigo-500" />
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                        Cliente: {req.clientName}
                                    </span>
                                </div>
                            )}
                            <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2">{req.title}</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">{req.description}</p>

                            {req.adminResponse && (
                                <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-500/40 flex items-center justify-center">
                                            <User className="w-3 h-3 text-indigo-700 dark:text-indigo-300" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-indigo-400 dark:text-indigo-300 tracking-wider">Resposta da Administração</span>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200 leading-relaxed">{req.adminResponse}</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 mt-auto border-t border-slate-50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                        {req.requesterName?.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 truncate max-w-[100px]">{req.requesterName}</span>
                                </div>
                                {req.clientName && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-500/10 max-w-[140px]">
                                        <User className="w-3 h-3 text-indigo-500" />
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase truncate">
                                            {req.clientName}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-300">Responsável: {req.requesterName}</span>
                                <div className="flex items-center gap-1">
                                    {req.clientPhone && (
                                        <a
                                            href={`https://wa.me/55${req.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${req.clientName || ''}, sobre sua solicitação: ${req.title}`)}`}
                                            target="_blank"
                                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                            title="WhatsApp"
                                        >
                                            <Phone className="w-4 h-4" />
                                        </a>
                                    )}
                                    <select
                                        value={req.status}
                                        onChange={(e) => handleStatusUpdate(req.id, e.target.value)}
                                        className="h-8 px-2 bg-slate-100 dark:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 border-none outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <option value="pending">Pendente</option>
                                        <option value="working">Em Andamento</option>
                                        <option value="completed">Concluído</option>
                                    </select>
                                    {!req.adminResponse && (
                                        <button
                                            onClick={() => setResponseRequest(req)}
                                            className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleOpenModal(req)} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(req.id)} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={cn(
                            "absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border bg-white",
                            getStatusColor(req.status)
                        )}>
                            {req.status === 'pending' ? 'Pendente' : req.status === 'working' ? 'Em Curso' : 'Concluído'}
                        </div>
                    </div>
                ))}
            </div>

            {filteredRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                        <Filter className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-600">Nenhuma solicitação encontrada</h3>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[1rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                        <div className="bg-slate-900 dark:bg-black p-6 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-lg font-black tracking-widest uppercase">
                                    {editingId ? 'EDITAR' : 'NOVA'} SOLICITAÇÃO
                                </h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Passo {activeStep + 1} de 5</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-1 bg-slate-800 w-full">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((activeStep + 1) / 5) * 100}%` }} />
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); if (activeStep === 4) handleSubmit(e); }} className="p-8 space-y-8">
                            <div className="min-h-[220px] flex flex-col justify-center">
                                {activeStep === 0 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Para qual cliente é esta solicitação?</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <select
                                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white transition-all text-sm"
                                                onChange={(e) => {
                                                    const client = clients.find(c => c.id === e.target.value);
                                                    if (client) setFormData({ ...formData, clientName: client.name, clientPhone: client.phone || '' });
                                                }}
                                                value=""
                                            >
                                                <option value="">Selecione um cliente...</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <input
                                                autoFocus
                                                placeholder="Ou digite o nome manualmente..."
                                                value={formData.clientName}
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Qual o contato do cliente?</h3>
                                        </div>
                                        <input
                                            autoFocus
                                            placeholder="WhatsApp (Ex: 11999999999)"
                                            value={formData.clientPhone}
                                            onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white transition-all text-sm"
                                        />
                                    </div>
                                )}

                                {activeStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">O que você precisa?</h3>
                                        </div>
                                        <input
                                            autoFocus
                                            required
                                            placeholder="Título da solicitação..."
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full p-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white transition-all text-sm"
                                        />
                                    </div>
                                )}

                                {activeStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Explique melhor os detalhes:</h3>
                                        </div>
                                        <textarea
                                            autoFocus
                                            required
                                            className="w-full p-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 dark:text-white min-h-[140px] transition-all resize-none text-sm"
                                            placeholder="Descreva aqui..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                )}

                                {activeStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo e Urgência</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['purchase', 'task', 'budget', 'other'].map(t => (
                                                    <button
                                                        key={t} type="button" onClick={() => setFormData({ ...formData, type: t })}
                                                        className={cn("p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-wide transition-all", formData.type === t ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400" : "border-slate-50 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 text-slate-400")}
                                                    >
                                                        {t === 'purchase' ? 'Compra' : t === 'task' ? 'Tarefa' : t === 'budget' ? 'Cotação' : 'Outro'}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl">
                                                {['normal', 'high', 'urgent'].map(p => (
                                                    <button
                                                        key={p} type="button" onClick={() => setFormData({ ...formData, priority: p })}
                                                        className={cn("flex-1 py-3 rounded-lg font-black text-[10px] uppercase transition-all", formData.priority === p ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" : "text-slate-400")}
                                                    >
                                                        {p === 'urgent' ? '🔥 Urgente' : p === 'high' ? '⚠️ Alta' : 'Normal'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                                {activeStep > 0 && <button type="button" onClick={() => setActiveStep(prev => prev - 1)} className="px-6 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Voltar</button>}
                                {activeStep < 4 ? <button type="button" onClick={() => setActiveStep(prev => prev + 1)} disabled={activeStep === 0 && !formData.clientName} className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Continuar <ArrowRight className="inline w-3 h-3 ml-2" /></button> : <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Finalizar Solicitação <CheckCircle className="inline w-4 h-4 ml-2" /></button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {responseRequest && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-slate-800">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 md:p-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black tracking-tight">Responder Solicitação</h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">Para: {responseRequest.requesterName}</p>
                            </div>
                            <button onClick={() => { setResponseRequest(null); setResponseText(""); }} className="p-2 bg-slate-100 rounded-xl">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <textarea
                                autoFocus className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium min-h-[120px] transition-all resize-none"
                                placeholder="Digite sua resposta aqui..." value={responseText} onChange={e => setResponseText(e.target.value)}
                            />
                            <button onClick={handleSaveResponse} disabled={!responseText.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <Send className="w-4 h-4" /> Enviar Resposta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
