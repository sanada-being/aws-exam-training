import { describe, it, expect } from "vitest";
import {
  isAnswered,
  recordFirst,
  tally,
  type SessionAnswers,
} from "./sessionAnswers";

describe("sessionAnswers（初回回答のみを採用）", () => {
  it("未回答なら isAnswered は false、回答後は true", () => {
    let a: SessionAnswers = {};
    expect(isAnswered(a, "q1")).toBe(false);
    a = recordFirst(a, "q1", false, ["A"]);
    expect(isAnswered(a, "q1")).toBe(true);
  });

  it("recordFirst は初回の選択・正誤を保持する", () => {
    const a = recordFirst({}, "q1", true, ["B"]);
    expect(a.q1).toEqual({ selected: ["B"], correct: true });
  });

  it("同じ問題を再回答しても初回の結果が維持される（2回目は無視）", () => {
    let a = recordFirst({}, "q1", false, ["A"]); // 初回=不正解
    a = recordFirst(a, "q1", true, ["B"]); // 戻って正解し直し
    expect(a.q1).toEqual({ selected: ["A"], correct: false }); // 初回のまま
  });

  it("recordFirst は元のオブジェクトを破壊しない", () => {
    const a: SessionAnswers = {};
    const b = recordFirst(a, "q1", true, ["A"]);
    expect(a).toEqual({});
    expect(b).not.toBe(a);
  });

  it("2回目呼び出しで変化が無い場合は同一参照を返す", () => {
    const a = recordFirst({}, "q1", true, ["A"]);
    const b = recordFirst(a, "q1", false, ["B"]);
    expect(b).toBe(a);
  });

  it("tally は初回正誤で正答数・誤答idを集計（挿入順）", () => {
    let a: SessionAnswers = {};
    a = recordFirst(a, "q1", true, ["A"]);
    a = recordFirst(a, "q2", false, ["C"]);
    a = recordFirst(a, "q3", false, ["D"]);
    // q2 を戻って正解し直しても集計は初回基準
    a = recordFirst(a, "q2", true, ["B"]);
    expect(tally(a)).toEqual({ answered: 3, correct: 1, wrongIds: ["q2", "q3"] });
  });

  it("空なら tally は 0", () => {
    expect(tally({})).toEqual({ answered: 0, correct: 0, wrongIds: [] });
  });
});
