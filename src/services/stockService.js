import { db } from "../lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    limit,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc
} from "firebase/firestore";
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const COLLECTION_NAME = "stock";

export const StockService = {
    /**
     * Upload an image and return the URL
     */
    uploadImage: async (file) => {
        if (!file) return null;
        try {
            const fileRef = ref(storage, `${COLLECTION_NAME}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    },

    /**
     * Add a new item to stock
     */
    addItem: async (orgId, userId, itemData) => {
        if (!orgId || !userId) throw new Error("Org ID and User ID required");

        const cleanNumber = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            
            // Remove R$, $, and spaces
            let cleaned = val.toString().replace(/[R$\s]/g, '');
            
            // Handle different decimal/thousand formats
            // If there's a comma and a dot, comma is likely decimal (BR) 
            // OR if there's only a comma, it's decimal (BR)
            // If there's only a dot, it's likely decimal (US)
            if (cleaned.includes(',') && cleaned.includes('.')) {
                // BR format: 1.250,50 -> remove dot, replace comma with dot
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.includes(',')) {
                // BR format: 950,00 -> replace comma with dot
                cleaned = cleaned.replace(',', '.');
            }
            // If only dot exists, assume it's already decimal (950.00)
            
            return parseFloat(cleaned) || 0;
        };

        try {
            const { id, ...data } = itemData;

            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...data,
                organizationId: orgId,
                createdBy: userId,
                quantity: parseInt(data.quantity) || 0,
                cost: cleanNumber(data.cost),
                price: cleanNumber(data.price),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding stock item:", error);
            throw error;
        }
    },

    /**
     * Get all stock items for a user
     */
    getStock: async (orgId) => {
        if (!orgId) return [];

        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("organizationId", "==", orgId),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
            }));
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn("Index missing, falling back to local sort");
                const qSimple = query(collection(db, COLLECTION_NAME), where("organizationId", "==", orgId));
                const snapshot = await getDocs(qSimple);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }
            throw error;
        }
    },

    /**
     * Update an item and log movement
     */
    updateItem: async (orgId, userId, id, updates, movementNote = "") => {
        if (!orgId || !userId || !id) throw new Error("Missing required IDs for update");

        try {
            const itemRef = doc(db, COLLECTION_NAME, id);
            const itemSnap = await getDoc(itemRef);

            if (!itemSnap.exists()) {
                throw new Error(`Document ${id} not found in ${COLLECTION_NAME}`);
            }

            const oldData = itemSnap.data();
            const newQty = updates.quantity !== undefined ? parseInt(updates.quantity) : oldData.quantity;

            // Log movement if quantity changed
            if (newQty !== oldData.quantity) {
                const diff = newQty - oldData.quantity;
                await addDoc(collection(db, "stockMovements"), {
                    organizationId: orgId,
                    userId: userId,
                    stockItemId: id,
                    productName: updates.name || oldData.name,
                    type: diff > 0 ? "entrada" : "saída",
                    quantity: Math.abs(diff),
                    previousQuantity: oldData.quantity,
                    newQuantity: newQty,
                    note: movementNote || (diff > 0 ? "Entrada manual" : "Saída manual"),
                    createdAt: serverTimestamp()
                });
            }

            // Clean updates: remove ID to avoid field 'id' being saved
            const { id: _, ...cleanUpdates } = updates;

            await updateDoc(itemRef, {
                ...cleanUpdates,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating stock item:", error);
            throw error;
        }
    },

    /**
     * Delete item (Move to trash)
     */
    deleteItem: async (orgId, userId, id, itemData) => {
        if (!orgId || !userId || !id) throw new Error("Missing required IDs for deletion");

        try {
            // 1. Save to trash
            await addDoc(collection(db, "trash"), {
                ...itemData,
                originalId: id,
                organizationId: orgId,
                deletedBy: userId,
                deletedAt: serverTimestamp(),
                type: 'stock'
            });

            // 2. Remove from stock
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return true;
        } catch (error) {
            console.error("Error moving item to trash:", error);
            throw error;
        }
    },

    /**
     * Get trashed items
     */
    getTrashedItems: async (orgId) => {
        if (!orgId) return [];
        try {
            const q = query(
                collection(db, "trash"),
                where("organizationId", "==", orgId),
                where("type", "==", "stock"),
                orderBy("deletedAt", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                deletedAt: doc.data().deletedAt?.toDate()
            }));
        } catch (error) {
            console.error("Error fetching trash:", error);
            throw error;
        }
    },

    /**
     * Restore item from trash
     */
    restoreItem: async (trashId) => {
        if (!trashId) throw new Error("Trash ID required");
        try {
            const trashRef = doc(db, "trash", trashId);
            const trashSnap = await getDoc(trashRef);

            if (trashSnap.exists()) {
                const { originalId, deletedBy, deletedAt, type, ...stockData } = trashSnap.data();

                // Add back to stock
                await addDoc(collection(db, COLLECTION_NAME), {
                    ...stockData,
                    updatedAt: serverTimestamp()
                });

                // Remove from trash
                await deleteDoc(trashRef);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error restoring item:", error);
            throw error;
        }
    },

    /**
     * Get stock movements
     */
    getMovements: async (orgId) => {
        if (!orgId) return [];
        try {
            const q = query(
                collection(db, "stockMovements"),
                where("organizationId", "==", orgId),
                orderBy("createdAt", "desc"),
                limit(100)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error("Error fetching movements:", error);
            throw error;
        }
    },

    /**
     * Reserve stock for a service order
     * Creates a reservation that temporarily locks stock quantity
     */
    reserveStock: async (orgId, userId, stockItemId, quantity, osId, osNumber) => {
        if (!orgId || !userId || !stockItemId || !quantity) {
            throw new Error("Missing required parameters for stock reservation");
        }

        try {
            const itemRef = doc(db, COLLECTION_NAME, stockItemId);
            const itemSnap = await getDoc(itemRef);

            if (!itemSnap.exists()) {
                throw new Error("Stock item not found");
            }

            const itemData = itemSnap.data();
            const availableQty = itemData.quantity - (itemData.reserved || 0);

            if (availableQty < quantity) {
                throw new Error(`Estoque insuficiente. Disponível: ${availableQty}, Solicitado: ${quantity}`);
            }

            // Update reserved quantity
            await updateDoc(itemRef, {
                reserved: (itemData.reserved || 0) + quantity,
                updatedAt: serverTimestamp()
            });

            // Log reservation
            await addDoc(collection(db, "stockReservations"), {
                organizationId: orgId,
                userId,
                stockItemId,
                productName: itemData.name,
                quantity,
                osId,
                osNumber,
                status: "reserved",
                createdAt: serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error("Error reserving stock:", error);
            throw error;
        }
    },

    /**
     * Release stock reservation (e.g., when OS is cancelled)
     */
    releaseReserve: async (orgId, stockItemId, quantity, osId) => {
        if (!orgId || !stockItemId || !quantity) {
            throw new Error("Missing required parameters for releasing reservation");
        }

        try {
            const itemRef = doc(db, COLLECTION_NAME, stockItemId);
            const itemSnap = await getDoc(itemRef);

            if (!itemSnap.exists()) {
                throw new Error("Stock item not found");
            }

            const itemData = itemSnap.data();
            const newReserved = Math.max(0, (itemData.reserved || 0) - quantity);

            await updateDoc(itemRef, {
                reserved: newReserved,
                updatedAt: serverTimestamp()
            });

            // Update reservation status
            const reservationsQuery = query(
                collection(db, "stockReservations"),
                where("organizationId", "==", orgId),
                where("stockItemId", "==", stockItemId),
                where("osId", "==", osId),
                where("status", "==", "reserved")
            );

            const reservationsSnap = await getDocs(reservationsQuery);
            for (const reservationDoc of reservationsSnap.docs) {
                await updateDoc(doc(db, "stockReservations", reservationDoc.id), {
                    status: "released",
                    releasedAt: serverTimestamp()
                });
            }

            return true;
        } catch (error) {
            console.error("Error releasing reservation:", error);
            throw error;
        }
    },

    /**
     * Confirm reservation and deduct from stock (when OS is completed)
     */
    confirmReserve: async (orgId, userId, stockItemId, quantity, osId, osNumber) => {
        if (!orgId || !userId || !stockItemId || !quantity) {
            throw new Error("Missing required parameters for confirming reservation");
        }

        try {
            const itemRef = doc(db, COLLECTION_NAME, stockItemId);
            const itemSnap = await getDoc(itemRef);

            if (!itemSnap.exists()) {
                throw new Error("Stock item not found");
            }

            const itemData = itemSnap.data();
            const newQuantity = itemData.quantity - quantity;
            const newReserved = Math.max(0, (itemData.reserved || 0) - quantity);

            if (newQuantity < 0) {
                throw new Error("Cannot confirm: insufficient stock");
            }

            // Update stock
            await updateDoc(itemRef, {
                quantity: newQuantity,
                reserved: newReserved,
                updatedAt: serverTimestamp()
            });

            // Log movement
            await addDoc(collection(db, "stockMovements"), {
                organizationId: orgId,
                userId,
                stockItemId,
                productName: itemData.name,
                type: "saída",
                quantity,
                previousQuantity: itemData.quantity,
                newQuantity,
                note: `Saída para OS #${osNumber}`,
                osId,
                osNumber,
                createdAt: serverTimestamp()
            });

            // Update reservation status
            const reservationsQuery = query(
                collection(db, "stockReservations"),
                where("organizationId", "==", orgId),
                where("stockItemId", "==", stockItemId),
                where("osId", "==", osId),
                where("status", "==", "reserved")
            );

            const reservationsSnap = await getDocs(reservationsQuery);
            for (const reservationDoc of reservationsSnap.docs) {
                await updateDoc(doc(db, "stockReservations", reservationDoc.id), {
                    status: "confirmed",
                    confirmedAt: serverTimestamp()
                });
            }

            return true;
        } catch (error) {
            console.error("Error confirming reservation:", error);
            throw error;
        }
    },

    /**
     * Get product by barcode
     */
    getProductByBarcode: async (orgId, barcode) => {
        if (!orgId || !barcode) return null;
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("organizationId", "==", orgId),
                where("barcode", "==", barcode),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error("Error finding product by barcode:", error);
            return null;
        }
    },

    /**
     * Get available quantity (total - reserved)
     */
    getAvailableQuantity: (item) => {
        if (!item) return 0;
        return (item.quantity || 0) - (item.reserved || 0);
    }
};
