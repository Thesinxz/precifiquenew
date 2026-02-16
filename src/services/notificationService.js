import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

// Your Firebase Cloud Messaging VAPID key (get from Firebase Console)
const VAPID_KEY = 'INJaVZIJQnRdG8aiBb9ygzryh3dzNIpJSzK3960NKrI'; // TODO: Replace with actual VAPID key

class NotificationService {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.isSupported = false;
        this.checkSupport();
    }

    checkSupport() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async initialize() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported in this browser');
            return false;
        }

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered:', registration);

            // Initialize Firebase Messaging
            const { messaging } = await import('firebase/messaging');
            this.messaging = getMessaging();

            return true;
        } catch (error) {
            console.error('Error initializing notifications:', error);
            return false;
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            return { granted: false, error: 'Not supported' };
        }

        try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Notification permission granted');
                return { granted: true };
            } else {
                console.log('Notification permission denied');
                return { granted: false, error: 'Permission denied' };
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            return { granted: false, error: error.message };
        }
    }

    async getDeviceToken(userId, organizationId) {
        if (!this.messaging) {
            await this.initialize();
        }

        if (!this.messaging) {
            return null;
        }

        try {
            const token = await getToken(this.messaging, { vapidKey: VAPID_KEY });

            if (token) {
                this.currentToken = token;
                console.log('FCM Token:', token);

                // Save token to Firestore
                await this.saveTokenToFirestore(userId, organizationId, token);

                return token;
            } else {
                console.log('No registration token available');
                return null;
            }
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    async saveTokenToFirestore(userId, organizationId, token) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token),
                lastTokenUpdate: serverTimestamp(),
                organizationId: organizationId
            });
            console.log('Token saved to Firestore');
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    setupForegroundListener(callback) {
        if (!this.messaging) {
            console.warn('Messaging not initialized');
            return;
        }

        onMessage(this.messaging, (payload) => {
            console.log('Foreground message received:', payload);

            const { title, body, icon, data } = payload.notification || {};

            // Show notification
            this.showNotification(title, {
                body,
                icon: icon || '/logo192.png',
                badge: '/logo192.png',
                tag: data?.tag || 'default',
                data: data,
                requireInteraction: data?.priority === 'high'
            });

            // Call callback if provided
            if (callback) {
                callback(payload);
            }
        });
    }

    async showNotification(title, options = {}) {
        if (!this.isSupported) {
            return;
        }

        if (Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    icon: '/logo192.png',
                    badge: '/logo192.png',
                    vibrate: [200, 100, 200],
                    ...options
                });
            } catch (error) {
                console.error('Error showing notification:', error);
            }
        }
    }

    // Trigger notifications for specific events
    async notifyNewOrder(orderData) {
        await this.showNotification('🛍️ Novo Pedido Online!', {
            body: `Pedido #${orderData.id.slice(0, 6)} - ${orderData.customerName}`,
            tag: 'new-order',
            data: { type: 'order', orderId: orderData.id },
            requireInteraction: true
        });
    }

    async notifyNewServiceOrder(osData) {
        await this.showNotification('🔧 Nova Ordem de Serviço!', {
            body: `OS #${osData.osNumber} - ${osData.device?.model || 'Aparelho'}`,
            tag: 'new-os',
            data: { type: 'service_order', osId: osData.id },
            requireInteraction: true
        });
    }

    async notifyNewMessage(messageData) {
        await this.showNotification('💬 Nova Mensagem de Cliente', {
            body: messageData.text || 'Você recebeu uma nova mensagem',
            tag: 'new-message',
            data: { type: 'message', chatId: messageData.chatId }
        });
    }

    async notifyLowStock(productData) {
        await this.showNotification('⚠️ Estoque Baixo!', {
            body: `${productData.name} - Apenas ${productData.quantity} unidades restantes`,
            tag: 'low-stock',
            data: { type: 'stock', productId: productData.id }
        });
    }

    async notifyOSStatusChange(osData, newStatus) {
        const statusMessages = {
            'aprovado': '✅ OS Aprovada pelo Cliente',
            'pronto': '🎉 OS Concluída e Pronta para Retirada',
            'cancelado': '❌ OS Cancelada',
            'atrasado': '⏰ OS Atrasada - Atenção Necessária'
        };

        const message = statusMessages[newStatus] || 'Status da OS Atualizado';

        await this.showNotification(message, {
            body: `OS #${osData.osNumber} - ${osData.device?.model || 'Aparelho'}`,
            tag: `os-status-${osData.id}`,
            data: { type: 'os_status', osId: osData.id, status: newStatus }
        });
    }

    async notifyTeamRequest(requestData) {
        await this.showNotification('📋 Nova Solicitação da Equipe', {
            body: `${requestData.requesterName}: ${requestData.title}`,
            tag: 'team-request',
            data: { type: 'team_request', requestId: requestData.id },
            requireInteraction: true
        });
    }

    // Check if notifications are enabled
    isEnabled() {
        return this.isSupported && Notification.permission === 'granted';
    }

    // Get permission status
    getPermissionStatus() {
        if (!this.isSupported) {
            return 'unsupported';
        }
        return Notification.permission;
    }
}

export const notificationService = new NotificationService();
