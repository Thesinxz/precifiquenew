import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    CheckCircle,
    Smartphone,
    Calendar,
    User,
    FileText,
    ShieldCheck,
    SmartphoneNfc,
    CreditCard,
    DollarSign,
    Share2,
    Loader2
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';

export function PublicProposal({ proposalId }) {
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (proposalId) {
            fetchProposal();
        }
    }, [proposalId]);

    const fetchProposal = async () => {
        try {
            const docRef = doc(db, 'proposals', proposalId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProposal(docSnap.data());
            } else {
                setError(true);
            }
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Orçamento...</p>
                </div>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-6">
                    <div className="bg-red-50 text-red-500 p-6 rounded-[2.5rem] border border-red-100 mx-auto w-fit">
                        <FileText className="w-12 h-12" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Orçamento não encontrado</h2>
                        <p className="text-slate-500 font-medium mt-2">Este link pode estar expirado ou o ID está incorreto.</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-inter pb-20">
            {/* Header */}
            <div className="bg-blue-600 pt-8 pb-24 md:pt-12 md:pb-32">
                <div className="max-w-3xl mx-auto px-4 md:px-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-80">Orçamento Confirmado</p>
                            <h1 className="text-lg md:text-xl font-black tracking-tight">Phone<span className="text-blue-300">Smart</span></h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-80">Data de Emissão</p>
                        <p className="font-bold text-xs md:text-sm">
                            {proposal.createdAt?.toDate().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-16 md:-mt-20">
                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-4 md:p-12 space-y-8 md:space-y-12">
                    {/* Hero Stats */}
                    <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8 pb-8 md:pb-12 border-b border-slate-50">
                        <div className="space-y-2 md:space-y-4">
                            <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                                <User className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Para:</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
                                {proposal.clientName}
                            </h2>
                        </div>
                        <div className="space-y-2 md:space-y-4 md:text-right">
                            <div className="flex md:justify-end items-center gap-2 md:gap-3 text-slate-400">
                                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Total à Vista:</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-emerald-600 tracking-tighter">
                                {formatCurrency(proposal.totalPix)}
                            </h2>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <Smartphone className="w-5 h-5" /> Detalhes dos Produtos
                        </h3>
                        <div className="grid gap-6">
                            {proposal.items.map((item, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 group hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all">
                                    <div className="space-y-2 text-center md:text-left w-full md:w-auto">
                                        <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest w-fit mb-2 mx-auto md:mx-0">
                                            {item.condition || 'Novo'}
                                        </div>
                                        <h4 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center justify-center md:justify-start gap-4 text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-wider">
                                            <span>Capacidade: {item.storage || 'N/A'}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                            <span>Cor: {item.color || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right w-full md:w-auto">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Pix</p>
                                            <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(item.pixPrice)}</p>
                                        </div>
                                        <div className="px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                                            <p className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Ou no Cartão</p>
                                            <p className="text-xs md:text-sm font-black text-blue-600 uppercase tracking-widest">12x de {formatCurrency(item.twelveMonthPrice / 12)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Security Seals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-50">
                        <div className="flex items-center gap-4 p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100">
                            <ShieldCheck className="w-10 h-10 text-emerald-500" />
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Originalidade</h5>
                                <p className="text-xs font-semibold text-emerald-600">Peças 100% Originais</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                            <SmartphoneNfc className="w-10 h-10 text-blue-500" />
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-700">Teste Completo</h5>
                                <p className="text-xs font-semibold text-blue-600">32 Itens Verificados</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 rounded-3xl bg-amber-50/50 border border-amber-100">
                            <CreditCard className="w-10 h-10 text-amber-500" />
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Parcelamento</h5>
                                <p className="text-xs font-semibold text-amber-600">Até 21x no Cartão</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer and Share */}
                <div className="mt-12 text-center space-y-8">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Gerado via <span className="text-blue-500">Phone Smart</span> Intelligence</p>
                    <div className="flex justify-center gap-4">
                        <button className="px-8 h-16 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200">
                            Aceitar Orçamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
