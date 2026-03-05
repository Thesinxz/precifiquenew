import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
    X, User, Search, Smartphone, ShieldCheck,
    Clock, CheckCircle2, ChevronRight, ChevronLeft, ChevronDown,
    Plus, Save, Printer, Share2, FileText,
    Smartphone as PhoneIcon, Laptop, Watch, Speaker, Tablet,
    Info, AlertCircle, Camera, QrCode, Eraser, Box, Zap
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { ClientService } from '../../services/clientService';
import { ServiceOrderService } from '../../services/serviceOrderService';
import { ClientFormModal } from './ClientFormModal';
import { VisualChecklist, FunctionalChecklist } from './ServiceOrderComponents';
import { PatternLock } from './PatternLock';
import { PrintingService } from '../../services/printingService';
import { PhotoUploader } from './PhotoUploader';

const STEPS = [
    { id: 1, label: 'Cliente', icon: User },
    { id: 2, label: 'Equipamento', icon: Smartphone },
    { id: 3, label: 'Atendimento', icon: ShieldCheck },
    { id: 4, label: 'Prazo e Orçamento', icon: Clock },
    { id: 5, label: 'Revisão', icon: CheckCircle2 }
];

const DEVICE_TYPES = [
    { id: 'iphone', label: 'iPhone', icon: PhoneIcon },
    { id: 'android', label: 'Android', icon: PhoneIcon },
    { id: 'tablet', label: 'Tablet/iPad', icon: Tablet },
    { id: 'notebook', label: 'Notebook', icon: Laptop },
    { id: 'watch', label: 'Apple Watch/Smartwatch', icon: Watch },
    { id: 'speaker', label: 'Caixa de Som', icon: Speaker },
    { id: 'other', label: 'Outro', icon: Info }
];

