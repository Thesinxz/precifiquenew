import { useState, useEffect } from 'react';
import {
    ChevronRight,
    Smartphone,
    ShieldCheck,
    Zap,
    BarChart3,
    ShoppingBag,
    Bot,
    Globe,
    ArrowRight,
    Star,
    CheckCircle2,
    Lock,
    Cpu,
    Boxes,
    Receipt
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';

export function LandingPage({ onGetStarted }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            title: "Cálculo de Margem Real",
            description: "Precifique iPhones e eletrônicos considerando taxas de maquininha, custo de importação e lucro líquido desejado.",
            icon: Zap,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Importação Automática XML",
            description: "Cadastre centenas de produtos e fornecedores em segundos importando apenas o arquivo XML da Nota Fiscal.",
            icon: Receipt,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
        },
        {
            title: "I.A. Advisor",
            description: "Nossa I.A. analisa suas vendas e sugere quais modelos (ex: iPhone 13 vs 15) estão trazendo mais retorno real.",
            icon: Bot,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Vitrine de Vendas",
            description: "Um site pronto para sua loja. Seus clientes escolhem cor e armazenamento, e o pedido cai direto no seu WhatsApp.",
            icon: Globe,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10"
        },
        {
            title: "Controle de Estoque (IMEI)",
            description: "Gerencie aparelhos novos e seminovos com controle total de IMEI, saúde da bateria e histórico de fornecedores.",
            icon: Boxes,
            color: "text-rose-500",
            bg: "bg-rose-500/10"
        },
        {
            title: "Financeiro & Fluxo",
            description: "Dashboard completo com contas a pagar, receber e conciliação automática de taxas de parcelamento.",
            icon: BarChart3,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Header */}
            <nav className={cn(
                "fixed top-0 inset-x-0 z-[100] transition-all duration-300 border-b",
                scrolled ? "bg-slate-950/80 backdrop-blur-xl border-slate-800 py-4" : "bg-transparent border-transparent py-6"
            )}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Logo className="scale-110" />

                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                        <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
                        <a href="#security" className="hover:text-white transition-colors">Segurança</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onGetStarted('login')}
                            className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => onGetStarted('signup')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Teste Grátis
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-black uppercase tracking-widest mb-8 animate-bounce">
                        <Star className="w-3 h-3 fill-indigo-400" /> Sistema Específico para Lojas de Celulares
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                        A Gestão que sua<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">Loja de iPhones</span> Merece.
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
                        Pare de usar planilhas complicadas. Tenha controle total de estoque, vendas com taxas calculadas e vitrine online em uma única plataforma.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => onGetStarted('signup')}
                            className="w-full md:w-auto px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
                        >
                            Começar 7 dias grátis <ArrowRight className="w-5 h-5" />
                        </button>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Acesso imediato
                        </p>
                    </div>

                    <div className="mt-24 relative max-w-5xl mx-auto">
                        <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full -z-10" />
                        <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 shadow-3xl overflow-hidden relative">
                            <div className="flex items-center gap-2 mb-6 px-4">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                            </div>
                            <img
                                src="https://images.unsplash.com/photo-1542744094-3a31f272c491?auto=format&fit=crop&q=80&w=2000"
                                alt="Phone Smart Interface"
                                className="rounded-2xl border border-slate-800 opacity-90 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-20">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4">Módulos Especializados</h2>
                        <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Tudo o que você precisa para<br />escalar suas vendas.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="group p-8 rounded-[2rem] bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-all duration-500">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", f.bg)}>
                                    <f.icon className={cn("w-7 h-7", f.color)} />
                                </div>
                                <h4 className="text-xl font-black mb-4 tracking-tight">{f.title}</h4>
                                <p className="text-slate-400 font-medium leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4">Investimento</h2>
                        <h3 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Comece agora,<br />pague depois.</h3>
                        <p className="text-slate-400 font-medium max-w-xl mx-auto">Teste todas as ferramentas por 7 dias sem custo. Se gostar, escolha o plano que melhor se adapta à sua loja.</p>
                    </div>

                    <div className="max-w-2xl mx-auto">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative bg-slate-900 rounded-[3rem] p-12 border border-slate-800">
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h4 className="text-2xl font-black mb-2">Plano Pro</h4>
                                        <p className="text-indigo-400 font-bold text-sm tracking-widest uppercase">7 dias grátis • Sem fidelidade</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-black text-white">R$ 97<span className="text-lg text-slate-400 font-bold">/mês</span></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                                    {[
                                        "Acesso Ilimitado à I.A.",
                                        "Importação de NF-e (XML)",
                                        "Estoque de iPhones (IMEI)",
                                        "Vitrine Online Customizada",
                                        "Multi-Usuários (Vendedores)",
                                        "Financeiro e Caixa Completo",
                                        "Suporte via WhatsApp",
                                        "Backup em Tempo Real"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                            <CheckCircle2 className="w-5 h-5 text-indigo-500" /> {item}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => onGetStarted('signup')}
                                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    Abrir Minha Conta Grátis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-slate-900">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <Logo />
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em]">© 2026 Phone Smart. Todos os direitos reservados.</p>
                        <div className="flex gap-8 text-slate-500 font-black text-xs uppercase tracking-widest">
                            <a href="#" className="hover:text-white transition-colors">Segurança</a>
                            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
