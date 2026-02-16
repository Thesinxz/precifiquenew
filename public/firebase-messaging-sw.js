importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCFsxne2pwbexrPI-un9jHapMu2ZcbiGiU",
    authDomain: "precifiqueantigravity.firebaseapp.com",
    projectId: "precifiqueantigravity",
    storageBucket: "precifiqueantigravity.firebasestorage.app",
    messagingSenderId: "1075911406444",
    appId: "1:1075911406444:web:4ee60cd536d9f2408f3949",
    measurementId: "G-VPZYZRCLM1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Nova Notificação';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/logo192.png',
        badge: '/logo192.png',
        tag: payload.data?.tag || 'default',
        data: payload.data,
        requireInteraction: payload.data?.priority === 'high',
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Handle different notification types
    const data = event.notification.data || {};
    let url = '/dashboard';

    switch (data.type) {
        case 'order':
            url = `/dashboard/orders`;
            break;
        case 'service_order':
            url = `/dashboard/lab`;
            break;
        case 'message':
            url = `/dashboard/inbox`;
            break;
        case 'stock':
            url = `/dashboard/stock`;
            break;
        case 'team_request':
            url = `/dashboard/requests`;
            break;
        default:
            url = '/dashboard';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes('/dashboard') && 'focus' in client) {
                    client.focus();
                    client.postMessage({
                        type: 'NOTIFICATION_CLICK',
                        data: data,
                        url: url
                    });
                    return;
                }
            }

            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Handle push events (for custom handling)
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event:', event);

    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[firebase-messaging-sw.js] Push data:', data);
        } catch (error) {
            console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
        }
    }
});
