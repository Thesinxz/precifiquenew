import { db } from "../lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    serverTimestamp,
    addDoc
} from "firebase/firestore";

const COLLECTION_NAME = "users";
const LOGS_COLLECTION = "login_logs";

export const UserService = {
    /**
     * Log user login event
     */
    logLogin: async (uid, profile) => {
        try {
            await addDoc(collection(db, LOGS_COLLECTION), {
                userId: uid,
                userName: profile?.name || 'Sistema',
                organizationId: profile?.organizationId || uid,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            });
        } catch (error) {
            console.error("Error logging login:", error);
        }
    },
    /**
     * Get user profile by UID
     */
    getProfile: async (uid) => {
        if (!uid) return null;
        try {
            const docRef = doc(db, COLLECTION_NAME, uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }
    },

    /**
     * Get all users in the same organization
     */
    getTeam: async (organizationId) => {
        if (!organizationId) return [];
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("organizationId", "==", organizationId)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching team:", error);
            throw error;
        }
    },

    /**
     * Update user role
     */
    updateRole: async (uid, newRole) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, uid);
            await updateDoc(docRef, {
                role: newRole,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating role:", error);
            throw error;
        }
    },

    /**
     * Update generic user data (goals, settings)
     */
    updateUser: async (uid, data) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, uid);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    },

    /**
     * Delete user profile (Remove from team)
     */
    deleteUser: async (uid) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, uid);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    },

    /**
     * Validate if an organization code (UID) exists
     */
    validateOrganization: async (orgId) => {
        if (!orgId) return false;
        try {
            // Check if the organization owner's profile exists
            const docRef = doc(db, COLLECTION_NAME, orgId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) return false;
            
            const data = docSnap.data();
            // Ensure the user is actually an owner
            return data.role === 'owner';
        } catch (error) {
            console.error("Error validating organization:", error);
            return false;
        }
    }
};
