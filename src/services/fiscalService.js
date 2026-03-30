import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const COLLECTION_NAME = "fiscal_settings";

export const FiscalService = {
    /**
     * Get fiscal settings for an organization
     */
    getSettings: async (orgId) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, orgId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error fetching fiscal settings:", error);
            throw error;
        }
    },

    /**
     * Save or update fiscal settings
     */
    saveSettings: async (orgId, data) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, orgId);
            await setDoc(docRef, { ...data, updatedAt: new Date() }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error saving fiscal settings:", error);
            throw error;
        }
    },

    /**
     * Upload Digital Certificate (Mock)
     */
    uploadCertificate: async (orgId, file, _password) => {
        try {
            // In a real app, this would upload the .pfx file to a secure storage bucket
            // and maybe send it to a server-side function to validate and install.
            console.log("Mock uploading certificate:", file.name);

            const docRef = doc(db, COLLECTION_NAME, orgId);
            await updateDoc(docRef, {
                certificateName: file.name,
                certificateExpiry: "2025-12-31", // Mock expiry
                certificateStatus: "active",
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error("Error uploading certificate:", error);
            throw error;
        }
    },

    /**
     * Emit NFC-e via Cloud Function
     */
    emitNFCe: async (saleData, orgId) => {
        console.log("Requesting NFC-e emission for sale:", saleData);
        try {
            const functions = getFunctions();
            const emitInvoice = httpsCallable(functions, 'emitInvoice');

            // Call the backend function
            const result = await emitInvoice({
                saleId: saleData.id,
                orgId: orgId
            });

            return result.data;
        } catch (error) {
            console.error("Cloud Function Emission Error:", error);
            throw error;
        }
    }
};
