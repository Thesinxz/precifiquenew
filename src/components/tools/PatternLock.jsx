import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { RotateCcw } from 'lucide-react';

export function PatternLock({ onChange }) {
    const [path, setPath] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const containerRef = useRef(null);

    const points = [
        { id: 0, x: 1, y: 1 }, { id: 1, x: 2, y: 1 }, { id: 2, x: 3, y: 1 },
        { id: 3, x: 1, y: 2 }, { id: 4, x: 2, y: 2 }, { id: 5, x: 3, y: 2 },
        { id: 6, x: 1, y: 3 }, { id: 7, x: 2, y: 3 }, { id: 8, x: 3, y: 3 }
    ];

    const handleStart = (id) => {
        setIsDrawing(true);
        setPath([id]);
    };

    const handleHover = (id) => {
        if (isDrawing && !path.includes(id)) {
            const newPath = [...path, id];
            setPath(newPath);
            onChange?.(newPath.join('-'));
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    const reset = () => {
        setPath([]);
        onChange?.('');
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative w-64 h-64 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-slate-100 dark:border-white/10 p-8 grid grid-cols-3 gap-8 select-none touch-none"
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchEnd={handleEnd}
            >
                {/* SVG for lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {path.length > 1 && path.map((pointId, index) => {
                        if (index === 0) return null;
                        const p1 = points[path[index - 1]];
                        const p2 = points[pointId];
                        return (
                            <line
                                key={index}
                                x1={`${(p1.x * 25)}%`}
                                y1={`${(p1.y * 25)}%`}
                                x2={`${(p2.x * 25)}%`}
                                y2={`${(p2.y * 25)}%`}
                                stroke="#4F46E5"
                                strokeWidth="6"
                                strokeLinecap="round"
                                className="animate-in fade-in zoom-in-50"
                            />
                        );
                    })}
                </svg>

                {points.map(p => (
                    <div
                        key={p.id}
                        className="relative z-10 flex items-center justify-center"
                        onMouseDown={() => handleStart(p.id)}
                        onMouseEnter={() => handleHover(p.id)}
                        onTouchStart={() => handleStart(p.id)}
                        onTouchMove={(e) => {
                            const touch = e.touches[0];
                            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                            const id = elem?.getAttribute('data-point-id');
                            if (id !== null && id !== undefined) handleHover(parseInt(id));
                        }}
                    >
                        <div
                            data-point-id={p.id}
                            className={cn(
                                "w-4 h-4 rounded-full transition-all duration-300",
                                path.includes(p.id) ? "bg-indigo-600 scale-150 shadow-lg shadow-indigo-200" : "bg-slate-300"
                            )}
                        />
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors"
            >
                <RotateCcw className="w-3 h-3" /> Limpar Desenho
            </button>
        </div>
    );
}
