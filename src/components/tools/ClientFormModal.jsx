import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save, User } from 'lucide-react';
import { ClientService } from '../../services/clientService';
import { useToast } from '../ui/Toast';

const clientSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    phone: z.string().min(10, "Telefone é obrigatório (mínimo 10 dígitos)"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    cpf: z.string().min(11, "CPF/CNPJ é obrigatório"),
    birthDate: z.string().optional(),
    cep: z.string().min(8, "CEP é obrigatório"),
    street: z.string().min(1, "Rua é obrigatória"),
    number: z.string().min(1, "Número é obrigatório"),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(2, "Estado é obrigatório"),
    address: z.string().optional(),
    ie: z.string().optional(),
    instagram: z.string().optional(),
    notes: z.string().optional()
});

export function ClientFormModal({ open, onClose, onSaved, editingClient, user, userProfile }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(clientSchema)
    });

    useEffect(() => {
        if (open) {
            if (editingClient) {
                reset({
                    ...editingClient,
                    cep: editingClient.cep || '',
                    street: editingClient.street || '',
                    number: editingClient.number || '',
                    neighborhood: editingClient.neighborhood || '',
                    city: editingClient.city || '',
                    state: editingClient.state || '',
                    address: editingClient.address || ''
                });
            } else {
                reset({
                    name: '', phone: '', email: '', cpf: '', ie: '', address: '',
                    instagram: '', notes: '', cep: '', street: '',
                    number: '', neighborhood: '', city: '', state: '',
                    birthDate: ''
                });
            }
        }
    }, [open, editingClient?.id, reset]);

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

    const onSubmit = async (data) => {
        try {
            let result;
            if (editingClient) {
                await ClientService.updateClient(editingClient.id, data);
                result = { ...editingClient, ...data };
                showToast("Cliente atualizado!", "success");
            } else {
                result = await ClientService.addClient(user.uid, data, orgId);
                showToast("Cliente cadastrado!", "success");
            }
            if (onSaved) onSaved(result);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving client:", error);
            showToast("Erro ao salvar cliente", "error");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl rounded-[1.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <User className="w-6 h-6 text-indigo-600" />
                        {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm">Centralize as informações do seu cliente.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Nome Completo *</label>
                        <input {...register('name')} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="Ex: João Silva" />
                        {errors.name && <span className="text-red-500 text-xs font-bold ml-1">{errors.name.message}</span>}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Telefone *</label>
                        <input
                            {...register('phone')}
                            maxLength={15}
                            onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, '');
                                v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
                                v = v.replace(/(\d)(\d{4})$/, '$1-$2');
                                setValue('phone', v);
                            }}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="(11) 99999-9999"
                        />
                        {errors.phone && <span className="text-red-500 text-xs font-bold ml-1">{errors.phone.message}</span>}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">CPF/CNPJ *</label>
                        <input
                            {...register('cpf')}
                            maxLength={18}
                            onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length <= 11) {
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                } else {
                                    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                                    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                                    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                                    v = v.replace(/(\d{4})(\d)/, '$1-$2');
                                }
                                setValue('cpf', v);
                            }}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="000.000.000-00"
                        />
                        {errors.cpf && <span className="text-red-500 text-xs font-bold ml-1">{errors.cpf.message}</span>}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Inscrição Estadual</label>
                        <input
                            {...register('ie')}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="Isento ou Número"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Email</label>
                        <input {...register('email')} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="joao@email.com" />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Nascimento</label>
                        <input {...register('birthDate')} type="date" className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20" />
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Instagram (Opcional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                            <input {...register('instagram')} className="w-full pl-8 pr-4 py-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="loja.precifique" />
                        </div>
                    </div>

                    <div className="md:col-span-3 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Endereço</h4>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">CEP *</label>
                            <input
                                {...register('cep')}
                                maxLength={9}
                                onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
                                    setValue('cep', v);

                                    // Only fetch if complete
                                    if (v.replace(/\D/g, '').length === 8) {
                                        // Use a timeout to avoid blocking the UI thread or immediate state clashes
                                        setTimeout(() => handleCepBlur({ target: { value: v } }), 100);
                                    }
                                }}
                                onBlur={(e) => {
                                    handleCepBlur(e);
                                }}
                                onClick={(e) => e.stopPropagation()} // Prevent closing if click outside logic exists
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="00000-000"
                            />
                            {errors.cep && <span className="text-red-500 text-xs font-bold ml-1">{errors.cep.message}</span>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Rua/Logradouro *</label>
                            <input {...register('street')} className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="Ex: Av. Paulista" />
                            {errors.street && <span className="text-red-500 text-xs font-bold ml-1">{errors.street.message}</span>}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Número *</label>
                            <input {...register('number')} className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="123" />
                            {errors.number && <span className="text-red-500 text-xs font-bold ml-1">{errors.number.message}</span>}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Bairro *</label>
                            <input {...register('neighborhood')} className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="Bairro" />
                            {errors.neighborhood && <span className="text-red-500 text-xs font-bold ml-1">{errors.neighborhood.message}</span>}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Cidade/UF *</label>
                            <div className="flex gap-2">
                                <input {...register('city')} className="flex-1 p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="Cidade" />
                                <input {...register('state')} className="w-16 p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="UF" />
                            </div>
                            {(errors.city || errors.state) && <span className="text-red-500 text-xs font-bold ml-1">Localização obrigatória</span>}
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Referência</label>
                            <input {...register('address')} className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20" placeholder="Apartamento, Bloco, etc." />
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Observações</label>
                        <textarea {...register('notes')} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 min-h-[100px]" placeholder="Preferências, histórico..." />
                    </div>

                    <div className="md:col-span-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar Cliente</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
