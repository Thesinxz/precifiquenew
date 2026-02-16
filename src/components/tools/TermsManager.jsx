import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import {
    FileText, ShieldCheck, Smartphone, Save,
    RefreshCcw, AlertCircle, CheckCircle2, Award
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function TermsManager({ user, userProfile, darkMode }) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('warranty');
    const orgId = userProfile?.organizationId || user?.uid;

    const [terms, setTerms] = useState({
        warranty: {
            title: 'CERTIFICADO DE GARANTIA E CONDIÇÕES DE USO',
            content: `1. PRAZO: A garantia contratual é de 90 dias a contar da data de entrega, cobrindo exclusivamente defeitos de fabricação.\n\n2. EXCLUSÕES: Estão excluídos da garantia danos causados por: quedas, impactos, pressão excessiva, contato com líquidos (mesmo em aparelhos resistentes à água), uso de carregadores não originais, ou variações de tensão elétrica.\n\n3. DISPLAY: Manchas, listras ou quebra interna do visor são caracterizadas como dano físico/pressão, não sendo cobertas pela garantia.\n\n4. SELOS: A violação, remoção ou rasura dos selos internos ou externos de garantia implica na perda imediata da mesma.\n\n5. INTERVENÇÃO: Caso o aparelho seja aberto por assistência não autorizada pela nossa loja, a garantia será anulada.\n\n6. SOFTWARE: Problemas de sistema decorrentes de atualizações interrompidas ou jailbreak não são cobertos.`,
            footer: 'O preenchimento do IMEI no recibo é obrigatório para validação.'
        },
        tradeIn: {
            title: 'TERMO DE ENTREGA DE APARELHO USADO (TRADE-IN)',
            content: `O cliente abaixo identificado declara, sob as penas da lei, que o aparelho entregue é de sua legítima propriedade e procedência, estando livre de qualquer ônus, bloqueio judicial ou impedimento legal.\n\nDECLARA ainda que:\n1. Desativou a conta iCloud/Google e 'Buscar meu iPhone'.\n2. Realizou o backup e apagou todos os dados pessoais.\n3. O valor de avaliação aqui registrado será descontado como crédito para a aquisição do novo produto.\n4. Uma vez concluída a transação, o aparelho usado não poderá ser devolvido por ter entrado em fluxo de revenda/desmonte.`,
            footer: 'Certifique-se de que o IMEI está legível.'
        },
        sale: {
            title: 'RECIBO DE VENDA',
            content: 'Obrigado por sua compra! Este documento serve como comprovante de pagamento e entrega dos produtos listados.',
            footer: 'Volte sempre!'
        },
        appleProvenance: {
            title: 'CERTIFICADO DE PROCEDÊNCIA E ORIGINALIDADE APPLE',
            content: `Atestamos para os devidos fins que o equipamento Apple descrito na nota/recibo é um PRODUTO ORIGINAL, de procedência lícita e verificada.\n\nGARANTIAS DE PROCEDÊNCIA:\n\n1. CHECK-UP GLOBAL: O aparelho não consta na Blacklist (lista negra) das operadoras nacionais e internacionais.\n\n2. iCLOUD E BLOQUEIOS: O dispositivo foi entregue livre de bloqueios de ativação (iCloud), senha ou gestão remota (MDM).\n\n3. PEÇAS E COMPONENTES: O dispositivo passou por rigorosa inspeção técnica que atesta a funcionalidade de seus componentes conforme o padrão do fabricante.\n\nEste certificado assegura que o cliente está adquirindo um produto legítimo, com garantia de origem e pleno funcionamento de rede.`,
            footer: 'Autenticidade Verificada.'
        }
    });

    useEffect(() => {
        if (orgId) loadTerms();
    }, [orgId]);

    const loadTerms = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, 'settings', orgId);
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data().customTerms) {
                setTerms(prev => ({ ...prev, ...snap.data().customTerms }));
            }
        } catch (error) {
            console.error("Error loading terms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, 'settings', orgId);
            await updateDoc(docRef, {
                customTerms: terms,
                updatedAt: new Date()
            });
            showToast("Termos atualizados com sucesso!", "success");
        } catch (error) {
            console.error("Error saving terms:", error);
            showToast("Erro ao salvar termos.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = (type) => {
        if (!confirm("Deseja restaurar o texto padrão?")) return;
        const defaults = {
            warranty: {
                title: 'CERTIFICADO DE GARANTIA',
                content: '1. A garantia cobre apenas defeitos de fabricação pelo prazo de 90 dias conforme CDC.\n2. A garantia não cobre danos por mau uso, quedas, contato com líquidos ou intervenções de terceiros.\n3. É indispensável a apresentação deste certificado para qualquer solicitação.',
                footer: 'Pela presente, as partes confirmam os termos acima.'
            },
            tradeIn: {
                title: 'TERMO DE RECEBIMENTO - TRADE-IN',
                content: 'O cliente declara que o aparelho entregue é de sua propriedade, livre de ônus e que todos os dados foram apagados. O valor avaliado será utilizado exclusivamente como crédito na compra de um novo aparelho.',
                footer: 'Assinaturas abaixo confirmam a transação.'
            },
            sale: {
                title: 'RECIBO DE VENDA',
                content: 'Obrigado por sua compra! Este documento serve como comprovante de pagamento e entrega dos produtos listados.',
                footer: 'Volte sempre!'
            },
            appleProvenance: {
                title: 'CERTIFICADO DE PROCEDÊNCIA E ORIGINALIDADE APPLE',
                content: 'Atestamos que este é um PRODUTO ORIGINAL Apple, de procedência lícita, livre de restrições (Blacklist) e bloqueios de iCloud/MDM. O equipamento foi inspecionado e aprovado em todos os testes de funcionalidade e rede.',
                footer: 'Autenticidade Verificada.'
            }
        };
        setTerms(prev => ({ ...prev, [type]: defaults[type] }));
    };

    if (isLoading) return <div className="flex justify-center p-20"><RefreshCcw className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="w-full pb-20 animate-in fade-in">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Gestão de Termos e Documentos
                    </h2>
                    <p className="text-slate-500 font-medium">Personalize os termos de garantia, troca e recibos da sua loja.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 space-y-2">
                    <button
                        onClick={() => setActiveTab('warranty')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2",
                            activeTab === 'warranty'
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:border-indigo-200"
                        )}
                    >
                        <ShieldCheck className="w-4 h-4" /> Termo de Garantia
                    </button>
                    <button
                        onClick={() => setActiveTab('tradeIn')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2",
                            activeTab === 'tradeIn'
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:border-emerald-200"
                        )}
                    >
                        <Smartphone className="w-4 h-4" /> Recibo Trade-in
                    </button>
                    <button
                        onClick={() => setActiveTab('sale')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2",
                            activeTab === 'sale'
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-800"
                        )}
                    >
                        <FileText className="w-4 h-4" /> Recibo de Venda
                    </button>
                    <button
                        onClick={() => setActiveTab('appleProvenance')}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2",
                            activeTab === 'appleProvenance'
                                ? "bg-black border-black text-white shadow-lg"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:border-black"
                        )}
                    >
                        <Award className="w-4 h-4 text-slate-400" /> Certificado Apple
                    </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm dark:shadow-slate-900/50 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Título do Documento</label>
                            <input
                                value={terms[activeTab].title}
                                onChange={e => setTerms({ ...terms, [activeTab]: { ...terms[activeTab], title: e.target.value } })}
                                className="w-full bg-slate-50 dark:bg-slate-950 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 dark:text-white outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Conteúdo Principal (Texto/Cláusulas)</label>
                            <textarea
                                value={terms[activeTab].content}
                                onChange={e => setTerms({ ...terms, [activeTab]: { ...terms[activeTab], content: e.target.value } })}
                                className="w-full bg-slate-50 dark:bg-slate-950 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-6 font-medium text-slate-600 dark:text-slate-300 dark:text-slate-300 outline-none transition-all min-h-[300px] leading-relaxed"
                            />
                            <p className="mt-2 text-[10px] text-slate-400 font-medium">* Use quebras de linha para separar itens.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Rodapé / Observações</label>
                            <input
                                value={terms[activeTab].footer}
                                onChange={e => setTerms({ ...terms, [activeTab]: { ...terms[activeTab], footer: e.target.value } })}
                                className="w-full bg-slate-50 dark:bg-slate-950 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 dark:text-white outline-none transition-all"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <button
                                onClick={() => handleReset(activeTab)}
                                className="text-[10px] font-black uppercase text-rose-500 hover:underline flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4" /> Restaurar Padrão
                            </button>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500">
                                <CheckCircle2 className="w-4 h-4" /> Autosave desativado
                            </div>
                        </div>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 dark:border-white/10 opacity-60">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 text-center tracking-widest">Prévia de Impressão</h4>
                        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-10 shadow-xl dark:shadow-slate-900/50 space-y-6 text-slate-800 dark:text-slate-100">
                            <h1 className="text-xl font-black text-center border-b pb-4">{terms[activeTab].title}</h1>
                            <div className="text-[10px] space-y-4">
                                {terms[activeTab].content.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                            <div className="pt-10 flex justify-between gap-4">
                                <div className="flex-1 border-t pt-2 text-[8px] font-bold text-center">Assinatura Loja</div>
                                <div className="flex-1 border-t pt-2 text-[8px] font-bold text-center">Assinatura Cliente</div>
                            </div>
                            <p className="text-[8px] text-center text-slate-400 pt-4">{terms[activeTab].footer}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
