import { describe, it, expect } from "vitest";
import { mergeRecord, mergeProgress } from "./merge";

describe("mergeRecord", () => {
  it("片方だけならそれを返す", () => {
    const r = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 5 };
    expect(mergeRecord(r, undefined)).toEqual(r);
    expect(mergeRecord(undefined, r)).toEqual(r);
  });
  it("lastAtが新しい方の正誤を採用、回数は最大", () => {
    const a = { attempts: 3, correctCount: 2, lastCorrect: false, lastAt: 100 };
    const b = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 200 };
    expect(mergeRecord(a, b)).toEqual({
      attempts: 3,
      correctCount: 2,
      lastCorrect: true, // b が新しい
      lastAt: 200,
    });
  });
});

describe("mergeProgress", () => {
  it("records統合。旧形式(タイムスタンプ無し)同士の★は和集合", () => {
    const a = {
      records: { q1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 10 } },
      bookmarks: { q1: true as const },
    };
    const b = {
      records: { q2: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: 20 } },
      bookmarks: { q2: true as const },
    };
    const m = mergeProgress(a, b);
    expect(Object.keys(m.records).sort()).toEqual(["q1", "q2"]);
    expect(m.bookmarks).toEqual({ q1: true, q2: true });
    expect(m.bookmarkMarks).toEqual({ q1: { on: true, at: 0 }, q2: { on: true, at: 0 } });
  });

  it("★の解除(タイムスタンプ付き)は他端末の古い★に上書きされない", () => {
    // ローカル: q1,q2 を時刻200で解除済み、q3 は★のまま
    const local = {
      records: {},
      bookmarks: { q3: true as const },
      bookmarkMarks: {
        q1: { on: false, at: 200 },
        q2: { on: false, at: 200 },
        q3: { on: true, at: 100 },
      },
    };
    // リモート: 旧形式で q1,q2,q3 全部★
    const remote = { records: {}, bookmarks: { q1: true as const, q2: true as const, q3: true as const } };
    expect(mergeProgress(local, remote).bookmarks).toEqual({ q3: true });
    expect(mergeProgress(remote, local).bookmarks).toEqual({ q3: true });
  });

  it("両方タイムスタンプ付きなら id ごとに新しい方", () => {
    const a = { records: {}, bookmarks: {}, bookmarkMarks: { q1: { on: true, at: 300 } } };
    const b = { records: {}, bookmarks: {}, bookmarkMarks: { q1: { on: false, at: 200 } } };
    const m = mergeProgress(a, b);
    expect(m.bookmarks).toEqual({ q1: true });
    expect(m.bookmarkMarks).toEqual({ q1: { on: true, at: 300 } });
  });

  it("空スナップショットでも安全", () => {
    const m = mergeProgress({ records: {}, bookmarks: {} }, { records: {}, bookmarks: {} });
    expect(m).toEqual({ records: {}, bookmarks: {}, bookmarkMarks: {} });
  });
});
