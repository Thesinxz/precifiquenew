import { Zap, HelpCircle, ExternalLink, CheckCircle2 } from 'lucide-react';

export function IntegrationsSettings({ data, onChange }) {
    const update = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-amber-500 mb-0.5" />
                    Integrações & APIs
                </h3>
                <p className="text-slate-500 text-sm mt-1">Conecte sua loja a serviços externos para automação total.</p>
            </div>

            {/* Whatchimp / WhatsApp API */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h4 className="font-extrabold text-slate-700 text-lg flex items-center gap-2">
                            WhatsApp API (Whatchimp)
                            {data?.whatchimpKey && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mt-1">Permite o envio automático de mensagens de marketing, pós-venda e atualizações de pedido.</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png" className="w-8 h-8" alt="WhatsApp" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">API Access Token</label>
                        <input
                            type="password"
                            value={data?.whatchimpKey || ''}
                            onChange={(e) => update('whatchimpKey', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            placeholder="Ex: whatchimp_live_..."
                            autoComplete="new-password"
                            name="whatchimpApiField"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            Pegue sua chave em: <a href="https://whatchimp.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">Painel Whatchimp <ExternalLink className="w-2.5 h-2.5" /></a>
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Device ID (Opcional)</label>
                        <input
                            type="text"
                            value={data?.whatchimpDeviceId || ''}
                            onChange={(e) => update('whatchimpDeviceId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            placeholder="Ex: phone_12345"
                        />
                    </div>
                </div>

                <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        ⚠️ <strong>Importante:</strong> Esta integração usa um serviço de terceiros (Whatchimp ou similar). Certifique-se de que seu plano suporte o volume de mensagens desejado para evitar bloqueios.
                    </p>
                </div>
            </div>

            {/* Other Integrations Placeholders */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 opacity-60 grayscale cursor-not-allowed relative">
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center font-black text-slate-400 text-xs tracking-widest uppercase rounded-[2rem]">Em Breve</div>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="font-extrabold text-slate-700 text-lg">Google Merchant Center</h4>
                        <p className="text-xs text-slate-400 mt-1">Sincronize seu estoque com o Google Shopping.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
