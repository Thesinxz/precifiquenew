import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '../../lib/validation/authSchemas';
import { fetchAddressByCEP } from '../../services/addressService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import {
    Loader2,
    ArrowLeft,
    Search,
    Check,
    ShieldCheck,
    Eye,
    EyeOff,
    Zap,
    MapPin,
    Store,
    User,
    Mail,
    Lock,
    ArrowRight
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';
import { DEFAULT_SETTINGS } from '../../lib/defaultSettings';

const InputField = ({ label, name, type = 'text', placeholder, onBlur, loading, icon: Icon, toggleVisibility, isVisible, register, errors }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />}
            <input
                type={isVisible !== undefined ? (isVisible ? 'text' : 'password') : type}
                {...register(name)}
                onBlur={onBlur}
                className={cn(
                    "w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all",
                    errors[name] && "border-red-500/30"
                )}
                placeholder={placeholder}
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />}
            {toggleVisibility && (
                <button type="button" onClick={toggleVisibility} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-500 p-1">
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
        {errors[name] && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest block">{errors[name].message}</span>}
    </div>
);

export function SignupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
    const [signupType, setSignupType] = useState('owner'); // 'owner' or 'seller'
    const [step, setStep] = useState(1); // 1: Personal/Auth, 2: Address/Business

    const [showPassword, setShowPassword] = useState(false);
    const { showToast } = useToast();

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(signupSchema),
        mode: 'onChange'
    });

    const watchedPassword = watch('password', '');
    const passwordRequirements = [
        { id: 'min', label: '8+ chars', test: (p) => p.length >= 8 },
        { id: 'upper', label: 'Maiúscula', test: (p) => /[A-Z]/.test(p) },
        { id: 'num', label: 'Número', test: (p) => /\d/.test(p) },
        { id: 'special', label: 'Especial', test: (p) => /[@$!%*?&]/.test(p) },
    ];

    const handleCepBlur = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            setIsFetchingAddress(true);
            const address = await fetchAddressByCEP(cep);
            if (address) {
                if (address.street) setValue('addressStreet', address.street);
                if (address.neighborhood) setValue('addressNeighborhood', address.neighborhood);
                if (address.city) setValue('addressCity', address.city);
                if (address.state) setValue('addressState', address.state);
                showToast("Endereço encontrado!", "success");
            }
            setIsFetchingAddress(false);
        }
    };

    const handleDocumentBlur = async (e) => {
        const docValue = e.target.value.replace(/\D/g, '');
        if (docValue.length === 14) {
            setIsFetchingCNPJ(true);
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docValue}`);
                if (!response.ok) throw new Error('Falha ao buscar CNPJ');
                const data = await response.json();
                setValue('fullName', data.nome_fantasia || data.razao_social);
                if (data.cep) {
                    setValue('cep', data.cep.replace(/(\d{5})(\d{3})/, '$1-$2'));
                    setValue('addressStreet', data.logradouro);
                    setValue('addressNumber', data.numero);
                    setValue('addressComplement', data.complemento);
                    setValue('addressNeighborhood', data.bairro);
                    setValue('addressCity', data.municipio);
                    setValue('addressState', data.uf);
                }
                showToast(`Dados de ${data.nome_fantasia || data.razao_social} carregados!`, "success");
            } catch (err) { console.error(err); }
            finally { setIsFetchingCNPJ(false); }
        }
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            if (signupType === 'seller' && !data.orgCode) {
                showToast("Insira o código da loja.", "error");
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;
            const trialStartDate = new Date().toISOString();

            const userProfile = {
                uid: user.uid,
                organizationId: signupType === 'owner' ? user.uid : data.orgCode,
                name: data.fullName,
                email: data.email,
                document: data.document.replace(/\D/g, ''),
                address: signupType === 'owner' ? {
                    zip: data.cep, street: data.addressStreet, number: data.addressNumber,
                    complement: data.addressComplement || '', neighborhood: data.addressNeighborhood,
                    city: data.addressCity, state: data.addressState
                } : null,
                role: signupType === 'owner' ? 'owner' : 'seller',
                createdAt: trialStartDate,
                trialStartDate: trialStartDate,
                subscriptionStatus: 'trial'
            };

            await setDoc(doc(db, 'users', user.uid), userProfile);

            if (signupType === 'owner') {
                const newSettings = {
                    ...DEFAULT_SETTINGS,
                    company: {
                        ...DEFAULT_SETTINGS.company,
                        name: data.fullName,
                        cnpj: data.document || '',
                        address: data.addressStreet ? `${data.addressStreet}, ${data.addressNumber} - ${data.addressCity}/${data.addressState}` : '',
                        trialStartDate: trialStartDate,
                        subscriptionStatus: 'trial'
                    }
                };
                await setDoc(doc(db, 'settings', user.uid), newSettings);
            }

            showToast("Conta criada com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao criar conta. Verifique os dados.", "error");
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-950 text-white font-inter flex p-4 md:p-8 overflow-x-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] -z-10" />

            <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Zap className="w-6 h-6 fill-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter">VeloCell<span className="text-indigo-500"> ERP</span></span>
                </div>

                <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 border-b border-slate-800 pb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter mb-2">Criar sua conta</h1>
                            <p className="text-slate-400 font-medium">Liderança em tecnologia para sua loja de iPhones.</p>
                        </div>

                        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
                            <button onClick={() => setSignupType('owner')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", signupType === 'owner' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>Dono de Loja</button>
                            <button onClick={() => setSignupType('seller')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", signupType === 'seller' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>Vendedor</button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                        {step === 1 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Dados Pessoais
                                    </h3>
                                    <InputField label="Nome Completo" name="fullName" icon={User} placeholder="Seu nome" register={register} errors={errors} />
                                    <InputField label="Documento (CNPJ/CPF)" name="document" icon={ShieldCheck} placeholder="Apenas números" onBlur={handleDocumentBlur} loading={isFetchingCNPJ} register={register} errors={errors} />
                                    <InputField label="Email Profissional" name="email" type="email" icon={Mail} placeholder="seu@email.com" register={register} errors={errors} />

                                    {signupType === 'seller' && (
                                        <div className="bg-indigo-600/10 border-2 border-indigo-600/20 rounded-3xl p-6 mt-6">
                                            <InputField label="Código da Loja" name="orgCode" icon={Store} placeholder="Solicite ao seu gerente" register={register} errors={errors} />
                                            <p className="text-[10px] text-indigo-400 mt-2 font-bold italic uppercase tracking-wider">* Você será vinculado a uma equipe existente.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <Lock className="w-4 h-4" /> Segurança
                                    </h3>
                                    <InputField label="Sua Senha" name="password" type="password" icon={Lock} placeholder="Crie uma senha forte" toggleVisibility={() => setShowPassword(!showPassword)} isVisible={showPassword} register={register} errors={errors} />
                                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-2">
                                        {passwordRequirements.map(req => (
                                            <div key={req.id} className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors", req.test(watchedPassword) ? "text-emerald-500" : "text-slate-600")}>
                                                <div className={cn("w-1.5 h-1.5 rounded-full", req.test(watchedPassword) ? "bg-emerald-500" : "bg-slate-700")} />
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>
                                    <InputField label="Confirmar Senha" name="confirmPassword" type="password" icon={Lock} placeholder="Repita a senha" register={register} errors={errors} />
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Detalhes da Loja
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <div className="md:col-span-4">
                                        <InputField label="CEP" name="cep" icon={Search} placeholder="00000-000" onBlur={handleCepBlur} loading={isFetchingAddress} register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-8">
                                        <InputField label="Logradouro" name="addressStreet" icon={MapPin} placeholder="Av / Rua" register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <InputField label="Número" name="addressNumber" placeholder="123" register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-9">
                                        <InputField label="Complemento" name="addressComplement" placeholder="Apto / Sala (Opcional)" register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <InputField label="Bairro" name="addressNeighborhood" register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-6">
                                        <InputField label="Cidade" name="addressCity" register={register} errors={errors} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputField label="UF" name="addressState" register={register} errors={errors} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-800">
                            {signupType === 'seller' ? (
                                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Concluir Cadastro"}
                                </button>
                            ) : step === 1 ? (
                                <button type="button" onClick={() => setStep(2)} className="w-full bg-white text-slate-950 font-black uppercase tracking-[0.1em] py-5 rounded-2xl shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 group active:scale-95">
                                    Próximo Passo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <>
                                    <button type="button" onClick={() => setStep(1)} className="w-full md:w-1/3 bg-slate-950 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl border border-slate-800 hover:bg-slate-900 transition-all">
                                        Voltar
                                    </button>
                                    <button type="submit" disabled={isLoading} className="w-full md:w-2/3 bg-indigo-600 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Concluir Cadastro"}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>

                    <p className="text-center mt-12 text-sm text-slate-500 font-medium">
                        Já tem acesso? <Link to="/login" className="text-indigo-500 font-black hover:text-indigo-400 transition-colors">Entrar no sistema</Link>
                    </p>
                </div>

                <div className="mt-8 flex items-center gap-2 text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">
                    <ShieldCheck className="w-4 h-4" /> Servidores Seguros Google Cloud
                </div>
            </div>
        </div>
    );
}
