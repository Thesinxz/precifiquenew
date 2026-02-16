import { useRef, useState } from 'react';
import { X, Printer, Loader2, FileCheck, Image as ImageIcon } from 'lucide-react';
import { PrintingService } from '../../services/printingService';
import { toPng } from 'html-to-image';
import download from 'downloadjs';

export function ThermalLabelModal({ items, settings, type = 'stock', onClose }) {
    const labelRef = useRef(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=800');
        if (!printWindow) return alert("Habilite pop-ups para imprimir.");

        const allLabelsHtml = items.map(i => PrintingService.generateLabelHtml(i, settings, type)).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Etiquetas (${items.length})</title>
                    <style>
                        ${PrintingService.getPrintStyles()}
                    </style>
                </head>
                <body>
                    ${allLabelsHtml}
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                // window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadImage = async () => {
        if (!labelRef.current) return;
        setIsGeneratingImage(true);
        try {
            // We capture the preview node which contains ALL items (or at least the first one if we only show one)
            // But for correctness, we should render ALL items if multiple. 
            // In this UI implementation, I'm rendering a preview of the FIRST item only for the "Preview Box".
            // If the user wants to download ALL, we currently only support the previewed one.
            // PROPOSAL: Render ALL items in the hidden ref container to support full download.

            const dataUrl = await toPng(labelRef.current, { quality: 1.0, pixelRatio: 3, backgroundColor: 'white' });
            download(dataUrl, `etiqueta-${items[0]?.name || 'produto'}.png`);
        } catch (error) {
            console.error("Failed to generate image", error);
            alert("Erro ao gerar imagem.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // Scoped styles for the preview to avoid polluting global scope
    // We strip @page and replace body with .preview-content
    const scopedStyles = PrintingService.getPrintStyles()
        .replace(/@page\s*{[^}]*}/g, '')
        .replace(/body\s*{/g, '.preview-content {')
        // Also ensure width/height are respected in preview
        .replace(/width:\s*50mm/g, 'width: 100%')
        .replace(/height:\s*40mm/g, 'min-height: 40mm');

    const previewHtml = items.length > 0 ? PrintingService.generateLabelHtml(items[0], settings, type) : '';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="p-8 pb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Imprimir Etiquetas</h3>
                        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        {items.length} etiqueta(s) selecionada(s).<br />
                        Otimizado para Impressora Térmica 50mm.
                    </p>
                </div>

                <div className="p-8 bg-slate-50 flex flex-col gap-4">
                    <div className="bg-white border-2 border-slate-200 border-dashed rounded-2xl p-4 text-center overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pré-visualização (1ª Etiqueta)</p>
                        <div className="flex justify-center overflow-auto py-2">
                            {/* The Wrapper for Image Generation */}
                            {/* We use specific width 50mm to match physical size */}
                            <div
                                ref={labelRef}
                                className="preview-content bg-white text-left shadow-sm flex flex-col origin-top"
                                style={{ width: '50mm', height: '40mm', transform: 'scale(1.5)', transformOrigin: 'top center', marginBottom: '20mm' }}
                            >
                                <style>{scopedStyles}</style>
                                {/* We inject the HTML and ensure it uses the scoped class */}
                                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDownloadImage}
                            disabled={isGeneratingImage}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                            Baixar Imagem (Celular)
                        </button>

                        <button
                            onClick={handlePrint}
                            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Printer className="w-5 h-5" />
                            Imprimir Direto
                        </button>

                        <button
                            onClick={() => PrintingService.downloadLabelsPdf(items, settings)}
                            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <FileCheck className="w-5 h-5" />
                            Baixar PDF
                        </button>
                    </div>

                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-wider">
                        Configure seu navegador para margem "Nenhuma"
                    </p>
                </div>
            </div>
        </div>
    );
}
