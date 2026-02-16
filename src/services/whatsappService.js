import { db } from '../lib/firebase';
import {
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

// Default message templates
const DEFAULT_TEMPLATES = {
    osCreated: {
        id: 'osCreated',
        name: 'OS Criada',
        message: `Olá {clientName}! 👋

Recebemos seu aparelho *{model}* para reparo.

📋 *OS #{osNumber}*
🔧 Problema: {issue}
📅 Previsão: {forecastDate}

Acompanhe o status em tempo real:
{trackingLink}

Qualquer dúvida, estamos à disposição!`,
        enabled: true
    },
    osApproved: {
        id: 'osApproved',
        name: 'Orçamento Aprovado',
        message: `Ótima notícia, {clientName}! ✅

Seu orçamento foi aprovado e já iniciamos o reparo do seu *{model}*.

📋 *OS #{osNumber}*
💰 Valor: R$ {totalValue}
⏱️ Previsão de conclusão: {forecastDate}

Acompanhe em tempo real:
{trackingLink}`,
        enabled: true
    },
    osCompleted: {
        id: 'osCompleted',
        name: 'OS Concluída',
        message: `Seu aparelho está pronto! 🎉

{clientName}, o reparo do seu *{model}* foi concluído com sucesso!

📋 *OS #{osNumber}*
✅ Status: Pronto para retirada
💰 Valor: R$ {totalValue}

📍 Retire na loja durante nosso horário de funcionamento.

Obrigado pela confiança! 😊`,
        enabled: true
    },
    osDelayed: {
        id: 'osDelayed',
        name: 'OS Atrasada',
        message: `{clientName}, informamos que houve um atraso no reparo do seu *{model}*.

📋 *OS #{osNumber}*
⏰ Nova previsão: {forecastDate}

Pedimos desculpas pelo transtorno. Estamos trabalhando para concluir o mais rápido possível.

Acompanhe:
{trackingLink}`,
        enabled: true
    }
};

export const WhatsappService = {
    /**
     * Tries to send a message via API. Returns status or fallback link.
     */
    async sendMessage(orgId, phone, text) {
        try {
            // 1. Normalize Phone
            const cleanPhone = phone.replace(/\D/g, '');
            // Ensure 55 country code for Brazil if missing (heuristic)
            const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

            // 2. Get Integration Settings
            const settingsRef = doc(db, 'settings', orgId);
            const settingsSnap = await getDoc(settingsRef);
            const settings = settingsSnap.exists() ? settingsSnap.data() : {};

            const integrations = settings.integrations || {};
            const apiKey = integrations.whatchimpKey;

            // 3. API Send Strategy
            if (apiKey) {
                // Example Whatchimp / Generic WhatsApp API implementation
                // Replace URL with exact endpoint from documentation provided by user or found
                const response = await fetch('https://api.whatchimp.com/api/v1/send-message', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        number: formattedPhone, // Whatchimp uses 'number' usually
                        message: text
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("WhatsApp API Error:", errorData);
                    throw new Error(errorData.message || 'Falha no envio API');
                }

                return { success: true, method: 'api' };
            }

            // 4. No API Key -> Return Link for Manual Send
            const link = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
            return { success: false, method: 'link', link };

        } catch (error) {
            console.error("WhatsApp Service Error:", error);
            // On error, suggest fallback link
            const cleanPhone = phone.replace(/\D/g, '');
            const formated = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
            const link = `https://wa.me/${formated}?text=${encodeURIComponent(text)}`;
            return { success: false, method: 'link', link, error: error.message };
        }
    },

    /**
     * Get all templates for an organization
     */
    async getTemplates(orgId) {
        if (!orgId) return DEFAULT_TEMPLATES;

        try {
            const q = query(
                collection(db, "whatsappTemplates"),
                where("organizationId", "==", orgId)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return DEFAULT_TEMPLATES;
            }

            const templates = {};
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                templates[data.id] = { ...data, docId: docSnap.id };
            });

            return { ...DEFAULT_TEMPLATES, ...templates };
        } catch (error) {
            console.error("Error fetching templates:", error);
            return DEFAULT_TEMPLATES;
        }
    },

    /**
     * Save/Update a template
     */
    async saveTemplate(orgId, templateData) {
        if (!orgId) throw new Error("Organization ID required");

        try {
            const q = query(
                collection(db, "whatsappTemplates"),
                where("organizationId", "==", orgId),
                where("id", "==", templateData.id)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                await addDoc(collection(db, "whatsappTemplates"), {
                    ...templateData,
                    organizationId: orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                const docRef = doc(db, "whatsappTemplates", snapshot.docs[0].id);
                await updateDoc(docRef, {
                    ...templateData,
                    updatedAt: serverTimestamp()
                });
            }

            return true;
        } catch (error) {
            console.error("Error saving template:", error);
            throw error;
        }
    },

    /**
     * Replace template variables with actual data
     */
    fillTemplate(template, data) {
        let message = template;

        const replacements = {
            '{clientName}': data.clientName || 'Cliente',
            '{model}': data.model || 'aparelho',
            '{osNumber}': data.osNumber || '---',
            '{issue}': data.issue || 'Não especificado',
            '{forecastDate}': data.forecastDate || 'A definir',
            '{totalValue}': data.totalValue || '0,00',
            '{trackingLink}': data.trackingLink || ''
        };

        Object.entries(replacements).forEach(([key, value]) => {
            message = message.replace(new RegExp(key, 'g'), value);
        });

        return message;
    },

    /**
     * Generate tracking link for OS
     */
    generateTrackingLink(osId) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/track/${osId}`;
    },

    /**
     * Send WhatsApp message via web (opens WhatsApp)
     */
    sendMessageWeb(phone, message) {
        if (!phone) throw new Error("Phone number required");

        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        return true;
    },

    /**
     * Log sent message
     */
    async logMessage(orgId, userId, messageData) {
        if (!orgId || !userId) return;

        try {
            await addDoc(collection(db, "whatsappLogs"), {
                organizationId: orgId,
                userId,
                ...messageData,
                sentAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error logging message:", error);
        }
    },

    /**
     * Trigger automated message based on OS event
     */
    async triggerOSMessage(orgId, userId, osData, eventType) {
        if (!orgId || !osData) return;

        try {
            const templates = await this.getTemplates(orgId);
            const template = templates[eventType];

            if (!template || !template.enabled) {
                console.log(`Template ${eventType} is disabled or not found`);
                return null;
            }

            // Prepare data for template
            const templateData = {
                clientName: osData.client?.name || osData.clientName,
                model: osData.device?.model || osData.model,
                osNumber: osData.osNumber || osData.id?.substring(0, 8),
                issue: osData.issue || osData.defect,
                forecastDate: osData.endDate ?
                    (osData.endDate.seconds ?
                        new Date(osData.endDate.seconds * 1000).toLocaleDateString('pt-BR') :
                        new Date(osData.endDate).toLocaleDateString('pt-BR')
                    ) : 'A definir',
                totalValue: osData.totalValue ? parseFloat(osData.totalValue).toFixed(2) : '0,00',
                trackingLink: this.generateTrackingLink(osData.id)
            };

            const message = this.fillTemplate(template.message, templateData);

            // Log the message
            await this.logMessage(orgId, userId, {
                osId: osData.id,
                osNumber: templateData.osNumber,
                clientName: templateData.clientName,
                phone: osData.client?.phone || osData.clientPhone,
                templateId: eventType,
                message,
                status: 'prepared'
            });

            return {
                message,
                phone: osData.client?.phone || osData.clientPhone,
                templateData
            };
        } catch (error) {
            console.error("Error triggering OS message:", error);
            throw error;
        }
    },

    /**
     * Get message history for an OS
     */
    async getOSMessageHistory(orgId, osId) {
        if (!orgId || !osId) return [];

        try {
            const q = query(
                collection(db, "whatsappLogs"),
                where("organizationId", "==", orgId),
                where("osId", "==", osId)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
                sentAt: docSnap.data().sentAt?.toDate()
            }));
        } catch (error) {
            console.error("Error fetching message history:", error);
            return [];
        }
    }
};
