import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const SETTINGS_COLLECTION = 'settings';
const STORE_ID = 'default_store';
const LOCAL_STORAGE_KEY = 'precifica_ai_settings';

export const SettingsService = {
    // Load settings from Firestore (or LocalStorage fallback)
    loadSettings: async (userId) => {
        if (!userId) {
            console.error("No userId provided to loadSettings");
            return null;
        }

        const userKey = `${LOCAL_STORAGE_KEY}_${userId}`;

        try {
            // Try Firebase first
            const docRef = doc(db, SETTINGS_COLLECTION, userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Sync to local storage for offline use/speed next time
                localStorage.setItem(userKey, JSON.stringify(data));
                return data;
            } else {
                // If not in Firebase, check LocalStorage for this user
                const local = localStorage.getItem(userKey);
                // Fallback to legacy generic key if nothing for this user yet
                const fallback = localStorage.getItem(LOCAL_STORAGE_KEY);
                return local ? JSON.parse(local) : (fallback ? JSON.parse(fallback) : null);
            }
        } catch (error) {
            console.warn("Firebase load failed (Permissions/Network), falling back to LocalStorage:", error);
            // Fallback
            const local = localStorage.getItem(userKey);
            const fallback = localStorage.getItem(LOCAL_STORAGE_KEY);
            return local ? JSON.parse(local) : (fallback ? JSON.parse(fallback) : null);
        }
    },

    // Save/Overwrite settings
    saveSettings: async (settings, userId) => {
        if (!userId) {
            console.error("No userId provided to saveSettings");
            throw new Error("User ID required for cloud sync");
        }

        const userKey = `${LOCAL_STORAGE_KEY}_${userId}`;
        // Always save to LocalStorage first for immediate fallback availability
        localStorage.setItem(userKey, JSON.stringify(settings));

        try {
            const docRef = doc(db, SETTINGS_COLLECTION, userId);
            await setDoc(docRef, settings, { merge: true });
            console.log("Cloud sync successful for settings");
            return true;
        } catch (error) {
            console.error("Firebase Sync Error:", error);
            // Re-throw to inform the caller/UI about the cloud failure
            throw error;
        }
    }
};
