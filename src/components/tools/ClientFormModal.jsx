import { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';
import { ClientService } from '../../services/clientService';
import { useToast } from '../ui/Toast';

export function ClientFormModal({ open, onClose, onSaved, editingClient, user, userProfile }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', cpf: '',
        ie: '', birthDate: '', instagram: '', notes: '',
        cep: '', street: '', number: '', neighborhood: '',
        city: '', state: '', address: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (editingClient) {
                setFormData({
                    name: editingClient.name || '',
                    phone: editingClient.phone || '',
                    email: editingClient.email || '',
                    cpf: editingClient.cpf || '',
                    ie: editingClient.ie || '',
                    birthDate: editingClient.birthDate || '',
                    instagram: editingClient.instagram || '',
                    notes: editingClient.notes || '',
                    cep: editingClient.cep || '',
                    street: editingClient.street || '',
                    number: editingClient.number || '',
                    neighborhood: editingClient.neighborhood || '',
                    city: editingClient.city || '',
                    state: editingClient.state || '',
                    address: editingClient.address || ''
                });
            } else {
                setFormData({
                    name: '', phone: '', email: '', cpf: '',
                    ie: '', birthDate: '', instagram: '', notes: '',
                    cep: '', street: '', number: '', neighborhood: '',
                    city: '', state: '', address: ''
                });
            }
        }
    }, [open, editingClient?.id]); // Use ID for stability, not object reference

    const handleChange = (e) => {
        const { name, value } = e.target;

        let formattedValue = value;
        // Basic masks
        if (name === 'phone') {
            formattedValue = value.replace(/\D/g, '').slice(0, 11)
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d)(\d{4})$/, '$1-$2');
        } else if (name === 'cpf') {
            const numbers = value.replace(/\D/g, '').slice(0, 14);
            if (numbers.length <= 11) {
                formattedValue = numbers
                    .replace(/(\d{3})(\d)/, '$1.$2')
                    .replace(/(\d{3})(\d)/, '$1.$2')
                    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                formattedValue = numbers
                    .replace(/^(\d{2})(\d)/, '$1.$2')
                    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1/$2')
                    .replace(/(\d{4})(\d)/, '$1-$2');
            }
        } else if (name === 'cep') {
            // Only mask, NO AUTO FETCH to prevent resets
            formattedValue = value.replace(/\D/g, '').slice(0, 8)
                .replace(/^(\d{5})(\d)/, '$1-$2');
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || formData.name.length < 3) {
            showToast("Nome inválido (mínimo 3 letras).", "error");
            return;
        }
        if (!formData.phone || formData.phone.length < 10) {
            showToast("Telefone inválido.", "error");
            return;
        }

        setLoading(true);
        try {
            let result;
            if (editingClient) {
                await ClientService.updateClient(editingClient.id, formData);
                result = { ...editingClient, ...formData };
                showToast("Cliente atualizado!", "success");
            } else {
                result = await ClientService.addClient(user.uid, formData, orgId);
                showToast("Cliente cadastrado!", "success");
            }
            if (onSaved) onSaved(result);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving client:", error);
            showToast("Erro ao salvar cliente", "error");
        } finally {
            setLoading(false);
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

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Nome Completo *</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Telefone *</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">CPF/CNPJ *</label>
                        <input
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Inscrição Estadual</label>
                        <input
                            name="ie"
                            value={formData.ie}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="Isento ou Número"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Email</label>
                        <input
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                            placeholder="joao@email.com"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Nascimento</label>
                        <input
                            name="birthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Instagram (Opcional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                            <input
                                name="instagram"
                                value={formData.instagram}
                                onChange={handleChange}
                                className="w-full pl-8 pr-4 py-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="loja.precifique"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-3 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Endereço</h4>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">CEP *</label>
                            <input
                                name="cep"
                                value={formData.cep}
                                onChange={handleChange}
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="00000-000"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Rua/Logradouro *</label>
                            <input
                                name="street"
                                value={formData.street}
                                onChange={handleChange}
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="Ex: Av. Paulista"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Número *</label>
                            <input
                                name="number"
                                value={formData.number}
                                onChange={handleChange}
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="123"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Bairro *</label>
                            <input
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="Bairro"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Cidade/UF *</label>
                            <div className="flex gap-2">
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="flex-1 p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                    placeholder="Cidade"
                                />
                                <input
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-16 p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                    placeholder="UF"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Referência</label>
                            <input
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600/20"
                                placeholder="Apartamento, Bloco, etc."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Observações</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 min-h-[100px]"
                            placeholder="Preferências, histórico..."
                        />
                    </div>

                    <div className="md:col-span-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar Cliente</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
