import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const InvoiceService = {
    /**
     * Emit NFe or NFCe for a sale
     */
    emitInvoice: async (saleId, orgId) => {
        try {
            const emitInvoice = httpsCallable(functions, 'emitInvoice');
            const result = await emitInvoice({ saleId, orgId });
            return result.data;
        } catch (error) {
            console.error('Error emitting invoice:', error);
            throw error;
        }
    }
};
