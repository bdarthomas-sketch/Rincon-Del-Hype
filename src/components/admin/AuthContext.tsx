import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { loginAdmin, checkSession, silentRefresh, UNAUTHORIZED_EVENT, TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_IN_KEY, type AdminUser } from "./api";

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
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    checkSession(storedToken)
      .then((res) => {
        if (res.data.authenticated) {
          setState({ token: storedToken, user: res.data.user ?? null, loading: false });
          const expiresIn = localStorage.getItem(EXPIRES_IN_KEY);
          if (expiresIn) scheduleRefreshRef.current?.(parseInt(expiresIn));
        } else {
          handleInitRefresh();
        }
      })
      .catch(() => handleInitRefresh());

    function handleInitRefresh() {
      silentRefresh().then((refreshed) => {
        if (refreshed) {
          setState({ token: refreshed.access_token, user: null, loading: false });
          scheduleRefreshRef.current?.(refreshed.expires_in);
          checkSession(refreshed.access_token).then((res) => {
            if (res.data.authenticated && res.data.user) {
              setState((s) => ({ ...s, user: res.data.user }));
            }
          }).catch(() => {});
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(EXPIRES_IN_KEY);
          setState({ token: null, user: null, loading: false, error: "Sesión expirada. Ingresá de nuevo." });
        }
      });
    }

    async function onUnauthorized() {
      const refreshed = await silentRefresh();
      if (refreshed) {
        setState((s) => ({ ...s, token: refreshed.access_token, error: null }));
        scheduleRefreshRef.current?.(refreshed.expires_in);
        checkSession(refreshed.access_token).then((res) => {
          if (res.data.authenticated && res.data.user) {
            setState((s) => ({ ...s, user: res.data.user }));
          }
        }).catch(() => {});
        return;
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(EXPIRES_IN_KEY);
      setState({ token: null, user: null, loading: false, error: "Sesión expirada. Ingresá de nuevo." });
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginAdmin(email, password);
    localStorage.setItem(TOKEN_KEY, res.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refresh_token);
    localStorage.setItem(EXPIRES_IN_KEY, String(res.data.expires_in));
    setState({ token: res.data.access_token, user: res.data.user, loading: false, error: null });
    scheduleRefreshRef.current?.(res.data.expires_in);
  }, []);

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_IN_KEY);
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
