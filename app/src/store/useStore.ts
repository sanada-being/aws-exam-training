import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyAnswer, type Records } from "../domain/progress";
import { mergeProgress, type ProgressSnapshot } from "../domain/merge";
import { recordFirst } from "../domain/sessionAnswers";
import type { Session } from "../domain/session";

export type { Session };

interface State {
  records: Records;
  bookmarks: Record<string, true>;
  session: Session | null;
  recordAnswer: (id: string, correct: boolean, at?: number) => void;
  toggleBookmark: (id: string) => void;
  resetProgress: () => void;
  /** リモート進捗を取り込みマージする（同期用）。 */
  mergeRemote: (remote: ProgressSnapshot) => void;
  // セッション（中断/再開）
  startSession: (queueIds: string[], reviewMode?: boolean) => void;
  setSessionIndex: (index: number) => void;
  /** セッション内の初回回答を記録する（再回答では上書きしない）。 */
  recordSessionAnswer: (id: string, correct: boolean, selected: string[]) => void;
  endSession: () => void;
}

/** 現在の進捗スナップショット（同期・エクスポートで使う）。 */
export function getSnapshot(): ProgressSnapshot {
  const s = useStore.getState();
  return { records: s.records, bookmarks: s.bookmarks };
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
      mergeRemote: (remote) =>
        set((s) => {
          const merged = mergeProgress(
            { records: s.records, bookmarks: s.bookmarks },
            { records: remote.records ?? {}, bookmarks: remote.bookmarks ?? {} },
          );
          return { records: merged.records, bookmarks: merged.bookmarks };
        }),
      startSession: (queueIds, reviewMode = false) =>
        set({ session: { queueIds, index: 0, answers: {}, reviewMode } }),
      setSessionIndex: (index) =>
        set((s) => (s.session ? { session: { ...s.session, index } } : {})),
      recordSessionAnswer: (id, correct, selected) =>
        set((s) => {
          if (!s.session) return {};
          const answers = recordFirst(s.session.answers, id, correct, selected);
          // 初回回答が既にある場合は同一参照が返るので、無駄な更新を避ける
          if (answers === s.session.answers) return {};
          return { session: { ...s.session, answers } };
        }),
      endSession: () => set({ session: null }),
    }),
    { name: "saa-progress-v1", version: 1 },
  ),
);
