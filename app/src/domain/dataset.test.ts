import { describe, it, expect } from "vitest";
import { summarize, isRetiredFormat, excludeRetiredFormats } from "./dataset";
import type { Question } from "../types";

function q(partial: Partial<Question>): Question {
  return {
    id: "x",
    questionNumber: 1,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e", ja: "j" },
    options: [{ key: "A", en: "a", ja: "あ" }],
    adoptedAnswer: ["A"],
    communityVote: [{ answer: "A", count: 10, percent: 100 }],
    answerConfidence: "high",
    needsReview: false,
    ...partial,
  };
}

describe("summarize", () => {
  it("空配列は total=0", () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.byConfidence).toEqual({ high: 0, medium: 0, low: 0 });
  });

  it("total / topic別 / 確信度別 / 複数回答数を集計する", () => {
    const s = summarize([
      q({ topic: 1, answerConfidence: "high" }),
      q({ topic: 1, answerConfidence: "medium", isMultipleAnswer: true }),
      q({ topic: 2, answerConfidence: "high" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byTopic).toEqual({ 1: 2, 2: 1 });
    expect(s.byConfidence).toEqual({ high: 2, medium: 1, low: 0 });
    expect(s.multipleAnswer).toBe(1);
  });
});

/** 選択肢6つ・正解3つ（本番で廃止された「3つ選ぶ」形式）の問題を作る。 */
function chooseThree(id = "three"): Question {
  return q({
    id,
    isMultipleAnswer: true,
    options: ["A", "B", "C", "D", "E", "F"].map((k) => ({ key: k, en: k, ja: k })),
    adoptedAnswer: ["A", "C", "E"],
  });
}

describe("isRetiredFormat", () => {
  it("正解が3つの問題は廃止形式", () => {
    expect(isRetiredFormat(chooseThree())).toBe(true);
  });

  it("単一選択・2つ選択は廃止形式ではない", () => {
    expect(isRetiredFormat(q({ adoptedAnswer: ["A"] }))).toBe(false);
    expect(isRetiredFormat(q({ adoptedAnswer: ["A", "B"], isMultipleAnswer: true }))).toBe(false);
  });

  it("正解が4つ以上でも廃止形式として扱う", () => {
    expect(isRetiredFormat(q({ adoptedAnswer: ["A", "B", "C", "D"] }))).toBe(true);
  });

  it("adoptedAnswer が空でも例外にならない", () => {
    expect(isRetiredFormat(q({ adoptedAnswer: [] }))).toBe(false);
  });
});

describe("excludeRetiredFormats", () => {
  it("廃止形式だけを取り除く", () => {
    const kept = [q({ id: "a" }), q({ id: "b", adoptedAnswer: ["A", "B"] })];
    const out = excludeRetiredFormats([kept[0], chooseThree(), kept[1]]);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("元の配列を変更しない", () => {
    const input = [chooseThree(), q({ id: "a" })];
    excludeRetiredFormats(input);
    expect(input).toHaveLength(2);
  });

  it("空配列はそのまま", () => {
    expect(excludeRetiredFormats([])).toEqual([]);
  });
});
