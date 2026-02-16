import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';

export const ClientService = {
    async addClient(userId, clientData, orgId) {
        try {
            const dataToSave = {
                userId,
                organizationId: orgId || userId,
                ...clientData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'clients'), dataToSave);
            return { id: docRef.id, ...dataToSave };
        } catch (error) {
            console.error("Error adding client:", error);
            throw error;
        }
    },

    async getClients(orgId) {
        try {
            // Main clean query per organization
            const q = query(
                collection(db, 'clients'),
                where("organizationId", "==", orgId),
                orderBy("createdAt", "asc")
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        } catch (error) {
            // Handle missing index or building index error
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                console.warn("Index building or missing for clients. Falling back to client-side sort.");

                // Fallback 1: Simple organizationId query
                const qSimple = query(
                    collection(db, 'clients'),
                    where("organizationId", "==", orgId)
                );

                // Fallback 2: Simple userId query (for legacy data)
                const qLegacy = query(
                    collection(db, 'clients'),
                    where("userId", "==", orgId)
                );

                const [snap1, snap2] = await Promise.all([
                    getDocs(qSimple).catch(() => ({ docs: [] })),
                    getDocs(qLegacy).catch(() => ({ docs: [] }))
                ]);

                const allDocs = [...snap1.docs, ...snap2.docs];
                const uniqueClients = new Map();

                allDocs.forEach(doc => {
                    if (!uniqueClients.has(doc.id)) {
                        uniqueClients.set(doc.id, { id: doc.id, ...doc.data() });
                    }
                });

                const result = Array.from(uniqueClients.values());
                return result.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateA - dateB;
                });
            }
            console.error("Error fetching clients:", error);
            throw error;
        }
    },

    async updateClient(clientId, data) {
        try {
            const clientRef = doc(db, 'clients', clientId);
            await updateDoc(clientRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    },

    async deleteClient(clientId) {
        try {
            await deleteDoc(doc(db, 'clients', clientId));
        } catch (error) {
            console.error("Error deleting client:", error);
            throw error;
        }
    }
};
