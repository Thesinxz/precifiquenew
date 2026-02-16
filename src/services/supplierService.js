import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export const SupplierService = {
    async getSupplierByCnpj(orgId, cnpj) {
        const q = query(
            collection(db, 'suppliers'),
            where("organizationId", "==", orgId),
            where("cnpj", "==", cnpj)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    async addSupplier(orgId, supplierData) {
        const data = {
            ...supplierData,
            organizationId: orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'suppliers'), data);
        return { id: docRef.id, ...data };
    },

    async getSuppliers(orgId) {
        const q = query(
            collection(db, 'suppliers'),
            where("organizationId", "==", orgId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
