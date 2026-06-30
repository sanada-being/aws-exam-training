import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyAnswer, type Records } from "../domain/progress";

export interface Session {
  queueIds: string[];
  index: number;
  correct: number;
}

interface State {
  records: Records;
  bookmarks: Record<string, true>;
  session: Session | null;
  recordAnswer: (id: string, correct: boolean, at?: number) => void;
  toggleBookmark: (id: string) => void;
  resetProgress: () => void;
  // セッション（中断/再開）
  startSession: (queueIds: string[]) => void;
  setSessionIndex: (index: number) => void;
  bumpSessionCorrect: () => void;
  endSession: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      records: {},
      bookmarks: {},
      session: null,
      recordAnswer: (id, correct, at = Date.now()) =>
        set((s) => ({
          records: { ...s.records, [id]: applyAnswer(s.records[id], correct, at) },
        })),
      toggleBookmark: (id) =>
        set((s) => {
          const next = { ...s.bookmarks };
          if (next[id]) delete next[id];
          else next[id] = true;
          return { bookmarks: next };
        }),
      resetProgress: () => set({ records: {}, bookmarks: {}, session: null }),
      startSession: (queueIds) => set({ session: { queueIds, index: 0, correct: 0 } }),
      setSessionIndex: (index) =>
        set((s) => (s.session ? { session: { ...s.session, index } } : {})),
      bumpSessionCorrect: () =>
        set((s) => (s.session ? { session: { ...s.session, correct: s.session.correct + 1 } } : {})),
      endSession: () => set({ session: null }),
    }),
    { name: "saa-progress-v1", version: 1 },
  ),
);
