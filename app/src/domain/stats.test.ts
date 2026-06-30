import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";
import type { Question } from "../types";
import type { Records } from "./progress";

function q(n: number): Question {
  return {
    id: `q${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e", ja: "j" },
    options: [],
    adoptedAnswer: ["A"],
    communityVote: [],
    answerConfidence: "high",
    needsReview: false,
  };
}

describe("computeStats", () => {
  it("未解答は0", () => {
    const s = computeStats([q(1), q(2)], {}, {});
    expect(s).toMatchObject({ total: 2, answered: 0, correct: 0, weak: 0, accuracy: 0 });
  });

  it("正答率・苦手数・ブックマーク数を集計", () => {
    const records: Records = {
      q1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 },
      q2: { attempts: 2, correctCount: 1, lastCorrect: false, lastAt: 2 },
      q3: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 3 },
    };
    const s = computeStats([q(1), q(2), q(3), q(4)], records, { q1: true });
    expect(s.total).toBe(4);
    expect(s.answered).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.weak).toBe(1);
    expect(s.accuracy).toBe(67); // 2/3
    expect(s.bookmarks).toBe(1);
  });
});
