import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    orderBy,
    serverTimestamp,
    getDoc,
    runTransaction
} from 'firebase/firestore';
import { WhatsappService } from './whatsappService';
import { notificationService } from './notificationService';

export const ServiceOrderService = {
    async getNextOSNumber(orgId) {
        if (!orgId) throw new Error("Organization ID required");
        const counterRef = doc(db, 'counters', `os_${orgId}`);

        try {
            return await runTransaction(db, async (transaction) => {
                const counterSnap = await transaction.get(counterRef);
                let nextNumber = 1;

                if (counterSnap.exists()) {
                    nextNumber = (counterSnap.data().current || 0) + 1;
                    transaction.update(counterRef, { current: nextNumber });
                } else {
                    transaction.set(counterRef, { current: 1 });
                }

                return nextNumber;
            });
        } catch (error) {
            console.error("Error generating sequential OS number:", error);
            throw error;
        }
    },

    async createOS(orgId, osData) {
        if (!orgId) throw new Error("Organization ID required");

        try {
            const osNumber = await this.getNextOSNumber(orgId);

            const dataToSave = {
                ...osData,
                osNumber,
                organizationId: orgId,
                status: osData.status || 'triagem',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                history: [
                    {
                        status: osData.status || 'triagem',
                        note: osData.historyNote || 'Abertura de Ordem de Serviço',
                        date: new Date()
                    }
                ]
            };

            if (dataToSave.historyNote) delete dataToSave.historyNote;

            const docRef = await addDoc(collection(db, 'technical_lab'), dataToSave);

            // Trigger WhatsApp automation for OS created
            try {
                const osDataForMessage = {
                    id: docRef.id,
                    osNumber: `OS-${String(osNumber).padStart(4, '0')}`,
                    client: osData.client,
                    clientName: osData.client?.name || osData.ownerName,
                    clientPhone: osData.client?.phone || osData.ownerPhone,
                    device: osData.device,
                    model: osData.device?.model || osData.model,
                    issue: osData.defect || osData.issue,
                    endDate: osData.endDate,
                    totalValue: osData.totalValue
                };

                await WhatsappService.triggerOSMessage(orgId, osData.userId, osDataForMessage, 'osCreated');
            } catch (whatsappError) {
                console.error("WhatsApp automation error (non-critical):", whatsappError);
                // Don't throw - WhatsApp error shouldn't block OS creation
            }

            // Trigger push notification for new OS
            try {
                await notificationService.notifyNewServiceOrder({
                    id: docRef.id,
                    osNumber: `OS-${String(osNumber).padStart(4, '0')}`,
                    device: osData.device
                });
            } catch (notifError) {
                console.error("Notification error (non-critical):", notifError);
            }

            return { id: docRef.id, osNumber };
        } catch (error) {
            console.error("Error creating service order:", error);
            throw error;
        }
    },

    async getOS(orgId) {
        if (!orgId) return [];
        try {
            const q = query(
                collection(db, 'technical_lab'),
                where("organizationId", "==", orgId),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching service orders:", error);
            throw error;
        }
    },

    async updateOS(id, updates) {
        try {
            const osRef = doc(db, 'technical_lab', id);
            const dataToUpdate = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            if (dataToUpdate.client) {
                dataToUpdate.ownerName = dataToUpdate.client.name;
                dataToUpdate.ownerPhone = dataToUpdate.client.phone;
                dataToUpdate.clientId = dataToUpdate.client.id;
                delete dataToUpdate.client;
            }

            await updateDoc(osRef, dataToUpdate);
            return true;
        } catch (error) {
            console.error("Error updating service order:", error);
            throw error;
        }
    },

    async addHistory(id, status, note, orgId = null, userId = null) {
        try {
            const osRef = doc(db, 'technical_lab', id);
            const osSnap = await getDoc(osRef);
            if (osSnap.exists()) {
                const currentHistory = osSnap.data().history || [];
                const osData = osSnap.data();

                await updateDoc(osRef, {
                    status,
                    history: [
                        ...currentHistory,
                        {
                            status,
                            note,
                            date: new Date()
                        }
                    ],
                    updatedAt: serverTimestamp()
                });

                // Trigger WhatsApp automation based on status
                if (orgId && userId) {
                    try {
                        let eventType = null;

                        // Map status to WhatsApp event
                        if (status === 'approved' || status === 'aprovado') {
                            eventType = 'osApproved';
                        } else if (status === 'completed' || status === 'pronto' || status === 'concluido') {
                            eventType = 'osCompleted';
                        } else if (status === 'delayed' || status === 'atrasado') {
                            eventType = 'osDelayed';
                        }

                        if (eventType) {
                            const osDataForMessage = {
                                id,
                                osNumber: `OS-${String(osData.osNumber).padStart(4, '0')}`,
                                client: osData.client,
                                clientName: osData.client?.name || osData.ownerName,
                                clientPhone: osData.client?.phone || osData.ownerPhone,
                                device: osData.device,
                                model: osData.device?.model || osData.model,
                                issue: osData.defect || osData.issue,
                                endDate: osData.endDate,
                                totalValue: osData.totalValue
                            };

                            await WhatsappService.triggerOSMessage(orgId, userId, osDataForMessage, eventType);
                        }
                    } catch (whatsappError) {
                        console.error("WhatsApp automation error (non-critical):", whatsappError);
                        // Don't throw - WhatsApp error shouldn't block status update
                    }
                }
            }
        } catch (error) {
            console.error("Error adding history:", error);
            throw error;
        }
    }
};
