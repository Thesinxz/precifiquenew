import { useEffect, useRef } from 'react';

export function AutoUpdate() {
    const versionRef = useRef(null);

    useEffect(() => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

        const checkVersion = async () => {
            try {
                const res = await fetch('/version.json?t=' + Date.now());
                if (!res.ok) return;
                const data = await res.json();
                const serverVersion = data.version;

                if (versionRef.current && serverVersion !== versionRef.current) {
                    console.log('New version detected. Reloading...');
                    if ('serviceWorker' in navigator) {
                        // Unregister old SWs to ensure clean slate if needed, or just reload
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.update();
                        }
                    }
                    window.location.reload();
                }

                versionRef.current = serverVersion;
            } catch (error) {
                console.error('Failed to check version:', error);
            }
        };

        // Check immediately
        checkVersion();

        // Check every 30 seconds
        const interval = setInterval(checkVersion, 30000);

        // Also check on visibility change (when user comes back to tab)
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    return null;
}
