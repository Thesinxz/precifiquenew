import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Smartphone, Check, X, AlertCircle } from 'lucide-react';

export function VisualChecklist({ value = [], onChange, readOnly = false }) {
    // value is array of { x: number, y: number, side: 'front'|'back', type: 'scratch'|'crack' }
    const [activeSide, setActiveSide] = useState('front');

    const handleClick = (e) => {
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        onChange([...value, { x, y, side: activeSide, type: 'scratch' }]);
    };

    const removeMark = (index, e) => {
        e.stopPropagation();
        if (readOnly) return;
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-4">
                <button
                    type="button"
                    onClick={() => setActiveSide('front')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                        activeSide === 'front' ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                >
                    Frente
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSide('back')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                        activeSide === 'back' ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                >
                    Traseira
                </button>
            </div>

            <div className="relative mx-auto h-[300px] w-[160px] bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-white/20 rounded-[2rem] shadow-sm dark:shadow-slate-900/50 select-none" onClick={handleClick}>
                {/* Phone Frame */}
                {activeSide === 'front' ? (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-100 dark:bg-slate-800 rounded-b-xl z-20"></div>
                        <div className="absolute inset-1 border border-slate-100 dark:border-white/10 rounded-[1.8rem]"></div>
                    </div>
                ) : (
                    <div className="absolute inset-0 pointer-events-none bg-slate-50 dark:bg-slate-950 rounded-[2rem]">
                        <div className="absolute top-4 left-4 w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl z-20 opacity-50"></div>
                        <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Smartphone className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                        </div>
                    </div>
                )}

                {/* Marks */}
                {value.filter(m => m.side === activeSide).map((mark, i) => (
                    <div
                        key={i}
                        onClick={(e) => removeMark(value.indexOf(mark), e)}
                        className="absolute w-4 h-4 -ml-2 -mt-2 flex items-center justify-center bg-red-500/80 rounded-full text-white text-[8px] font-bold cursor-pointer hover:scale-125 transition-transform z-30"
                        style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    >
                        <X className="w-3 h-3" />
                    </div>
                ))}

                {!readOnly && (
                    <div className="absolute bottom-4 inset-x-0 text-center text-[8px] text-slate-400 uppercase font-bold pointer-events-none">
                        Clique para marcar avarias
                    </div>
                )}
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">
                {value.length} avaria(s) marcada(s)
            </p>
        </div>
    );
}

export function FunctionalChecklist({ value = {}, onChange, readOnly = false }) {
    const items = [
        'Wifi', 'Bluetooth', 'Sinal Rede', 'Microfone',
        'Alto-falante', 'FaceID', 'Câmeras', 'Flash',
        'Carregamento', 'Botões', 'Sensor Prox.', 'Tela/Touch', 'Carcaça'
    ];

    const toggleStatus = (key) => {
        if (readOnly) return;
        const current = value[key] || 'unchecked'; // unchecked -> ok -> defect -> unchecked
        let next = 'unchecked';
        if (current === 'unchecked') next = 'ok';
        else if (current === 'ok') next = 'defect';
        else if (current === 'defect') next = 'unchecked';

        onChange({ ...value, [key]: next });
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(item => {
                const status = value[item] || 'unchecked';
                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => toggleStatus(item)}
                        className={cn(
                            "p-3 rounded-xl border-2 text-xs font-bold uppercase transition-all flex items-center justify-between",
                            status === 'unchecked' && "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100",
                            status === 'ok' && "bg-emerald-50 border-emerald-200 text-emerald-600",
                            status === 'defect' && "bg-red-50 border-red-200 text-red-600"
                        )}
                    >
                        {item}
                        {status === 'ok' && <Check className="w-4 h-4" />}
                        {status === 'defect' && <AlertCircle className="w-4 h-4" />}
                    </button>
                );
            })}
        </div>
    );
}
