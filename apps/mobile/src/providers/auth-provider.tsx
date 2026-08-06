import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, getIdToken, signOut as firebaseSignOut } from '@/src/firebase/auth';
import { verifyAdmin } from '@/src/api/client';
import type { AuthUser } from '@mediterranea/shared/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** True only once the server has confirmed the signed-in user is an admin. */
  isAdmin: boolean;
  /** True when the admin check could not reach the server (vs. a genuine denial). */
  adminCheckFailed: boolean;
  /** Re-run the admin check (e.g. after a connection error). */
  recheckAdmin: () => Promise<void>;
  /** Returns a fresh Firebase ID token (auto-refreshed), or null if signed out. */
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckFailed, setAdminCheckFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback(async (firebaseUser: User) => {
    const token = await getIdToken();
    const { reachable, isAdmin: admin } = token
      ? await verifyAdmin(token)
      : { reachable: false, isAdmin: false };
    setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAdmin: admin,
    });
    setIsAdmin(admin);
    setAdminCheckFailed(!reachable);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          await applyUser(firebaseUser);
        } else {
          setUser(null);
          setIsAdmin(false);
          setAdminCheckFailed(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setIsAdmin(false);
        setAdminCheckFailed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [applyUser]);

  const getToken = useCallback(() => getIdToken(), []);

  const recheckAdmin = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const { reachable, isAdmin: admin } = await verifyAdmin(token);
    setIsAdmin(admin);
    setAdminCheckFailed(!reachable);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setUser(null);
    setIsAdmin(false);
    setAdminCheckFailed(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, adminCheckFailed, recheckAdmin, getToken, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
