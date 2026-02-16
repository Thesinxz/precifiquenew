import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../../lib/validation/authSchemas';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '../ui/Toast';

export function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const { showToast } = useToast();

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(forgotPasswordSchema)
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, data.email);
            setIsSent(true);
            showToast("Email de recuperação enviado!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao enviar email. Verifique o endereço.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-md border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Email Enviado!</h2>
                    <p className="text-slate-500 font-medium mb-8">
                        Verifique sua caixa de entrada para redefinir sua senha.
                    </p>
                    <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                        Voltar para Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-md border border-slate-100 relative">
                <Link to="/login" className="absolute left-8 top-8 text-slate-400 hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="text-center mb-10 mt-4">
                    <h1 className="text-2xl font-black text-indigo-900 mb-2">Recuperar Senha</h1>
                    <p className="text-slate-500 font-medium">Digite seu email para receber o link.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                {...register('email')}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>
                        {errors.email && <span className="text-xs text-red-500 font-bold mt-1 block">{errors.email.message}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Link"}
                    </button>
                </form>
            </div>
        </div>
    );
}
