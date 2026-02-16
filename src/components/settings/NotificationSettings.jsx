import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Settings as SettingsIcon, Smartphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { notificationService } from '../../services/notificationService';

export function NotificationSettings({ user, userProfile }) {
    const { showToast } = useToast();
    const [isEnabled, setIsEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('default');
    const [isLoading, setIsLoading] = useState(false);
    const [deviceToken, setDeviceToken] = useState(null);

    // Notification preferences
    const [preferences, setPreferences] = useState({
        newOrders: true,
        newServiceOrders: true,
        newMessages: true,
        lowStock: true,
        osStatusChanges: true,
        teamRequests: true
    });

    useEffect(() => {
        checkNotificationStatus();
    }, []);

    const checkNotificationStatus = () => {
        const status = notificationService.getPermissionStatus();
        setPermissionStatus(status);
        setIsEnabled(status === 'granted');
    };

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        try {
            // Initialize service
            const initialized = await notificationService.initialize();
            if (!initialized) {
                showToast('Notificações não suportadas neste navegador', 'error');
                setIsLoading(false);
                return;
            }

            // Request permission
            const { granted, error } = await notificationService.requestPermission();

            if (granted) {
                // Get device token
                const token = await notificationService.getDeviceToken(
                    user.uid,
                    userProfile?.organizationId
                );

                if (token) {
                    setDeviceToken(token);
                    setIsEnabled(true);
                    setPermissionStatus('granted');

                    // Setup foreground listener
                    notificationService.setupForegroundListener((payload) => {
                        console.log('Notification received:', payload);
                        showToast(payload.notification?.title || 'Nova notificação', 'info');
                    });

                    showToast('Notificações ativadas com sucesso!', 'success');
                } else {
                    showToast('Erro ao obter token de notificação', 'error');
                }
            } else {
                showToast(error || 'Permissão negada', 'error');
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
            showToast('Erro ao ativar notificações', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNotification = async () => {
        try {
            await notificationService.showNotification('🔔 Teste de Notificação', {
                body: 'Se você viu isso, as notificações estão funcionando perfeitamente!',
                tag: 'test',
                requireInteraction: false
            });
            showToast('Notificação de teste enviada!', 'success');
        } catch (error) {
            console.error('Error sending test notification:', error);
            showToast('Erro ao enviar notificação de teste', 'error');
        }
    };

    const togglePreference = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
        // TODO: Save preferences to Firestore
    };

    if (permissionStatus === 'unsupported') {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-1">
                            Notificações não suportadas
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Seu navegador não suporta notificações push. Tente usar Chrome, Firefox ou Edge.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className={cn(
                "p-6 rounded-2xl border transition-all",
                isEnabled
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30"
                    : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10"
            )}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            isEnabled
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        )}>
                            {isEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">
                                Notificações Push
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {isEnabled
                                    ? 'Você receberá alertas em tempo real sobre eventos importantes'
                                    : 'Ative para receber alertas em tempo real'}
                            </p>
                        </div>
                    </div>

                    {!isEnabled ? (
                        <button
                            onClick={handleEnableNotifications}
                            disabled={isLoading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                        >
                            {isLoading ? 'Ativando...' : 'Ativar Notificações'}
                        </button>
                    ) : (
                        <button
                            onClick={handleTestNotification}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                            Testar Notificação
                        </button>
                    )}
                </div>
            </div>

            {/* Preferences */}
            {isEnabled && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-indigo-600" />
                        Preferências de Notificação
                    </h4>

                    <div className="space-y-3">
                        {[
                            { key: 'newOrders', label: 'Novos Pedidos Online', icon: '🛍️' },
                            { key: 'newServiceOrders', label: 'Novas Ordens de Serviço', icon: '🔧' },
                            { key: 'newMessages', label: 'Novas Mensagens de Clientes', icon: '💬' },
                            { key: 'lowStock', label: 'Alertas de Estoque Baixo', icon: '⚠️' },
                            { key: 'osStatusChanges', label: 'Mudanças de Status de OS', icon: '📋' },
                            { key: 'teamRequests', label: 'Solicitações da Equipe', icon: '👥' }
                        ].map(({ key, label, icon }) => (
                            <div
                                key={key}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{icon}</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
                                </div>
                                <button
                                    onClick={() => togglePreference(key)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all relative",
                                        preferences[key]
                                            ? "bg-emerald-500"
                                            : "bg-slate-300 dark:bg-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                        preferences[key] ? "left-6" : "left-0.5"
                                    )} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Notificações em todos os dispositivos
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Você receberá notificações em todos os dispositivos onde fizer login, incluindo desktop e mobile.
                    </p>
                </div>
            </div>
        </div>
    );
}
