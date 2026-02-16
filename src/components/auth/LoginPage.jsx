import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../lib/validation/authSchemas';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Logo } from '../ui/Logo';
import { Loader2, Mail, Lock, Chrome, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

export function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    // Ensure Persistence is set to LOCAL on mount
    useEffect(() => {
        import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
            setPersistence(auth, browserLocalPersistence).catch(console.error);
        });
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            showToast("Login realizado com sucesso!", "success");
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/invalid-credential' || error.message?.includes('invalid-credential')) {
                showToast("E-mail ou senha incorretos. Verifique suas credenciais.", "error");
            } else {
                showToast("Erro ao fazer login.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        // DIRECT POPUP: No awaits before this call to prevent browser blocking
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            showToast("Login com Google realizado!", "success");
        } catch (error) {
            console.error("Google Login Error:", error);
            if (error.code === 'auth/popup-blocked') {
                showToast("Popup bloqueado! Autorize popups nas configurações do navegador.", "error");
            } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                showToast("Erro ao conectar com Google. Tente novament.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-950 overflow-hidden font-inter">
            {/* Left Side: Visual/Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-950 to-slate-950" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

                <div className="relative z-10 flex items-center gap-3">
                    <Logo />
                </div>

                <div className="relative z-10">
                    <h2 className="text-6xl font-black text-white leading-[0.9] tracking-tighter mb-8">
                        Domine o<br />
                        <span className="text-blue-500">Mercado.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-medium max-w-md leading-relaxed">
                        Acesse a plataforma de gestão mais tecnológica do mercado e tenha controle total do seu negócio em tempo real.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-8">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800" />
                        ))}
                    </div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        +500 LOJAS <span className="text-indigo-500 text-lg">●</span> CONECTADAS
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] -z-10" />

                <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
                    <div className="mb-10 lg:hidden">
                        <div className="flex items-center gap-2 mb-8">
                            <Logo />
                        </div>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Login</h1>
                        <p className="text-slate-400 font-medium">Seja bem-vindo de volta ao centro de comando.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Email Profissional</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    {...register('email')}
                                    className={cn(
                                        "w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all",
                                        errors.email && "border-red-500/50"
                                    )}
                                    placeholder="seu@email.com"
                                />
                            </div>
                            {errors.email && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"><ShieldCheck className="w-3 h-3" /> {errors.email.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sua Senha</label>
                                <Link to="/forgot-password" className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-400">Esqueceu?</Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="password"
                                    {...register('password')}
                                    className={cn(
                                        "w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all",
                                        errors.password && "border-red-500/50"
                                    )}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"><ShieldCheck className="w-3 h-3" /> {errors.password.message}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white text-slate-950 font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-95"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Acessar Conta <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>

                    <div className="my-10 flex items-center gap-4">
                        <div className="h-px bg-slate-800 flex-1" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Ou entrar com</span>
                        <div className="h-px bg-slate-800 flex-1" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-slate-900 border-2 border-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Chrome className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs uppercase font-black tracking-widest">Google Account</span>
                    </button>

                    <p className="text-center mt-12 text-sm text-slate-500 font-medium">
                        Novo na plataforma? <Link to="/signup" className="text-blue-500 font-black hover:text-blue-400 transition-colors">Criar conta gratuita</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
