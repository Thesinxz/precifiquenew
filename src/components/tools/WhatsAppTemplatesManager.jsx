import { useState, useEffect } from 'react';
import { WhatsappService } from '../../services/whatsappService';
import { useToast } from '../ui/Toast';
import { MessageSquare, Save, RotateCcw, Eye, EyeOff, Sparkles, Zap, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function WhatsAppTemplatesManager({ user, userProfile }) {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState({});
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [previewData, setPreviewData] = useState({
        clientName: 'João Silva',
        model: 'iPhone 13 Pro',
        osNumber: 'OS-2024-001',
        issue: 'Tela quebrada',
        forecastDate: '25/02/2026',
        totalValue: '450,00',
        trackingLink: 'https://precifique.app/track/abc123'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const orgId = userProfile?.organizationId || user?.uid;

    useEffect(() => {
        loadTemplates();
    }, [orgId]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await WhatsappService.getTemplates(orgId);
            setTemplates(data);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar templates", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (templateId) => {
        if (!editingTemplate) return;

        setIsSaving(true);
        try {
            await WhatsappService.saveTemplate(orgId, editingTemplate);
            setTemplates(prev => ({
                ...prev,
                [templateId]: editingTemplate
            }));
            setEditingTemplate(null);
            showToast("Template salvo com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar template", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = (templateId) => {
        const original = templates[templateId];
        setEditingTemplate(original);
    };

    const getPreview = (template) => {
        if (!template) return '';
        return WhatsappService.fillTemplate(template.message, previewData);
    };

    const templateCards = [
        {
            id: 'osCreated',
            icon: Sparkles,
            color: 'blue',
            title: 'OS Criada',
            description: 'Enviado quando uma nova ordem de serviço é criada'
        },
        {
            id: 'osApproved',
            icon: CheckCircle,
            color: 'emerald',
            title: 'Orçamento Aprovado',
            description: 'Enviado quando o cliente aprova o orçamento'
        },
        {
            id: 'osCompleted',
            icon: Zap,
            color: 'indigo',
            title: 'OS Concluída',
            description: 'Enviado quando o reparo é finalizado'
        },
        {
            id: 'osDelayed',
            icon: Clock,
            color: 'amber',
            title: 'OS Atrasada',
            description: 'Enviado quando há atraso no prazo'
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 mb-2">
                    <MessageSquare className="w-8 h-8 text-emerald-500" />
                    Templates WhatsApp
                </h2>
                <p className="text-slate-500 font-medium">Configure mensagens automáticas para suas Ordens de Serviço</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {templateCards.map(card => {
                    const template = templates[card.id];
                    const isEditing = editingTemplate?.id === card.id;
                    const currentTemplate = isEditing ? editingTemplate : template;

                    return (
                        <div key={card.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className={cn(
                                "p-6 border-b border-slate-100 dark:border-white/10",
                                card.color === 'blue' && "bg-blue-50 dark:bg-blue-900/10",
                                card.color === 'emerald' && "bg-emerald-50 dark:bg-emerald-900/10",
                                card.color === 'indigo' && "bg-indigo-50 dark:bg-indigo-900/10",
                                card.color === 'amber' && "bg-amber-50 dark:bg-amber-900/10"
                            )}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                            card.color === 'blue' && "bg-blue-600 text-white",
                                            card.color === 'emerald' && "bg-emerald-600 text-white",
                                            card.color === 'indigo' && "bg-indigo-600 text-white",
                                            card.color === 'amber' && "bg-amber-600 text-white"
                                        )}>
                                            <card.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{card.title}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newEnabled = !currentTemplate?.enabled;
                                            const updated = { ...currentTemplate, enabled: newEnabled };
                                            WhatsappService.saveTemplate(orgId, updated);
                                            setTemplates(prev => ({ ...prev, [card.id]: updated }));
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            currentTemplate?.enabled
                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        )}
                                    >
                                        {currentTemplate?.enabled ? <><Eye className="w-3 h-3 inline mr-1" />Ativo</> : <><EyeOff className="w-3 h-3 inline mr-1" />Inativo</>}
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {isEditing ? (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mensagem</label>
                                            <textarea
                                                value={editingTemplate.message}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                                                rows={10}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                                                placeholder="Digite sua mensagem..."
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2">
                                                Variáveis disponíveis: {'{clientName}'}, {'{model}'}, {'{osNumber}'}, {'{issue}'}, {'{forecastDate}'}, {'{totalValue}'}, {'{trackingLink}'}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSave(card.id)}
                                                disabled={isSaving}
                                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Save className="w-4 h-4" />
                                                {isSaving ? 'Salvando...' : 'Salvar'}
                                            </button>
                                            <button
                                                onClick={() => handleReset(card.id)}
                                                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingTemplate(null)}
                                                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium leading-relaxed">
                                                {getPreview(currentTemplate)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setEditingTemplate(currentTemplate)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all"
                                        >
                                            Editar Template
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Card */}
            <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-1">Como funciona?</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            As mensagens são enviadas automaticamente quando você atualiza o status de uma Ordem de Serviço.
                            Você pode personalizar cada template e ativar/desativar conforme necessário.
                            As variáveis entre chaves { } serão substituídas pelos dados reais da OS.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
