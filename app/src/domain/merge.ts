import type { QRecord, Records } from "./progress";
import {
  activeBookmarks,
  mergeMarks,
  snapshotMarks,
  type BookmarkMarks,
  type LegacyBookmarks,
} from "./bookmarks";

export interface ProgressSnapshot {
  records: Records;
  /** on の★(旧形式・表示用)。常に bookmarkMarks と整合させる。 */
  bookmarks: LegacyBookmarks;
  /** 時刻付きの★状態(解除の墓標を含む)。旧データには無い。 */
  bookmarkMarks?: BookmarkMarks;
}

/** 1問分のレコードを統合。lastAtが新しい方の正誤を採用し、回数系は最大値を保持。 */
export function mergeRecord(a: QRecord | undefined, b: QRecord | undefined): QRecord {
  if (!a) return b!;
  if (!b) return a!;
  const latest = a.lastAt >= b.lastAt ? a : b;
  return {
    attempts: Math.max(a.attempts, b.attempts),
    correctCount: Math.max(a.correctCount, b.correctCount),
    lastCorrect: latest.lastCorrect,
    lastAt: Math.max(a.lastAt, b.lastAt),
  };
}

export function mergeRecords(a: Records, b: Records): Records {
  const out: Records = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[id] = mergeRecord(a[id], b[id]);
  }
  return out;
}

/** 2端末分の進捗スナップショットを統合。★は id ごとに操作時刻が新しい方を採用(LWW)。 */
export function mergeProgress(
  a: ProgressSnapshot,
  b: ProgressSnapshot,
): Required<ProgressSnapshot> {
  const bookmarkMarks = mergeMarks(snapshotMarks(a), snapshotMarks(b));
  return {
    records: mergeRecords(a.records ?? {}, b.records ?? {}),
    bookmarks: activeBookmarks(bookmarkMarks),
    bookmarkMarks,
  };
}
