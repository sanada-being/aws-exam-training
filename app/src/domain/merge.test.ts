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
  it("records統合と★の和集合", () => {
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
  });

  it("空スナップショットでも安全", () => {
    const m = mergeProgress({ records: {}, bookmarks: {} }, { records: {}, bookmarks: {} });
    expect(m).toEqual({ records: {}, bookmarks: {} });
  });
});
