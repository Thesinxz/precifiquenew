import { useState, useEffect } from 'react';
import {
    Smartphone, CheckCircle2, XCircle, AlertTriangle,
    Camera, Wifi, Battery, Lock, Eye, Volume2,
    Mic, ChevronRight, Save, FileText, Printer, Check, X
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useToast } from '../ui/Toast';

export function DeviceInspectionModal({ isOpen, onClose, onSave }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [device, setDevice] = useState({
        model: '',
        storage: '',
        color: '',
        batteryHealth: 100,
        imei: ''
    });

    const [checklist, setChecklist] = useState({
        faceId: null, // true, false, or null (not tested)
        trueTone: null,
        cameraFront: null,
        cameraBack: null,
        wifi: null,
        audio: null,
        mic: null,
        charging: null,
        icloudOff: null,
        blacklistClean: null
    });

    const [cosmetic, setCosmetic] = useState({
        screen: 'A', // A, B, C
        housing: 'A',
        back: 'A'
    });

    const [valuation, setValuation] = useState(0);

    // Initial simple valuation logic
    useEffect(() => {
        let basePrice = 2000; // Mock base
        if (device.model.includes('13')) basePrice = 2500;
        if (device.model.includes('14')) basePrice = 3500;
        if (device.model.includes('15')) basePrice = 4500;

        let penalty = 0;
        if (cosmetic.screen === 'B') penalty += 300;
        if (cosmetic.screen === 'C') penalty += 800;
        if (cosmetic.housing === 'B') penalty += 150;

        if (checklist.faceId === false) penalty += 1000;
        if (checklist.trueTone === false) penalty += 200;

        setValuation(Math.max(0, basePrice - penalty));
    }, [device, checklist, cosmetic]);

    if (!isOpen) return null;

    const toggleCheck = (key) => {
        setChecklist(prev => ({
            ...prev,
            [key]: prev[key] === true ? null : true
        }));
    };

    const toggleFail = (key) => {
        setChecklist(prev => ({
            ...prev,
            [key]: prev[key] === false ? null : false
        }));
    };

    const renderStep1 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                Dados do Aparelho
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Modelo</label>
                    <input
                        type="text"
                        value={device.model}
                        onChange={e => setDevice({ ...device, model: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-transparent focus:border-indigo-500 font-bold text-slate-700 outline-none"
                        placeholder="Ex: iPhone 13 Pro"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Capacidade</label>
                    <select
                        value={device.storage}
                        onChange={e => setDevice({ ...device, storage: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-transparent focus:border-indigo-500 font-bold text-slate-700 outline-none"
                    >
                        <option value="">Selecione</option>
                        <option value="64GB">64GB</option>
                        <option value="128GB">128GB</option>
                        <option value="256GB">256GB</option>
                        <option value="512GB">512GB</option>
                        <option value="1TB">1TB</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Saúde Bateria %</label>
                    <input
                        type="number"
                        value={device.batteryHealth}
                        onChange={e => setDevice({ ...device, batteryHealth: parseInt(e.target.value) })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-transparent focus:border-indigo-500 font-bold text-slate-700 outline-none"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">IMEI (Opcional)</label>
                    <input
                        type="text"
                        value={device.imei}
                        onChange={e => setDevice({ ...device, imei: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-transparent focus:border-indigo-500 font-bold text-slate-700 outline-none"
                        placeholder="000.000.000.000"
                    />
                </div>
            </div>
            <button
                onClick={() => setStep(2)}
                disabled={!device.model || !device.storage}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                Próximo <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );

    const ChecklistItem = ({ label, icon: Icon, id }) => (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-2">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-500">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-700 text-sm">{label}</span>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => toggleFail(id)}
                    className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        checklist[id] === false ? "bg-red-500 text-white" : "bg-white text-slate-300 hover:bg-red-50 hover:text-red-400"
                    )}
                >
                    <X className="w-4 h-4" />
                </button>
                <button
                    onClick={() => toggleCheck(id)}
                    className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        checklist[id] === true ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-white text-slate-300 hover:bg-emerald-50 hover:text-emerald-400"
                    )}
                >
                    <Check className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">Checklist Funcional</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">Marque os itens aprovados</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <ChecklistItem id="faceId" label="Face ID / Touch ID" icon={Eye} />
                <ChecklistItem id="trueTone" label="True Tone (Tela)" icon={Smartphone} />
                <ChecklistItem id="icloudOff" label="iCloud Deslogado" icon={Lock} />
                <ChecklistItem id="blacklistClean" label="Blacklist Limpa" icon={CheckCircle2} />
                <ChecklistItem id="cameraBack" label="Câmeras Traseiras" icon={Camera} />
                <ChecklistItem id="cameraFront" label="Câmera Frontal" icon={Camera} />
                <ChecklistItem id="audio" label="Áudio / Alto-falantes" icon={Volume2} />
                <ChecklistItem id="mic" label="Microfones" icon={Mic} />
                <ChecklistItem id="wifi" label="Wi-Fi / Bluetooth" icon={Wifi} />
                <ChecklistItem id="charging" label="Carregamento" icon={Battery} />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                    Voltar
                </button>
                <button
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    Avaliar Cosmética <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h3 className="text-lg font-black text-slate-800">Avaliação Visual</h3>

            <div className="space-y-4">
                <div>
                    <label className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2">
                        <span>Tela / Display</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px]",
                            cosmetic.screen === 'A' ? "bg-emerald-100 text-emerald-600" : cosmetic.screen === 'B' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        )}>Grade {cosmetic.screen}</span>
                    </label>
                    <div className="flex gap-2">
                        {['A', 'B', 'C'].map(grade => (
                            <button
                                key={grade}
                                onClick={() => setCosmetic(prev => ({ ...prev, screen: grade }))}
                                className={cn(
                                    "flex-1 py-3 rounded-xl border-2 text-xs font-black uppercase transition-all",
                                    cosmetic.screen === grade ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                {grade === 'A' ? 'Impecável' : grade === 'B' ? 'Riscos Leves' : 'Trincado/Fundo'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2">
                        <span>Carcaça / Aro</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px]",
                            cosmetic.housing === 'A' ? "bg-emerald-100 text-emerald-600" : cosmetic.housing === 'B' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        )}>Grade {cosmetic.housing}</span>
                    </label>
                    <div className="flex gap-2">
                        {['A', 'B', 'C'].map(grade => (
                            <button
                                key={grade}
                                onClick={() => setCosmetic(prev => ({ ...prev, housing: grade }))}
                                className={cn(
                                    "flex-1 py-3 rounded-xl border-2 text-xs font-black uppercase transition-all",
                                    cosmetic.housing === grade ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                {grade === 'A' ? 'Perfeito' : grade === 'B' ? 'Marcas de Uso' : 'Amassado'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white mt-8">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avaliação Sugerida</p>
                <h2 className="text-3xl font-black tracking-tight">{formatCurrency(valuation)}</h2>
                <p className="text-[10px] text-slate-500 mt-2">*Valor estimado com base nos critérios selecionados.</p>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                    Voltar
                </button>
                <button
                    onClick={() => {
                        showToast("Laudo gerado com sucesso!", "success");
                        onClose();
                    }}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-200"
                >
                    <Printer className="w-4 h-4" /> Gerar Laudo
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Avaliação Técnica</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Passo {step} de 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

            </div>
        </div>
    );
}
