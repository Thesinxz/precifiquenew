import { useState, useEffect } from 'react';
import { User, Building2, MapPin, Save, Loader2, Camera, Phone } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import { auth } from '../../../lib/firebase';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { maskCNPJ, maskPhone } from '../../../lib/utils';
import { UserService } from '../../../services/userService';

export function ProfilePage({ settings, onSave, userProfile, onProfileUpdate }) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        displayName: userProfile?.name || auth.currentUser?.displayName || '',
        companyName: settings?.company?.name || '',
        companyCnpj: settings?.company?.cnpj || '',
        companyAddress: settings?.company?.address || '',
        phone: settings?.company?.phone || ''
    });

    useEffect(() => {
        setFormData({
            displayName: userProfile?.name || auth.currentUser?.displayName || '',
            companyName: settings?.company?.name || '',
            companyCnpj: settings?.company?.cnpj || '',
            companyAddress: settings?.company?.address || '',
            phone: settings?.company?.phone || ''
        });
    }, [settings]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Update Firebase Auth Profile (Display Name)
            if (auth.currentUser && formData.displayName !== auth.currentUser.displayName) {
                await updateProfile(auth.currentUser, {
                    displayName: formData.displayName
                });
            }

            // 2. Update Firestore User Document
            if (formData.displayName !== userProfile?.name) {
                await UserService.updateUser(auth.currentUser.uid, {
                    name: formData.displayName
                });
                if (onProfileUpdate) await onProfileUpdate();
            }

            // 3. Update Firestore Settings (Company Data)
            const updatedSettings = {
                ...settings,
                company: {
                    ...settings.company,
                    name: formData.companyName,
                    cnpj: formData.companyCnpj,
                    address: formData.companyAddress,
                    phone: formData.phone
                }
            };

            await onSave(updatedSettings);
            showToast("Perfil atualizado com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar perfil.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Meu Perfil</h2>
                <p className="text-slate-500 font-medium">Gerencie seus dados pessoais e informações da loja para orçamentos.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* User Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <div className="relative z-10 -mt-10 mb-4 inline-block">
                            <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-xl mx-auto">
                                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {auth.currentUser?.photoURL ? (
                                        <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-slate-300" />
                                    )}
                                </div>
                            </div>
                            {/* <button type="button" className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-colors">
                                <Camera className="w-3 h-3" />
                             </button> */}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{auth.currentUser?.email}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Conta Verificada</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            Dados Pessoais
                        </h3>
                        <div className="space-y-4">
                            <InputGroup
                                label="Nome de Exibição"
                                icon={User}
                                value={formData.displayName}
                                onChange={(e) => handleChange('displayName', e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <div className="w-1 h-4 bg-amber-500 rounded-full" />
                            Segurança da Conta
                        </h3>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Senha de Acesso</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Defina uma senha para acessar sua conta também com Email/Senha,<br />mesmo se tiver criado com Google.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={isResetting}
                                onClick={async () => {
                                    if (!auth.currentUser?.email) return showToast("Erro: Email não encontrado.", "error");
                                    setIsResetting(true);
                                    try {
                                        await sendPasswordResetEmail(auth, auth.currentUser.email);
                                        showToast(`Email enviado para ${auth.currentUser.email}!`, "success");
                                    } catch (e) {
                                        console.error("Reset Error:", e);
                                        showToast("Erro: " + (e.message || "Tente novamente."), "error");
                                    } finally {
                                        setIsResetting(false);
                                    }
                                }}
                                className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-white border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isResetting && <Loader2 className="w-3 h-3 animate-spin" />}
                                {isResetting ? "Enviando..." : "Redefinir Senha"}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            Dados da Loja (Para Orçamentos)
                        </h3>
                        <div className="space-y-4">
                            <InputGroup
                                label="Nome da Loja"
                                icon={Building2}
                                value={formData.companyName}
                                onChange={(e) => handleChange('companyName', e.target.value)}
                                placeholder="Ex: Tech Store"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup
                                    label="CNPJ"
                                    icon={Building2}
                                    value={formData.companyCnpj}
                                    onChange={(e) => handleChange('companyCnpj', maskCNPJ(e.target.value))}
                                    placeholder="00.000.000/0000-00"
                                />
                                <InputGroup
                                    label="Telefone / WhatsApp"
                                    icon={User}
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', maskPhone(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <InputGroup
                                label="Endereço Completo"
                                icon={MapPin}
                                value={formData.companyAddress}
                                onChange={(e) => handleChange('companyAddress', e.target.value)}
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function InputGroup({ label, icon: Icon, value, onChange, placeholder, type = 'text' }) {
    return (
        <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                />
            </div>
        </div>
    );
}
