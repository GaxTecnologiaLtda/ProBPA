import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Unit } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: User | null;
  currentUnit: Unit | null;
  selectUnit: (unit: Unit) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isOnline: boolean;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme based on system preference
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [user, setUser] = useState<User | null>(null);
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  // Effect to apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Effect to listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Session Expiration Logic (48h)
        const sessionStart = localStorage.getItem('probpa_session_start');
        const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

        if (sessionStart) {
          const elapsedTime = Date.now() - parseInt(sessionStart, 10);
          if (elapsedTime > TWO_DAYS_MS) {
            console.warn("Sessão expirada (48h). Forçando novo login.");
            localStorage.removeItem('probpa_session_start');
            sessionStorage.setItem('loginMessage', 'Sua sessão expirou por segurança. Por favor, faça login novamente.');
            await signOut(auth);
            setUser(null);
            setCurrentUnit(null);
            setLoading(false);
            return;
          }
        } else {
          // If no timestamp (first run with this logic), set it now
          localStorage.setItem('probpa_session_start', Date.now().toString());
        }

        try {
          // Force refresh to ensure we get the latest claims (assignments)
          // If offline, this might fail, so we catch and fallback to cached token
          let tokenResult;
          try {
            // Only force refresh if online
            if (navigator.onLine) {
              tokenResult = await firebaseUser.getIdTokenResult(true);
            } else {
              console.log("Offline mode: Using cached token.");
              tokenResult = await firebaseUser.getIdTokenResult(false);
            }
          } catch (e) {
            console.warn("Failed to refresh token (likely offline), using cache.", e);
            tokenResult = await firebaseUser.getIdTokenResult(false);
          }

          const claims = tokenResult.claims;

          if (claims.role === 'PROFESSIONAL' && claims.active === false) {
            sessionStorage.setItem('loginMessage', 'Seu acesso foi desativado pela Entidade Gestora.');
            await signOut(auth);
            setUser(null);
            setCurrentUnit(null);
            setLoading(false);
            return;
          }

          if (claims.role === 'PROFESSIONAL' && claims.entityId) {
            // Parse units from assignments or legacy fields
            let units: Unit[] = [];
            const assignments = claims.assignments as any[];
            let professionalData: any = {};

            // Fetch latest professional data to ensure we have CBO/Registry
            try {
              if (claims.professionalId) {
                // If offline, getDoc will try cache first (due to enabled persistence)
                const docRef = doc(db, 'professionals', claims.professionalId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  professionalData = docSnap.data();
                }
              }
            } catch (err) {
              console.warn("Error fetching professional details (likely offline):", err);
              // Fallback: rely on claims/assignments if doc fetch fails completely
            }

            // Use fetched assignments if available
            const sourceAssignments = professionalData.assignments || assignments;

            if (sourceAssignments && sourceAssignments.length > 0) {
              // Fetch full unit details to get 'type' (crucial for LEDI logic)
              const unitsPromises = sourceAssignments.map(async (a: any) => {
                let unitType = '';
                let unitCnes = '';
                try {
                  const uSnap = await getDoc(doc(db, 'units', a.unitId));
                  if (uSnap.exists()) {
                    const uData = uSnap.data();
                    unitType = uData.type || '';
                    unitCnes = uData.cnes || '';
                  }
                } catch (e) {
                  // If offline and not in cache, we might fail here. 
                  // In that case, we proceed with empty type/cnes
                  console.warn(`Unit ${a.unitId} fetch failed (offline?), using defaults`, e);
                }

                return {
                  id: a.unitId,
                  name: a.unitName,
                  municipalityId: a.municipalityId || '', // FORCE from assignment
                  municipalityName: a.municipalityName || '',
                  occupation: a.occupation,
                  registerClass: a.registerClass,
                  cnes: unitCnes,
                  type: unitType // Populated from DB
                };
              });

              units = await Promise.all(unitsPromises);

            } else if (claims.unitId) {
              // Fallback legacy
              units = [{
                id: claims.unitId as string,
                name: claims.unitName as string || 'Unidade Padrão',
                municipalityId: claims.municipalityId as string,
                municipalityName: claims.municipalityName as string,
                occupation: professionalData.occupation || '',
                registerClass: professionalData.registerClass || '',
                cnes: '',
                type: '' // Unknown in legacy fallback
              }];
            }

            console.log("Context: Parsed Units:", units);

            let entityType = "PUBLIC"; // Default fallback
            if (claims.entityId) {
              try {
                const entDocRef = doc(db, 'entities', claims.entityId as string);
                const entSnap = await getDoc(entDocRef); // Cached first
                if (entSnap.exists()) {
                  const ed = entSnap.data();
                  entityType = (ed.type === 'Privada' || ed.type === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
                }
              } catch (err) {
                console.warn("Could not fetch Entity Type in Context (Offline?), using default:", err);
              }
            }

            const newUser: User = {
              id: firebaseUser.uid,
              name: claims.name as string || firebaseUser.displayName || professionalData.name || 'Profissional',
              email: firebaseUser.email || '',
              cns: professionalData.cns || '',
              role: claims.role as string,
              avatar: firebaseUser.photoURL || '',
              entityId: claims.entityId as string,
              entityName: claims.entityName as string,
              entityType: entityType,
              professionalId: claims.professionalId as string,
              units: units,
              cbo: professionalData.occupation,
              registry: professionalData.registerClass,
              phone: professionalData.phone
            };

            setUser(newUser);

            // Auto-select if only one unit
            if (units.length === 1) {
              setCurrentUnit(units[0]);
            } else {
              // If multiple, currentUnit remains null until selected
              // Check if we can restore previous selection session? (Optional enhancement)
              setCurrentUnit(null);
            }

          } else {
            console.error("Usuário sem permissão ou claims incompletas.");
            await signOut(auth);
            setUser(null);
            setCurrentUnit(null);
          }
        } catch (error) {
          console.error("Erro fatual ao validar claims:", error);
          // Only logout if it's NOT a network error (to preserve offline session)
          if (navigator.onLine) {
            setUser(null);
            setCurrentUnit(null);
          } else {
            console.log("Manter sessão offline, mesmo com erro de validação (provavelmente rede)");
            // Note: User might end up null here if we don't set it. 
            // Ideally we should have set it above if offline fallback worked.
            // If we really crashed before setUser, user is blocked.
            // But the try-catch blocks above for token/doc should prevent falling here for simple network errors.
          }
        }
      } else {
        setUser(null);
        setCurrentUnit(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitorar status do profissional em tempo real
  useEffect(() => {
    if (!user || user.role !== 'PROFESSIONAL') return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    currentUser.getIdTokenResult().then((tokenResult) => {
      const profId = tokenResult.claims.professionalId as string;
      if (profId) {
        const unsub = onSnapshot(doc(db, "professionals", profId), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Check global active status
            if (data.active === false) {
              console.warn("Usuário desativado em tempo real.");
              sessionStorage.setItem('loginMessage', 'Seu acesso foi desativado pela Entidade Gestora.');
              await logout();
              window.location.href = '/login';
              return;
            }

            // Check assignment active status if currentUnit is selected
            // This requires mapping currentUnit to the assignment in the doc
            // For now, we rely on the global active status or the next login to refresh claims
          } else {
            // Documento deletado?
            sessionStorage.setItem('loginMessage', 'Seu cadastro foi removido.');
            await logout();
          }
        });
        return () => unsub();
      }
    });
  }, [user]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const login = async (email: string, pass: string) => {
    // Session start will be handled by onAuthStateChanged if missing, 
    // but setting it here ensures precision.
    localStorage.setItem('probpa_session_start', Date.now().toString());
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    localStorage.removeItem('probpa_session_start');
    await signOut(auth);
    setCurrentUnit(null);
  };

  const selectUnit = (unit: Unit) => {
    setCurrentUnit(unit);
  };

  return (
    <AppContext.Provider value={{ theme, toggleTheme, user, currentUnit, selectUnit, login, logout, isOnline, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};