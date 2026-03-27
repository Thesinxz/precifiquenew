import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const CashFlowService = {
    /**
     * Records a financial movement (Income or Expense)
     */
    addMovement: async (orgId, movement) => {
        // movement: { description, amount, category, type ('income'|'expense'), date, origin, referenceId }
        try {
            const data = {
                ...movement,
                organizationId: orgId,
                createdAt: serverTimestamp(),
                // Ensure date is a Firestore timestamp or JS Date
                date: movement.date instanceof Date ? movement.date : new Date(movement.date)
            };
            const docRef = await addDoc(collection(db, 'financialMovements'), data);
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error("Error adding financial movement:", error);
            throw error;
        }
    },

    /**
     * Get movements for a period
     */
    getMovements: async (orgId, startDate, endDate) => {
        try {
            let conditions = [
                where("organizationId", "==", orgId),
                orderBy("date", "desc")
            ];

            if (startDate) {
                conditions.unshift(where("date", ">=", startDate instanceof Date ? startDate : new Date(startDate)));
            }
            if (endDate) {
                conditions.unshift(where("date", "<=", endDate instanceof Date ? endDate : new Date(endDate)));
            }

            const q = query(
                collection(db, 'financialMovements'),
                ...conditions
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
                };
            });
        } catch (error) {
            console.error("Error getting financial movements:", error);
            // Fallback for missing index or other errors
            const qSimple = query(
                collection(db, 'financialMovements'),
                where("organizationId", "==", orgId)
            );
            const snapshot = await getDocs(qSimple);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                const d = data.date?.toDate ? data.date.toDate() : new Date(data.date);
                return {
                    id: doc.id,
                    ...data,
                    date: d
                };
            }).filter(m => {
                if (startDate && m.date < (startDate instanceof Date ? startDate : new Date(startDate))) return false;
                if (endDate && m.date > (endDate instanceof Date ? endDate : new Date(endDate))) return false;
                return true;
            }).sort((a, b) => b.date - a.date);
        }
    },

    // Legacy support for older components (aliasing to new system)
    addExpense: async (orgId, expense) => {
        return CashFlowService.addMovement(orgId, { ...expense, type: 'expense' });
    },

    getExpenses: async (orgId) => {
        const movements = await CashFlowService.getMovements(orgId);
        return movements.filter(m => m.type === 'expense');
    },

    deleteExpense: async (id) => {
        try {
            await deleteDoc(doc(db, 'financialMovements', id));
        } catch (error) {
            console.error("Error deleting movement:", error);
            throw error;
        }
    }
};
