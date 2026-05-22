import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type User = { username: string };
type AuthCtxType = {
  user: User | null;
  login: (u: string, p: string) => { ok: boolean; error?: string };
  register: (u: string, p: string) => { ok: boolean; error?: string };
  logout: () => void;
  ready: boolean;
};
const AuthCtx = createContext<AuthCtxType>({} as AuthCtxType);

const USERS_KEY = "gp_users";
const SESSION_KEY = "gp_session";
const DEFAULT_USERS: Record<string, string> = { "admin.dashboard": "bismillah" };

function loadUsers(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_USERS, ...stored };
  } catch {
    return { ...DEFAULT_USERS };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem(SESSION_KEY);
    if (s) {
      try { setUser(JSON.parse(s)); } catch {}
    }
    setReady(true);
  }, []);

  const login: AuthCtxType["login"] = (username, password) => {
    const users = loadUsers();
    if (!users[username]) return { ok: false, error: "Username tidak ditemukan." };
    if (users[username] !== password) return { ok: false, error: "Password salah." };
    const u = { username };
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    return { ok: true };
  };

  const register: AuthCtxType["register"] = (username, password) => {
    if (!username.trim() || !password.trim()) return { ok: false, error: "Username & password wajib diisi." };
    if (username.length < 3) return { ok: false, error: "Username minimal 3 karakter." };
    if (password.length < 4) return { ok: false, error: "Password minimal 4 karakter." };
    const users = loadUsers();
    if (users[username]) return { ok: false, error: "Username sudah terdaftar." };
    const newStored = { ...users };
    delete newStored["admin.dashboard"]; // don't persist default
    newStored[username] = password;
    localStorage.setItem(USERS_KEY, JSON.stringify(newStored));
    const u = { username };
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return <AuthCtx.Provider value={{ user, login, register, logout, ready }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
