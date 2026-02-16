import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../dashboard/Sidebar';
import { MobileNav } from '../dashboard/MobileNav';
import { AutoUpdate } from '../AutoUpdate';

import { CommandPalette } from '../ui/CommandPalette';
import { NotificationCenter } from '../dashboard/NotificationCenter';
import { cn } from '../../lib/utils';
import { Menu, MessageSquarePlus, X, AlertCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function DashboardLayout({
    user,
    userProfile,
    settings,
    isSalesMode,
    onToggleSalesMode,
    onLogout,
    onToggleDarkMode,
    darkMode,
    proposalCount,
    ordersCount
}) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadResponses, setUnreadResponses] = useState([]);
    const [unviewedRequests, setUnviewedRequests] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'internal_requests'),
            where('requesterId', '==', user.uid),
            where('hasUnreadResponse', '==', true)
        );
        const unsub = onSnapshot(q, (snap) => {
            setUnreadResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    // Admin Notification Logic
    useEffect(() => {
        if (!user || !userProfile?.organizationId || (userProfile.role !== 'owner' && userProfile.role !== 'admin')) return;

        const q = query(
            collection(db, 'internal_requests'),
            where('organizationId', '==', userProfile.organizationId),
            where('viewedByAdmin', '==', false)
        );

        const unsub = onSnapshot(q, (snap) => {
            // Filter out my own requests (admin shouldn't be notified of their own creation)
            const relevant = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => r.requesterId !== user.uid);
            setUnviewedRequests(relevant);
        });
        return () => unsub();
    }, [user, userProfile]);

    // Command K Listener
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandPaletteOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Map current path to view ID for Sidebar highlighting compatibility
    const getCurrentView = () => {
        const path = location.pathname.split('/').pop();
        if (!path || path === 'dashboard') return 'dashboard';

        const reverseMap = {
            'proposals': 'proposal',
            'pos': 'quick_pos',
            'checkout': 'smart_sale',
            'ocr': 'mass',
            'lab': 'tech_lab',
            'cashflow': 'cash_flow',
            // Default: path matches ID
        };
        return reverseMap[path] || path;
    };

    // Navigation logic handled by child components now

    return (
        <div className={cn("flex min-h-screen transition-colors duration-300", darkMode ? "bg-slate-950" : "bg-slate-50")}>

            {/* Sidebar */}
            <Sidebar
                currentView={getCurrentView()}
                userProfile={userProfile}
                isMobileOpen={isMobileNavOpen}
                setIsMobileOpen={setIsMobileNavOpen}
                proposalCount={proposalCount}
                ordersCount={ordersCount}
                isSalesMode={isSalesMode}
                onToggleSalesMode={onToggleSalesMode}
                onLogout={onLogout}
                settings={settings}
                onOpenNotifications={() => setIsNotificationOpen(true)}
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 min-w-0 md:pl-0 pb-20 md:pb-0 relative flex flex-col">

                {/* Admin Request Notification Bar */}
                {unviewedRequests.length > 0 && (
                    <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between shadow-lg relative z-50 animate-in slide-in-from-top duration-300 border-b border-emerald-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full animate-pulse hidden md:block">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">
                                    {unviewedRequests.length === 1
                                        ? `Nova solicitação: "${unviewedRequests[0].title}"`
                                        : `Você tem ${unviewedRequests.length} novas solicitações!`}
                                </p>
                                <p className="text-[10px] md:text-xs text-emerald-100">
                                    {unviewedRequests.length === 1
                                        ? `De ${unviewedRequests[0].requesterName}`
                                        : 'Aguardando sua revisão.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => unviewedRequests.length === 1
                                    ? navigate('/dashboard/requests', { state: { requestId: unviewedRequests[0].id } })
                                    : navigate('/dashboard/requests')
                                }
                                className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-sm whitespace-nowrap"
                            >
                                {unviewedRequests.length === 1 ? 'Responder' : 'Ver Todas'}
                            </button>
                            <button
                                onClick={async () => {
                                    for (const r of unviewedRequests) {
                                        try {
                                            await updateDoc(doc(db, 'internal_requests', r.id), { viewedByAdmin: true });
                                        } catch (e) { console.error(e); }
                                    }
                                }}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Response Notification Bar */}
                {unreadResponses.length > 0 && (
                    <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg relative z-40 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full animate-pulse hidden md:block">
                                <MessageSquarePlus className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">
                                    {unreadResponses.length === 1
                                        ? `Sua solicitação "${unreadResponses[0].title}" foi respondida!`
                                        : `Você tem ${unreadResponses.length} novas respostas!`}
                                </p>
                                <p className="text-[10px] md:text-xs text-indigo-200">Clique em ver para conferir a resposta da administração.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => unreadResponses.length === 1
                                    ? navigate('/dashboard/requests', { state: { requestId: unreadResponses[0].id } })
                                    : navigate('/dashboard/requests')
                                }
                                className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
                            >
                                Ver Agora
                            </button>
                            <button
                                onClick={async () => {
                                    for (const r of unreadResponses) {
                                        try {
                                            await updateDoc(doc(db, 'internal_requests', r.id), { hasUnreadResponse: false });
                                        } catch (e) { console.error(e); }
                                    }
                                }}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 sticky top-0 z-30">
                    <button onClick={() => setIsMobileNavOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-black text-lg text-slate-800 dark:text-white">Phone Smart</span>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                <div className="p-4 md:p-8 w-full">
                    <Outlet context={{
                        onOpenNotifications: () => setIsNotificationOpen(true),
                        onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
                        notificationCount: unreadResponses.length + unviewedRequests.length
                    }} />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <MobileNav
                currentView={getCurrentView()}
                onToggleSidebar={() => setIsMobileNavOpen(true)}
                onOpenNotifications={() => setIsNotificationOpen(true)}
            />

            <AutoUpdate />
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
            <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} darkMode={darkMode} />
        </div>
    );
}
