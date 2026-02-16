import { useState, useEffect } from 'react';
import { Upload, Palette, Layout, BadgeCheck, Monitor, ExternalLink } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useToast } from '../../../ui/Toast';

export function BrandingSettings({ data = {}, onChange, userProfile }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || userProfile?.uid;

    const [config, setConfig] = useState({
        appName: data?.appName || 'Precifique',
        primaryColor: data?.primaryColor || '#4F46E5', // Indigo-600
        secondaryColor: data?.secondaryColor || '#10B981', // Emerald-500
        logoUrl: data?.logoUrl || '',
        hidePoweredBy: data?.hidePoweredBy || false,
        customDomain: data?.customDomain || '',

        // TV & Showcase migrating from Gifts
        tvTickerText: data?.tvTickerText || '',
        tickerItems: data?.tickerItems || [
            { emoji: '⚡', text: 'Parcelamos em até 18x' },
            { emoji: '🛡️', text: 'Garantia em todos os aparelhos' },
            { emoji: '📦', text: 'Entregamos para todo o Brasil' },
            { emoji: '⭐', text: 'Melhor Avaliação da Região' }
        ],
        showcaseTitle: data?.showcaseTitle || '',
        bannerText: data?.bannerText || '',
        bannerImage: data?.bannerImage || '',
        customSlug: data?.customSlug || '',
        showOutOfStock: data?.showOutOfStock || false,
        hidePrices: data?.hidePrices || false
    });

    useEffect(() => {
        // Debounce update to parent
        const timer = setTimeout(() => {
            onChange(config);
        }, 300);
        return () => clearTimeout(timer);
    }, [config]);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-500" />
                    White Label & Personalização
                </h3>
                <p className="text-sm text-slate-500">
                    Defina a identidade visual do sistema e da sua vitrine pública.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identidade Básica */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Nome e Logo</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do App (Sistema)</label>
                                <input
                                    type="text"
                                    value={config.appName}
                                    onChange={e => setConfig({ ...config, appName: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    placeholder="Ex: Minha Loja System"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Este nome aparecerá na aba do navegador e nos menus.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">URL da Logo (Cabeçalho)</label>
                                <input
                                    type="text"
                                    value={config.logoUrl}
                                    onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cores */}
                <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Cores do Sistema</label>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Cor Primária (Botões/Destaques)</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: config.primaryColor }} />
                                    <input
                                        type="color"
                                        value={config.primaryColor}
                                        onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                        className="w-12 h-8 rounded cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Cor Secundária (Sucesso/Confirmação)</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: config.secondaryColor }} />
                                    <input
                                        type="color"
                                        value={config.secondaryColor}
                                        onChange={e => setConfig({ ...config, secondaryColor: e.target.value })}
                                        className="w-12 h-8 rounded cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* White Label */}
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <BadgeCheck className="w-5 h-5 text-indigo-600" />
                            <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest">White Label Pro</label>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-indigo-100/50">
                                <div>
                                    <span className="block text-sm font-bold text-slate-700">Remover "Powered by Precifique"</span>
                                    <span className="text-[10px] text-slate-500">Oculta a marca do sistema no rodapé e logins.</span>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, hidePoweredBy: !config.hidePoweredBy })}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
                                        config.hidePoweredBy ? "bg-indigo-600" : "bg-slate-300"
                                    )}
                                >
                                    <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", config.hidePoweredBy ? "translate-x-6" : "translate-x-0")} />
                                </button>
                            </div>

                            <div className="opacity-50 pointer-events-none">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Domínio Personalizado (Em breve)</label>
                                <input disabled value={config.customDomain} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-sm" placeholder="app.sualoja.com.br" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- VITRINE PÚBLICA & TV MODE --- */}
                <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                    <div className="flex items-center gap-2 mb-6">
                        <Monitor className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-800">Vitrine Digital & TV Mode</h3>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Opções da Vitrine */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Personalização da Vitrine Pública</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Título da Loja (Topo)</label>
                                    <input
                                        type="text"
                                        value={config.showcaseTitle}
                                        onChange={e => setConfig({ ...config, showcaseTitle: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
                                        placeholder="Ex: Minha Loja - Oficial"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Texto do Banner</label>
                                    <input
                                        type="text"
                                        value={config.bannerText}
                                        onChange={e => setConfig({ ...config, bannerText: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
                                        placeholder="Ex: Ofertas Imperdíveis"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">URL da Imagem do Banner</label>
                                    <input
                                        type="text"
                                        value={config.bannerImage}
                                        onChange={e => setConfig({ ...config, bannerImage: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm">Mostrar Esgotados</h4>
                                        <p className="text-[10px] text-slate-500">Exibir produtos sem estoque com etiqueta.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.showOutOfStock}
                                            onChange={(e) => setConfig({ ...config, showOutOfStock: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm">Ocultar Preços</h4>
                                        <p className="text-[10px] text-slate-500">Modo somente catálogo.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.hidePrices}
                                            onChange={(e) => setConfig({ ...config, hidePrices: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 2. TV Mode Ticker & Link */}
                        <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-0" />

                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6 mb-2">
                                    <div>
                                        <h4 className="text-xl font-bold">Player TV / Vitrine</h4>
                                        <p className="text-slate-400 text-sm">Abra este link na Smart TV da sua loja.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                if (orgId) {
                                                    const idToUse = config.customSlug || orgId;
                                                    window.open(`${window.location.origin}?tv=${idToUse}`, '_blank');
                                                } else {
                                                    showToast("ID da organização não encontrado.", "error");
                                                }
                                            }}
                                            className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-xl"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Abrir Player
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (orgId) {
                                                    const idToUse = config.customSlug || orgId;
                                                    const url = `${window.location.origin}?tv=${idToUse}`;
                                                    navigator.clipboard.writeText(url);
                                                    showToast("Link copiado!", "success");
                                                }
                                            }}
                                            className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-colors"
                                        >
                                            Copiar Link
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-300">Mensagens do Rodapé (Ticker)</label>
                                    <div className="space-y-2">
                                        {(config.tickerItems || []).map((item, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={item.emoji || ''}
                                                    onChange={e => {
                                                        const newItems = [...(config.tickerItems || [])];
                                                        newItems[index] = { ...newItems[index], emoji: e.target.value };
                                                        setConfig({ ...config, tickerItems: newItems });
                                                    }}
                                                    className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-center text-lg outline-none focus:border-indigo-500 text-white"
                                                    placeholder="Emoji"
                                                />
                                                <input
                                                    type="text"
                                                    value={item.text || ''}
                                                    onChange={e => {
                                                        const newItems = [...(config.tickerItems || [])];
                                                        newItems[index] = { ...newItems[index], text: e.target.value };
                                                        setConfig({ ...config, tickerItems: newItems });
                                                    }}
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                                                    placeholder="Mensagem"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newItems = config.tickerItems.filter((_, i) => i !== index);
                                                        setConfig({ ...config, tickerItems: newItems });
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                                                >
                                                    <div className="w-5 h-5 flex items-center justify-center font-bold">×</div>
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setConfig({ ...config, tickerItems: [...(config.tickerItems || []), { emoji: '✨', text: '' }] })}
                                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 mt-2"
                                        >
                                            + Adicionar Mensagem
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-300">Link Personalizado (Slug)</label>
                                    <div className="flex items-center gap-0 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-indigo-500 transition-colors">
                                        <span className="text-slate-500 font-medium select-none truncate">{window.location.hostname}/?tv=</span>
                                        <input
                                            type="text"
                                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-bold w-full placeholder:text-slate-600 ml-1 outline-none"
                                            placeholder="minhaloja"
                                            value={config.customSlug || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase();
                                                setConfig({ ...config, customSlug: val });
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!config.customSlug || config.customSlug.length < 3) return showToast("O link deve ter pelo menos 3 caracteres.", "warning");

                                            try {
                                                const { doc, getDoc, setDoc } = await import('firebase/firestore');
                                                const { db } = await import('../../../../lib/firebase');

                                                const slugRef = doc(db, 'short_links', config.customSlug);
                                                const slugSnap = await getDoc(slugRef);

                                                if (slugSnap.exists() && slugSnap.data().orgId !== orgId) {
                                                    showToast("Este link já está em uso por outra loja.", "error");
                                                    return;
                                                }

                                                await setDoc(slugRef, {
                                                    orgId: orgId,
                                                    updatedAt: new Date()
                                                });

                                                showToast("Link reservado com sucesso!", "success");
                                            } catch (e) {
                                                console.error(e);
                                                showToast("Erro ao reservar link.", "error");
                                            }
                                        }}
                                        className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 transition-colors shadow-lg"
                                    >
                                        Validar e Reservar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
