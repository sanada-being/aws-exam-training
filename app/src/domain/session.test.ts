import { describe, it, expect } from "vitest";
import { isResumable, resolveResume, sessionResult, type Session } from "./session";

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

describe("resolveResume（問題集が変わっても再開位置を id で解決する）", () => {
  const q = (id: string) => ({ id });
  const map = (ids: string[]) => new Map(ids.map((id) => [id, q(id)]));

  it("問題集が変わっていなければ session の位置のまま", () => {
    const s0 = s({ queueIds: ["a", "b", "c"], index: 2 });
    expect(resolveResume(s0, map(["a", "b", "c"]))).toEqual({
      items: [q("a"), q("b"), q("c")],
      index: 2,
    });
  });

  it("前方の問題が問題集から消えても、再開位置がずれない", () => {
    // b を解いている途中で、a がデータ更新で消えた
    const s0 = s({ queueIds: ["a", "b", "c"], index: 1 });
    expect(resolveResume(s0, map(["b", "c"]))).toEqual({
      items: [q("b"), q("c")],
      index: 0, // b は新しい items の先頭
    });
  });

  it("中断していた問題自体が消えたら、未回答の先頭から続ける", () => {
    const s0 = s({
      queueIds: ["a", "b", "c"],
      index: 1,
      answers: { a: { selected: ["A"], correct: true } },
    });
    expect(resolveResume(s0, map(["a", "c"]))).toEqual({
      items: [q("a"), q("c")],
      index: 1, // a は回答済みなので c から
    });
  });

  it("残った問題が全て回答済みなら結果画面の位置を返す", () => {
    const s0 = s({
      queueIds: ["a", "b"],
      index: 1,
      answers: { a: { selected: ["A"], correct: true } },
    });
    expect(resolveResume(s0, map(["a"]))).toEqual({ items: [q("a")], index: 1 });
  });

  it("問題が全て消えていれば再開しない", () => {
    expect(resolveResume(s({ index: 1 }), map([]))).toBeNull();
  });

  it("再開不可なセッション（旧形式・完了済み）では null", () => {
    expect(resolveResume(null, map(["a"]))).toBeNull();
    expect(resolveResume(s({ index: 3 }), map(["a", "b", "c"]))).toBeNull();
  });
});
