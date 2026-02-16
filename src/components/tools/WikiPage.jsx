import { useState } from 'react';
import { BookOpen, Search, ChevronRight, FileText, Lightbulb, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const WIKI_CONTENT = [
    {
        category: 'Operacional',
        icon: Zap,
        articles: [
            { id: 'venda-rapida', title: 'Como fazer uma Venda Rápida', content: 'Para fazer uma venda rápida, acesse o PDV no menu Vendas. Selecione os produtos ou coloque o valor manualmente, escolha a forma de pagamento e finalize.' },
            { id: 'entrada-estoque', title: 'Entrada de Novos Aparelhos', content: 'Sempre confira o IMEI/Serial ao cadastrar um novo aparelho. Use a categoria correta para que o cálculo de margem seja aplicado automaticamente.' },
        ]
    },
    {
        category: 'Assistência Técnica',
        icon: ShieldCheck,
        articles: [
            { id: 'checklist-entrada', title: 'Checklist de Entrada Obrigatório', content: 'Todo aparelho que entra para conserto deve passar pelo checklist: Wifi, Câmeras, Touch, Som e Carregamento devem ser testados na frente do cliente.' },
            { id: 'garantia-reparos', title: 'Política de Garantia de Telas', content: 'Nossa garantia para telas é de 90 dias contra defeitos de fabricação. Danos físicos, riscos profundos ou contato com líquido anulam a garantia.' },
        ]
    },
    {
        category: 'Regras de Negócio',
        icon: Lightbulb,
        articles: [
            { id: 'comissao-vendedor', title: 'Como funciona a Comissão', content: 'Sua comissão é calculada sobre o lucro líquido (após taxas de cartão). Aparelhos novos têm comissão fixa, enquanto acessórios seguem a porcentagem ajustada no seu perfil.' },
        ]
    }
];

export function WikiPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);

    const filteredContent = WIKI_CONTENT.map(cat => ({
        ...cat,
        articles: cat.articles.filter(art =>
            art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            art.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.articles.length > 0);

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-indigo-600" />
                    Wiki Interna / Manuais
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Guia prático de como a nossa loja opera.</p>
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="O que você deseja aprender hoje?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] py-4 pl-12 pr-6 font-bold text-slate-700 dark:text-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                />
            </div>

            {selectedArticle ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-right duration-300">
                    <button
                        onClick={() => setSelectedArticle(null)}
                        className="text-xs font-black uppercase text-indigo-600 mb-6 flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar para os manuais
                    </button>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">{selectedArticle.title}</h1>
                    <div className="prose dark:prose-invert prose-slate max-w-none">
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                            {selectedArticle.content}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredContent.map(category => (
                        <div key={category.category} className="space-y-4">
                            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">
                                <category.icon className="w-3 h-3" />
                                {category.category}
                            </h3>
                            {category.articles.map(article => (
                                <button
                                    key={article.id}
                                    onClick={() => setSelectedArticle(article)}
                                    className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{article.title}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
