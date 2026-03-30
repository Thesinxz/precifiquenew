import { Monitor, Plus, Trash2, ExternalLink } from 'lucide-react';
import { InputGroup } from './_Shared';

export function GiftsSettings({ data, onChange, userProfile }) {
    // data: { gifts: [{id, name, cost}] }
    // data: { gifts: [{id, name, cost}] }

    const handleGiftUpdate = (newGifts) => {
        onChange({ ...data, gifts: newGifts });
    };

    const addGift = () => {
        const newItem = { id: Date.now(), name: 'Nova Capinha', cost: 10 };
        handleGiftUpdate([...(data?.gifts || []), newItem]);
    };

    return (
        <div className="space-y-8">
            {/* Gifts Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Brindes e Adicionais</h3>
                    <button onClick={addGift} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition">
                        + Adicionar Item
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <tr>
                                <th className="p-4">Nome do Brinde</th>
                                <th className="p-4 w-32">Custo Médio</th>
                                <th className="p-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.gifts?.map((gift, idx) => (
                                <tr key={gift.id}>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={gift.name}
                                            onChange={e => {
                                                const updated = [...data.gifts];
                                                updated[idx].name = e.target.value;
                                                handleGiftUpdate(updated);
                                            }}
                                            className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400">R$</span>
                                            <input
                                                type="number"
                                                value={gift.cost}
                                                onChange={e => {
                                                    const updated = [...data.gifts];
                                                    updated[idx].cost = parseFloat(e.target.value);
                                                    handleGiftUpdate(updated);
                                                }}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-700"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleGiftUpdate(data.gifts.filter(g => g.id !== gift.id))}
                                            className="text-slate-300 hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!data?.gifts || data.gifts.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 italic">Nenhum brinde cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
