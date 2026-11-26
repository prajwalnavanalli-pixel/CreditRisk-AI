"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import {
  api,
  getStoredToken,
  setStoredToken,
  type HealthResponse,
  type UserProfile,
} from "@/lib/api";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface AppContextValue {
  user: UserProfile | null;
  token: string | null;
  authLoading: boolean;
  theme: "dark" | "light";
  health: HealthResponse | null;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    full_name: string;
    organization?: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  notify: (toast: Omit<ToastItem, "id">) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "creditrisk_theme";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const applyThemeClass = useCallback((nextTheme: "dark" | "light") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(nextTheme);
  }, []);

  const setTheme = useCallback(
    (nextTheme: "dark" | "light") => {
      setThemeState(nextTheme);
      applyThemeClass(nextTheme);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
    },
    [applyThemeClass]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const notify = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch {
      setHealth({ api_status: "unreachable", database_status: "disconnected" });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
      setToken(existingToken);
      if (res.user.theme_preference) {
        setTheme(res.user.theme_preference);
      }
    } catch {
      setStoredToken(null);
      setUser(null);
      setToken(null);
    }
  }, [setTheme]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      await Promise.all([refreshHealth(), refreshUser()]);
      if (!active) return;
      const savedTheme =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(THEME_STORAGE_KEY) as
              | "dark"
              | "light"
              | null)
          : null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      }
      setAuthLoading(false);
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, [applyThemeClass, refreshHealth, refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setStoredToken(null);
      setUser(null);
      setToken(null);
      notify({
        type: "warning",
        title: "Session Expired",
        message: "Please sign in again to continue.",
      });
    };
    window.addEventListener("creditrisk:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("creditrisk:unauthorized", handleUnauthorized);
    };
  }, [notify]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.login(identifier, password);
      setStoredToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      if (res.user.theme_preference) {
        setTheme(res.user.theme_preference);
      }
      notify({
        type: "success",
        title: `Welcome back, ${res.user.full_name}`,
        message: `Signed in as ${res.user.role.toUpperCase()}`,
      });
    },
    [notify, setTheme]
  );

  const register = useCallback(
    async (payload: {
      username: string;
      email: string;
      full_name: string;
      organization?: string;
      password: string;
    }) => {
      const res = await api.register(payload);
      setStoredToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      notify({
        type: "success",
        title: "Account Created",
        message: `Signed in as ${res.user.full_name}`,
      });
    },
    [notify]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    notify({
      type: "info",
      title: "Signed Out",
      message: "Your session has been closed.",
    });
  }, [notify]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        authLoading,
        theme,
        health,
        setTheme,
        toggleTheme,
        login,
        register,
        logout,
        refreshUser,
        refreshHealth,
        notify,
      }}
    >
      {children}

      {/* Global Toast Notification Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.type === "success"
              ? CheckCircle2
              : toast.type === "error"
                ? XCircle
                : toast.type === "warning"
                  ? AlertTriangle
                  : Info;

          const accent =
            toast.type === "success"
              ? "border-emerald-500/30 text-emerald-400"
              : toast.type === "error"
                ? "border-rose-500/30 text-rose-400"
                : toast.type === "warning"
                  ? "border-amber-500/30 text-amber-400"
                  : "border-indigo-500/30 text-indigo-400";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-[#101621]/95 p-4 shadow-2xl backdrop-blur-xl ${accent}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
