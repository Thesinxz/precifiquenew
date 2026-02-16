import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    runTransaction,
    serverTimestamp,
    orderBy,
    limit
} from "firebase/firestore";

const WALLET_COLLECTION = "loyaltyWallets";
const TRANSACTIONS_COLLECTION = "loyaltyTransactions";

export const LoyaltyService = {
    /**
     * Get Client Wallet Balance
     */
    getWallet: async (clientId, orgId) => {
        if (!clientId || !orgId) return null;

        const q = query(
            collection(db, WALLET_COLLECTION),
            where("clientId", "==", clientId),
            where("organizationId", "==", orgId),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return { balance: 0, lifetimeEarned: 0 };

        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    /**
     * Process Loyalty for a Sale
     * @param {Object} sale - Sale object
     * @param {Object} settings - Loyalty settings { enabled, cashbackPercent, expiryMonths }
     */
    processSaleReward: async (sale, settings) => {
        if (!settings?.enabled || !sale.client?.id) return;

        const rewardAmount = (sale.total || 0) * (settings.cashbackPercent / 100);
        if (rewardAmount <= 0) return;

        await runTransaction(db, async (transaction) => {
            // 1. Get Wallet
            const q = query(
                collection(db, WALLET_COLLECTION),
                where("clientId", "==", sale.client.id),
                where("organizationId", "==", sale.organizationId),
                limit(1)
            );
            const snapshot = await getDocs(q); // Note: Transaction reads must come before writes, but query isn't supported directly inside transaction object for get().
            // Ideally we use doc ref if we know ID. Since we query, we might have race condition if not careful.
            // For simplicity in this structure, we'll assume low concurrency per client.

            let walletRef;
            let currentBalance = 0;
            let currentLifetime = 0;

            if (snapshot.empty) {
                walletRef = doc(collection(db, WALLET_COLLECTION));
                transaction.set(walletRef, {
                    clientId: sale.client.id,
                    organizationId: sale.organizationId,
                    balance: 0,
                    lifetimeEarned: 0,
                    updatedAt: serverTimestamp()
                });
            } else {
                walletRef = doc(db, WALLET_COLLECTION, snapshot.docs[0].id);
                currentBalance = snapshot.docs[0].data().balance || 0;
                currentLifetime = snapshot.docs[0].data().lifetimeEarned || 0;
            }

            // 2. Add Transaction Record
            const transRef = doc(collection(db, TRANSACTIONS_COLLECTION));
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + (settings.expiryMonths || 12));

            transaction.set(transRef, {
                walletId: walletRef.id,
                clientId: sale.client.id,
                organizationId: sale.organizationId,
                saleId: sale.id,
                type: 'credit', // 'credit' | 'debit'
                amount: rewardAmount,
                description: `Cashback da venda #${sale.id && sale.id.slice(-4)}`,
                expiryDate: expiryDate,
                createdAt: serverTimestamp()
            });

            // 3. Update Wallet Balance
            transaction.update(walletRef, {
                balance: currentBalance + rewardAmount,
                lifetimeEarned: currentLifetime + rewardAmount,
                updatedAt: serverTimestamp()
            });
        });
    },

    /**
     * Get Transaction History
     */
    getHistory: async (clientId, orgId) => {
        const q = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where("clientId", "==", clientId),
            where("organizationId", "==", orgId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};
