import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyAnswer, type Records } from "../domain/progress";
import { mergeProgress, type ProgressSnapshot } from "../domain/merge";
import { recordFirst } from "../domain/sessionAnswers";
import type { Session } from "../domain/session";
import {
  activeBookmarks,
  marksFromLegacy,
  toggleMark,
  type BookmarkMarks,
  type LegacyBookmarks,
} from "../domain/bookmarks";

export type { Session };

interface State {
  records: Records;
  /** on の★(表示用)。bookmarkMarks から導出し常に整合させる。 */
  bookmarks: LegacyBookmarks;
  /** ★の時刻付き状態(同期の正本。解除の墓標も含む)。 */
  bookmarkMarks: BookmarkMarks;
  session: Session | null;
  recordAnswer: (id: string, correct: boolean, at?: number) => void;
  toggleBookmark: (id: string, at?: number) => void;
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
  return { records: s.records, bookmarks: s.bookmarks, bookmarkMarks: s.bookmarkMarks };
}

/** marks を正本として、表示用 bookmarks と一緒に更新する。 */
function withMarks(bookmarkMarks: BookmarkMarks) {
  return { bookmarkMarks, bookmarks: activeBookmarks(bookmarkMarks) };
}

const STORE_VERSION = 2;

/** 永続データの移行。v1(bookmarkMarks無し)は旧形式★を at=0 の marks にする。 */
export function migrateProgress(persisted: unknown, version: number): Record<string, unknown> {
  const p = (persisted ?? {}) as Record<string, unknown>;
  if (version < 2 || !p.bookmarkMarks) {
    const bookmarks = (p.bookmarks ?? {}) as LegacyBookmarks;
    return { ...p, ...withMarks(marksFromLegacy(bookmarks)) };
  }
  return p;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      records: {},
      bookmarks: {},
      bookmarkMarks: {},
      session: null,
      recordAnswer: (id, correct, at = Date.now()) =>
        set((s) => ({
          records: { ...s.records, [id]: applyAnswer(s.records[id], correct, at) },
        })),
      toggleBookmark: (id, at = Date.now()) =>
        set((s) => withMarks(toggleMark(s.bookmarkMarks, id, at))),
      resetProgress: () => set({ records: {}, ...withMarks({}), session: null }),
      mergeRemote: (remote) =>
        set((s) => {
          const merged = mergeProgress(
            { records: s.records, bookmarks: s.bookmarks, bookmarkMarks: s.bookmarkMarks },
            {
              records: remote.records ?? {},
              bookmarks: remote.bookmarks ?? {},
              bookmarkMarks: remote.bookmarkMarks,
            },
          );
          return { records: merged.records, ...withMarks(merged.bookmarkMarks) };
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
    {
      name: "saa-progress-v1",
      version: STORE_VERSION,
      migrate: (persisted, version) => migrateProgress(persisted, version) as unknown as State,
    },
  ),
);
