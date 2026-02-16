import { useState } from 'react';
import { X, FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { InvoiceService } from '../../services/invoiceService';
import { useToast } from '../ui/Toast';

export function InvoiceEmissionModal({ open, onClose, sale, orgId }) {
    const { showToast } = useToast();
    const [emitting, setEmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleEmit = async () => {
        if (!sale?.id) {
            showToast('Venda não encontrada', 'error');
            return;
        }

        setEmitting(true);
        setError(null);
        setResult(null);

        try {
            const response = await InvoiceService.emitInvoice(sale.id, orgId);
            setResult(response);
            showToast('Nota fiscal emitida com sucesso!', 'success');
        } catch (err) {
            console.error('Emission error:', err);
            setError(err.message || 'Erro ao emitir nota fiscal');
            showToast('Erro ao emitir nota fiscal', 'error');
        } finally {
            setEmitting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        setError(null);
        onClose();
    };

    if (!open) return null;

    // Handle both 'client' and 'customer' field names
    const customer = sale?.customer || sale?.client;
    const invoiceType = customer?.cpf ? 'NF-e' : 'NFC-e';
    const items = sale?.items || [];
    const total = sale?.total || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[1.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        Emitir {invoiceType}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm">
                        {invoiceType === 'NFC-e' ? 'Cupom Fiscal Eletrônico' : 'Nota Fiscal Eletrônica'}
                    </p>
                </div>

                {!result && !error && (
                    <div className="space-y-6">
                        {/* Sale Info */}
                        <div className="bg-slate-50 p-6 rounded-[1.5rem]">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                Detalhes da Venda
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Cliente:</span>
                                    <span className="font-bold text-slate-800">
                                        {customer?.name || 'Consumidor Anônimo'}
                                    </span>
                                </div>
                                {customer?.cpf && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">CPF/CNPJ:</span>
                                        <span className="font-bold text-slate-800">
                                            {customer.cpf}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Valor Total:</span>
                                    <span className="font-bold text-slate-800">
                                        R$ {total.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Itens:</span>
                                    <span className="font-bold text-slate-800">
                                        {items.length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Emit Button */}
                        <button
                            onClick={handleEmit}
                            disabled={emitting}
                            className="w-full py-5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {emitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Emitindo...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-5 h-5" />
                                    Emitir {invoiceType}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Success Result */}
                {result && (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-[1.5rem] text-center">
                            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-emerald-800 mb-2">
                                {invoiceType} Emitida com Sucesso!
                            </h4>
                            <p className="text-sm text-emerald-600 font-medium">
                                {result.message}
                            </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[1.5rem] space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Chave NFe:</span>
                                <span className="font-mono text-xs text-slate-800">
                                    {result.nfeKey}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Protocolo:</span>
                                <span className="font-bold text-slate-800">{result.protocol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Status:</span>
                                <span className="font-bold text-emerald-600">{result.status}</span>
                            </div>
                        </div>

                        {result.pdfUrl && (
                            <a
                                href={result.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Baixar DANFE
                            </a>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {/* Error Result */}
                {error && (
                    <div className="space-y-6">
                        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[1.5rem] text-center">
                            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-red-800 mb-2">
                                Erro na Emissão
                            </h4>
                            <p className="text-sm text-red-600 font-medium">
                                {error}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEmit}
                                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
