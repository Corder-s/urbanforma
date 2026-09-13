import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginCredentials, User } from "./auth.types";
import * as authService from "./auth.service";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the initial session is being restored / an auth call runs. */
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  /**
   * Replace the in-memory user after a profile edit (Settings → Profile). The
   * service persists it into the current session; this only refreshes the tree.
   */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore the session on startup. Uses the service so corrupt/expired
  // sessions are cleared and the app never crashes or flashes the login page.
  // Later this becomes GET /api/auth/me (with token refresh) and isLoading
  // drives that UI.
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setUser(authService.getCurrentUser());
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Cross-tab session sync (no extra library): another tab signing in or out
  // writes/removes the session key. The "storage" event only fires in OTHER
  // tabs, keeping every tab consistent.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key && e.key !== authService.SESSION_STORAGE_KEY) return;
      // Session removed elsewhere → logged out; otherwise re-read current user.
      setUser(e.newValue === null ? null : authService.getCurrentUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const session = await authService.login(credentials);
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser: User) => setUser(nextUser), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
