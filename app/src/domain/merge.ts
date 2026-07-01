import type { QRecord, Records } from "./progress";

export interface ProgressSnapshot {
  records: Records;
  bookmarks: Record<string, true>;
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

/** 2端末分の進捗スナップショットを統合（★は和集合）。 */
export function mergeProgress(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot {
  return {
    records: mergeRecords(a.records ?? {}, b.records ?? {}),
    bookmarks: { ...(a.bookmarks ?? {}), ...(b.bookmarks ?? {}) },
  };
}
