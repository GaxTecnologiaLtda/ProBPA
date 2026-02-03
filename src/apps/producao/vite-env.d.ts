declare module 'virtual:pwa-register/react' {
    import type { Dispatch, SetStateAction } from 'react';
    import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

    export interface RegisterSWHook {
        needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
        offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    }

    export function useRegisterSW(options?: RegisterSWOptions): RegisterSWHook;
}
