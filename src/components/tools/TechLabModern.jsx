import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import {
    Smartphone, Wrench, Microscope, CheckCircle2, Search,
    Clock, ArrowRight, MessageSquare, Printer, ChevronRight,
    User, Calendar, AlertCircle, Zap, Phone
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { ServiceOrderWizard } from './ServiceOrderWizard';
import { PrintingService } from '../../services/printingService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PerformanceLab } from './PerformanceLab';
import { BarChart3 } from 'lucide-react';

const STATUSES = [
    {
        id: 'triagem',
        label: 'Triagem',
        icon: Search,
        color: 'amber',
        description: 'Aguardando diagnóstico'
    },
    {
        id: 'manutencao',
        label: 'Manutenção',
        icon: Wrench,
        color: 'blue',
        description: 'Em reparo'
    },
    {
        id: 'revisao',
        label: 'Revisão',
        icon: Microscope,
        color: 'indigo',
        description: 'Testes finais'
    },
    {
        id: 'concluido',
        label: 'Pronto',
        icon: CheckCircle2,
        color: 'emerald',
        description: 'Aguardando retirada'
    }
];

const getFirestoreDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export function TechLabModern({ user, userProfile, settings, darkMode }) {
    const { showToast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('triagem');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleUpdateStatus = async (id, newStatus) => {
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
                    note: `Mudança de status para ${newStatus}`
                }]
            });
            showToast(`Status atualizado!`, "success");
        } catch (error) {
            showToast("Erro ao atualizar status", "error");
        }
    };

    const handleSendWhatsApp = (item) => {
        if (!item.ownerPhone) return showToast("Cliente sem telefone", "error");

        const statusMessages = {
            triagem: `Recebemos seu ${item.model} para avaliação. Te avisaremos assim que tivermos o diagnóstico.`,
            manutencao: `Seu ${item.model} já está em bancada sendo reparado!`,
            revisao: `Seu ${item.model} passou pelo reparo e está em testes finais de qualidade.`,
            concluido: `Boas notícias! Seu ${item.model} está PRONTO para retirada! 🥳\n\nFicou novo!`
        };

        const msg = `Olá ${item.ownerName?.split(' ')[0] || 'Cliente'}, aqui é da ${settings?.company?.name || 'Assistência'}! \n\n${statusMessages[item.status]}`;
        const link = `https://wa.me/55${item.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
    };

    const filteredItems = items.filter(item => {
        const matchesStatus = item.status === activeTab;
        const matchesSearch = searchTerm === '' ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.osNumber?.toString().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    const OSCard = ({ item }) => {
        const status = STATUSES.find(s => s.id === item.status);
        const nextStatus = STATUSES[STATUSES.findIndex(s => s.id === item.status) + 1];
        const timeAgo = formatDistanceToNow(getFirestoreDate(item.createdAt), {
            addSuffix: true,
            locale: ptBR
        });

        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/10 hover:shadow-lg dark:shadow-slate-900/50 transition-all group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400">OS #{item.osNumber}</span>
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                status?.color === 'amber' && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                                status?.color === 'blue' && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                                status?.color === 'indigo' && "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
                                status?.color === 'emerald' && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            )}>
                                {status?.label}
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {item.brand} {item.model}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {item.problem || 'Sem descrição'}
                        </p>
                    </div>
                </div>

                {/* Client Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600 dark:text-slate-300 dark:text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.ownerName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.ownerPhone}</p>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-400">{timeAgo}</span>
                    </div>
                    {item.estimatedWait && (
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-400">{item.estimatedWait} min</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleSendWhatsApp(item)}
                        className="flex-1 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                    </button>
                    <button
                        onClick={() => PrintingService.printOSThermal(item, settings)}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                    {nextStatus && (
                        <button
                            onClick={() => handleUpdateStatus(item.id, nextStatus.id)}
                            className={cn(
                                "px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1",
                                nextStatus.color === 'blue' && "bg-blue-600 text-white hover:bg-blue-700",
                                nextStatus.color === 'indigo' && "bg-indigo-600 text-white hover:bg-indigo-700",
                                nextStatus.color === 'emerald' && "bg-emerald-600 text-white hover:bg-emerald-700"
                            )}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
            {/* Header */}
            <div className="w-full mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Laboratório Técnico
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {items.length} ordens de serviço ativas
                        </p>
                    </div>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 hover:shadow-xl flex items-center gap-2"
                    >
                        <Smartphone className="w-5 h-5" />
                        Nova OS
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, modelo ou número da OS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/20 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="w-full mb-8">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {STATUSES.map(status => {
                        const count = items.filter(i => i.status === status.id).length;
                        const Icon = status.icon;

                        return (
                            <button
                                key={status.id}
                                onClick={() => setActiveTab(status.id)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all whitespace-nowrap",
                                    activeTab === status.id
                                        ? "bg-white dark:bg-slate-900 border-slate-900 dark:border-white/30 shadow-lg dark:shadow-slate-900/50"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    activeTab === status.id
                                        ? status.color === 'amber' && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                        : status.color === 'amber' && "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
                                    activeTab === status.id
                                        ? status.color === 'blue' && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        : status.color === 'blue' && "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
                                    activeTab === status.id
                                        ? status.color === 'indigo' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                        : status.color === 'indigo' && "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
                                    activeTab === status.id
                                        ? status.color === 'emerald' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                        : status.color === 'emerald' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{status.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{count} {count === 1 ? 'item' : 'itens'}</p>
                                </div>
                            </button>
                        );
                    })}

                    <div className="w-px h-10 bg-slate-200 dark:bg-white/10 mx-2" />

                    <button
                        onClick={() => setActiveTab('performance')}
                        className={cn(
                            "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all whitespace-nowrap",
                            activeTab === 'performance'
                                ? "bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-lg dark:shadow-slate-900/50"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            activeTab === 'performance'
                                ? "bg-indigo-600 text-white"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        )}>
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-slate-900 dark:text-white">Performance</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Metricas & TAT</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* OS Cards Grid or Performance Panel */}
            <div className="w-full">
                {activeTab === 'performance' ? (
                    <PerformanceLab userProfile={userProfile} settings={settings} />
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-100 dark:border-white/10 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 dark:bg-white dark:bg-slate-900/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            Nenhuma OS nesta etapa
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {searchTerm ? 'Tente ajustar sua busca' : 'Crie uma nova ordem de serviço para começar'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
                        {filteredItems.map(item => (
                            <OSCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Wizard Modal */}
            <ServiceOrderWizard
                open={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                user={user}
                userProfile={userProfile}
                settings={settings}
                onSaved={() => {
                    setIsWizardOpen(false);
                    showToast("OS criada com sucesso!", "success");
                }}
            />
        </div>
    );
}
