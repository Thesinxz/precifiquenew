import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    doc,
    runTransaction,
    orderBy
} from "firebase/firestore";
import { generateReferenceCode } from "../lib/utils";

const COLLECTION = "sales";

export const SalesService = {
    /**
     * Registers a new sale, updates stock, and records transaction.
     * @param {string} userId - User ID
     * @param {string} orgId - Organization ID
     * @param {Object} saleData - { client, items, total, ... }
     */
    createSale: async (userId, orgId, saleData) => {
        if (!orgId) throw new Error("Organization ID required");

        try {
            let createdSaleId = null;
            await runTransaction(db, async (transaction) => {
                console.log("DEBUG TRANSACTION: Started");
                // 1. Calculate Finances if not provided
                let totalCost = saleData.totalCost;
                let feeAmount = saleData.feeAmount;
                let netAmount = saleData.netAmount;
                let profit = saleData.profit;

                if (totalCost === undefined) {
                    totalCost = saleData.items.reduce((acc, item) => acc + (item.cost || 0) * (item.quantity || 1), 0);
                }
                console.log("DEBUG TRANSACTION: totalCost", totalCost);

                if (feeAmount === undefined) {
                    let totalFees = 0;
                    const entries = saleData.paymentEntries || [{ method: saleData.paymentMethod || 'pix', amount: saleData.total, installments: saleData.installments || 1 }];

                    for (const entry of entries) {
                        let entryFeeRate = 0;
                        if (entry.method === 'pix' || entry.method === 'cash' || entry.method === 'trade_in' || entry.method === 'transfer') {
                            const hasIphone = saleData.items.some(item => {
                                const cat = (item.category || "").toUpperCase();
                                const name = (item.name || "").toUpperCase();
                                return cat.includes("IPHONE") || name.includes("IPHONE");
                            });
                            entryFeeRate = (hasIphone && entry.method === 'pix') ? 0.0199 : 0;
                        } else if (entry.method === 'card' || entry.method === 'credit' || entry.method === 'debit') {
                            const installments = entry.installments || 1;
                            let maxRate = 0;

                            saleData.items.forEach(item => {
                                const category = saleData.settings?.categories?.find(c =>
                                    c.name?.toLowerCase() === item.category?.toLowerCase()
                                );
                                const gateways = Array.isArray(saleData.settings?.financial?.gateways) ? saleData.settings.financial.gateways : [];
                                const gateway = gateways.find(g => g.id === category?.gatewayId) || gateways[0];

                                if (gateway && gateway.rates) {
                                    let rate = 0;
                                    const inst = parseInt(installments) || 1;

                                    if (Array.isArray(gateway.rates)) {
                                        // Legacy Array Support
                                        const rateObj = gateway.rates.find(r => parseInt(r.installments) === inst);
                                        rate = rateObj ? Number(rateObj.rate) : 0;
                                    } else {
                                        // Object Support (New Standard)
                                        if (entry.method === 'debit') {
                                            rate = Number(gateway.rates.debit || 0);
                                        } else {
                                            // Credit Logic
                                            const key = `credit${inst}x`;
                                            rate = Number(gateway.rates[key] || 0);
                                        }
                                    }

                                    if (rate > maxRate) maxRate = rate;
                                } else {
                                    console.warn("DEBUG: No gateway/rates found for item:", item.name);
                                }
                            });
                            entryFeeRate = maxRate / 100;
                        }
                        totalFees += entry.amount * entryFeeRate;
                    }
                    feeAmount = totalFees;
                }
                console.log("DEBUG TRANSACTION: feeAmount", feeAmount);

                netAmount = (saleData.total || 0) - feeAmount;
                profit = netAmount - totalCost;
                console.log("DEBUG TRANSACTION: netAmount/profit", { netAmount, profit });

                // --- START TRANSACTION READS ---
                const stockUpdates = [];
                for (const item of saleData.items) {
                    const itemRef = doc(db, 'stock', item.id);
                    const itemDoc = await transaction.get(itemRef);
                    if (!itemDoc.exists()) {
                        console.error("DEBUG TRANSACTION: Item not found", item.id);
                        throw new Error(`Produto ${item.name} não encontrado no estoque.`);
                    }

                    if (itemDoc.data().organizationId && itemDoc.data().organizationId !== orgId) {
                        console.error("DEBUG TRANSACTION: Org Mismatch", { itemOrg: itemDoc.data().organizationId, targetOrg: orgId });
                        throw new Error(`Conflito de Organização: O produto ${item.name} pertence a outra organização/loja.`);
                    }

                    const currentQty = parseInt(itemDoc.data().quantity) || 0;
                    if (currentQty < item.quantity) {
                        console.error("DEBUG TRANSACTION: Insufficient stock", { name: item.name, currentQty, requestedQty: item.quantity });
                        throw new Error(`Estoque insuficiente para ${item.name} (Disponível: ${currentQty})`);
                    }
                    stockUpdates.push({ ref: itemRef, newQty: currentQty - item.quantity, item });
                }
                console.log("DEBUG TRANSACTION: Reads complete", stockUpdates.length, "items");

                // --- START TRANSACTION WRITES ---
                // 2. Create Sale Record
                const saleRef = doc(collection(db, COLLECTION));
                saleData.id = saleRef.id; // Assign ID so loyalty and other services have it
                createdSaleId = saleRef.id; // Capture the ID

                // Clean data for Firestore (Avoid undefined and large temp objects)
                const { settings: _, ...cleanSaleData } = saleData;

                transaction.set(saleRef, {
                    postSaleContacted: false,
                    ...cleanSaleData,
                    totalCost,
                    feeAmount,
                    netAmount,
                    profit,
                    code: generateReferenceCode('SALE'),
                    userId,
                    organizationId: orgId,
                    createdAt: serverTimestamp(),
                    status: 'completed'
                });
                console.log("DEBUG TRANSACTION: Sale record set", saleRef.id);

                // 3. Update Stock
                stockUpdates.forEach(update => {
                    transaction.update(update.ref, {
                        quantity: update.newQty,
                        updatedAt: serverTimestamp()
                    });
                });
                console.log("DEBUG TRANSACTION: Stock updates set (Qty only)");

                // 4. Record Stock Movement
                stockUpdates.forEach(update => {
                    const item = update.item;
                    const movementRef = doc(collection(db, 'stockMovements'));
                    transaction.set(movementRef, {
                        stockId: item.id,
                        itemName: item.name,
                        type: 'out',
                        quantity: item.quantity,
                        reason: 'Venda Finalizada',
                        saleId: createdSaleId,
                        userId,
                        organizationId: orgId,
                        createdAt: serverTimestamp()
                    });
                });

                // 5. Process Payment Entries (Financials & Receivables)
                const paymentEntries = saleData.paymentEntries || [{
                    method: saleData.paymentMethod || 'pix',
                    amount: saleData.total,
                    installments: saleData.installments || 1
                }];

                for (const entry of paymentEntries) {
                    const isImmediate = ['cash', 'pix', 'debit', 'transfer'].includes(entry.method);
                    const installments = parseInt(entry.installments || 1);
                    const isInstallmentCash = entry.method === 'cash' && installments > 1;

                    // A. Financial Movement (Immediate Liquidity)
                    // Only for 1x Cash, Pix, Debit, Transfer
                    if (isImmediate && !isInstallmentCash) {
                        const moveRef = doc(collection(db, 'financialMovements'));
                        transaction.set(moveRef, {
                            description: `Venda #${saleData.code || '---'} (${entry.method.toUpperCase()})`,
                            amount: entry.amount,
                            category: 'Vendas',
                            type: 'income',
                            origin: 'sale',
                            referenceId: createdSaleId,
                            organizationId: orgId,
                            date: serverTimestamp(),
                            createdAt: serverTimestamp()
                        });
                    }

                    // B. Receivables (Fiado / Dinheiro Parcelado / Cartão de Crédito)
                    // Generates "Contas a Receber" entries
                    const needsReceivable = entry.method === 'fiado' ||
                        (entry.method === 'cash' && installments > 1) ||
                        entry.method === 'credit' ||
                        entry.method === 'card';

                    if (needsReceivable) {
                        const baseAmount = entry.amount / installments;

                        for (let i = 0; i < installments; i++) {
                            const receivableRef = doc(collection(db, 'receivables'));
                            let dueDate = new Date();
                            if (entry.dueDate) {
                                const parts = entry.dueDate.split('-');
                                const baseDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
                                dueDate = new Date(baseDate);
                                dueDate.setDate(baseDate.getDate() + (30 * i));
                            } else {
                                dueDate.setDate(dueDate.getDate() + (30 * (i + 1)));
                            }

                            transaction.set(receivableRef, {
                                organizationId: orgId,
                                customerName: saleData.client?.name || 'Cliente Não Identificado',
                                description: `Venda #${saleData.code || '---'} (${entry.method === 'credit' ? 'Cartão' : entry.method.toUpperCase()}) - Parc. ${i + 1}/${installments}`,
                                amount: baseAmount,
                                dueDate: dueDate.toISOString().split('T')[0], // YYYY-MM-DD
                                status: 'pending',
                                saleId: createdSaleId,
                                costCenterId: null,
                                createdAt: serverTimestamp(),
                                createdBy: userId,
                                originalMethod: entry.method
                            });
                        }
                    }
                }
            });
            console.log("DEBUG: Transaction committed successfully");

            return createdSaleId; // Return the captured sale ID
        } catch (error) {
            console.error("Error creating sale:", error);
            throw error;
        }
    },

    /**
     * Get sales that need post-sales contact.
     * Logic: Sales created between [Today - X days] and [Today - X days + 24h].
     * Ideally, we fetch recent sales and filter in client to avoid complex indexes.
     */
    getPendingAutomations: async (orgId, daysAgo = 3, mode = 'post-sale') => {
        try {
            const q = query(
                collection(db, COLLECTION),
                where("organizationId", "==", orgId),
                where(mode === 'warranty' ? "warrantyReminderSent" : "postSaleContacted", "==", false)
            );

            const snapshot = await getDocs(q);
            const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            return sales.filter(sale => {
                if (!sale.createdAt) return false;

                let saleDate;
                if (sale.createdAt.toDate) {
                    saleDate = sale.createdAt.toDate();
                } else if (sale.createdAt.seconds) {
                    saleDate = new Date(sale.createdAt.seconds * 1000);
                } else {
                    saleDate = new Date(sale.createdAt);
                }

                const diffTime = Math.abs(new Date() - saleDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (mode === 'warranty') {
                    return diffDays >= 330;
                }
                return diffDays >= daysAgo;
            });
        } catch (error) {
            console.error("Error fetching pending automations:", error);
            return [];
        }
    },

    markAsContacted: async (saleId, mode = 'post-sale') => {
        const ref = doc(db, COLLECTION, saleId);
        const update = mode === 'warranty'
            ? { warrantyReminderSent: true, warrantyContactDate: serverTimestamp() }
            : { postSaleContacted: true, lastContactDate: serverTimestamp() };

        await (await import('firebase/firestore')).updateDoc(ref, update);
    },

    /**
     * Get sales report for dashboard
     */
    getSales: async (orgId, startDate, endDate) => {
        try {
            let q = query(
                collection(db, COLLECTION),
                where("organizationId", "==", orgId),
                orderBy("createdAt", "asc")
            );

            if (startDate && endDate) {
                q = query(
                    collection(db, COLLECTION),
                    where("organizationId", "==", orgId),
                    where("createdAt", ">=", startDate),
                    where("createdAt", "<=", endDate),
                    orderBy("createdAt", "asc")
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn("Index missing for sales. Client-side sort fallback.");
                const qSimple = query(collection(db, COLLECTION), where("organizationId", "==", orgId));
                const snapshot = await getDocs(qSimple);
                let sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                if (startDate && endDate) {
                    sales = sales.filter(s => {
                        const date = s.createdAt?.toDate ? s.createdAt.toDate() : (s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.createdAt));
                        return date >= startDate && date <= endDate;
                    });
                }
                return sales.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0));
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0));
                    return dateB - dateA;
                });
            }
            throw error;
        }
    },

    getSalesByClient: async (orgId, clientId) => {
        try {
            const q = query(
                collection(db, COLLECTION),
                where("organizationId", "==", orgId),
                where("client.id", "==", clientId),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            if (error.code === 'failed-precondition') {
                const qSimple = query(collection(db, COLLECTION), where("organizationId", "==", orgId), where("client.id", "==", clientId));
                const snapshot = await getDocs(qSimple);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
            }
            throw error;
        }
    },

    /**
     * Cancels a sale: restores stock and deletes the sale record.
     */
    cancelSale: async (saleId, orgId) => {
        if (!saleId) throw new Error("Sale ID é obrigatório");
        if (!orgId) throw new Error("Organization ID é obrigatório");

        try {
            let receivableRefs = [];
            let financialRefs = [];

            // Find associated receivables first to delete them in the transaction
            // Try-catch individual para não bloquear o cancelamento se não houver
            try {
                const receivablesQuery = query(
                    collection(db, 'receivables'),
                    where('saleId', '==', saleId),
                    where('organizationId', '==', orgId)
                );
                const receivablesSnap = await getDocs(receivablesQuery);
                receivableRefs = receivablesSnap.docs.map(d => d.ref);
            } catch (e) {
                console.warn("Erro ao buscar receivables (pode não existir):", e.message);
                // Continua mesmo se não encontrar receivables
            }

            // Find associated financial movements (Income)
            // Try-catch individual para não bloquear o cancelamento se não houver
            try {
                const financialQuery = query(
                    collection(db, 'financialMovements'),
                    where('referenceId', '==', saleId),
                    where('origin', '==', 'sale'),
                    where('organizationId', '==', orgId)
                );
                const financialSnap = await getDocs(financialQuery);
                financialRefs = financialSnap.docs.map(d => d.ref);
            } catch (e) {
                console.warn("Erro ao buscar financialMovements (pode não existir):", e.message);
                // Continua mesmo se não encontrar financialMovements
            }

            await runTransaction(db, async (transaction) => {
                const saleRef = doc(db, COLLECTION, saleId);
                const saleDoc = await transaction.get(saleRef);

                if (!saleDoc.exists()) {
                    throw new Error("Venda não encontrada");
                }

                const saleData = saleDoc.data();

                // Verificar se o usuário tem permissão para cancelar esta venda (mesma organização)
                if (saleData.organizationId && saleData.organizationId !== orgId) {
                    throw new Error("Você não tem permissão para cancelar vendas de outra organização");
                }

                // 1. Restore Stock
                for (const item of saleData.items || []) {
                    console.log("Restoring item:", item.id, item.name);
                    if (item.id) {
                        const itemRef = doc(db, "stock", item.id);
                        const itemDoc = await transaction.get(itemRef);
                        if (itemDoc.exists()) {
                            const currentQty = itemDoc.data().quantity || 0;
                            const restoreQty = item.quantity || 1;
                            transaction.update(itemRef, {
                                quantity: currentQty + restoreQty,
                                updatedAt: serverTimestamp()
                            });

                            // Log Movement (In)
                            const moveRef = doc(collection(db, "stockMovements"));
                            transaction.set(moveRef, {
                                stockId: item.id,
                                itemName: item.name,
                                type: 'in',
                                quantity: restoreQty,
                                reason: 'Cancelamento de Venda',
                                userId: saleData.userId || saleData.sellerId || "System",
                                organizationId: orgId,
                                createdAt: serverTimestamp()
                            });
                        }
                    }
                }

                // 2. Update Order Status if it exists
                if (saleData.orderId) {
                    try {
                        const orderRef = doc(db, "orders", saleData.orderId);
                        transaction.update(orderRef, {
                            status: 'cancelled',
                            updatedAt: serverTimestamp()
                        });
                    } catch (e) {
                        console.warn("Erro ao atualizar order (pode não existir):", e.message);
                        // Continua mesmo se não conseguir atualizar a order
                    }
                }

                // 3. Delete associated receivables and financial movements (se existirem)
                receivableRefs.forEach(ref => {
                    transaction.delete(ref);
                });

                financialRefs.forEach(ref => {
                    transaction.delete(ref);
                });

                // 4. Delete Sale Record
                transaction.delete(saleRef);
            });
            return true;
        } catch (error) {
            console.error("Error cancelling sale:", error);
            throw error;
        }
    },

    /**
     * Updates an existing sale and recalculates finances.
     */
    updateSale: async (saleId, orgId, updatedData) => {
        if (!orgId) throw new Error("Organization ID required for update");

        try {
            // 1. Prepare references BEFORE transaction (Reads)
            // find associated financial movements to update
            const financialQuery = query(
                collection(db, 'financialMovements'),
                where('referenceId', '==', saleId),
                where('origin', '==', 'sale'),
                where('organizationId', '==', orgId)
            );
            const financialSnap = await getDocs(financialQuery);
            const financialRefs = financialSnap.docs.map(d => d.ref);

            await runTransaction(db, async (transaction) => {
                const saleRef = doc(db, COLLECTION, saleId);
                const saleSnap = await transaction.get(saleRef);
                if (!saleSnap.exists()) throw new Error("Venda não encontrada");

                const currentSale = saleSnap.data();

                // Recalculate Finances
                let totalCost = updatedData.items.reduce((acc, item) => acc + (parseFloat(item.cost || 0) * (item.quantity || 1)), 0);

                // Calculate Fees (Reusing logic from createSale)
                let feeAmount = 0;
                const entries = updatedData.paymentEntries || [{
                    method: updatedData.paymentMethod || currentSale.paymentMethod || 'pix',
                    amount: updatedData.total,
                    installments: updatedData.installments || 1
                }];

                for (const entry of entries) {
                    let entryFeeRate = 0;
                    if (entry.method === 'pix' || entry.method === 'cash' || entry.method === 'trade_in' || entry.method === 'transfer') {
                        const hasIphone = updatedData.items.some(item => {
                            const cat = (item.category || "").toUpperCase();
                            const name = (item.name || "").toUpperCase();
                            return cat.includes("IPHONE") || name.includes("IPHONE");
                        });
                        entryFeeRate = (hasIphone && entry.method === 'pix') ? 0.0199 : 0;
                    } else if (entry.method === 'card' || entry.method === 'credit' || entry.method === 'debit') {
                        const installments = entry.installments || 1;
                        let maxRate = 0;

                        updatedData.items.forEach(item => {
                            const category = updatedData.settings?.categories?.find(c =>
                                c.name?.toLowerCase() === item.category?.toLowerCase()
                            );
                            const gateways = Array.isArray(updatedData.settings?.financial?.gateways) ? updatedData.settings.financial.gateways : [];
                            const gateway = gateways.find(g => g.id === category?.gatewayId) || gateways[0];

                            if (gateway && gateway.rates) {
                                let rate = 0;
                                const inst = parseInt(installments) || 1;

                                if (Array.isArray(gateway.rates)) {
                                    // Legacy Array Support
                                    const rateObj = gateway.rates.find(r => parseInt(r.installments) === inst);
                                    rate = rateObj ? Number(rateObj.rate) : 0;
                                } else {
                                    // Object Support (New Standard)
                                    if (entry.method === 'debit') {
                                        rate = Number(gateway.rates.debit || 0);
                                    } else {
                                        // Credit Logic
                                        const key = `credit${inst}x`;
                                        rate = Number(gateway.rates[key] || 0);
                                    }
                                }

                                if (rate > maxRate) maxRate = rate;
                            } else {
                                console.warn("DEBUG: No gateway/rates found for item:", item.name);
                            }
                        });
                        entryFeeRate = maxRate / 100;
                    }
                    feeAmount += entry.amount * entryFeeRate;
                }

                const netAmount = (updatedData.total || 0) - feeAmount;
                const profit = netAmount - totalCost;

                // remove settings from updatedData before saving to reference to avoid bloating the document
                const { settings, ...cleanData } = updatedData;

                // Update Sale
                transaction.update(saleRef, {
                    ...cleanData,
                    totalCost,
                    feeAmount,
                    netAmount,
                    profit,
                    updatedAt: serverTimestamp()
                });

                // Sync with Financial Movements (Income)
                financialRefs.forEach(ref => {
                    transaction.update(ref, {
                        amount: cleanData.total,
                        updatedAt: serverTimestamp()
                    });
                });
            });
            return true;
        } catch (error) {
            console.error("Error updating sale:", error);
            throw error;
        }
    }
};
