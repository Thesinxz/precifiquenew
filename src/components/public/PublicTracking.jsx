import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
    Clock, Wrench, Microscope, CheckCircle2,
    Smartphone, MessageSquare, ShieldCheck,
    ChevronRight, MapPin, Calendar, AlertCircle,
    Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_STEPS = [
    { id: 'triagem', label: 'Triagem', icon: Clock },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench },
    { id: 'revisao', label: 'Revisão', icon: Microscope },
    { id: 'concluido', label: 'Pronto', icon: CheckCircle2 }
];

export function PublicTracking() {
    const { id } = useParams();
    const [os, setOs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [storeSettings, setStoreSettings] = useState(null);

    useEffect(() => {
        if (!id) return;

        // Real-time listener for the service order
        const unsubscribe = onSnapshot(doc(db, 'technical_lab', id), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setOs({ id: docSnap.id, ...data });

                // Load store settings (brand name, etc)
                if (data.organizationId && !storeSettings) {
                    const settingsSnap = await getDoc(doc(db, 'settings', data.organizationId));
                    if (settingsSnap.exists()) {
                        setStoreSettings(settingsSnap.data());
                    }
                }
            } else {
                setOs(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-medium animate-pulse tracking-widest uppercase text-[10px]">Consultando Ordem de Serviço...</p>
            </div>
        );
    }

    if (!os) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">OS não encontrada</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">Verifique o código de rastreamento enviado pela loja ou entre em contato com o suporte.</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                    Voltar ao Início
                </button>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === os.status?.toLowerCase()) || 0;
    const storeName = storeSettings?.company?.name || "Assistência Técnica";

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 pb-20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                <div className="max-w-2xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-black text-slate-900 leading-none">{storeName}</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status em Tempo Real</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-10 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Hero Card */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-900/5 relative overflow-hidden border border-slate-100">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">OS #{os.osNumber}</span>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-600 border border-slate-100">
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{os.brand} {os.model}</h2>
                                <p className="text-slate-500 font-medium flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Sob cuidados técnicos
                                </p>
                            </div>
                        </div>

                        {/* Status Label Big */}
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100/50 mb-10">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                            <span className="font-black text-sm uppercase tracking-widest">
                                Status: {STATUS_STEPS[currentStepIndex]?.label}
                            </span>
                        </div>

                        {/* Visual Progress Steps */}
                        <div className="relative flex justify-between items-center mb-10">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2" />
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 transition-all duration-1000"
                                style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                            />

                            {STATUS_STEPS.map((step, idx) => {
                                const Icon = step.icon;
                                const isCompleted = idx <= currentStepIndex;
                                const isActive = idx === currentStepIndex;

                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                            isCompleted ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-white text-slate-300 border-2 border-slate-100"
                                        )}>
                                            {isCompleted && !isActive ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>
                                        <span className={cn(
                                            "absolute -bottom-7 text-[9px] font-black uppercase tracking-widest transition-colors",
                                            isActive ? "text-indigo-600" : "text-slate-400"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entrada</p>
                            <p className="text-sm font-black text-slate-800">
                                {os.createdAt ? format(os.createdAt.toDate ? os.createdAt.toDate() : new Date(os.createdAt.seconds * 1000), "dd MMM, HH:mm", { locale: ptBR }) : '---'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Previsão</p>
                            <p className="text-sm font-black text-slate-800">
                                ~{os.estimatedWait || 60} min
                            </p>
                        </div>
                    </div>
                </div>

                {/* History/Timeline */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100">
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs">
                            <Activity className="w-4 h-4" />
                        </span>
                        Linha do Tempo
                    </h3>

                    <div className="space-y-8">
                        {os.history?.slice().reverse().map((event, idx) => (
                            <div key={idx} className="flex gap-6 relative">
                                {idx < (os.history?.length - 1) && (
                                    <div className="absolute left-[11px] top-6 bottom-[-32px] w-px bg-slate-100" />
                                )}
                                <div className={cn(
                                    "w-[22px] h-[22px] rounded-full mt-1 border-4 border-white shadow-sm flex-shrink-0 relative z-10",
                                    idx === 0 ? "bg-indigo-600" : "bg-slate-200"
                                )} />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className={cn(
                                            "font-black text-sm uppercase tracking-widest",
                                            idx === 0 ? "text-indigo-600" : "text-slate-400"
                                        )}>
                                            {event.status}
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {format(event.date?.toDate ? event.date.toDate() : new Date(event.date), "dd/MM • HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed italic">
                                        "{event.note || 'Status atualizado pelo sistema.'}"
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Accessories Mention */}
                {os.accessoriesIn?.length > 0 && (
                    <div className="p-6 bg-slate-100/50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Acessórios Identificados</p>
                        <div className="flex flex-wrap gap-2">
                            {os.accessoriesIn.map(acc => (
                                <span key={acc} className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-slate-600 border border-slate-100">
                                    {acc}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <button
                        onClick={() => {
                            const phone = storeSettings?.company?.phone?.replace(/\D/g, '') || '';
                            const msg = `Olá! Gostaria de mais informações sobre minha OS #${os.osNumber} (${os.model})`;
                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="flex-1 h-16 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all"
                    >
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        Falar com Consultor
                    </button>
                </div>
            </div>
        </div>
    );
}

function Activity({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
    )
}
