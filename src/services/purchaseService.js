import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { StockService } from "./stockService";
import { CashFlowService } from "./cashFlowService";
import { SupplierService } from "./supplierService";
import { generateReferenceCode } from "../lib/utils";

export const PurchaseService = {
    /**
     * Parses a Brazilian NF-e XML string
     */
    parseNfXML: (xmlString) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            // Check if it's a valid XML
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Erro ao processar XML. Verifique o arquivo.");
            }

            const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
            if (!infNFe) throw new Error("XML não parece ser uma NF-e válida.");

            // Supplier (Emitente)
            const emit = infNFe.getElementsByTagName("emit")[0];
            const supplier = {
                name: emit?.getElementsByTagName("xNome")[0]?.textContent || "Fornecedor Desconhecido",
                cnpj: emit?.getElementsByTagName("CNPJ")[0]?.textContent || "",
                ie: emit?.getElementsByTagName("IE")[0]?.textContent || "",
            };

            // Invoice Info
            const ide = infNFe.getElementsByTagName("ide")[0];
            const invoice = {
                number: ide?.getElementsByTagName("nNF")[0]?.textContent || "",
                series: ide?.getElementsByTagName("serie")[0]?.textContent || "",
                date: ide?.getElementsByTagName("dhEmi")[0]?.textContent || new Date().toISOString(),
            };

            // Products
            const details = infNFe.getElementsByTagName("det");
            const products = [];

            for (let i = 0; i < details.length; i++) {
                const prod = details[i].getElementsByTagName("prod")[0];
                if (!prod) continue;

                products.push({
                    code: prod.getElementsByTagName("cProd")[0]?.textContent || "",
                    name: prod.getElementsByTagName("xProd")[0]?.textContent || "",
                    ncm: prod.getElementsByTagName("NCM")[0]?.textContent || "",
                    quantity: parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0"),
                    unitCost: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0"),
                    totalValue: parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || "0"),
                });
            }

            return { supplier, invoice, products };
        } catch (error) {
            console.error("XML Parsing Error:", error);
            throw error;
        }
    },

    /**
     * Process the import: Add items to stock and optionally create expenses
     */
    importPurchase: async (orgId, userId, purchaseData, options = {}) => {
        const { addToStock = true, createExpense = true, markup = 30 } = options;
        const results = { stockItems: [], expenseId: null, supplierId: null };

        try {
            // 0. Check/Add Supplier
            if (purchaseData.supplier.cnpj) {
                let supplier = await SupplierService.getSupplierByCnpj(orgId, purchaseData.supplier.cnpj);
                if (!supplier) {
                    supplier = await SupplierService.addSupplier(orgId, purchaseData.supplier);
                }
                results.supplierId = supplier.id;
            }

            // 1. Add items to stock
            if (addToStock) {
                for (const prod of purchaseData.products) {
                    const stockItem = {
                        name: prod.name,
                        category: "Importado XML",
                        cost: prod.unitCost,
                        price: prod.unitCost * (1 + (markup / 100)),
                        quantity: prod.quantity,
                        ncm: prod.ncm,
                        brand: purchaseData.supplier.name,
                        details: `Importado via NF-e ${purchaseData.invoice.number}`
                    };
                    await StockService.addItem(orgId, userId, stockItem);
                    results.stockItems.push(prod.name);
                }
            }

            // 2. Create Accounts Payable (Payable) or Expense
            if (createExpense) {
                const totalInvoice = purchaseData.products.reduce((acc, p) => acc + p.totalValue, 0);

                // Track as Payable (Scheduled)
                const payableData = {
                    organizationId: orgId,
                    supplierName: purchaseData.supplier.name,
                    description: `NF-e ${purchaseData.invoice.number} - Importação Automática`,
                    amount: totalInvoice,
                    dueDate: new Date(purchaseData.invoice.date).toISOString().split('T')[0],
                    status: 'pending',
                    category: 'Fornecedores',
                    createdAt: serverTimestamp(),
                    createdBy: userId
                };

                await addDoc(collection(db, 'payables'), payableData);
                // We don't record in financialMovements yet because it's 'pending'
            }

            return results;
        } catch (error) {
            console.error("Import Purchase Error:", error);
            throw error;
        }
    }
};
