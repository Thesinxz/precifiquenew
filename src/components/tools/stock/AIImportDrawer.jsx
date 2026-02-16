import React, { useState } from 'react';
import {
    X, Sparkles, Upload, FileText, Loader2,
    CheckCircle2, AlertCircle, Plus, ArrowRight, Camera
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { extractImportProducts } from '../../../services/aiService';

export function AIImportDrawer({ open, onClose, onImported, orgId, userId }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [manualText, setManualText] = useState("");
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const handleAnalyze = async () => {
        if (files.length === 0 && !manualText) return;

        setIsAnalyzing(true);
        try {
            const result = await extractImportProducts(files, manualText);
            setExtractedData(result);
        } catch (error) {
            console.error(error);
            alert("Erro na análise AI. Verifique sua chave API ou o formato dos arquivos.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmImport = async () => {
        // Here we would normally call a bulk add service
        // For now, let's just pass it back to the manager
        onImported(extractedData);
        onClose();
        setExtractedData(null);
        setFiles([]);
        setManualText("");
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-white dark:bg-slate-950 shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100 dark:border-slate-800">

                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-indigo-900/10">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Importação Inteligente</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Extraia produtos de fotos ou listas de texto</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {!extractedData ? (
                        <div className="space-y-8">
                            {/* Upload Area */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 block">1. Envie Fotos ou PDFs de Invoices</label>
                                <div
                                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center group hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all cursor-pointer relative"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                                    }}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Camera className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 tracking-tight">Solte seus arquivos aqui</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-2">Arraste fotos de notas fiscais, listas impressas ou prints do WhatsApp.</p>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                                                <FileText className="w-3 h-3" /> {f.name}
                                                <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Manual Text Area */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 block">2. Ou Cole a Lista de Produtos (WhatsApp / Bloco de Notas)</label>
                                <textarea
                                    placeholder="Ex: 2 iphone 15 pro max black 256gb - 950 usd&#10;1 watch series 9 45mm midnight - 320 usd"
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                    className="w-full h-40 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-600 dark:text-slate-300 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || (files.length === 0 && !manualText)}
                                className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Analisando com Gemini AI...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 text-indigo-500" /> Iniciar Análise Mágica
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Resultados Encontrados ({extractedData.length})</h4>
                                <button onClick={() => setExtractedData(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Refazer Análise</button>
                            </div>

                            <div className="space-y-3">
                                {extractedData.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-white tracking-tight">{item.productName}</p>
                                                <div className="flex gap-2 items-center mt-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{item.quantity}un</span>
                                                    <span className="text-slate-300 text-[10px]">|</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatCurrency(item.cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 text-slate-300 hover:text-indigo-500"><Plus className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleConfirmImport}
                                className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Plus className="w-5 h-5" /> Importar Tudo para o Estoque
                            </button>
                        </div>
                    )}
                </div>

                {/* Info Bar */}
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-relaxed">
                        DICA: Quanto mais nítida a foto, melhor a precisão do Gemini. <br />
                        A IA irá tentar identificar modelo, armazenamento, cor e custo unitário.
                    </p>
                </div>
            </div>
        </div>
    );
}
