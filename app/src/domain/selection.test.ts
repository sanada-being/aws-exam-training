import { describe, it, expect } from "vitest";
import { shuffle, selectByMode, buildQueue, modeCount } from "./selection";
import type { Question } from "../types";
import type { Records } from "./progress";

function q(n: number): Question {
  return {
    id: `q${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e", ja: "j" },
    options: [{ key: "A", en: "a", ja: "あ" }],
    adoptedAnswer: ["A"],
    communityVote: [],
    answerConfidence: "high",
    needsReview: false,
  };
}

const questions = [q(1), q(2), q(3)];
const records: Records = {
  q1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 }, // 正解済み
  q2: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: 2 }, // 苦手
  // q3 は未解答
};

describe("shuffle", () => {
  it("要素集合を保つ", () => {
    const out = shuffle([1, 2, 3, 4], () => 0.5);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("selectByMode", () => {
  it("wrong は直近誤答のみ", () => {
    expect(selectByMode(questions, "wrong", records).map((x) => x.questionNumber)).toEqual([2]);
  });
  it("unanswered は未解答のみ", () => {
    expect(selectByMode(questions, "unanswered", records).map((x) => x.questionNumber)).toEqual([3]);
  });
  it("sequential は全件", () => {
    expect(selectByMode(questions, "sequential", records)).toHaveLength(3);
  });
});

describe("buildQueue", () => {
  it("sequential は問題番号順", () => {
    expect(buildQueue([q(3), q(1), q(2)], "sequential", {}).map((x) => x.questionNumber)).toEqual([
      1, 2, 3,
    ]);
  });
  it("random は全件保持", () => {
    expect(
      buildQueue(questions, "random", {}, () => 0.5)
        .map((x) => x.questionNumber)
        .sort(),
    ).toEqual([1, 2, 3]);
  });
});

describe("modeCount", () => {
  it("各モードの対象数", () => {
    expect(modeCount(questions, "wrong", records)).toBe(1);
    expect(modeCount(questions, "unanswered", records)).toBe(1);
    expect(modeCount(questions, "sequential", records)).toBe(3);
  });
});
