import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

const NotificationContext = createContext();

// Simple Crystal Bell Sound (Data URI)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // This is too short/invalid. 
// Let's use a real short beep base64.
// Softer, more subtle Pop/Click sound
const BEEP_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3'; // Bubbles/Soft Pop

export function NotificationProvider({ children, user, userProfile }) {
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('erp_notifications_v3');
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed.slice(0, 50) : []; // Auto-prune to last 50
    });

    const unreadCount = useMemo(() => {
        return Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;
    }, [notifications]);

    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [currentNotification, setCurrentNotification] = useState(null); // Make sure this is declared

    useEffect(() => {
        if (currentNotification) {
            const timer = setTimeout(() => {
                setCurrentNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentNotification]);

    useEffect(() => {
        localStorage.setItem('erp_notifications_v3', JSON.stringify(notifications));
        // unreadCount is derived, no need to save separate count anymore if we don't init from it
    }, [notifications]);

    const [hasPermission, setHasPermission] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    });
    const audioRef = useRef(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        audioRef.current = new Audio(BEEP_SOUND);
        audioRef.current.volume = 0.4; // 40% Volume - Less intrusive
    }, []);

    // Request Permission on Mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                setHasPermission(perm === 'granted');
            });
        }
    }, []);

    // Listen to Orders & Leads
    useEffect(() => {
        if (!user) return;

        const orgId = userProfile?.organizationId || user.uid;

        // 1. Order Listener
        const qOrders = query(
            collection(db, 'orders'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        // 2. Lead Listener (Chat/Catalog Interests)
        const qLeads = query(
            collection(db, 'leads'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        // 3. Stock Level Listener (Critical Alerta)
        const qLowStock = query(
            collection(db, 'stock'),
            where('organizationId', '==', orgId),
            orderBy('updatedAt', 'desc'),
            limit(10)
        );

        // 4. Internal Requests Listener
        const qInternal = query(
            collection(db, 'internal_requests'),
            where('organizationId', '==', orgId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        // 5. Chats Listener (Global Inbox Alert)
        const qChats = query(
            collection(db, 'chats'),
            where('organizationId', '==', orgId),
            orderBy('lastUpdated', 'desc'),
            limit(10)
        );

        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            let pending = 0;
            snapshot.docs.forEach(doc => {
                if (doc.data().status === 'pending') pending++;
            });
            setPendingOrdersCount(pending);

            if (isFirstLoad.current) return;

            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
                    const isRecent = (Date.now() - createdAt < 120000); // 2 minutes window
                    if (isRecent) {
                        triggerNotification(
                            `📦 Novo Pedido: ${data.customer?.name || 'Cliente'}`,
                            `Valor: R$ ${data.total || '0,00'}`,
                            'orders'
                        );
                    }
                }
            });
        });

        const unsubLeads = onSnapshot(qLeads, (snapshot) => {
            if (isFirstLoad.current) return;

            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
                    const isRecent = (Date.now() - createdAt < 120000); // 2 minutes window
                    if (isRecent) {
                        triggerNotification(
                            `🔥 Novo Interesse: ${data.customerData?.name || 'Cliente'}`,
                            `Produto: ${data.productName || 'Vitrini'}`,
                            'inbox'
                        );
                    }
                }
            });
        });

        const unsubStock = onSnapshot(qLowStock, (snapshot) => {
            if (isFirstLoad.current) return;

            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const data = change.doc.data();
                    const lowThreshold = data.minQuantity || 5;

                    if (data.quantity <= lowThreshold) {
                        const updatedAt = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now();
                        const isJustUpdated = (Date.now() - updatedAt < 60000);
                        if (isJustUpdated) {
                            triggerNotification(
                                `⚠️ Estoque Crítico: ${data.name}`,
                                `Apenas ${data.quantity} un. restantes!`,
                                'stock'
                            );
                        }
                    }
                }
            });
        });

        const unsubInternal = onSnapshot(qInternal, (snapshot) => {
            if (isFirstLoad.current) return;

            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 :
                        (data.createdAt instanceof Date ? data.createdAt.getTime() : Date.now());
                    const isRecent = (Date.now() - createdAt < 120000); // 2 minutes window
                    if (isRecent) {
                        triggerNotification(
                            `📌 Nova Solicitação: ${data.title}`,
                            `Por: ${data.requesterName}`,
                            'requests'
                        );
                    }
                }
            });
        });

        // Set isFirstLoad to false after a short delay to ensure initial snapshots are processed
        const unsubChats = onSnapshot(qChats, (snapshot) => {
            if (isFirstLoad.current) return;

            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (change.type === 'modified' || change.type === 'added') {
                    const lastMsg = data.messages?.[data.messages.length - 1];
                    if (lastMsg && lastMsg.sender !== 'agent') {
                        const updatedAt = data.lastUpdated?.seconds ? data.lastUpdated.seconds * 1000 : Date.now();
                        if (Date.now() - updatedAt < 120000) {
                            triggerNotification(
                                `💬 Nova Mensagem de ${data.customerName || 'Cliente'}`,
                                lastMsg.text || 'Enviou uma foto',
                                'inbox'
                            );
                        }
                    }
                }
            });
        });

        const timeout = setTimeout(() => {
            isFirstLoad.current = false;
        }, 3000);

        return () => {
            clearTimeout(timeout);
            unsubOrders();
            unsubStock();
            unsubInternal();
            unsubChats();
        };
    }, [user, userProfile]);

    const triggerNotification = (title, body, targetView = null) => {
        // 1. Play Sound (User interaction check)
        if (audioRef.current) {
            audioRef.current.play().catch(() => {
                console.log("Audio waiting for first user click to unlock.");
            });
        }

        // 2. Browser Notification
        if (hasPermission && typeof window !== 'undefined' && 'Notification' in window) {
            try {
                // Determine if we should be noisy
                const isPriority = ['stock', 'orders'].includes(targetView);

                const n = new Notification("VeloCell ERP", {
                    body: `${title}\n${body}`,
                    icon: '/favicon.png', // Ensure this path is valid
                    tag: 'erp-alert-' + Date.now(), // Unique tag to prevent overwriting unless desired
                    requireInteraction: true, // Key for "overlay" behavior (stays on screen)
                    silent: false
                });
                n.onclick = () => { window.focus(); n.close(); };
            } catch (e) {
                console.error("System notification failed:", e);
            }
        }

        // 3. Add to persisted list
        setNotifications(prev => {
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return [{
                id: newId,
                title,
                body,
                targetView,
                read: false,
                timestamp: new Date().toISOString()
            }, ...prev].slice(0, 50);
        });

        // 4. Show In-App Floating Card
        setCurrentNotification({ title, body, targetView });
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => {
            if (n.id === id && !n.read) {
                return { ...n, read: true };
            }
            return n;
        }));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(item => item.id !== id));
    };

    const testNotification = () => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(perm => {
                setHasPermission(perm === 'granted');
                if (perm === 'granted') {
                    triggerNotification("🔔 Teste de Notificação", "As notificações estão funcionando corretamente!");
                } else {
                    alert("Por favor, habilite as notificações no seu navegador para receber alertas.");
                }
            });
        } else {
            triggerNotification("🔔 Teste de Notificação", "As notificações estão funcionando corretamente!");
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            pendingOrdersCount,
            markAllAsRead,
            markAsRead,
            deleteNotification,
            clearNotifications,
            testNotification,
            hasPermission,
            requestPermission: () => {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    return Notification.requestPermission();
                }
                return Promise.resolve('denied');
            }
        }}>
            {children}

            {/* In-App Floating Notification Card */}
            {currentNotification && (
                <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right duration-500 fade-in">
                    <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                            setCurrentNotification(null);
                            // Start navigation if needed, or just dismiss
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
                            <span className="text-xl">🔔</span>
                        </div>
                        <div>
                            <h4 className="font-black text-sm">{currentNotification.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{currentNotification.body}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentNotification(null); }}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
