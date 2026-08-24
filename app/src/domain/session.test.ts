import { describe, it, expect } from "vitest";
import { isResumable, sessionResult, type Session } from "./session";

function s(over: Partial<Session> = {}): Session {
  return { queueIds: ["a", "b", "c"], index: 0, answers: {}, reviewMode: false, ...over };
}

describe("isResumable", () => {
  it("セッションが無ければ再開できない", () => {
    expect(isResumable(null)).toBe(false);
  });

  it("最後まで解き終わっていれば再開できない", () => {
    expect(isResumable(s({ index: 3 }))).toBe(false);
  });

  it("途中なら再開できる", () => {
    expect(isResumable(s({ index: 1 }))).toBe(true);
  });

  it("旧形式（answers を持たない）は再開できない", () => {
    // persist の version は上げずに、回答明細を持たない旧セッションを無効扱いにする
    const legacy = { queueIds: ["a", "b", "c"], index: 1, correct: 1 } as unknown as Session;
    expect(isResumable(legacy)).toBe(false);
  });

  it("queueIds が壊れていれば再開できない", () => {
    expect(isResumable({ index: 0, answers: {}, reviewMode: false } as unknown as Session)).toBe(
      false,
    );
  });
});

describe("sessionResult", () => {
  it("正答数・誤答idは answers だけから導出する（カウンタを持たない）", () => {
    const r = sessionResult(
      s({
        answers: {
          a: { selected: ["A"], correct: true },
          b: { selected: ["B"], correct: false },
          c: { selected: ["C"], correct: true },
        },
      }),
      3,
    );
    expect(r).toEqual({ total: 3, correct: 2, wrongIds: ["b"], accuracy: 67 });
  });

  it("未回答があっても分母は出題数、正答率は 100% を超えない", () => {
    const r = sessionResult(s({ answers: { a: { selected: ["A"], correct: true } } }), 3);
    expect(r.total).toBe(3);
    expect(r.correct).toBe(1);
    expect(r.accuracy).toBe(33);
  });

  it("セッションが無ければ 0 件として扱う", () => {
    expect(sessionResult(null, 5)).toEqual({ total: 5, correct: 0, wrongIds: [], accuracy: 0 });
  });

  it("出題数 0 なら正答率は 0", () => {
    expect(sessionResult(s(), 0).accuracy).toBe(0);
  });
});
