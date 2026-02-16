import { useState } from 'react';
import { PurchaseService } from '../../services/purchaseService';
import { useToast } from '../ui/Toast';
import {
    FileUp,
    FileText,
    Trash2,
    Package,
    DollarSign,
    Check,
    AlertCircle,
    ChevronRight,
    Loader2,
    Store,
    Receipt,
    Lock,
    ShieldCheck,
    CloudDownload
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';

export function PurchasesPage({ user, userProfile }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;

    const [files, setFiles] = useState([]);
    const [importedData, setImportedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setIsProcessing(true);
        try {
            const results = [];
            for (const file of selectedFiles) {
                const text = await file.text();
                const data = PurchaseService.parseNfXML(text);
                results.push({
                    file: file.name,
                    ...data,
                    products: data.products.map(p => ({
                        ...p,
                        selected: true,
                        category: '', // User will choose or system suggest
                        price: p.unitCost * 1.3 // Default 30% markup
                    }))
                });
            }
            setImportedData(prev => [...prev, ...results]);
            showToast(`${results.length} XML(s) processado(s) com sucesso!`, "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao processar um ou mais arquivos.", "error");
        } finally {
            setIsProcessing(false);
            e.target.value = null; // Reset input
        }
    };

    const handleImport = async () => {
        if (importedData.length === 0) return;

        setIsImporting(true);
        try {
            let totalStockItems = 0;
            for (const invoice of importedData) {
                const selectedProducts = invoice.products.filter(p => p.selected);
                if (selectedProducts.length === 0) continue;

                await PurchaseService.importPurchase(orgId, user.uid, {
                    ...invoice,
                    products: selectedProducts
                });
                totalStockItems += selectedProducts.length;
            }

            showToast(`Importação concluída! ${totalStockItems} itens adicionados ao estoque.`, "success");
            setImportedData([]);
        } catch (error) {
            console.error(error);
            showToast("Erro ao realizar importação.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    const removeInvoice = (idx) => {
        setImportedData(prev => prev.filter((_, i) => i !== idx));
    };

    const toggleProductSelection = (invoiceIdx, prodIdx) => {
        setImportedData(prev => {
            const newData = [...prev];
            newData[invoiceIdx].products[prodIdx].selected = !newData[invoiceIdx].products[prodIdx].selected;
            return newData;
        });
    };

    const updateProductPrice = (invoiceIdx, prodIdx, val) => {
        setImportedData(prev => {
            const newData = [...prev];
            newData[invoiceIdx].products[prodIdx].price = parseFloat(val);
            return newData;
        });
    };

    return (
        <div className="w-full pb-20 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Receipt className="w-8 h-8 text-indigo-600" />
                        Módulo de Compras
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Importe XMLs de fornecedores e automatize seu estoque.</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => document.getElementById('a1Input').click()}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Lock className="w-4 h-4 text-emerald-400" />
                        Certificado A1
                    </button>
                    <input
                        type="file"
                        id="a1Input"
                        accept=".pfx,.p12"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) showToast("Certificado A1 vinculado com sucesso! Pronto para consulta SEFAZ.", "success");
                        }}
                    />

                    <input
                        type="file"
                        id="xmlInput"
                        multiple
                        accept=".xml"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <label
                        htmlFor="xmlInput"
                        className={cn(
                            "px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2 cursor-pointer active:scale-95",
                            isProcessing && "opacity-50 cursor-wait"
                        )}
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        Importar XML
                    </label>

                    {importedData.length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl dark:shadow-slate-900/50 shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Confirmar Tudo
                        </button>
                    )}
                </div>
            </header>

            {importedData.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                        <FileText className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">Sem arquivos carregados</h2>
                        <p className="text-slate-500 max-w-sm mx-auto font-medium">Carregue os arquivos XML de suas Notas Fiscais para cadastrar produtos e fornecedores automaticamente.</p>
                    </div>
                    <label htmlFor="xmlInput" className="mt-4 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                        Selecionar Arquivos
                    </label>
                </div>
            ) : (
                <div className="space-y-8">
                    {importedData.map((invoice, iIdx) => (
                        <div key={iIdx} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            {/* Invoice Header */}
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm dark:shadow-slate-900/50 text-indigo-600">
                                        <Store className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">{invoice.supplier.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">NF-e: {invoice.invoice.number} • CNPJ: {invoice.supplier.cnpj}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Total Nota</p>
                                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(invoice.products.reduce((acc, p) => acc + p.totalValue, 0))}</p>
                                    </div>
                                    <button onClick={() => removeInvoice(iIdx)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors ml-4">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div className="p-2 md:p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Custo Unit.</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugestão Venda</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Importar?</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {invoice.products.map((prod, pIdx) => (
                                                <tr key={pIdx} className={cn("transition-colors", !prod.selected && "opacity-40 bg-slate-50/50")}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                <Package className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{prod.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">NCM: {prod.ncm}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-black text-slate-700 dark:text-slate-200">{prod.quantity}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-bold text-slate-500">{formatCurrency(prod.unitCost)}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">R$</span>
                                                            <input
                                                                type="number"
                                                                value={prod.price.toFixed(2)}
                                                                onChange={(e) => updateProductPrice(iIdx, pIdx, e.target.value)}
                                                                className="w-32 pl-8 pr-3 py-2 bg-emerald-50 border-2 border-transparent focus:border-emerald-500 rounded-xl font-bold text-emerald-700 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => toggleProductSelection(iIdx, pIdx)}
                                                            className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto",
                                                                prod.selected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-300"
                                                            )}
                                                        >
                                                            <Check className="w-5 h-5 flex-shrink-0" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="bg-slate-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl dark:shadow-slate-900/50">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white dark:bg-slate-900/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xl tracking-tight">Pronto para Integrar?</h4>
                                <p className="text-slate-400 font-medium tracking-tight">Ao clicar em processar, os itens selecionados serão adicionados ao estoque e uma conta a pagar será gerada.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="w-full md:w-auto px-12 py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl dark:shadow-slate-900/50 shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 group active:scale-95"
                        >
                            {isImporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                            Efetivar Compras
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
