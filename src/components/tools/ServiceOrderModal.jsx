import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import { Plus, Smartphone, Wrench, Search, ClipboardCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { VisualChecklist, FunctionalChecklist } from './ServiceOrderComponents';
import { ClientFormModal } from './ClientFormModal';

export function ServiceOrderModal({ open, onClose, onSaved, editingItem, user, userProfile, initialClient }) {
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    const initialForm = {
        model: '',
        imei: '',
        origin: 'repair',
        entryCondition: '',
        technicalNotes: '',
        expectedCost: 0,
        status: 'triagem',
        priority: 'normal',
        ownerName: '',
        ownerPhone: '',
        clientId: '',
        visualChecklist: [],
        functionalChecklist: {}
    };

    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        if (open) {
            if (editingItem) {
                setFormData({
                    ...initialForm,
                    ...editingItem,
                    expectedCost: editingItem.expectedCost || 0
                });
            } else if (initialClient) {
                setFormData({
                    ...initialForm,
                    ownerName: initialClient.name,
                    ownerPhone: initialClient.phone,
                    clientId: initialClient.id
                });
            } else {
                setFormData(initialForm);
            }
        }
    }, [open, editingItem, initialClient]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const orgId = userProfile?.organizationId || user.uid;
            const data = {
                ...formData,
                organizationId: orgId,
                updatedAt: serverTimestamp(),
            };

            if (editingItem?.id) {
                await updateDoc(doc(db, 'technical_lab', editingItem.id), data);
                showToast("Registro atualizado!", "success");
            } else {
                const docRef = await addDoc(collection(db, 'technical_lab'), {
                    ...data,
                    createdAt: serverTimestamp(),
                    history: [{
                        status: 'triagem',
                        date: new Date(),
                        note: 'Entrada no laboratório'
                    }]
                });
                data.id = docRef.id;
                showToast("Ordem de serviço registrada!", "success");
            }
            if (onSaved) onSaved(data);
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar registro.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative dark:bg-slate-900 border dark:border-white/10">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                            {editingItem ? 'Editar Ordem' : 'Nova Ordem de Serviço'}
                        </h2>
                        <p className="text-xs font-bold text-slate-500">Fluxo integrado com o Laboratório Técnico.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors">
                        <Plus className="w-8 h-8 rotate-45 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Client Info Section */}
                    <div className="md:col-span-2 bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Identificação do Cliente</h3>
                            {!initialClient && !editingItem && (
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(true)}
                                    className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                                >
                                    + Novo Cliente
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nome do Cliente</label>
                                <input
                                    required
                                    placeholder="Nome completo..."
                                    value={formData.ownerName}
                                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                    className="w-full p-4 rounded-2xl border-2 border-transparent bg-white dark:bg-slate-800 dark:text-white focus:border-blue-500/30 outline-none transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">WhatsApp</label>
                                <input
                                    required
                                    placeholder="(00) 00000-0000"
                                    value={formData.ownerPhone}
                                    onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                                    className="w-full p-4 rounded-2xl border-2 border-transparent bg-white dark:bg-slate-800 dark:text-white focus:border-blue-500/30 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block text-xs">Modelo do Aparelho</label>
                            <div className="relative">
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    required
                                    placeholder="Ex: iPhone 14 Pro Max"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent bg-slate-50 dark:bg-white/5 dark:text-white focus:border-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block text-xs">IMEI ou Serial Number</label>
                            <input
                                required
                                placeholder="00000000000000"
                                value={formData.imei}
                                onChange={e => setFormData({ ...formData, imei: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-transparent bg-slate-50 dark:bg-white/5 dark:text-white focus:border-blue-500 outline-none transition-all font-bold font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Prioridade</label>
                                <select
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full p-4 rounded-2xl border-2 border-transparent bg-slate-50 dark:bg-white/5 dark:text-white focus:border-blue-500 outline-none transition-all font-bold"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Custo Est. (R$)</label>
                                <input
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.expectedCost}
                                    onChange={e => setFormData({ ...formData, expectedCost: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-4 rounded-2xl border-2 border-transparent bg-slate-50 dark:bg-white/5 dark:text-white focus:border-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block text-xs">Condição de Entrada</label>
                            <textarea
                                placeholder="Descreva os defeitos e estado físico..."
                                value={formData.entryCondition}
                                onChange={e => setFormData({ ...formData, entryCondition: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-transparent bg-slate-50 dark:bg-white/5 dark:text-white focus:border-blue-500 outline-none transition-all font-medium min-h-[140px]"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                Lista de Verificação
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Checklist Visual</p>
                                    <VisualChecklist
                                        value={formData.visualChecklist}
                                        onChange={(val) => setFormData({ ...formData, visualChecklist: val })}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Checklist Funcional</p>
                                    <FunctionalChecklist
                                        value={formData.functionalChecklist}
                                        onChange={(val) => setFormData({ ...formData, functionalChecklist: val })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-6 border-t border-slate-100 dark:border-white/5 mb-4">
                        <button
                            disabled={isProcessing}
                            type="submit"
                            className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isProcessing ? 'Processando...' : (editingItem ? 'Salvar Alterações' : 'Finalizar e Gerar Protocolo')}
                        </button>
                    </div>
                </form>

                <ClientFormModal
                    open={isClientModalOpen}
                    onClose={() => setIsClientModalOpen(false)}
                    onSaved={(client) => {
                        setFormData({
                            ...formData,
                            ownerName: client.name,
                            ownerPhone: client.phone,
                            clientId: client.id
                        });
                        showToast("Cliente selecionado!", "success");
                    }}
                    user={user}
                    userProfile={userProfile}
                />
            </div>
        </div>
    );
}
