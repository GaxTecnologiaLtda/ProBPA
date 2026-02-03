import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "REDACTED_SECRET",
    authDomain: "probpa-025.firebaseapp.com",
    databaseURL: "https://probpa-025-default-rtdb.firebaseio.com",
    projectId: "probpa-025",
    storageBucket: "probpa-025.firebasestorage.app",
    messagingSenderId: "948625316088",
    appId: "1:948625316088:web:714ab517df52a77060430d"
};

const app = initializeApp(firebaseConfig);

// Enable Offline Persistence (Modern API)
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const auth = getAuth(app);

export const functions = getFunctions(app, 'southamerica-east1');
export const storage = getStorage(app);

export default app;
