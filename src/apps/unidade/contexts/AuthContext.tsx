import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'RECEPCIONISTA' | 'COORDENADOR';

interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (role: UserRole) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const UnidadeAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (role: UserRole) => {
        const mockUser: User = {
            id: role === 'COORDENADOR' ? 'coord-1' : 'recp-1',
            name: role === 'COORDENADOR' ? 'Dr. Gabriel Silva' : 'Ana Recepcionista',
            role: role,
            avatar: role === 'COORDENADOR' ? 'GS' : 'AR'
        };
        setUser(mockUser);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useUnidadeAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useUnidadeAuth must be used within a UnidadeAuthProvider');
    }
    return context;
};
