import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import {
    Smartphone, Wrench, Microscope, CheckCircle2,
    Plus, Search, Filter, Clock, AlertTriangle,
    ArrowRight, History, Trash2, Edit3, ShieldCheck,
    CreditCard, Download, ClipboardCheck, MessageSquare,
    Box, Monitor, Zap, Star, Printer, FileText
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { VisualChecklist, FunctionalChecklist } from './ServiceOrderComponents';
import { ThermalLabelModal } from '../ui/ThermalLabelModal';
import { ServiceOrderWizard } from './ServiceOrderWizard';
import { PrintingService } from '../../services/printingService';

const STEPS = [
    { id: 'triagem', label: 'Triagem', icon: Search, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'revisao', label: 'Revisão Final', icon: Microscope, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { id: 'concluido', label: 'Pronto p/ Retirada', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' }
];

export function TechLab({ user, userProfile, settings, darkMode }) {
    const { showToast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('triagem');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [labelItems, setLabelItems] = useState([]);
    const [labelType, setLabelType] = useState('tech_lab');

    const [editingId, setEditingId] = useState(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const orgId = userProfile?.organizationId || user.uid;

        const q = query(
            collection(db, 'technical_lab'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, userProfile]);


    const handleSendStatus = (item) => {
        if (!item.ownerPhone) return showToast("Cliente sem telefone", "error");

        let msg = `Olá ${item.ownerName?.split(' ')[0] || 'Cliente'}, aqui é da ${userProfile?.name || 'Assistência'}! \n\n`;

        if (item.status === 'triagem') msg += `Recebemos seu ${item.model} para avaliação. Te avisaremos assim que tivermos o diagnóstico.`;
        else if (item.status === 'manutencao') msg += `Seu ${item.model} já está em bancada sendo reparado!`;
        else if (item.status === 'revisao') msg += `Seu ${item.model} passou pelo reparo e está em testes finais de qualidade.`;
        else if (item.status === 'concluido') msg += `Boas notícias! Seu ${item.model} está PRONTO para retirada! 🥳\n\nFicou novo!`;

        const link = `https://wa.me/55${item.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
    };

    const handleUpdateStatus = async (id, newStatus, note = '') => {
        try {
            const itemRef = doc(db, 'technical_lab', id);
            const itemSnap = await getDoc(itemRef);
            const currentHistory = itemSnap.data().history || [];

            await updateDoc(itemRef, {
                status: newStatus,
                updatedAt: new Date(),
                history: [...currentHistory, {
                    status: newStatus,
                    date: new Date(),
                    note: note || `Mudança de status para ${newStatus}`
                }]
            });
            showToast(`Status atualizado para ${newStatus}`, "success");
        } catch (error) {
            showToast("Erro ao atualizar status", "error");
        }
    };

    const handleGraduateToStock = async (item) => {
        if (!window.confirm("Deseja mover este aparelho para o Estoque de Vendas?")) return;

        setIsProcessing(true);
        try {
            // 1. Add to Stock
            await addDoc(collection(db, 'stock'), {
                name: item.model,
                category: 'iPhone',
                condition: 'Usado', // Default
                imei: item.imei,
                costPrice: item.expectedCost || 0,
                technicalNotes: item.technicalNotes,
                organizationId: item.organizationId,
                status: 'available',
                createdAt: new Date(),
                quantity: 1,
                minPrice: (item.expectedCost || 0) * 1.3, // Simple suggested markup
            });

            // 2. Mark as completed in Lab
            await updateDoc(doc(db, 'technical_lab', item.id), {
                status: 'finalizado_estoque',
                graduatedAt: new Date()
            });

            showToast("Aparelho graduado para o estoque!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao mover para estoque.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingId(item.id);
        } else {
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const filteredItems = items.filter(item => {
        const matchesTab = item.status === activeTab;
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            item.model.toLowerCase().includes(search) ||
            item.imei.toLowerCase().includes(search) ||
            item.ownerName?.toLowerCase().includes(search);
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className={cn("text-3xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-800")}>
                        Laboratório <span className="text-blue-600">Técnico</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Controle de entrada, triagem e manutenção de iPhones.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl dark:shadow-slate-900/50 shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Registrar Entrada
                </button>
            </div>

            {/* Status Steps Tracker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STEPS.map((step) => {
                    const count = items.filter(i => i.status === step.id).length;
                    return (
                        <button
                            key={step.id}
                            onClick={() => setActiveTab(step.id)}
                            className={cn(
                                "relative p-6 rounded-3xl border-2 transition-all flex flex-col items-start gap-4 text-left overflow-hidden group",
                                activeTab === step.id
                                    ? cn(step.bg, step.border, "shadow-lg")
                                    : darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className={cn("p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300",
                                activeTab === step.id ? "bg-white text-blue-600 shadow-sm" : darkMode ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-400"
                            )}>
                                <step.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={cn("text-[10px] font-black uppercase tracking-widest", activeTab === step.id ? "text-blue-600" : "text-slate-400")}>{step.label}</p>
                                <p className={cn("text-2xl font-black", darkMode ? "text-white" : "text-slate-900")}>{count}</p>
                            </div>
                            {activeTab === step.id && <div className="absolute top-0 right-0 p-4 opacity-10"><step.icon className="w-16 h-16" /></div>}
                        </button>
                    );
                })}
            </div>

            {/* List and Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por modelo, IMEI ou cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none transition-all font-bold text-sm",
                                darkMode ? "bg-white/5 border-white/5 focus:border-blue-500 text-white" : "bg-white border-slate-100 focus:border-blue-100 text-slate-700"
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className={cn("group relative p-6 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl",
                                darkMode ? "bg-[#0A0A0A] border-white/5 hover:border-blue-500/30" : "bg-white border-slate-100 hover:border-blue-100"
                            )}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", darkMode ? "bg-blue-500/10" : "bg-blue-50")}>
                                    <Smartphone className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(item)} className="p-2 hover:bg-blue-500/10 rounded-xl transition-colors text-slate-400 hover:text-blue-500"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => { setLabelType('tech_lab'); setLabelItems([item]); }} className="p-2 hover:bg-indigo-500/10 rounded-xl transition-colors text-slate-400 hover:text-indigo-500" title="Imprimir Etiqueta"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => { setLabelType('tech_receipt'); setLabelItems([item]); }} className="p-2 hover:bg-amber-500/10 rounded-xl transition-colors text-slate-400 hover:text-amber-500" title="Imprimir Ticket"><FileText className="w-4 h-4" /></button>
                                    <button onClick={() => handleSendStatus(item)} className="p-2 hover:bg-emerald-500/10 rounded-xl transition-colors text-slate-400 hover:text-emerald-500"><MessageSquare className="w-4 h-4" /></button>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("Excluir registro?")) await deleteDoc(doc(db, 'technical_lab', item.id));
                                        }}
                                        className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-blue-600 text-[8px] font-black uppercase text-white rounded-md tracking-widest">
                                        {item.origin === 'trade_in' ? 'Troca' : item.origin === 'import' ? 'Importação' : 'Retorno'}
                                    </span>
                                    {item.priority === 'urgent' && <span className="px-2 py-0.5 bg-red-500 text-[8px] font-black uppercase text-white rounded-md tracking-widest animate-pulse">Urgente</span>}
                                </div>
                                <h3 className={cn("text-xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-800")}>{item.model}</h3>
                                <p className="text-xs font-bold text-slate-500 font-mono tracking-tighter">IMEI: {item.imei}</p>
                            </div>

                            {item.entryCondition && (
                                <div className={cn("p-4 rounded-2xl mb-6 text-xs font-medium leading-relaxed", darkMode ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600")}>
                                    <p className="line-clamp-3">{item.entryCondition}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                                <div className="flex flex-col">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Custo Est.</p>
                                    <p className="text-sm font-black text-blue-500">{formatCurrency(item.expectedCost || 0)}</p>
                                </div>

                                {activeTab === 'concluido' ? (
                                    <button
                                        onClick={() => handleGraduateToStock(item)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        Mover Estoque
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const nextStatus = STEPS[STEPS.findIndex(s => s.id === activeTab) + 1]?.id;
                                            if (nextStatus) handleUpdateStatus(item.id, nextStatus);
                                        }}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:translate-x-1 transition-transform"
                                    >
                                        Próxima Etapa <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 dark:bg-white dark:bg-slate-900/5 rounded-full flex items-center justify-center">
                            <Box className="w-8 h-8 text-slate-200" />
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum aparelho nesta etapa</p>
                            <p className="text-slate-300 text-[10px]">Utilize o campo de busca ou mude a categoria.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Wizard & Modals */}
            <ServiceOrderWizard
                open={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                user={user}
                userProfile={userProfile}
                settings={darkMode ? { ...settings, darkMode: true } : settings}
            />

            {labelItems.length > 0 && (
                <ThermalLabelModal
                    items={labelItems}
                    type={labelType}
                    onClose={() => setLabelItems([])}
                    settings={settings}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
