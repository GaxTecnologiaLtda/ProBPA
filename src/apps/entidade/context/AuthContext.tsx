import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    claims: any;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    claims: {},
    logout: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [claims, setClaims] = useState<any>({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const tokenResult = await currentUser.getIdTokenResult();
                setClaims(tokenResult.claims);
            } else {
                setClaims({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        if (user && claims?.entityId) {
            try {
                // @ts-ignore
                const { logAction } = await import('../services/logsService');
                await logAction({
                    action: 'LOGOUT',
                    target: 'USER',
                    description: 'Usuário realizou logout do sistema',
                    user: { uid: user.uid, email: user.email || '', name: user.displayName || user.email || '' },
                    entityId: claims.entityId
                });
            } catch (error) {
                console.error("Logout log error", error);
            }
        }
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, claims, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
