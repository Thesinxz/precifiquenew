import { formatCurrency } from "../lib/utils";
import jsPDF from 'jspdf';

export const PrintingService = {
    /**
     * Generates a downloadable PDF for thermal labels (50x40mm)
     * effectively solving browser printing scaling issues.
     */

    // FULL IMPLEMENTATION REPLACING THE STUB ABOVE
    downloadLabelsPdf: async (items, settings) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [50, 40]
        });

        const width = 50;
        const height = 40;
        const margin = 2;
        const workableWidth = width - (margin * 2);

        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            if (index > 0) doc.addPage();

            // 1. Outer Border
            doc.setLineWidth(0.5);
            doc.rect(margin, margin, workableWidth, height - (margin * 2));

            // 2. Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            const title = (item.name || "").toUpperCase().slice(0, 25);
            doc.text(title, width / 2, margin + 4, { align: 'center' });

            // Line under title
            doc.setLineWidth(0.2);
            doc.line(margin, margin + 5, width - margin, margin + 5);

            // 3. QR Code (Center) - FETCHING REAL QR
            try {
                const baseUrl = window.location.origin;
                const orgId = settings?.organizationId || item.organizationId;
                const catalogUrl = `${baseUrl}/?c=${orgId}&product=${item.id}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(catalogUrl)}&margin=0`;

                // Helper to load image in jsPDF
                const img = await new Promise((resolve) => {
                    const i = new Image();
                    i.crossOrigin = "anonymous";
                    i.src = qrUrl;
                    i.onload = () => resolve(i);
                    i.onerror = () => resolve(null);
                });

                if (img) {
                    doc.addImage(img, 'PNG', (width / 2) - 6, margin + 6, 12, 12);
                }
            } catch (e) {
                console.warn("QR generation failed for PDF", e);
            }

            doc.setFontSize(5);
            doc.text("CS-" + item.id.slice(0, 4).toUpperCase(), width / 2, margin + 19, { align: 'center' });

            // 4. Specs Grid
            const yGrid1 = margin + 20;
            const rowHeight = 7;

            doc.setLineWidth(0.1);
            doc.line(margin, yGrid1, width - margin, yGrid1);
            const colW = workableWidth / 3;
            doc.line(margin + colW, yGrid1, margin + colW, yGrid1 + rowHeight);
            doc.line(margin + (colW * 2), yGrid1, margin + (colW * 2), yGrid1 + rowHeight);

            doc.setFontSize(4);
            doc.text("CAP", margin + 1, yGrid1 + 2);
            doc.text("COR", margin + colW + 1, yGrid1 + 2);
            doc.text("BAT", margin + (colW * 2) + 1, yGrid1 + 2);

            doc.setFontSize(6);
            const storage = (item.storage || "-").toUpperCase().slice(0, 6);
            const color = (item.color || "-").toUpperCase().slice(0, 6);
            const bat = item.batteryHealth ? item.batteryHealth + "%" : "-";
            doc.text(storage, margin + 1, yGrid1 + 5);
            doc.text(color, margin + colW + 1, yGrid1 + 5);
            doc.text(bat, margin + (colW * 2) + 1, yGrid1 + 5);

            // Row 2: Condition | Status
            const yGrid2 = yGrid1 + rowHeight;
            doc.line(margin, yGrid2, width - margin, yGrid2);
            doc.line(margin + colW, yGrid2, margin + colW, yGrid2 + rowHeight);
            doc.setFontSize(4);
            doc.text("COND", margin + 1, yGrid2 + 2);
            doc.text("IMEI", margin + colW + 1, yGrid2 + 2);
            doc.setFontSize(6);
            doc.text((item.condition || "-").toUpperCase().slice(0, 8), margin + 1, yGrid2 + 5);
            doc.text((item.imeis?.[0] || item.imei || "N/A").slice(-8), margin + colW + 1, yGrid2 + 5);

            // Row 3: Prices
            const yGrid3 = yGrid2 + rowHeight;
            doc.setFillColor(0, 0, 0);
            doc.rect(margin, yGrid3, workableWidth, rowHeight + 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.line(width / 2, yGrid3, width / 2, yGrid3 + rowHeight + 2);

            const pixPrice = parseFloat(item.price || item.cost || 0);
            doc.setFontSize(4.5);
            doc.text("PIX: " + formatCurrency(pixPrice), margin + 2, yGrid3 + 5);
            doc.text("12X: " + formatCurrency(pixPrice * 1.15), (width / 2) + 2, yGrid3 + 5);

            doc.setTextColor(0, 0, 0);
        }

        doc.save(`Etiquetas_${items.length}_un.pdf`);
    },

    /**
     * Generates HTML for a thermal label optimized for 58mm printers.
     * ... existing code ...
     */
    generateLabelHtml: (item, settings, type = 'stock') => {
        if (type === 'stock') {
            return PrintingService._generateStockLabel(item, settings);
        } else if (type === 'tech_lab') {
            return PrintingService._generateTechLabel(item);
        } else if (type === 'tech_receipt') {
            return PrintingService._generateTechReceipt(item, settings);
        }
        return '';
    },

    _generateStockLabel: (item, settings) => {
        // Pricing Logic
        const category = settings?.categories?.find(c => c.name === item.category) || settings?.categories?.[0];
        const gateway = settings?.financial?.gateways?.find(g => g.id === category?.gatewayId) || settings?.financial?.gateways?.[0];

        const calculateInstallmentTotal = (basePrice, numInstallments) => {
            if (!gateway) return basePrice;
            const rates = gateway?.rates || {};
            const pixRate = parseFloat(rates.pix || 0);
            const nfRate = (category?.requiresNotaFiscal || category?.requiresNf) ? (parseFloat(settings?.financial?.notaFiscalRate) || 0) : 0;
            const rateKey = `credit${numInstallments}x`;
            const targetRate = parseFloat(rates[rateKey] || 0);

            const totalPixLoad = (pixRate + nfRate) / 100;
            const baseReceiveAmount = basePrice * (1 - totalPixLoad);
            const totalTargetLoad = (targetRate + nfRate) / 100;

            if (totalTargetLoad < 1) return baseReceiveAmount / (1 - totalTargetLoad);
            return basePrice * (1 + (targetRate / 100));
        };

        const pixPrice = parseFloat(item.price || item.cost || 0);
        const price12x = calculateInstallmentTotal(pixPrice, 12) / 12;

        const baseUrl = window.location.origin;
        // Construct URL for the product page (Root path + query params)
        const orgId = settings?.organizationId || item.organizationId;
        const catalogUrl = `${baseUrl}/?c=${orgId}&product=${item.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(catalogUrl)}&margin=0`;

        // Prepare Data Fields
        const model = item.name || 'Produto Sem Nome';
        const storage = item.storage || '-';
        const color = item.color || '-';
        const battery = item.batteryHealth ? `${item.batteryHealth}%` : '-';
        const condition = item.condition || '-';

        return `
            <div class="label-container">
                <!-- Header with Title -->
                <div class="product-title">
                    ${model}
                </div>

                <!-- Top QR Code (Direct Link) -->
                <div class="top-qr">
                    <img src="${qrUrl}" alt="QR Code" />
                    <span>SCAN ME</span>
                </div>

                <!-- Info Grid -->
                <div class="info-grid">
                    <!-- Row 1: Specs -->
                    <div class="grid-row">
                        <div class="grid-cell">
                            <span class="cell-label">Capacidade</span>
                            <span class="cell-value">${storage}</span>
                        </div>
                        <div class="grid-cell" style="flex: 1.5;">
                            <span class="cell-label">Cor</span>
                            <span class="cell-value">${color}</span>
                        </div>
                        <div class="grid-cell">
                            <span class="cell-label">Saúde Bat.</span>
                            <span class="cell-value">${battery}</span>
                        </div>
                    </div>

                    <!-- Row 2: Condition & Status -->
                    <div class="grid-row">
                         <div class="grid-cell">
                            <span class="cell-label">Condição</span>
                            <span class="cell-value">${condition}</span>
                        </div>
                        <div class="grid-cell" style="flex: 2;">
                            <span class="cell-label">Status</span>
                            <span class="cell-value">APROVADO</span>
                        </div>
                    </div>

                    <!-- Row 3: Prices (High Contrast) -->
                    <div class="grid-row price-row">
                        <div class="grid-cell" style="border-right: 1px solid #fff;">
                            <span class="cell-label" style="color:#fff;">Valor Pix</span>
                            <span class="cell-value" style="font-size:11px;">${formatCurrency(pixPrice)}</span>
                        </div>
                        <div class="grid-cell">
                            <span class="cell-label" style="color:#fff;">12x Cartão</span>
                            <span class="cell-value" style="font-size:11px;">${formatCurrency(price12x)}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer / ID -->
                <div class="footer">
                    <div class="footer-info">
                        <strong>RE-ID:</strong> ${item.id.slice(0, 8).toUpperCase()}<br/>
                        <span style="font-size: 6px;">${new Date().toLocaleDateString()}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 8px; font-weight: bold;">IMEI: ${item.imei || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    },

    _generateTechLabel: (item) => {
        const dateStr = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
        const barcodeText = item.id || '0000';
        const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${barcodeText}&scale=3&height=30&incltext=0`;

        return `
            <div class="label-container" style="border-style: dashed;">
                <div class="product-title">REQ. TÉCNICA #${item.id?.slice(-4)}</div>
                
                <div class="info-grid" style="border-top: 2px solid #000;">
                    <div class="grid-row">
                        <div class="grid-cell" style="flex: 2;">
                            <span class="cell-label">Modelo</span>
                            <span class="cell-value" style="font-size: 8px;">${item.model}</span>
                        </div>
                        <div class="grid-cell">
                            <span class="cell-label">Data</span>
                            <span class="cell-value">${dateStr}</span>
                        </div>
                    </div>
                     <div class="grid-row">
                        <div class="grid-cell">
                            <span class="cell-label">Cliente</span>
                            <span class="cell-value" style="font-size: 8px;">${item.ownerName?.slice(0, 15) || 'Balcão'}</span>
                        </div>
                    </div>
                </div>

                <div class="top-barcode" style="border-bottom: none; border-top: 2px solid #000; margin-top: auto;">
                    <img src="${barcodeUrl}" />
                    <span>${item.id}</span>
                </div>
            </div>
         `;
    },

    _generateTechReceipt: (item, settings) => {
        const dateStr = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
        const storeName = settings?.company?.name || settings?.storeName || "ASSISTÊNCIA TÉCNICA";

        const accessoriesIn = item.accessoriesIn?.join(', ') || 'Nenhum';
        const accessoriesOut = item.accessoriesOut?.join(', ') || 'Nenhum';
        const totals = item.totals || { finalTotal: 0, prePaymentTotal: 0, remainingTotal: 0 };

        return `
            <div class="receipt-container os-receipt">
                <div style="text-align:center; margin-bottom: 10px;">
                    <h2 style="margin:0; font-size:16px;">${storeName.toUpperCase()}</h2>
                    <p style="margin:2px 0; font-size:10px;">ORDEM DE SERVIÇO</p>
                    <p style="margin:0; font-size:14px; font-weight: 900;">#${item.osNumber || '---'}</p>
                    <p style="margin:0; font-size:9px;">${dateStr}</p>
                </div>

                <div class="border-t py-1">
                    <p style="margin:2px 0; font-size:11px;"><strong>CLIENTE:</strong> ${item.ownerName || 'Balcão'}</p>
                    <p style="margin:2px 0; font-size:11px;"><strong>FONE:</strong> ${item.ownerPhone || '-'}</p>
                </div>

                <div class="border-t py-1">
                    <p style="margin:2px 0; font-size:11px;"><strong>EQUIPAMENTO:</strong> ${item.brand} ${item.model}</p>
                    ${item.serialNumber ? `<p style="margin:2px 0; font-size:11px;"><strong>SN/IMEI:</strong> ${item.serialNumber}</p>` : ''}
                    <p style="margin:2px 0; font-size:11px;"><strong>SENHA:</strong> ${item.passwordType === 'pattern' ? '[PADRÃO DESENHADO]' : (item.password || 'Nenhuma')}</p>
                </div>

                <div class="border-t py-1">
                    <p style="margin:2px 0; font-size:11px;"><strong>PROBLEMA RELATADO:</strong></p>
                    <p style="margin:2px 0; font-size:10px; font-weight: 500;">${item.problem || 'Nenhuma observação.'}</p>
                    <p style="margin:2px 0; font-size:10px;"><strong>FICOU NA LOJA:</strong> ${accessoriesIn}</p>
                    <p style="margin:2px 0; font-size:10px;"><strong>ENTREGUE AO CLIENTE:</strong> ${accessoriesOut}</p>
                </div>

                <div class="border-t py-1">
                    <div style="display:flex; justify-content:space-between; font-size:10px;">
                        <span>ORÇAMENTO:</span>
                        <span>${formatCurrency(totals.finalTotal)}</span>
                    </div>
                    ${totals.prePaymentTotal > 0 ? `
                        <div style="display:flex; justify-content:space-between; font-size:10px;">
                            <span>ADIANTAMENTO:</span>
                            <span>-${formatCurrency(totals.prePaymentTotal)}</span>
                        </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:13px; font-weight: 900; margin-top: 4px;">
                        <span>SALDO A PAGAR:</span>
                        <span>${formatCurrency(totals.remainingTotal)}</span>
                    </div>
                </div>

                <div style="margin-top: 25px; border-top: 1px solid black; text-align:center; padding-top: 5px;">
                    <p style="font-size:9px; font-weight: 700;">ASSINATURA DO CLIENTE</p>
                </div>

                <div style="margin-top: 15px; text-align:center; font-size:8px; font-weight: 500;">
                    <p>Prazo Médio: ${item.estimatedWait || 60} min.<br/>
                    A garantia é de 90 dias apenas para o serviço realizado.<br/>
                    O não cumprimento do prazo de retirada em 90 dias após a finalização implica em abandono do equipamento conforme o Código Civil.</p>
                </div>

                <div class="text-center" style="margin-top: 10px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=OS_${item.id}" style="width: 40px; height: 40px;" />
                    <p style="font-size: 7px; margin: 0;">Acompanhe em nosso site</p>
                </div>
            </div>
        `;
    },

    getPrintStyles: (type = 'label') => {
        const isReceipt = type === 'receipt' || type === 'tech_receipt';

        // CSS rules
        const pageSize = isReceipt ? '72mm auto' : '50mm 40mm'; // 72mm is safer for 80mm printers
        const bodyWidth = isReceipt ? '100%' : '50mm';
        const bodyHeight = isReceipt ? 'auto' : '40mm';

        return `
            @page { 
                size: ${pageSize}; 
                margin: 0mm; 
            }
            body { 
                margin: 0; 
                padding: 0;
                font-family: Arial, Helvetica, sans-serif; 
                font-weight: 900;
                -webkit-print-color-adjust: exact;
                background-color: white;
                width: ${bodyWidth};
                height: ${bodyHeight};
            }
            .label-container {
                width: 100%; 
                height: 100%;
                display: flex;
                flex-direction: column;
                margin: 0;
                padding: 1mm;
                box-sizing: border-box;
                color: #000;
                page-break-after: always;
                break-inside: avoid;
                border: none;
                overflow: hidden;
            }
            .receipt-container {
                width: 78mm; /* 80mm printer paper usually has ~72-78mm printable area */
                margin: 0 auto;
                padding: 10px 5px;
                box-sizing: border-box;
                color: #000;
                font-size: 12px;
                line-height: 1.2;
            }
            .os-receipt p { margin: 4px 0; }
            .os-receipt strong { font-weight: 900; }
            
            /* Top QR Section */
            .top-qr {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4px 0 2px 0;
                border-bottom: 2px solid #000;
                background: #fff;
            }
            .top-qr img { 
                height: 18mm; 
                width: 18mm; 
                object-fit: contain;
                image-rendering: pixelated; 
            }
            .top-qr span {
                font-size: 8px;
                letter-spacing: 1px;
                margin-top: 1px;
                font-weight: 800;
            }

            /* Product Title */
            .product-title {
                padding: 4px;
                text-align: center;
                font-size: 9px; /* Reduced for 50mm */
                line-height: 1.1;
                font-weight: 900;
                border-bottom: 2px solid #000;
                text-transform: uppercase;
            }

            /* The Grid */
            .info-grid {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .grid-row {
                display: flex;
                width: 100%;
                border-bottom: 1px solid #000;
            }
            .grid-row:last-child {
                border-bottom: none;
            }
            .grid-cell {
                flex: 1;
                padding: 3px 4px;
                border-right: 1px solid #000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                font-size: 8px;
                overflow: hidden;
            }
            .grid-cell:last-child {
                border-right: none;
            }

            /* Specific Cell Styles */
            .cell-label {
                font-size: 6px;
                color: #000;
                text-transform: uppercase;
                margin-bottom: 1px;
                font-weight: 800;
            }
            .cell-value {
                font-size: 8px; /* Reduced for 50mm */
                font-weight: 900;
                white-space: nowrap;
                text-transform: uppercase;
                color: #000;
            }
            
            /* Price Row Special */
            .price-row {
                background: #000;
                color: #fff;
            }
            .price-row .grid-cell {
                border-right: 1px solid #fff;
                align-items: center;
            }
            .price-row .cell-label { color: #fff; }
            .price-row .cell-value { font-size: 10px; color: #fff; }

            /* Bottom Footer */
            .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                padding: 4px;
                border-top: 2px solid #000;
            }
            .footer-info {
                font-size: 7px;
                line-height: 1.2;
            }
            .footer-qr img {
                width: 12mm;
                height: 12mm;
            }

            /* Receipt Specific Utility Classes */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-t { border-top: 1px dashed #000; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .mt-2 { margin-top: 8px; }
            
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 2px 0; vertical-align: top; }
            
            /* Utils */
            *{ -webkit-font-smoothing: none; }
        `;
    },

    printThermalReceipt: (sale, settings) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (!printWindow) return;

        const htmlContent = PrintingService._generateReceiptHtml(sale, settings);
        const styles = PrintingService.getPrintStyles('receipt');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Cupom</title>
                    <style>${styles}</style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = () => {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    _generateReceiptHtml: (sale, settings) => {
        const company = settings?.company || {};
        const safeDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : (sale.createdAt ? new Date(sale.createdAt) : new Date());
        const formattedDate = safeDate.toLocaleDateString('pt-BR') + ' ' + safeDate.toLocaleTimeString('pt-BR');

        const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        const itemsRows = sale.items.map(item => {
            // Check for iPhone/Device specific fields
            // The item object in sale.items usually carries simplified data. 
            // We rely on what was saved during the sale. 
            // If the schema saves 'variant' or direct props, we use them.

            const variant = item.variant || {};
            const isDevice = item.category?.toLowerCase().includes('iphone') || item.category?.toLowerCase().includes('celular') || item.imei;

            let detailsHtml = '';

            // Try to extract details from either item root or variant object
            const imei = item.imei || variant.imei;
            const battery = item.batteryHealth || variant.batteryHealth;
            const condition = item.condition || variant.condition;
            const color = item.color || variant.color;
            const storage = item.storage || variant.storage;

            if (isDevice || imei) {
                detailsHtml = `
                <div style="font-size: 9px; color: #333; margin-top: 2px;">
                    ${storage ? `<span>${storage}</span> • ` : ''}
                    ${color ? `<span>${color}</span>` : ''}
                    ${condition ? `<br/>Cond: ${condition}` : ''}
                    ${battery ? ` • Bat: ${battery}%` : ''}
                    ${imei ? `<br/>IMEI: ${imei}` : ''}
                </div>`;
            }

            return `
            <tr>
                <td colspan="3" class="uppercase font-bold pt-2">
                    ${item.name}
                    ${detailsHtml}
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 4px;">${item.quantity} x ${formatMoney(item.price)}</td>
                <td class="text-right font-bold" style="padding-bottom: 4px;">${formatMoney(item.price * item.quantity)}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #ccc;"><td></td><td></td></tr>
        `;
        }).join('');

        const paymentsRows = sale.paymentEntries.map(p => {
            let methodLabel = p.method === 'pix' ? 'PIX/DINHEIRO' : p.method === 'credit' ? `CARTÃO` : 'OUTRO';
            let installmentInfo = '';

            if (p.method === 'credit' && p.installments > 1) {
                const instValue = p.amount / p.installments;
                installmentInfo = `<br/><span style="font-size:9px;">(${p.installments}x de ${formatMoney(instValue)})</span>`;
            }

            return `
            <tr>
                <td class="uppercase" style="padding: 2px 0;">${methodLabel}${installmentInfo}</td>
                <td class="text-right" style="padding: 2px 0;">${formatMoney(p.amount)}</td>
            </tr>
        `;
        }).join('');

        let logoHtml = '';
        if (company.logo || company.logoUrl) {
            logoHtml = `<div class="text-center mb-2"><img src="${company.logo || company.logoUrl}" style="max-width: 60%; max-height: 50px; object-fit: contain;" /></div>`;
        }

        return `
            <div class="receipt-container">
                <div class="text-center mb-1">
                    ${logoHtml}
                    <h2 style="margin:0; font-size:16px;">${company.name?.toUpperCase() || 'SUA LOJA'}</h2>
                    <p style="margin:2px 0; font-size:10px;">${company.address || 'Produtos Apple & Tech'}</p>
                    <p style="margin:2px 0; font-size:10px;">${company.phone || ''}</p>
                </div>
                
                <div class="border-b py-1 mb-1 text-center">
                    <span class="font-bold">COMPROVANTE DE VENDA</span>
                </div>

                <div class="mb-1">
                    Data: ${formattedDate}<br/>
                    Venda: <strong>#${sale.code || '---'}</strong><br/>
                    Vendedor: ${sale.sellerName || '---'}
                </div>

                <div class="border-b mb-1"></div>
                
                <div class="mb-1">
                    <strong>CLIENTE</strong><br/>
                    ${sale.client?.name || 'Consumidor Final'}<br/>
                    ${sale.client?.cpf ? `CPF: ${sale.client.cpf}<br/>` : ''}
                    ${sale.client?.phone ? `Tel: ${sale.client.phone}` : ''}
                </div>

                <div class="border-b mb-1"></div>

                <table class="mb-1">
                    ${itemsRows}
                </table>

                <div class="border-t py-1 mt-2">
                    <div style="display:flex; justify-content:space-between;">
                        <span>SUBTOTAL</span>
                        <span>${formatMoney(sale.subtotal)}</span>
                    </div>
                    ${sale.discount > 0 ? `
                    <div style="display:flex; justify-content:space-between;">
                        <span>DESCONTOS</span>
                        <span>- ${formatMoney(sale.discount)}</span>
                    </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:14px; font-weight:bold;">
                        <span>TOTAL</span>
                        <span>${formatMoney(sale.total)}</span>
                    </div>
                </div>

                <div class="border-b mb-1"></div>
                
                <div class="py-1">
                    <div style="font-weight:bold; margin-bottom:4px;">FORMA DE PAGAMENTO</div>
                    <table>
                        ${paymentsRows}
                    </table>
                </div>

                <div class="border-t py-2 text-center mt-2">
                    <p style="font-size:10px; margin:0;">
                         <strong>Termos de Garantia:</strong><br/>
                         90 dias de garantia legal para defeitos de fabricação.
                         A garantia não cobre danos físicos, líquidos ou mau uso.
                         Trocas somente com este cupom fiscal em até 7 dias.
                    </p>
                </div>
                <div class="text-center" style="margin-top:10px;">
                    <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${sale.code || '000'}&scale=2&height=20&incltext=0" style="width:80%;" />
                </div>
            </div>
        `;
    },

    printOSThermal: (os, settings) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (!printWindow) return;

        const htmlContent = PrintingService._generateTechReceipt(os, settings);
        const styles = PrintingService.getPrintStyles('tech_receipt');

        printWindow.document.write(`
            <html>
                <head>
                    <title>OS #${os.osNumber}</title>
                    <style>${styles}</style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = () => {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    _generateTechReceipt: (os, settings) => {
        const dateStr = os.createdAt ? new Date(os.createdAt.seconds * 1000).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
        const company = settings?.company || {};
        const storeName = company.name || settings?.storeName || "ASSISTÊNCIA TÉCNICA";

        const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        const totals = os.totals || { finalTotal: 0, prePaymentTotal: 0, remainingTotal: 0 };
        const subtotal = (os.parts?.reduce((acc, p) => acc + (Number(p.price) || 0), 0) || 0) + (Number(os.laborValue) || 0);
        const finalTotal = subtotal - (Number(os.discount) || 0);
        const remaining = finalTotal - (Number(os.prePayment) || 0);

        const accessories = os.accessoriesIn?.length > 0 ? os.accessoriesIn.join(', ') : 'Nenhum';
        const hasPassword = !!(os.password || (os.passwordType && os.passwordType !== 'none'));

        return `
            <div class="receipt-container os-receipt">
                <div style="text-align:center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
                    <h2 style="margin:0; font-size:18px; font-weight: 900;">${storeName.toUpperCase()}</h2>
                    <p style="margin:2px 0; font-size:10px;">${company.cnpj ? `CNPJ: ${company.cnpj}` : ''}</p>
                    <p style="margin:2px 0; font-size:10px;">${company.address || ''}</p>
                    <p style="margin:2px 0; font-size:10px;">${company.phone || ''}</p>
                </div>

                <div style="text-align:center; margin-bottom: 15px;">
                    <p style="margin:0; font-size:11px; font-weight: 700; color: #666;">ORDEM DE SERVIÇO</p>
                    <h1 style="margin:0; font-size:24px; font-weight: 900;">#${os.osNumber}</h1>
                    <p style="margin:0; font-size:10px;">Entrada: ${dateStr}</p>
                </div>

                <div class="border-t py-2">
                    <p><strong>CLIENTE:</strong> ${os.ownerName || 'Balcão'}</p>
                    <p><strong>FONE:</strong> ${os.ownerPhone || '-'}</p>
                </div>

                <div class="border-t py-2">
                    <p><strong>APARELHO:</strong> ${os.brand} ${os.model}</p>
                    <p><strong>SÉRIE/IMEI:</strong> ${os.serialNumber || os.imei || 'N/I'}</p>
                    <p><strong>COR:</strong> ${os.color || 'N/I'}</p>
                    <p><strong>SENHA:</strong> ${hasPassword ? 'SIM' : 'NÃO'}</p>
                </div>

                <div class="border-t py-2">
                    <p style="margin-bottom: 2px;"><strong>RELATO:</strong></p>
                    <p style="font-size:10px; line-height: 1.4;">${os.problem || 'Nenhum relato específico.'}</p>
                </div>

                <div class="border-t py-2">
                    <p><strong>ACESSÓRIOS:</strong> ${accessories}</p>
                </div>

                <div class="border-t py-2" style="background: #f9f9f9; padding: 10px 5px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px;">
                        <span>ORÇAMENTO:</span>
                        <span>${formatCurrency(finalTotal)}</span>
                    </div>
                    ${Number(os.prePayment) > 0 ? `
                        <div style="display:flex; justify-content:space-between; font-size:11px; color: #d00;">
                            <span>ADIANTAMENTO:</span>
                            <span>-${formatCurrency(Number(os.prePayment))}</span>
                        </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:15px; font-weight: 900; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;">
                        <span>A PAGAR:</span>
                        <span>${formatCurrency(remaining)}</span>
                    </div>
                </div>

                <div style="margin-top: 25px; text-align:center;">
                    <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto 5px;"></div>
                    <p style="font-size:10px; font-weight: 700;">ASSINATURA DO CLIENTE</p>
                </div>

                <div style="margin-top: 20px; text-align:center; padding: 10px; border: 1px dashed #ccc; border-radius: 5px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OS_${os.id}" style="width: 80px; height: 80px;" />
                    <p style="font-size: 9px; margin: 5px 0 0; font-weight: bold;">Acompanhe o status pelo QR Code</p>
                </div>

                <div style="margin-top: 15px; font-size:8px; line-height: 1.3; color: #555; text-align: justify;">
                    <p><strong>GARANTIA:</strong> 90 dias apenas para o serviço realizado.<br/>
                    <strong>DADOS:</strong> Não nos responsabilizamos por perda de arquivos ou dados.<br/>
                    <strong>ABANDONO:</strong> Equipamentos não retirados em 90 dias após aviso de conclusão serão considerados abandonados conforme Art. 1.275 do Cód. Civil.</p>
                </div>
            </div>
        `;
    },

    printOSA4: async (os, settings) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const storeName = settings?.company?.name || settings?.storeName || "ASSISTÊNCIA TÉCNICA";
        const company = settings?.company || {};
        const dateStr = os.createdAt ? new Date(os.createdAt.seconds * 1000).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

        const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        // Layout Constants
        const marginX = 15;
        let currentY = 15;

        // 1. Header & Logo
        doc.setFillColor(79, 70, 229); // Indigo
        doc.rect(marginX, currentY, 5, 20, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text(storeName.toUpperCase(), marginX + 8, currentY + 7);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${company.cnpj ? `CNPJ: ${company.cnpj} | ` : ''}${company.address || ''}`, marginX + 8, currentY + 12);
        doc.text(`${company.phone || ''} | ${company.email || ''}`, marginX + 8, currentY + 16);

        // OS Box (Top Right)
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(140, currentY, 55, 20, 2, 2, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("ORDEM DE SERVIÇO", 152, currentY + 5);
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.text(`#${os.osNumber}`, 154, currentY + 13);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(dateStr, 150, currentY + 17);

        currentY += 30;

        // 2. Sections - Client & Equipment
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, currentY, 195, currentY);
        currentY += 8;

        // Client Column
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("DADOS DO CLIENTE", marginX, currentY);
        currentY += 5;
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`NOME: ${os.ownerName || '---'}`, marginX, currentY);
        doc.text(`FONE: ${os.ownerPhone || '---'}`, marginX, currentY + 5);
        doc.text(`EMAIL: ${os.ownerEmail || '---'}`, marginX, currentY + 10);

        // Equipment Column (Split)
        let equipmentX = 110;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("DADOS DO EQUIPAMENTO", equipmentX, currentY - 5);
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`${os.brand} ${os.model}`, equipmentX, currentY);
        doc.setFontSize(8);
        doc.text(`SÉRIE/IMEI: ${os.serialNumber || os.imei || 'N/I'}`, equipmentX, currentY + 5);
        doc.text(`COR: ${os.color || '---'}`, equipmentX, currentY + 10);

        currentY += 20;

        // 3. Security & Accessories
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, currentY, 195, currentY);
        currentY += 8;

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("SEGURANÇA E ACESSÓRIOS", marginX, currentY);
        currentY += 6;

        const hasPassword = !!(os.password || (os.passwordType && os.passwordType !== 'none'));
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("Senha informada:", marginX, currentY);
        doc.setFont("helvetica", "bold");
        doc.text(hasPassword ? "SIM" : "NÃO", marginX + 30, currentY);
        doc.setFont("helvetica", "normal");

        if (!hasPassword) {
            doc.setFontSize(8);
            doc.setTextColor(239, 68, 68); // Red
            const securityText = "O cliente optou por não informar a senha. Dessa forma, não foi possível testar o equipamento quanto a outros possíveis defeitos.";
            doc.text(securityText, marginX, currentY + 5);
            currentY += 8;
        } else if (os.password) {
            doc.text(`Chave: ${os.password}`, marginX + 50, currentY);
        }

        currentY += 6;
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`Acessórios entregues: ${os.accessoriesIn?.join(', ') || 'Nenhum'}`, marginX, currentY);

        currentY += 12;

        // 4. Relato do Cliente & Danos
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, currentY, 195, currentY);
        currentY += 8;

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("RECLAMAÇÃO DO CLIENTE", marginX, currentY);
        currentY += 6;
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const problemLines = doc.splitTextToSize(os.problem || "Nenhum relato específico.", 180);
        doc.text(problemLines, marginX, currentY);
        currentY += (problemLines.length * 5) + 5;

        if (os.visualDamages?.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("AVARIAS / DANOS VISUAIS IDENTIFICADOS", marginX, currentY);
            currentY += 6;
            doc.setFontSize(9);
            doc.setTextColor(239, 68, 68);
            doc.text(os.visualDamages.join(' • '), marginX, currentY);
            currentY += 10;
        }

        // 5. Orçamento
        currentY = Math.max(currentY, 160);
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(marginX, currentY, 180, 45, 2, 2, 'FD');
        currentY += 8;

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("DETALHAMENTO FINANCEIRO", marginX + 10, currentY);
        currentY += 8;

        const partsTotal = os.parts?.reduce((acc, p) => acc + (Number(p.price) || 0), 0) || 0;
        const labor = Number(os.laborValue) || 0;
        const discount = Number(os.discount) || 0;
        const total = partsTotal + labor - discount;
        const remaining = total - (Number(os.prePayment) || 0);

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Total em Peças/Serviços:", marginX + 10, currentY);
        doc.text(formatCurrency(partsTotal), 185, currentY, { align: 'right' });
        doc.text("Mão de Obra:", marginX + 10, currentY + 5);
        doc.text(formatCurrency(labor), 185, currentY + 5, { align: 'right' });

        if (discount > 0) {
            doc.text("Desconto concedido:", marginX + 10, currentY + 10);
            doc.setTextColor(239, 68, 68);
            doc.text(`-${formatCurrency(discount)}`, 185, currentY + 10, { align: 'right' });
            doc.setTextColor(71, 85, 105);
        }

        currentY += 22;
        doc.setFillColor(238, 242, 255);
        doc.rect(marginX + 5, currentY - 5, 170, 10, 'F');
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("TOTAL A PAGAR:", marginX + 10, currentY + 2);
        doc.text(formatCurrency(remaining), 185, currentY + 2, { align: 'right' });
        doc.setFont("helvetica", "normal");

        // 6. QR Code & Acompanhamento
        currentY += 20;
        try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OS_${os.id}`;
            const img = await new Promise(resolve => {
                const i = new Image();
                i.crossOrigin = "anonymous";
                i.src = qrUrl;
                i.onload = () => resolve(i);
                i.onerror = () => resolve(null);
            });
            if (img) {
                doc.addImage(img, 'PNG', 165, currentY, 25, 25);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text("ACOMPANHE O STATUS", 130, currentY + 10, { align: 'right' });
                doc.text("Escaneie o código ao lado", 130, currentY + 14, { align: 'right' });
            }
        } catch (e) { }

        // 7. Terms & Conditions
        currentY = 245;
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const terms = [
            "TERMOS E CONDIÇÕES:",
            "• GARANTIA: 90 dias a partir da data de retirada, exclusivamente para o serviço/peça descrita nesta OS.",
            "• DADOS: A loja não se responsabiliza por perda de dados. O backup é de inteira responsabilidade do cliente.",
            "• ABANDONO: Equipamentos não retirados em 90 dias após o aviso de conclusão serão considerados abandonados (Lei 10.406/02).",
            "• MAU USO: Sinais de queda, contato com líquido ou abertura por terceiros invalidam qualquer garantia."
        ];
        doc.text(terms, marginX, currentY);

        // 8. Signatures
        currentY = 280;
        doc.setDrawColor(203, 213, 225);
        doc.line(marginX, currentY, 80, currentY);
        doc.line(115, currentY, 195, currentY);
        doc.setFontSize(7);
        doc.text("ASSINATURA DO CLIENTE", marginX + 18, currentY + 4);
        doc.text("ASSISTÊNCIA TÉCNICA", 140, currentY + 4);
        doc.text(dateStr, 105, currentY + 4, { align: 'center' });

        doc.save(`OS_${os.osNumber}_${os.ownerName?.replace(/\s+/g, '_')}.pdf`);
    },

    whatsappShare: (os, settings) => {
        const storeName = settings?.company?.name || settings?.storeName || "nossa loja";
        const phone = os.ownerPhone?.replace(/\D/g, '');
        if (!phone) return;

        const message = encodeURIComponent(
            `Olá ${os.ownerName}! 🛠️\n\n` +
            `Sua Ordem de Serviço *#${os.osNumber}* foi aberta com sucesso na *${storeName}*.\n\n` +
            `*Equipamento:* ${os.brand} ${os.model}\n` +
            `*Status:* ${os.status}\n` +
            `*Previsão:* ~${os.estimatedWait || 60} min.\n\n` +
            `Qualquer dúvida, estamos à disposição!`
        );

        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
};
