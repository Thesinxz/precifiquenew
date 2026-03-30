import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    deleteDoc,
    doc
} from "firebase/firestore";

const COLLECTION_NAME = "calculations";

export const HistoryService = {
    /**
     * Saves a calculation to the user's history
     */
    saveCalculation: async (userId, calculationData) => {
        if (!userId) throw new Error("User ID required");

        try {
            await addDoc(collection(db, COLLECTION_NAME), {
                userId,
                ...calculationData,
                createdAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error saving calculation:", error);
            throw error;
        }
    },

    /**
     * Retrieves the last N calculations for a user
     */
    getHistory: async (userId, limitCount = 50) => {
        if (!userId) return [];

        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "==", userId),
                orderBy("createdAt", "asc"),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert timestamp to Date object if present
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
        } catch (error) {
            console.error("Error fetching history:", error);
            throw error;
        }
    },

    /**
     * Deletes a calculation
     */
    deleteCalculation: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return true;
        } catch (error) {
            console.error("Error deleting calculation:", error);
            throw error;
        }
    }
};
