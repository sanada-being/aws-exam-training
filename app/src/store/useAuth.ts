import { create } from "zustand";

interface AuthState {
  userId: string | null;
  email: string | null;
  status: "idle" | "syncing" | "ok" | "error";
  lastError: string | null;
  setUser: (userId: string | null, email: string | null) => void;
  setStatus: (s: AuthState["status"], error?: string | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  userId: null,
  email: null,
  status: "idle",
  lastError: null,
  setUser: (userId, email) => set({ userId, email }),
  setStatus: (status, error = null) => set({ status, lastError: error }),
}));
