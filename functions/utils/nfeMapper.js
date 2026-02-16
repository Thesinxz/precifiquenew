/**
 * Helper to map Firestore Data to NFe JSON
 */

const formatPrice = (num) => (num || 0).toFixed(2);
const formatQuantity = (num) => (num || 0).toFixed(4);

/**
 * Maps the Company Data (Emitente)
 */
function mapEmitente(company) {
    return {
        CNPJ: company.cnpj?.replace(/\D/g, '') || '',
        xNome: company.name || '',
        xFant: company.tradeName || company.name || '',
        enderEmit: {
            xLgr: company.address?.street || 'Rua Desconhecida',
            nro: company.address?.number || 'S/N',
            xBairro: company.address?.neighborhood || 'Centro',
            cMun: company.address?.cityCode || '3550308', // Default SP
            xMun: company.address?.city || 'São Paulo',
            UF: company.address?.state || 'SP',
            CEP: company.address?.zipCode?.replace(/\D/g, '') || '00000000',
            cPais: '1058',
            xPais: 'BRASIL',
            fone: company.phone?.replace(/\D/g, '') || ''
        },
        IE: company.ie?.replace(/\D/g, '') || '',
        CRT: company.crt || '1' // 1 = Simples Nacional
    };
}

/**
 * Maps the Products (Detalhes)
 */
function mapProducts(items, environment = 'homologation') {
    return items.map((item, index) => {
        const prod = {
            cProd: item.id.substring(0, 60),
            cEAN: item.barcode || 'SEM GTIN',
            xProd: (environment === 'homologation' ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL - ' : '') + item.name,
            NCM: item.ncm || '00000000', // Critical: Must be valid
            CEST: item.cest || null,
            CFOP: item.cfop || '5102',
            uCom: 'UN',
            qCom: formatQuantity(item.quantity),
            vUnCom: formatPrice(item.unitPrice),
            vProd: formatPrice(item.quantity * item.unitPrice),
            cEANTrib: item.barcode || 'SEM GTIN',
            uTrib: 'UN',
            qTrib: formatQuantity(item.quantity),
            vUnTrib: formatPrice(item.unitPrice),
            indTot: '1', // Compoe valor total da nota
        };

        // Simplified Tax Logic for Simples Nacional (CSOSN 102 - Tributada sem permissão de crédito)
        // In a real app, this should be configurable per product.
        const imposto = {
            ICMS: {
                ICMSSN102: {
                    orig: item.origin || '0',
                    CSOSN: '102'
                }
            },
            PIS: {
                PISOutr: {
                    CST: '99',
                    vBC: '0.00',
                    pPIS: '0.00',
                    vPIS: '0.00'
                }
            },
            COFINS: {
                COFINSOutr: {
                    CST: '99',
                    vBC: '0.00',
                    pCOFINS: '0.00',
                    vCOFINS: '0.00'
                }
            }
        };

        return {
            nItem: index + 1,
            prod,
            imposto
        };
    });
}

/**
 * Maps the Payments (Pagamento)
 */
function mapPayments(payments) {
    // payment types: 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 17=PIX
    const mapType = (t) => {
        const lower = t?.toLowerCase() || '';
        if (lower.includes('pix')) return '17';
        if (lower.includes('credito') || lower.includes('crédito')) return '03';
        if (lower.includes('debito') || lower.includes('débito')) return '04';
        return '01'; // Default Dinheiro
    };

    if (!payments || payments.length === 0) {
        return {
            detPag: [{
                tPag: '01',
                vPag: '0.00'
            }]
        };
    }

    return {
        detPag: payments.map(p => ({
            tPag: mapType(p.method),
            vPag: formatPrice(p.amount)
        }))
    };
}

/**
 * Maps the Customer Data (Destinatario)
 */
function mapDestinatario(customer) {
    if (!customer || !customer.cpf) return null; // NFC-e Anonymous

    const isCNPJ = customer.cpf.length > 14;

    return {
        [isCNPJ ? 'CNPJ' : 'CPF']: customer.cpf.replace(/\D/g, ''),
        xNome: customer.name,
        enderDest: {
            xLgr: customer.street || 'Rua Desconhecida',
            nro: customer.number || 'S/N',
            xBairro: customer.neighborhood || 'Centro',
            cMun: '3550308', // TODO: Need mechanism to find IBGE code from City/State
            xMun: customer.city || 'Sao Paulo',
            UF: customer.state || 'SP',
            CEP: customer.cep?.replace(/\D/g, '') || '00000000',
            cPais: '1058',
            xPais: 'BRASIL',
            fone: customer.phone?.replace(/\D/g, '') || ''
        },
        indIEDest: isCNPJ && customer.ie && customer.ie !== 'ISENTO' ? '1' : '9', // 1=Contributor, 9=Non-Contributor
        IE: isCNPJ && customer.ie && customer.ie !== 'ISENTO' ? customer.ie.replace(/\D/g, '') : undefined,
        email: customer.email || undefined
    };
}

module.exports = { mapEmitente, mapProducts, mapPayments, mapDestinatario };
