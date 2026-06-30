import { describe, it, expect } from "vitest";
import { summarize } from "./dataset";
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
