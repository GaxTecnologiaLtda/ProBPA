import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaUpdater: React.FC = () => {
    const intervalMS = 60 * 1000; // Check every minute

    const {
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log(`Service Worker registered at: ${swUrl}`);

            // Periodic check for updates
            r && setInterval(() => {
                console.log('Checking for new Service Worker version...');
                r.update();
            }, intervalMS);
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
        onNeedRefresh() {
            console.log('New content available, auto-updating...');
            updateServiceWorker(true);
        },
        onOfflineReady() {
            console.log('App is ready to work offline');
        },
    });

    return null; // Hidden component
};
