import { describe, it, expect } from "vitest";
import { toQuestions } from "./loader";
import type { Question } from "../types";

function q(id: string, adoptedAnswer: string[]): Question {
  return {
    id,
    questionNumber: 1,
    topic: 1,
    isMultipleAnswer: adoptedAnswer.length > 1,
    question: { en: "e", ja: "j" },
    options: ["A", "B", "C", "D", "E", "F"].map((k) => ({ key: k, en: k, ja: k })),
    adoptedAnswer,
    communityVote: [],
    answerConfidence: "high",
    needsReview: false,
  };
}

describe("toQuestions", () => {
  it("配列でなければ例外", () => {
    expect(() => toQuestions({})).toThrow(/must be an array/);
    expect(() => toQuestions(null)).toThrow();
  });

  it("廃止された「3つ選ぶ」形式を除外する", () => {
    const out = toQuestions([q("single", ["A"]), q("three", ["A", "C", "E"]), q("two", ["A", "B"])]);
    expect(out.map((x) => x.id)).toEqual(["single", "two"]);
  });

  it("該当が無ければ全件そのまま返す", () => {
    expect(toQuestions([q("a", ["A"]), q("b", ["A", "B"])])).toHaveLength(2);
  });
});
