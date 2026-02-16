import { useState, useEffect, useRef } from 'react';
import { Trophy, Target, Edit2, Check, X } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';

export function GoalsWidget({ currentAmount, userProfile, goal }) {
    const [target, setTarget] = useState(goal || 50000);
    const [isEditing, setIsEditing] = useState(false);
    const [tempTarget, setTempTarget] = useState(target.toString());
    const [showConfetti, setShowConfetti] = useState(false);

    const percentage = Math.min(100, Math.max(0, (currentAmount / target) * 100));
    const isMet = currentAmount >= target;

    useEffect(() => {
        if (goal) setTarget(goal);
    }, [goal]);

    // Optional: Synchronize manual edits back to settings if we wanted, 
    // but for now we keep local edit state visual or rely on parent to save settings.
    // The previous localStorage logic is removed to favoring the prop.

    useEffect(() => {
        if (isMet && !showConfetti) {
            setShowConfetti(true);
            // Reset confetti after a while if desired, or keep it one-off
        }
    }, [isMet]);

    const handleSave = () => {
        const val = parseFloat(tempTarget);
        if (!isNaN(val) && val > 0) {
            setTarget(val);
            setIsEditing(false);
        }
    };

    // Circular Progress Props
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900/50 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 flex flex-col justify-between h-full min-h-[140px]">

            {/* Confetti (CSS Particles) - Simple Implementation */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-[fall_3s_ease-in-out_infinite]"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-${Math.random() * 20}px`,
                                backgroundColor: ['#FCD34D', '#34D399', '#60A5FA', '#F472B6'][Math.floor(Math.random() * 4)],
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 3}s`
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Meta Mensal
                    </p>

                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                autoFocus
                                type="number"
                                value={tempTarget}
                                onChange={(e) => setTempTarget(e.target.value)}
                                className="w-24 text-sm font-bold border-b-2 border-indigo-500 outline-none p-1 bg-transparent dark:text-white"
                            />
                            <button onClick={handleSave} className="p-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full hover:bg-emerald-200"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setIsEditing(false)} className="p-1 bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400 rounded-full hover:bg-slate-200"><X className="w-3 h-3" /></button>
                        </div>
                    ) : (
                        <div className="group/edit relative cursor-pointer" onClick={() => { setTempTarget(target.toString()); setIsEditing(true); }}>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                                {formatCurrency(currentAmount)}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                de {formatCurrency(target)}
                                <Edit2 className="w-3 h-3 inline ml-1 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                            </p>
                        </div>
                    )}
                </div>

                {/* Circular Chart */}
                <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Ring */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-slate-100 dark:text-white/5"
                        />
                        {/* Progress Ring */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={cn(
                                "transition-all duration-1000 ease-out",
                                isMet ? "text-emerald-500" : "text-indigo-600"
                            )}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {isMet ? (
                            <Trophy className="w-6 h-6 text-emerald-500 animate-bounce" />
                        ) : (
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{Math.round(percentage)}%</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-2 w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden z-10">
                <div
                    className={cn("h-full rounded-full transition-all duration-1000", isMet ? "bg-emerald-500" : "bg-indigo-500")}
                    style={{ width: `${percentage}%` }}
                />
            </div>

        </div>
    );
}

// Add simple keyframe animation for fallback confetti
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(150px) rotate(360deg); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);
