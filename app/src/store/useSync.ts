import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

interface SyncState {
  token: string; // GitHub PAT(gist権限)。この端末のブラウザ内のみ保存。
  gistId: string; // 同期コード
  enabled: boolean;
  status: SyncStatus;
  lastError: string | null;
  lastSyncedAt: number | null;
  setToken: (t: string) => void;
  setGistId: (id: string) => void;
  setEnabled: (v: boolean) => void;
  setStatus: (s: SyncStatus, error?: string | null) => void;
  markSynced: (at: number) => void;
  clear: () => void;
}

export const useSync = create<SyncState>()(
  persist(
    (set) => ({
      token: "",
      gistId: "",
      enabled: false,
      status: "idle",
      lastError: null,
      lastSyncedAt: null,
      setToken: (t) => set({ token: t.trim() }),
      setGistId: (id) => set({ gistId: id.trim() }),
      setEnabled: (v) => set({ enabled: v }),
      setStatus: (status, error = null) => set({ status, lastError: error }),
      markSynced: (at) => set({ lastSyncedAt: at, status: "ok", lastError: null }),
      clear: () => set({ token: "", gistId: "", enabled: false, status: "idle", lastError: null }),
    }),
    { name: "saa-sync-v1" },
  ),
);
