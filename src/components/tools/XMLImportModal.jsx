import { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { NFeXMLParser } from '../../utils/xmlParser';
import { StockService } from '../../services/stockService';
import { useToast } from '../ui/Toast';

export function XMLImportModal({ open, onClose, user, userProfile }) {
    const { showToast } = useToast();
    const [importing, setImporting] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);

    const orgId = userProfile?.organizationId || user?.uid;

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.xml')) {
            showToast('Por favor, selecione um arquivo XML válido', 'error');
            return;
        }

        try {
            const text = await file.text();
            const data = await NFeXMLParser.parseXML(text);
            setParsedData(data);
            // Select all products by default
            setSelectedProducts(data.products.map((_, idx) => idx));
            showToast('XML processado com sucesso!', 'success');
        } catch (error) {
            console.error('Error parsing XML:', error);
            showToast('Erro ao processar XML: ' + error.message, 'error');
        }
    };

    const handleImport = async () => {
        if (!parsedData || selectedProducts.length === 0) {
            showToast('Selecione pelo menos um produto para importar', 'warning');
            return;
        }

        setImporting(true);
        try {
            let imported = 0;
            let updated = 0;

            for (const idx of selectedProducts) {
                const product = parsedData.products[idx];

                // Check if product exists by barcode
                const existing = product.barcode ?
                    await StockService.getProductByBarcode(orgId, product.barcode) : null;

                if (existing) {
                    // Update existing product with fiscal data and cost
                    await StockService.updateItem(orgId, user.uid, existing.id, {
                        ncm: product.ncm || existing.ncm,
                        cest: product.cest || existing.cest,
                        cfop: product.cfop || existing.cfop,
                        origin: product.origin || existing.origin,
                        cost: product.unitPrice
                    }, `Atualizado via XML - ${parsedData.nfeNumber}`);
                    updated++;
                } else {
                    // Create new product
                    await StockService.addItem(orgId, user.uid, {
                        name: product.name,
                        barcode: product.barcode,
                        ncm: product.ncm,
                        cest: product.cest,
                        cfop: product.cfop,
                        origin: product.origin,
                        cost: product.unitPrice,
                        price: product.unitPrice * 1.3, // Default 30% markup
                        quantity: 0,
                        category: 'Importado'
                    });
                    imported++;
                }
            }

            showToast(`Importação concluída! ${imported} novos, ${updated} atualizados`, 'success');
            setParsedData(null);
            setSelectedProducts([]);
            if (onClose) onClose();
        } catch (error) {
            console.error('Import error:', error);
            showToast('Erro ao importar produtos', 'error');
        } finally {
            setImporting(false);
        }
    };

    const toggleProduct = (idx) => {
        setSelectedProducts(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-5xl rounded-[1.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-600" />
                        Importar XML de Compra
                    </h3>
                    <p className="text-slate-500 font-medium text-sm">
                        Importe produtos e dados fiscais de notas de fornecedores
                    </p>
                </div>

                {!parsedData ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-12 text-center">
                        <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-bold mb-4">
                            Arraste um arquivo XML ou clique para selecionar
                        </p>
                        <input
                            type="file"
                            accept=".xml"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="xml-upload"
                        />
                        <label
                            htmlFor="xml-upload"
                            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-bold cursor-pointer hover:bg-purple-700 transition-colors"
                        >
                            Selecionar XML
                        </label>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Supplier Info */}
                        <div className="bg-slate-50 p-6 rounded-[1.5rem]">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                Fornecedor
                            </h4>
                            <p className="font-bold text-slate-800">{parsedData.supplier.name}</p>
                            <p className="text-sm text-slate-600">CNPJ: {parsedData.supplier.cnpj}</p>
                        </div>

                        {/* Products List */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                Produtos ({parsedData.products.length})
                            </h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {parsedData.products.map((product, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => toggleProduct(idx)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedProducts.includes(idx)
                                            ? 'border-purple-600 bg-purple-50'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {selectedProducts.includes(idx) ? (
                                                    <CheckCircle className="w-5 h-5 text-purple-600" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">{product.name}</p>
                                                <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                                    <span>NCM: {product.ncm || 'N/A'}</span>
                                                    <span>EAN: {product.barcode || 'N/A'}</span>
                                                    <span>Qtd: {product.quantity}</span>
                                                    <span className="font-bold text-purple-600">
                                                        R$ {product.unitPrice.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setParsedData(null)}
                                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || selectedProducts.length === 0}
                                className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {importing ? 'Importando...' : `Importar ${selectedProducts.length} Produtos`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