export function ServiceOrderWizard({ open, onClose, user, userProfile, onSaved, settings, initialClient }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialClient) {
                setSelectedClient(initialClient);
                setStep(2);
            } else {
                setSelectedClient(null);
                setStep(1);
            }
        }
    }, [open, initialClient]);

    // Step 1: Client
    const [clientSearch, setClientSearch] = useState('');
    const [foundClients, setFoundClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    // Step 2: Equipment
    const [deviceData, setDeviceData] = useState({
        type: 'iphone',
        brand: 'Apple',
        model: '',
        color: '',
        imei: '',
        problem: '',
        solution: '',
        technicalReport: '',
        accessoriesIn: [], // Left at shop
        accessoriesOut: [], // Taken by client
        passwordType: 'none', // none, pin, alpha, pattern
        password: '',
        patternData: null,
        visualEvidence: [],
        drawingMode: false,
        photos: [], // Uploaded photos with URLs and paths
        functionalChecklist: {} // New field
    });

    const [activeAccordion, setActiveAccordion] = useState(null); // 'security', 'accessories', 'physical'

    // Step 3: Service Type
    const [serviceType, setServiceType] = useState('analysis'); // analysis, pre_approved

    // Step 4: Budget & ETA
    const [budgetData, setBudgetData] = useState({
        parts: [],
        laborValue: 0,
        discount: 0,
        prePayment: 0
    });

    const [etaData, setEtaData] = useState({
        date: 'today',
        customDate: new Date().toISOString().split('T')[0],
        estimatedWait: 60
    });

    // ETA Calculation Logic
    useEffect(() => {
        if (open && step === 4) {
            const calculateETA = async () => {
                try {
                    const orgId = userProfile?.organizationId || user?.uid;
                    const q = query(
                        collection(db, 'technical_lab'),
                        where('organizationId', '==', orgId),
                        where('status', 'not-in', ['Finalizada', 'Cancelada', 'Entregue'])
                    );
                    const snap = await getDocs(q);
                    const activeCount = snap.size;

                    // Simple logic: Each OS takes ~60 mins.
                    // If 3 open OS, wait is 4 hours (1 current + 3 in queue)
                    const waitMinutes = (activeCount + 1) * 60;
                    setEtaData(prev => ({ ...prev, estimatedWait: waitMinutes }));

                    // Default date: Today
                    const today = new Date().toISOString().split('T')[0];
                    setEtaData(prev => ({ ...prev, date: 'today', customDate: today }));
                } catch (e) {
                    console.error("Error calculating ETA:", e);
                }
            };
            calculateETA();
        }
    }, [open, step, user, userProfile]);

    // Budget Calculation
    const totals = {
        parts: budgetData.parts.reduce((acc, p) => acc + (p.price || 0), 0),
        labor: Number(budgetData.laborValue) || 0,
        discount: Number(budgetData.discount) || 0,
        prePayment: Number(budgetData.prePayment) || 0,
        get total() { return (this.parts + this.labor) - this.discount; },
        get remaining() { return this.total - this.prePayment; }
    };

    const [createdOS, setCreatedOS] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Reset flow on close/open
    useEffect(() => {
        if (open) {
            if (initialClient) {
                setSelectedClient(initialClient);
                setStep(2);
            } else {
                setStep(1);
                setSelectedClient(null);
            }
            setClientSearch('');
            setShowSuccess(false);
            setCreatedOS(null);
        }
    }, [open, initialClient]);

    // Client Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (clientSearch.length >= 2 && !selectedClient) {
                setIsSearchingClient(true);
                try {
                    const orgId = userProfile?.organizationId || user?.uid;
                    const q = query(
                        collection(db, 'clients'),
                        where('organizationId', '==', orgId)
                    );
                    const snap = await getDocs(q);
                    const search = clientSearch.toLowerCase();
                    const filtered = snap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter(c =>
                            c.name.toLowerCase().includes(search) ||
                            c.cpf?.includes(search) ||
                            c.phone?.includes(search)
                        )
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setFoundClients(filtered);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearchingClient(false);
                }
            } else {
                setFoundClients([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [clientSearch, selectedClient, user, userProfile]);

    const handleCreateOS = async () => {
        setIsProcessing(true);
        try {
            const orgId = userProfile?.organizationId || user?.uid;
            const osData = {
                clientId: selectedClient.id,
                ownerName: selectedClient.name,
                ownerPhone: selectedClient.phone,
                ...deviceData,
                serviceType,
                ...etaData,
                ...budgetData,
                totals: {
                    partsTotal: totals.parts,
                    laborTotal: totals.labor,
                    discountTotal: totals.discount,
                    prePaymentTotal: totals.prePayment,
                    finalTotal: totals.total,
                    remainingTotal: totals.remaining
                },
                status: serviceType === 'analysis' ? 'Aguardando Diagnóstico' : 'Aguardando Início',
                historyNote: serviceType === 'analysis' ? 'Entrada para Análise Técnica' : 'OS Criada com Orçamento Pré-aprovado'
            };

            const result = await ServiceOrderService.createOS(orgId, osData);
            setCreatedOS({ ...osData, ...result });
            setShowSuccess(true);
            showToast(`OS #${result.osNumber} criada com sucesso!`, "success");
            if (onSaved) onSaved(result);
        } catch (e) {
            console.error(e);
            showToast("Erro ao criar OS", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in transition-all">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full md:h-[90vh] md:rounded-3xl shadow-xl dark:shadow-slate-900/50 relative flex flex-col overflow-hidden border border-slate-200 dark:border-white/10">
                {showSuccess && createdOS ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-8 border-4 border-white dark:border-slate-800 shadow-xl dark:shadow-slate-900/50">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>

                        <div className="space-y-2 mb-12">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ordem de Serviço Criada</p>
                            <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">#{createdOS.osNumber}</h2>
                            <p className="text-slate-500 font-medium text-sm">O registro de {deviceData.brand} {deviceData.model} foi finalizado!</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                            <button
                                onClick={() => PrintingService.printOSThermal(createdOS, settings)}
                                className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm dark:shadow-slate-900/50">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 group-hover:text-indigo-900">Etiqueta Térmica</span>
                            </button>

                            <button
                                onClick={() => PrintingService.printOSA4(createdOS, settings)}
                                className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm dark:shadow-slate-900/50">
                                    <Printer className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 group-hover:text-indigo-900">Comprovante A4</span>
                            </button>

                            <button
                                onClick={() => PrintingService.whatsappShare(createdOS, settings)}
                                className="flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-emerald-500 hover:text-emerald-600 transition-all text-sm font-bold text-slate-600 dark:text-slate-300 md:col-span-2"
                            >
                                <Share2 className="w-5 h-5" /> Enviar para o WhatsApp do Cliente
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-sm hover:bg-black transition-all shadow-xl dark:shadow-slate-900/50 md:col-span-2 mt-4"
                            >
                                Voltar para Central de OS
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                        {/* Header & Stepper */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Nova Ordem de Serviço</h2>
                                <div className="hidden md:flex items-center gap-4">
                                    {STEPS.map((s) => (
                                        <div key={s.id} className="flex items-center">
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2",
                                                step === s.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100/50" :
                                                    step > s.id ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-white/5"
                                            )}>
                                                {step > s.id ? <CheckCircle2 className="w-3 h-3" /> : <span>{s.id}</span>}
                                                {s.label}
                                            </div>
                                            {s.id !== STEPS.length && <div className="w-4 h-[1px] bg-slate-100 dark:bg-white/10 mx-2" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content area focus: One main action per screen */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">

                            {step === 1 && (
                                <div className="max-w-2xl mx-auto py-12 px-6 space-y-10 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Identificação do Cliente</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Selecione o cliente para iniciar a Ordem de Serviço.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                            <input
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 rounded-xl outline-none transition-all font-medium"
                                                placeholder="Buscar por Nome, CPF ou WhatsApp..."
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                                disabled={!!selectedClient}
                                                autoFocus
                                            />
                                            {selectedClient && (
                                                <button onClick={() => setSelectedClient(null)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800">
                                                    Alterar
                                                </button>
                                            )}
                                        </div>

                                        {isSearchingClient && (
                                            <div className="flex justify-center py-4">
                                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}

                                        {!selectedClient && foundClients.length > 0 && (
                                            <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm dark:shadow-slate-900/50">
                                                {foundClients.map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => setSelectedClient(client)}
                                                        className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-all flex items-center justify-between group"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600">{client.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{client.phone} • {client.cpf || 'Sem CPF'}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {clientSearch.length >= 2 && foundClients.length === 0 && !isSearchingClient && !selectedClient && (
                                            <div className="p-10 text-center bg-slate-50 dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 space-y-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Nenhum cliente encontrado</p>
                                                <button
                                                    onClick={() => setIsClientModalOpen(true)}
                                                    className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-all"
                                                >
                                                    Cadastrar Novo Cliente
                                                </button>
                                            </div>
                                        )}

                                        {selectedClient && (
                                            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between group animate-in zoom-in-95">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center">
                                                        <User className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente Selecionado</p>
                                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedClient.name}</p>
                                                        <p className="text-xs font-medium text-slate-500">{selectedClient.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedClient && (
                                        <div className="pt-4 flex justify-end">
                                            <button
                                                onClick={() => setStep(2)}
                                                className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 shadow-indigo-200"
                                            >
                                                Continuar para Equipamento
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="max-w-4xl mx-auto py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Equipamento</h3>
                                        <p className="text-slate-500 text-sm">Selecione o tipo e descreva o estado do aparelho.</p>
                                    </div>

                                    {/* Device Type Selection */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                        {DEVICE_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setDeviceData({ ...deviceData, type: type.id })}
                                                className={cn(
                                                    "flex-shrink-0 px-6 py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 min-w-[100px]",
                                                    deviceData.type === type.id
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                                                )}
                                            >
                                                <type.icon className="w-5 h-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Basic Data Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Marca</label>
                                                    <input
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 font-medium shadow-sm dark:shadow-slate-900/50 transition-all"
                                                        placeholder="Ex: Apple"
                                                        value={deviceData.brand}
                                                        onChange={e => setDeviceData({ ...deviceData, brand: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Modelo</label>
                                                    <input
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 font-medium shadow-sm dark:shadow-slate-900/50 transition-all"
                                                        placeholder="Ex: iPhone 14"
                                                        value={deviceData.model}
                                                        onChange={e => setDeviceData({ ...deviceData, model: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Cor</label>
                                                    <input
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 font-medium shadow-sm dark:shadow-slate-900/50 transition-all"
                                                        placeholder="Ex: Preto"
                                                        value={deviceData.color}
                                                        onChange={e => setDeviceData({ ...deviceData, color: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">IMEI / Serial</label>
                                                    <input
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 font-medium font-mono shadow-sm dark:shadow-slate-900/50 transition-all"
                                                        placeholder="Opcional"
                                                        value={deviceData.imei}
                                                        onChange={e => setDeviceData({ ...deviceData, imei: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Defeito Relatado</label>
                                            <textarea
                                                className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 focus:bg-white dark:bg-slate-900 font-medium min-h-[120px] resize-none shadow-sm dark:shadow-slate-900/50 transition-all"
                                                placeholder="Descreva o que o cliente informou..."
                                                value={deviceData.problem}
                                                onChange={e => setDeviceData({ ...deviceData, problem: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Advanced Accordions Section */}
                                    <div className="space-y-2">
                                        {[
                                            { id: 'security', label: 'Senhas e Acesso', icon: ShieldCheck, isFilled: deviceData.passwordType !== 'none' },
                                            { id: 'accessories', label: 'Acessórios e Itens', icon: Box, isFilled: deviceData.accessoriesIn.length > 0 },
                                            { id: 'checklist', label: 'Checklist Funcional', icon: CheckCircle2, isFilled: Object.keys(deviceData.functionalChecklist || {}).length > 0 },
                                            { id: 'physical', label: 'Danos e Estado Físico', icon: Camera, isFilled: deviceData.visualEvidence.length > 0 || deviceData.photos.length > 0 }
                                        ].map((acc) => (
                                            <div key={acc.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm dark:shadow-slate-900/50">
                                                <button
                                                    onClick={() => setActiveAccordion(activeAccordion === acc.id ? null : acc.id)}
                                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-slate-950 transition-all font-bold text-slate-700 dark:text-slate-200 text-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <acc.icon className="w-5 h-5 text-indigo-600" />
                                                        {acc.label}
                                                        {acc.isFilled && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                                    </div>
                                                    <ChevronDown className={cn("w-4 h-4 transition-transform", activeAccordion === acc.id && "rotate-180")} />
                                                </button>
                                                {activeAccordion === acc.id && (
                                                    <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 animate-in slide-in-from-top-2">
                                                        {acc.id === 'security' && (
                                                            <div className="space-y-6">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {['none', 'pin', 'pattern'].map(t => (
                                                                        <button
                                                                            key={t}
                                                                            onClick={() => setDeviceData({ ...deviceData, passwordType: t })}
                                                                            className={cn(
                                                                                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                                                                                deviceData.passwordType === t ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
                                                                            )}
                                                                        >
                                                                            {t === 'none' ? 'Sem Senha' : t === 'pin' ? 'PIN/Alfa' : 'Padrão'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {deviceData.passwordType === 'pin' && (
                                                                    <input
                                                                        className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-600/30 font-bold text-lg text-center tracking-widest shadow-sm dark:shadow-slate-900/50"
                                                                        placeholder="Digitar Senha..."
                                                                        value={deviceData.password}
                                                                        onChange={e => setDeviceData({ ...deviceData, password: e.target.value })}
                                                                    />
                                                                )}
                                                                {deviceData.passwordType === 'pattern' && (
                                                                    <div className="flex flex-col items-center py-4">
                                                                        <div className="scale-75 origin-top mb-[-60px]">
                                                                            <PatternLock onChange={(path) => setDeviceData({ ...deviceData, password: path, patternData: path })} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {deviceData.passwordType === 'none' && (
                                                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex gap-3 items-start border border-amber-100 dark:border-amber-900/30">
                                                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200 leading-relaxed">O cliente não informou senha. Testes completos não poderão ser realizados.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {acc.id === 'accessories' && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {['Carregador', 'Cabo', 'Capa', 'Chip', 'Cartão SD', 'Caneta'].map(item => {
                                                                    const isIn = deviceData.accessoriesIn.includes(item);
                                                                    return (
                                                                        <div key={item} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm dark:shadow-slate-900/50">
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item}</span>
                                                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setDeviceData({
                                                                                            ...deviceData,
                                                                                            accessoriesIn: deviceData.accessoriesIn.filter(a => a !== item),
                                                                                            accessoriesOut: [...new Set([...deviceData.accessoriesOut, item])]
                                                                                        });
                                                                                    }}
                                                                                    className={cn("px-3 py-1 text-[9px] font-bold transition-all rounded-md", !isIn ? "bg-white text-slate-700 shadow-sm" : "text-slate-400")}
                                                                                >Levou</button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setDeviceData({
                                                                                            ...deviceData,
                                                                                            accessoriesIn: [...new Set([...deviceData.accessoriesIn, item])],
                                                                                            accessoriesOut: deviceData.accessoriesOut.filter(a => a !== item)
                                                                                        });
                                                                                    }}
                                                                                    className={cn("px-3 py-1 text-[9px] font-bold transition-all rounded-md", isIn ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400")}
                                                                                >Ficou</button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {acc.id === 'checklist' && (
                                                            <div className="space-y-4">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Teste Rápido de Entrada</p>
                                                                <FunctionalChecklist
                                                                    value={deviceData.functionalChecklist}
                                                                    onChange={(c) => setDeviceData({ ...deviceData, functionalChecklist: c })}
                                                                />
                                                            </div>
                                                        )}
                                                        {acc.id === 'physical' && (
                                                            <div className="space-y-6">
                                                                <div className="max-w-md mx-auto">
                                                                    <VisualChecklist value={deviceData.visualEvidence} onChange={(v) => setDeviceData({ ...deviceData, visualEvidence: v })} />
                                                                </div>
                                                                <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                                                                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider">Fotos do Aparelho</h4>
                                                                    <PhotoUploader
                                                                        photos={deviceData.photos}
                                                                        onChange={(photos) => setDeviceData({ ...deviceData, photos })}
                                                                        organizationId={userProfile?.organizationId || user?.uid}
                                                                        maxPhotos={5}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-4 flex justify-between items-center">
                                        <button onClick={() => setStep(1)} className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-all">Voltar</button>
                                        <button
                                            disabled={!deviceData.model}
                                            onClick={() => setStep(3)}
                                            className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 shadow-indigo-200 disabled:opacity-50"
                                        >
                                            Continuar para Atendimento
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="max-w-4xl mx-auto py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col justify-center min-h-[500px]">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tipo de Atendimento</h3>
                                        <p className="text-slate-500 text-sm">Como desejam proceder com este serviço?</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={() => { setServiceType('analysis'); setStep(4); }}
                                            className={cn(
                                                "p-8 rounded-3xl border-2 text-left transition-all group relative",
                                                serviceType === 'analysis' ? "bg-white border-indigo-600 shadow-xl shadow-indigo-100" : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors", serviceType === 'analysis' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100")}>
                                                <Search className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Análise Técnica</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">O aparelho passará por diagnóstico técnico antes do orçamento final.</p>
                                            {serviceType === 'analysis' && <CheckCircle2 className="absolute top-6 right-6 w-6 h-6 text-indigo-600" />}
                                        </button>

                                        <button
                                            onClick={() => { setServiceType('pre_approved'); setStep(4); }}
                                            className={cn(
                                                "p-8 rounded-3xl border-2 text-left transition-all group relative",
                                                serviceType === 'pre_approved' ? "bg-white border-emerald-600 shadow-xl shadow-emerald-100" : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors", serviceType === 'pre_approved' ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100")}>
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Pré-aprovado</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">Serviço já autorizado pelo cliente. Siga direto para as peças e prazo.</p>
                                            {serviceType === 'pre_approved' && <CheckCircle2 className="absolute top-6 right-6 w-6 h-6 text-emerald-600" />}
                                        </button>
                                    </div>

                                    <div className="pt-4 flex justify-start">
                                        <button onClick={() => setStep(2)} className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-all">Voltar</button>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="max-w-6xl mx-auto py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 mb-24">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Prazo e Orçamento</h3>
                                        <p className="text-slate-500 text-sm">Defina a previsão de entrega e os custos envolvidos.</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                        {/* Delivery Prediction Card */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Clock className="w-5 h-5 text-indigo-600" />
                                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Previsão de Entrega</h4>
                                                </div>

                                                <div className="flex gap-1.5">
                                                    {['today', 'tomorrow', 'custom'].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setEtaData({ ...etaData, date: d })}
                                                            className={cn(
                                                                "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                                                                etaData.date === d ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                                                            )}
                                                        >
                                                            {d === 'today' ? 'Hoje' : d === 'tomorrow' ? 'Amanhã' : 'Data'}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="relative group">
                                                    <input
                                                        type="time"
                                                        className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-2xl text-center outline-none focus:border-indigo-600/30 shadow-sm dark:shadow-slate-900/50"
                                                        value={etaData.customTime || '18:00'}
                                                        onChange={e => setEtaData({ ...etaData, customTime: e.target.value })}
                                                    />
                                                </div>

                                                <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-600/10 flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg dark:shadow-slate-900/50 shadow-indigo-100">
                                                        <Zap className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-indigo-900 uppercase">Sugestão Inteligente</p>
                                                        <p className="text-xs font-semibold text-indigo-600 mt-1">
                                                            {Math.ceil(etaData.estimatedWait / 60)}h úteis para conclusão baseada na fila atual.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quote Details Card */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-slate-900/50 space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Box className="w-5 h-5 text-indigo-600" />
                                                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Itens e Serviços</h4>
                                                    </div>
                                                </div>

                                                {/* Parts List */}
                                                <div className="space-y-3">
                                                    {budgetData.parts.map((part, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-2">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-600 transition-all">{idx + 1}</div>
                                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{part.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold text-indigo-600">{formatCurrency(part.price)}</span>
                                                                <button
                                                                    onClick={() => setBudgetData({ ...budgetData, parts: budgetData.parts.filter((_, i) => i !== idx) })}
                                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Add Part Form */}
                                                    <div className="flex gap-2 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                                        <input
                                                            id="new-part-name"
                                                            className="flex-[2] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium outline-none focus:border-indigo-600/30"
                                                            placeholder="Nome da Peça ou Serviço..."
                                                        />
                                                        <input
                                                            id="new-part-price"
                                                            type="number"
                                                            className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-600/30"
                                                            placeholder="Valor R$"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const nameEl = document.getElementById('new-part-name');
                                                                const priceEl = document.getElementById('new-part-price');
                                                                if (nameEl.value && priceEl.value) {
                                                                    setBudgetData({ ...budgetData, parts: [...budgetData.parts, { name: nameEl.value, price: Number(priceEl.value) }] });
                                                                    nameEl.value = ''; priceEl.value = '';
                                                                }
                                                            }}
                                                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Advanced Budget Inputs */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Mão de Obra</label>
                                                        <input
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-600/30 transition-all"
                                                            placeholder="0,00"
                                                            value={budgetData.laborValue}
                                                            onChange={e => setBudgetData({ ...budgetData, laborValue: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Desconto (R$)</label>
                                                        <input
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-600/30 transition-all"
                                                            placeholder="0,00"
                                                            value={budgetData.discount}
                                                            onChange={e => setBudgetData({ ...budgetData, discount: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 mb-1.5 block">Adiantamento</label>
                                                        <input
                                                            className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-emerald-700 outline-none focus:border-emerald-500/30 transition-all"
                                                            placeholder="0,00"
                                                            value={budgetData.prePayment}
                                                            onChange={e => setBudgetData({ ...budgetData, prePayment: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button Navigation */}
                                    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 p-6 flex justify-between items-center max-w-5xl mx-auto px-12 md:rounded-t-[3rem] shadow-2xl dark:shadow-slate-900/50">
                                        <div className="flex gap-8">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Peças</p>
                                                <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(totals.parts)}</p>
                                            </div>
                                            <div className="border-l border-slate-200 dark:border-white/10 pl-8">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Serviço</p>
                                                <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(totals.labor)}</p>
                                            </div>
                                            <div className="border-l border-slate-200 dark:border-white/10 pl-8">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Total Geral</p>
                                                <p className="text-xl font-bold text-indigo-600">{formatCurrency(totals.total)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => setStep(3)} className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-all">Voltar</button>
                                            <button
                                                onClick={() => setStep(5)}
                                                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg dark:shadow-slate-900/50 shadow-indigo-100"
                                            >
                                                Ver Resumo Final
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="max-w-4xl mx-auto py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 mb-24">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Revisão e Finalização</h3>
                                        <p className="text-slate-500 text-sm">Confira os dados antes de gerar a Ordem de Serviço.</p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-slate-900/50">
                                        <div className="p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedClient?.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500">{selectedClient?.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                        <Smartphone className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Equipamento</p>
                                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{deviceData.brand} {deviceData.model}</p>
                                                        <p className="text-[11px] font-medium text-slate-500">{deviceData.color} • IMEI: {deviceData.imei || 'N/I'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <div>
                                                    <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Defeito e Diagnóstico</h5>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-white/10 italic">"{deviceData.problem || 'Nenhum detalhe adicional informado.'}"</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tipo de Serviço</h5>
                                                        <div className="text-xs font-bold text-indigo-600">{serviceType === 'analysis' ? 'Análise Técnica' : 'Orçamento Prévio'}</div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Previsão Entrega</h5>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{etaData.date === 'today' ? 'Hoje' : etaData.date === 'tomorrow' ? 'Amanhã' : etaData.customDate} às {etaData.customTime || '18:00'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                                                <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Resumo de Valores</h5>
                                                <div className="space-y-2 border-b border-slate-100 pb-4">
                                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                                        <span>Peças/Serviços</span>
                                                        <span>{formatCurrency(totals.parts)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                                        <span>Mão de Obra</span>
                                                        <span>{formatCurrency(totals.labor)}</span>
                                                    </div>
                                                    {Number(budgetData.discount) > 0 && (
                                                        <div className="flex justify-between text-xs font-medium text-emerald-600">
                                                            <span>Desconto</span>
                                                            <span>-{formatCurrency(Number(budgetData.discount))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-lg font-bold text-slate-900 dark:text-white">
                                                    <span>Total</span>
                                                    <span>{formatCurrency(totals.total)}</span>
                                                </div>
                                                {Number(budgetData.prePayment) > 0 && (
                                                    <div className="flex justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                                        <span>Pago Antecipado:</span>
                                                        <span>{formatCurrency(Number(budgetData.prePayment))}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Action Bar */}
                                    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 p-6 flex justify-between items-center max-w-5xl mx-auto px-12 md:rounded-t-[3rem] shadow-2xl dark:shadow-slate-900/50">
                                        <button onClick={() => setStep(4)} className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-all">Voltar</button>
                                        <button
                                            disabled={isProcessing}
                                            onClick={handleCreateOS}
                                            className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg dark:shadow-slate-900/50 flex items-center gap-3 disabled:opacity-50"
                                        >
                                            {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                            Criar Ordem de Serviço
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>



                        {/* Internal Modals */}
                        <ClientFormModal
                            open={isClientModalOpen}
                            onClose={() => setIsClientModalOpen(false)}
                            onSaved={(client) => {
                                setSelectedClient(client);
                                setStep(2);
                            }}
                            user={user}
                            userProfile={userProfile}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
