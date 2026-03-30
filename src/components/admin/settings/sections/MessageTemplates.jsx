import { useState, useRef } from 'react';
import { Copy, RefreshCw, Eye, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '../../../../lib/utils'; // Adjust path if needed, usually ../../../lib/utils based on file location

export function MessageTemplates({ data, categories, onChange }) {
    const [selectedCatId, setSelectedCatId] = useState(categories?.[0]?.id);
    const textareaRef = useRef(null);

    const activeCategory = categories?.find(c => c.id === selectedCatId);

    const getTemplateForCategory = (catName) => {
        const isSealed = catName?.toLowerCase().includes('lacrado') || catName?.toLowerCase().includes('novo');

        const sealedTemplate = `🚀 *OFERTA ESPECIAL (NOVO)*
📱 *{modelo}*

✨ *Detalhes:*
💾 {capacidade} • {cor}
💎 {condicao}
🔒 Garantia: {garantia}
{nota_fiscal}

💰 *VALORES:*
✅ *{pix}* (À vista/Pix)

💳 *Parcelamento:*
• 10x de {parcela_10x}
• 12x de {parcela_12x}
• 18x de {parcela_18x}
{entrada_info}
{brindes}

📍 *Loja Física / Entrega Rápida*`;

        const usedTemplate = `♻️ *OPORTUNIDADE (SEMINOVO)*
📱 *{modelo}*

✨ *Detalhes do Aparelho:*
💾 {capacidade} • {cor}
💎 {condicao}
🔋 Saúde Bateria: 100% (ou a consultar)
🔒 Garantia: {garantia}
{nota_fiscal}

💰 *VALORES:*
✅ *{pix}* (À vista/Pix)

💳 *Parcelamento:*
• 10x de {parcela_10x}
• 12x de {parcela_12x}
• 18x de {parcela_18x}
{entrada_info}
{brindes}

📍 *Loja Física / Entrega Rápida*`;

        return isSealed ? sealedTemplate : usedTemplate;
    };

    const defaultTemplate = getTemplateForCategory(activeCategory?.name);

    const handleUpdate = (type, text) => {
        onChange({
            ...data,
            [selectedCatId]: {
                ...data?.[selectedCatId],
                [type]: text
            }
        });
    };

    const insertVariable = (variable) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + variable + text.substring(end);

        handleUpdate('pricing', newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
    };

    const variables = [
        { label: 'Modelo', value: '{modelo}' },
        { label: 'Condição', value: '{condicao}' },
        { label: 'Garantia', value: '{garantia}' },
        { label: 'Preço Pix', value: '{pix}' },
        { label: 'Parcela 12x', value: '{parcela_12x}' },
        { label: 'Entrada Info', value: '{entrada_info}' },
        { label: 'Nota Fiscal', value: '{nota_fiscal}' },
        { label: 'Capacidade', value: '{capacidade}' },
        { label: 'Cor', value: '{cor}' },
        { label: 'Brindes', value: '{brindes}' },
    ];

    const generatePreview = (template) => {
        if (!template) return "";
        return template
            .replace(/{modelo}/g, "iPhone 15 Pro Max")
            .replace(/{condicao}/g, "Novo (Lacrado)")
            .replace(/{garantia}/g, "1 Ano Apple")
            .replace(/{nota_fiscal}/g, "✅ Com Nota Fiscal")
            .replace(/{pix}/g, "R$ 6.899,00")
            .replace(/{parcela_10x}/g, "R$ 789,90")
            .replace(/{parcela_12x}/g, "R$ 669,90")
            .replace(/{parcela_18x}/g, "R$ 449,90")
            .replace(/{entrada_info}/g, "\n🔄 *Abatimento de Troca:* -R$ 2.500,00 (iPhone 13)")
            .replace(/{capacidade}/g, "256GB")
            .replace(/{cor}/g, "Titanium Natural")
            .replace(/{brindes}/g, "\n🎁 *Brindes:* Capa MagSafe + Película 3D");
    };

    const currentTemplate = data?.[selectedCatId]?.pricing || defaultTemplate;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
            {/* Sidebar List */}
            <div className="container-sidebar w-full lg:w-1/4 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200">
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Categorias</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {categories?.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCatId(cat.id)}
                            className={cn(
                                "w-full text-left p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between group",
                                selectedCatId === cat.id
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                    : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <span className="opacity-70">{cat.icon === 'smartphone' ? '📱' : '📦'}</span>
                                {cat.name}
                            </span>
                            {selectedCatId === cat.id && <ChevronRight className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col gap-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                        Editando: {activeCategory?.name}
                    </h3>
                    <p className="text-sm text-slate-500">Personalize a mensagem enviada ao cliente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-0">
                    {/* Editor Column */}
                    <div className="flex flex-col gap-4 h-full">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase">Template</label>
                            <button
                                onClick={() => handleUpdate('pricing', defaultTemplate)}
                                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                            </button>
                        </div>

                        <div className="relative flex-1">
                            <textarea
                                ref={textareaRef}
                                value={currentTemplate}
                                onChange={e => handleUpdate('pricing', e.target.value)}
                                className="w-full h-full rounded-2xl border-slate-200 p-4 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-600 leading-relaxed resize-none shadow-sm"
                                placeholder="Digite sua mensagem..."
                            />
                        </div>

                        {/* Variable Chips */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Variáveis Disponíveis (Clique para inserir)</label>
                            <div className="flex flex-wrap gap-2">
                                {variables.map(v => (
                                    <button
                                        key={v.value}
                                        onClick={() => insertVariable(v.value)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono transition-colors flex items-center gap-1"
                                        title={`Inserir ${v.label}`}
                                    >
                                        {v.value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview Column */}
                    <div className="flex flex-col gap-4 h-full bg-slate-50 rounded-2xl border border-slate-200 p-4 overflow-hidden">
                        <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-200">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Pré-visualização (Ao Vivo)</span>
                        </div>
                        <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative">
                            {/* WhatsApp Background Effect */}
                            <div className="absolute inset-0 bg-[#e5ddd5] opacity-30 pointer-events-none" />
                            <div className="relative z-10 bg-[#dcf8c6] p-3 rounded-lg shadow-sm max-w-[90%] self-end ml-auto text-slate-800 leading-relaxed">
                                {generatePreview(currentTemplate)}
                                <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                    10:42 <span className="text-blue-500">✓✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
