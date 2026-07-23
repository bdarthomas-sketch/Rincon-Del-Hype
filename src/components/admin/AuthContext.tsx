import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { loginAdmin, logoutAdmin, checkSession, silentRefresh, UNAUTHORIZED_EVENT, type AdminUser } from "./api";

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    error: null,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefreshRef = useRef<(expiresIn: number) => void>();

  scheduleRefreshRef.current = (expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const ms = Math.max(expiresIn * 0.8 * 1000, 60000);
    refreshTimerRef.current = setTimeout(async () => {
      const refreshed = await silentRefresh();
      if (refreshed) {
        setState((s) => ({ ...s, token: refreshed.access_token }));
        scheduleRefreshRef.current?.(refreshed.expires_in);
      }
    }, ms);
  };

  useEffect(() => {
    checkSession()
      .then((res) => {
        if (res.data.authenticated) {
          setState({ token: res.data.access_token ?? null, user: res.data.user ?? null, loading: false, error: null });
          silentRefresh().then((r) => {
            if (r) scheduleRefreshRef.current?.(r.expires_in);
          }).catch(() => {});
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));

    async function onUnauthorized() {
      const refreshed = await silentRefresh();
      if (refreshed) {
        setState((s) => ({ ...s, token: refreshed.access_token, error: null }));
        scheduleRefreshRef.current?.(refreshed.expires_in);
      } else {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        setState({ token: null, user: null, loading: false, error: "Sesión expirada. Ingresá de nuevo." });
      }
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginAdmin(email, password);
    setState({ token: res.data.access_token, user: res.data.user, loading: false, error: null });
    scheduleRefreshRef.current?.(res.data.expires_in);
  }, []);

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    logoutAdmin().catch(() => {});
    setState({ token: null, user: null, loading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
