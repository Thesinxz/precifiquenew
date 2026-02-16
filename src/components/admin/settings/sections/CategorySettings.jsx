import { Plus, Trash2, Smartphone, Box, Watch, Monitor, Headphones, Gift, CreditCard, FileText } from 'lucide-react';
import { InputGroup } from './_Shared';
import { cn } from '../../../../lib/utils';

const ICONS = {
    smartphone: Smartphone,
    box: Box,
    watch: Watch,
    monitor: Monitor,
    headphones: Headphones
};

export function CategorySettings({ data, onChange, gateways, giftsList }) {
    const handleUpdate = (id, field, value) => {
        const newData = data.map(item => item.id === id ? { ...item, [field]: value } : item);
        onChange(newData);
    };

    const handleDelete = (id) => {
        onChange(data.filter(item => item.id !== id));
    };

    const handleAdd = () => {
        const newId = Date.now().toString();
        const newItem = {
            id: newId,
            name: 'Nova Categoria',
            type: 'product',
            margin: 20,
            marginType: 'percent',
            warranty: '3 meses',
            icon: 'box',
            gatewayId: gateways?.[0]?.id,
            requiresNotaFiscal: false,
            defaultGifts: []
        };
        onChange([...data, newItem]);
    };

    const toggleGift = (catId, giftId) => {
        const category = data.find(c => c.id === catId);
        const currentGifts = category.defaultGifts || [];
        const newGifts = currentGifts.includes(giftId)
            ? currentGifts.filter(id => id !== giftId)
            : [...currentGifts, giftId];
        handleUpdate(catId, 'defaultGifts', newGifts);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Gerenciar Categorias</h3>
                    <p className="text-sm text-slate-500">Defina regras de negócio específicas por categoria.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition"
                >
                    <Plus className="w-4 h-4" />
                    Nova Categoria
                </button>
            </div>

            <div className="space-y-4">
                {data?.map((cat) => (
                    <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors group">
                        {/* Main Details */}
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={cat.icon}
                                        onChange={e => handleUpdate(cat.id, 'icon', e.target.value)}
                                        className="w-10 h-10 p-2 rounded-lg bg-slate-50 border-slate-200 text-slate-600"
                                    >
                                        <option value="smartphone">📱</option>
                                        <option value="watch">⌚</option>
                                        <option value="headphones">🎧</option>
                                        <option value="monitor">💻</option>
                                        <option value="box">📦</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={cat.name}
                                        onChange={e => handleUpdate(cat.id, 'name', e.target.value)}
                                        className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 focus:bg-slate-50 rounded px-2 w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Garantia:</span>
                                    <input
                                        type="text"
                                        value={cat.warranty}
                                        onChange={e => handleUpdate(cat.id, 'warranty', e.target.value)}
                                        className="text-xs border-b border-slate-200 focus:border-indigo-500 bg-transparent w-full"
                                        placeholder="Ex: 1 ano Apple"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-32">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Margem</label>
                                    <div className="flex bg-indigo-50 rounded-lg p-1">
                                        <button
                                            onClick={() => handleUpdate(cat.id, 'marginType', 'fixed')}
                                            className={cn("px-2 py-1 text-xs font-bold rounded transition", cat.marginType === 'fixed' ? "text-indigo-600 bg-white shadow-sm" : "text-slate-400 hover:text-indigo-600")}
                                        >
                                            R$
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(cat.id, 'marginType', 'percent')}
                                            className={cn("px-2 py-1 text-xs font-bold rounded transition", cat.marginType === 'percent' ? "text-indigo-600 bg-white shadow-sm" : "text-slate-400 hover:text-indigo-600")}
                                        >
                                            %
                                        </button>
                                        <input
                                            type="number"
                                            value={cat.margin}
                                            onChange={e => handleUpdate(cat.id, 'margin', e.target.value)}
                                            className="w-full bg-transparent border-none text-center font-bold text-indigo-700 focus:ring-0 p-0"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Sub Settings: Gateway, NF, Gifts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Gateway Padrão
                                </label>
                                <select
                                    value={cat.gatewayId || ''}
                                    onChange={e => handleUpdate(cat.id, 'gatewayId', e.target.value)}
                                    className="text-xs font-medium p-2 rounded-lg border-slate-200 bg-white focus:ring-indigo-500"
                                >
                                    {gateways?.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Nota Fiscal
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 bg-white rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={cat.requiresNotaFiscal || false}
                                        onChange={e => handleUpdate(cat.id, 'requiresNotaFiscal', e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                    <span className="text-xs font-medium text-slate-600">Obrigatória?</span>
                                </label>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <Gift className="w-3 h-3" /> Brindes Inclusos
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {(giftsList || []).map(gift => (
                                        <button
                                            key={gift.id}
                                            onClick={() => toggleGift(cat.id, gift.id)}
                                            className={cn(
                                                "text-[10px] px-2 py-1 rounded border transition-all",
                                                (cat.defaultGifts || []).includes(gift.id)
                                                    ? "bg-indigo-100 text-indigo-700 border-indigo-200 font-bold"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                            )}
                                        >
                                            {gift.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}
