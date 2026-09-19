import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../services/api";
import type { TokenResponse, User, UserRole } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (payload: Record<string, unknown>) => Promise<TokenResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("complygem_token");
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("complygem_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const res = await api.login(email, password);
        localStorage.setItem("complygem_token", res.access_token);
        setUser(res.user);
        return res;
      },
      register: async (payload) => {
        const res = await api.register(payload);
        localStorage.setItem("complygem_token", res.access_token);
        setUser(res.user);
        return res;
      },
      logout: () => {
        localStorage.removeItem("complygem_token");
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function homeForRole(role: UserRole) {
  return role === "officer" ? "/officer/dashboard" : "/bidder/dashboard";
}
