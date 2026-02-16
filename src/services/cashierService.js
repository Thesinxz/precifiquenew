import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    getDoc
} from "firebase/firestore";
import { CashFlowService } from "./cashFlowService";

export const CashierService = {
    // Open a new cashier session
    async openSession(userId, organizationId, initialFloat) {
        try {
            const sessionRef = await addDoc(collection(db, "cashierSessions"), {
                userId,
                organizationId,
                status: 'open',
                openedAt: serverTimestamp(),
                initialFloat: parseFloat(initialFloat),
                currentBalance: parseFloat(initialFloat), // Starts with float
                movements: [], // Array of movement IDs or sub-collection? Let's use sub-collection for scale or just keeping track here? 
                // For simplicity in this stack, let's just track summary here and keep detailed movements in a separate collection linked by sessionId.
                salesCount: 0,
                totalSales: 0
            });

            // Log the initial float as a movement
            await this.addMovement(sessionRef.id, userId, organizationId, 'float', initialFloat, 'Abertura de Caixa');

            return sessionRef.id;
        } catch (error) {
            console.error("Error opening session:", error);
            throw error;
        }
    },

    // Close the cashier session
    async closeSession(sessionId, closingData) {
        // closingData: { declaredCash, declaredCard, declaredPix, notes }
        try {
            const sessionRef = doc(db, "cashierSessions", sessionId);
            await updateDoc(sessionRef, {
                status: 'closed',
                closedAt: serverTimestamp(),
                ...closingData
            });
        } catch (error) {
            console.error("Error closing session:", error);
            throw error;
        }
    },

    // Check if user has an open session
    async getCurrentSession(userId, organizationId) {
        try {
            const q = query(
                collection(db, "cashierSessions"),
                where("userId", "==", userId),
                where("organizationId", "==", organizationId),
                where("status", "==", "open"),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;

            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        } catch (error) {
            console.error("Error getting current session:", error);
            throw error;
        }
    },

    // Add a movement (Sale, Sangria, Supply)
    async addMovement(sessionId, userId, organizationId, type, amount, description = '') {
        // type: 'sale', 'sangria', 'supply', 'float'
        try {
            const movementRef = await addDoc(collection(db, "cashierMovements"), {
                sessionId,
                userId,
                organizationId,
                type,
                amount: parseFloat(amount),
                description,
                createdAt: serverTimestamp()
            });

            // Update session balance if it affects cash/liquidity
            // Sales might add to balance (if cash) or just totalSales.
            // For now, let's assume 'balance' tracks CASH in drawer.

            const sessionRef = doc(db, "cashierSessions", sessionId);
            const sessionSnap = await getDoc(sessionRef);
            if (!sessionSnap.exists()) throw new Error("Session not found");

            const currentData = sessionSnap.data();
            let newBalance = currentData.currentBalance || 0;
            let newTotalSales = currentData.totalSales || 0;
            let newSalesCount = currentData.salesCount || 0;

            if (type === 'supply' || type === 'float') {
                newBalance += parseFloat(amount);
            } else if (type === 'sangria') {
                newBalance -= parseFloat(amount);
            } else if (type === 'sale_cash') {
                newBalance += parseFloat(amount);
                newTotalSales += parseFloat(amount);
                newSalesCount += 1;
            } else if (type === 'sale_pix' || type === 'sale_card') {
                // Digital payments don't affect CASH balance in drawer, but affect totals
                newTotalSales += parseFloat(amount);
                newSalesCount += 1;
            }

            await updateDoc(sessionRef, {
                currentBalance: newBalance,
                totalSales: newTotalSales,
                salesCount: newSalesCount
            });

            // Sync with Unified Financial Dashboard if it's a structural movement
            if (type === 'sangria') {
                await CashFlowService.addMovement(organizationId, {
                    type: 'expense',
                    amount: parseFloat(amount),
                    description: `Sangria Caixa: ${description}`,
                    category: 'Sangria / Caixa',
                    origin: 'cashier',
                    referenceId: movementRef.id,
                    date: new Date()
                });
            }

            return movementRef.id;
        } catch (error) {
            console.error("Error adding movement:", error);
            throw error;
        }
    },

    // Get session details and movements for report
    async getSessionReport(sessionId) {
        try {
            const sessionRef = doc(db, "cashierSessions", sessionId);
            const sessionSnap = await getDoc(sessionRef);

            const movementsQuery = query(
                collection(db, "cashierMovements"),
                where("sessionId", "==", sessionId),
                orderBy("createdAt", "desc")
            );
            const movementsSnap = await getDocs(movementsQuery);
            const movements = movementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            return {
                session: { id: sessionSnap.id, ...sessionSnap.data() },
                movements
            };
        } catch (error) {
            console.error("Error getting report:", error);
            throw error;
        }
    }
};
