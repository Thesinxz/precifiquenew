/**
 * XML Parser for NFe Import
 * Extracts product and supplier data from NFe XML files
 */

export class NFeXMLParser {
    /**
     * Parse NFe XML and extract structured data
     */
    static async parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XML format');
        }

        // Extract supplier (Emitente)
        const supplier = this.extractSupplier(xmlDoc);

        // Extract products (Detalhes)
        const products = this.extractProducts(xmlDoc);

        // Extract totals
        const totals = this.extractTotals(xmlDoc);

        return {
            supplier,
            products,
            totals,
            nfeKey: this.getTextContent(xmlDoc, 'chNFe'),
            nfeNumber: this.getTextContent(xmlDoc, 'nNF'),
            issueDate: this.getTextContent(xmlDoc, 'dhEmi')
        };
    }

    static extractSupplier(xmlDoc) {
        return {
            cnpj: this.getTextContent(xmlDoc, 'emit > CNPJ'),
            name: this.getTextContent(xmlDoc, 'emit > xNome'),
            tradeName: this.getTextContent(xmlDoc, 'emit > xFant'),
            ie: this.getTextContent(xmlDoc, 'emit > IE'),
            address: {
                street: this.getTextContent(xmlDoc, 'enderEmit > xLgr'),
                number: this.getTextContent(xmlDoc, 'enderEmit > nro'),
                neighborhood: this.getTextContent(xmlDoc, 'enderEmit > xBairro'),
                city: this.getTextContent(xmlDoc, 'enderEmit > xMun'),
                state: this.getTextContent(xmlDoc, 'enderEmit > UF'),
                zipCode: this.getTextContent(xmlDoc, 'enderEmit > CEP')
            }
        };
    }

    static extractProducts(xmlDoc) {
        const detElements = xmlDoc.querySelectorAll('det');
        const products = [];

        detElements.forEach((det) => {
            const prod = det.querySelector('prod');
            if (!prod) return;

            products.push({
                code: this.getTextContent(prod, 'cProd'),
                name: this.getTextContent(prod, 'xProd'),
                ncm: this.getTextContent(prod, 'NCM'),
                cest: this.getTextContent(prod, 'CEST'),
                cfop: this.getTextContent(prod, 'CFOP'),
                barcode: this.getTextContent(prod, 'cEAN'),
                unit: this.getTextContent(prod, 'uCom'),
                quantity: parseFloat(this.getTextContent(prod, 'qCom') || '0'),
                unitPrice: parseFloat(this.getTextContent(prod, 'vUnCom') || '0'),
                totalPrice: parseFloat(this.getTextContent(prod, 'vProd') || '0'),
                origin: this.getTextContent(det, 'orig')
            });
        });

        return products;
    }

    static extractTotals(xmlDoc) {
        return {
            totalProducts: parseFloat(this.getTextContent(xmlDoc, 'vProd') || '0'),
            totalNFe: parseFloat(this.getTextContent(xmlDoc, 'vNF') || '0'),
            discount: parseFloat(this.getTextContent(xmlDoc, 'vDesc') || '0')
        };
    }

    static getTextContent(element, selector) {
        const found = element.querySelector(selector);
        return found ? found.textContent.trim() : '';
    }
}
