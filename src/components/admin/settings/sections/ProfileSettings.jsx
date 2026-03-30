import { useState, useRef } from 'react';
import { User, Building2, MapPin, Camera, Upload, Trash2, Smartphone, Loader2 } from 'lucide-react';
import { auth } from '../../../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '../../../ui/Toast';
import { InputGroup } from './_Shared';

export function ProfileSettings({ data, onChange }) {
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPushLoading, setIsPushLoading] = useState(false);

    // Auth Profile State (synced on load or managed locally)
    const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
    const photoURL = auth.currentUser?.photoURL || '';

    // Handle Auth Profile Update (Display Name)
    const handleUpdateAuthProfile = async () => {
        if (!auth.currentUser) return;
        setIsLoading(true);
        try {
            await updateProfile(auth.currentUser, { displayName, photoURL });
            showToast("Perfil pessoal atualizado!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar perfil.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Company Data Update
    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    // Logo Upload (Base 64 for simplicity in this env)
    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) { // 500KB limit
            showToast("A imagem deve ter no máximo 500KB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            handleChange('logo', base64);
            showToast("Logo carregada! Clique em 'Salvar Tudo' para persistir.", "success");
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        handleChange('logo', null);
    };

    return (
        <div className="space-y-10">
            {/* 1. Personal Profile Section */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-10"></div>
                <div className="relative flex flex-col md:flex-row gap-8 items-start pt-4">

                    {/* Avatar */}
                    <div className="flex-shrink-0 relative group mx-auto md:mx-0">
                        <div className="w-24 h-24 rounded-full bg-white p-1 shadow-xl ring-4 ring-indigo-50">
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                {photoURL ? (
                                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-slate-300" />
                                )}
                            </div>
                        </div>
                        {/* <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-colors">
                            <Camera className="w-3.5 h-3.5" />
                        </button> */}
                    </div>

                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Seu Perfil de Acesso</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-500">Informações visíveis para sua equipe.</p>
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-indigo-200">
                                    {auth.currentUser?.email === 'admin@precifica.ai' || data?.role === 'owner' ? 'Proprietário' : 'Vendedor'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup
                                label="Nome de Exibição"
                                icon={User}
                                value={displayName}
                                onChange={setDisplayName}
                                placeholder="Seu nome"
                            />
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Email (Fixo)</label>
                                <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-500 cursor-not-allowed">
                                    {auth.currentUser?.email}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleUpdateAuthProfile}
                                disabled={isLoading}
                                className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Atualizando...' : 'Atualizar Dados Pessoais'}
                            </button>
                        </div>

                        {/* Password Reset */}
                        <div className="pt-6 border-t border-slate-100 mt-4">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Segurança</h4>
                            <button
                                onClick={async () => {
                                    if (confirm("Enviar email de redefinição de senha para " + auth.currentUser?.email + "?")) {
                                        try {
                                            const { sendPasswordResetEmail } = await import('firebase/auth');
                                            await sendPasswordResetEmail(auth, auth.currentUser?.email);
                                            showToast("Email de redefinição enviado!", "success");
                                        } catch (e) {
                                            console.error(e);
                                            showToast("Erro ao enviar email: " + e.message, "error");
                                        }
                                    }
                                }}
                                className="text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-red-100"
                            >
                                Redefinir Senha
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Notification Section */}
            <div className="bg-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Smartphone className="w-6 h-6" />
                        Notificações Push
                    </h3>
                    <p className="text-indigo-200 text-sm max-w-md">
                        Receba alertas de vendas, estoque baixo e novidades direto no seu navegador ou celular, mesmo com o app fechado.
                    </p>
                </div>
                <button
                    disabled={isPushLoading}
                    onClick={async () => {
                        setIsPushLoading(true);
                        try {
                            const { PushNotificationService } = await import('../../../../services/pushNotificationService');
                            const token = await PushNotificationService.requestPermission();
                            if (token) showToast("Notificações Ativadas!", "success");
                            else showToast("Permissão negada ou não suportado neste navegador.", "error");
                        } catch (e) {
                            console.error(e);
                            showToast("Erro ao ativar notificações.", "error");
                        } finally {
                            setIsPushLoading(false);
                        }
                    }}
                    className="relative z-10 px-6 py-3 bg-white text-indigo-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-70 flex items-center gap-2"
                >
                    {isPushLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isPushLoading ? "Ativando..." : "Ativar Agora"}
                </button>
            </div >

            {/* 2. Company Identity Section */}
            < div className="space-y-6" >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Identidade da Loja</h3>
                        <p className="text-sm text-slate-500">Como sua marca aparece nos orçamentos PDF.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Logo Upload Area */}
                    <div className="md:col-span-4">
                        <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-colors h-full min-h-[200px] flex flex-col items-center justify-center relative group overflow-hidden">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />

                            {data?.logo ? (
                                <div className="relative w-full h-full p-4 flex items-center justify-center">
                                    <img src={data.logo} alt="Logo Loja" className="max-w-full max-h-40 object-contain" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
                                        className="absolute top-2 right-2 p-2 bg-red-100 text-red-500 rounded-full hover:bg-red-200 z-30 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center p-6 pointer-events-none">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 text-indigo-500">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Logo da Loja</p>
                                    <p className="text-xs text-slate-400 mt-1">Usado em PDFs e na Vitrine<br />(Max 500KB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Company Details */}
                    <div className="md:col-span-8 space-y-4">
                        <InputGroup
                            label="Nome da Loja"
                            value={data?.name || ''}
                            onChange={v => handleChange('name', v)}
                            placeholder="Ex: Minha Loja Tech"
                            icon={Building2}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup
                                label="CNPJ (Opcional)"
                                value={data?.cnpj || ''}
                                onChange={v => handleChange('cnpj', v)}
                                placeholder="00.000.000/0000-00"
                                icon={Building2}
                            />
                            <InputGroup
                                label="Telefone / WhatsApp"
                                value={data?.phone || ''}
                                onChange={v => handleChange('phone', v)}
                                placeholder="(00) 00000-0000"
                                icon={Smartphone}
                            />
                        </div>
                        <InputGroup
                            label="Endereço Completo"
                            value={data?.address || ''}
                            onChange={v => handleChange('address', v)}
                            placeholder="Rua, Número, Bairro - Cidade/UF"
                            icon={MapPin}
                        />
                    </div>
                </div>
            </div >
        </div >
    );
}
