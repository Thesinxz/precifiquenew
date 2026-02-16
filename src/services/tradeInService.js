import { db } from "../lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, runTransaction } from "firebase/firestore";

export const TradeInService = {
    /**
     * Process a trade-in sale:
     * 1. Creates a new stock item (the trade-in device)
     * 2. Adds stock movement (entry)
     * 3. Creates the sale record (deducting new items, recording trade-in as partial payment)
     */
    processTradeInSale: async (userId, orgId, saleData, tradeInData) => {
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Create Trade-In Item in Stock
                const tradeInRef = doc(collection(db, "stock"));
                const tradeInItem = {
                    ...tradeInData,
                    userId,
                    organizationId: orgId,
                    quantity: 1,
                    status: 'available', // Ready to be sold refurbished/used
                    createdAt: serverTimestamp(),
                    source: 'trade-in'
                };
                transaction.set(tradeInRef, tradeInItem);

                // 2. Log Trade-In Entry Movement
                const moveRef = doc(collection(db, "stockMovements"));
                transaction.set(moveRef, {
                    stockId: tradeInRef.id,
                    itemName: tradeInData.name,
                    type: 'in',
                    quantity: 1,
                    reason: 'Entrada Trade-In (Troca)',
                    userId,
                    organizationId: orgId,
                    createdAt: serverTimestamp()
                });

                // 3. Process the Sale (Deduct Sold Items)
                for (const item of saleData.items) {
                    if (item.id) {
                        const itemRef = doc(db, "stock", item.id);
                        const itemDoc = await transaction.get(itemRef);
                        if (itemDoc.exists()) {
                            const newQty = (itemDoc.data().quantity || 0) - (item.quantity || 1);
                            transaction.update(itemRef, { quantity: newQty });

                            // Log Sale Movement
                            const saleMoveRef = doc(collection(db, "stockMovements"));
                            transaction.set(saleMoveRef, {
                                stockId: item.id,
                                itemName: item.name,
                                type: 'out',
                                quantity: item.quantity || 1,
                                reason: 'Venda com Troca',
                                userId,
                                organizationId: orgId,
                                createdAt: serverTimestamp()
                            });
                        }
                    }
                }

                // 4. Create Sale Record
                const saleRef = doc(collection(db, "sales"));
                transaction.set(saleRef, {
                    ...saleData,
                    userId,
                    organizationId: orgId,
                    createdAt: serverTimestamp(),
                    status: 'completed',
                    tradeInId: tradeInRef.id,
                    tradeInValue: tradeInData.cost, // The value we paid for it
                    postSaleContacted: false
                });
            });
            return true;
        } catch (error) {
            console.error("Trade-In Error:", error);
            throw error;
        }
    }
};
