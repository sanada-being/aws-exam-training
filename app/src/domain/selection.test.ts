import { describe, it, expect } from "vitest";
import { shuffle, selectByMode, buildQueue, modeCount, selectExam, EXAM_COUNT } from "./selection";
import type { Confidence, Question } from "../types";
import type { Records } from "./progress";

function q(n: number, answerConfidence: Confidence = "high"): Question {
  return {
    id: `q${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e", ja: "j" },
    options: [{ key: "A", en: "a", ja: "あ" }],
    adoptedAnswer: ["A"],
    communityVote: [],
    answerConfidence,
    needsReview: false,
  };
}

/** 確信度ごとに n 問ずつ作る（番号が重複しないようオフセットを付ける）。 */
function pool(high: number, medium = 0, low = 0): Question[] {
  const mk = (count: number, conf: Confidence, offset: number) =>
    Array.from({ length: count }, (_, i) => q(offset + i + 1, conf));
  return [...mk(high, "high", 0), ...mk(medium, "medium", 1000), ...mk(low, "low", 2000)];
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
  it("limit で先頭N問に制限", () => {
    expect(buildQueue([q(1), q(2), q(3)], "sequential", {}, Math.random, 2).map((x) => x.questionNumber)).toEqual([
      1, 2,
    ]);
  });
  it("limitがプールより大きければ全件", () => {
    expect(buildQueue([q(1), q(2)], "sequential", {}, Math.random, 10)).toHaveLength(2);
  });
});

describe("modeCount", () => {
  it("各モードの対象数", () => {
    expect(modeCount(questions, "wrong", records)).toBe(1);
    expect(modeCount(questions, "unanswered", records)).toBe(1);
    expect(modeCount(questions, "sequential", records)).toBe(3);
  });
  it("exam は本番問題数で頭打ち", () => {
    expect(modeCount(pool(100), "exam", {})).toBe(EXAM_COUNT);
    expect(modeCount(pool(10), "exam", {})).toBe(10);
  });
});

describe("selectExam", () => {
  it("本番問題数は65問", () => {
    expect(EXAM_COUNT).toBe(65);
  });

  it("十分な数があれば65問を返す", () => {
    expect(selectExam(pool(100))).toHaveLength(EXAM_COUNT);
  });

  it("確信度:高を優先して選ぶ", () => {
    const picked = selectExam(pool(65, 50, 50));
    expect(picked.every((x) => x.answerConfidence === "high")).toBe(true);
  });

  it("高が足りなければ 中 → 低 の順に補充する", () => {
    const picked = selectExam(pool(60, 3, 50));
    const count = (c: Confidence) => picked.filter((x) => x.answerConfidence === c).length;
    expect(count("high")).toBe(60);
    expect(count("medium")).toBe(3);
    expect(count("low")).toBe(2);
  });

  it("プールが65問未満なら全件を返す", () => {
    expect(selectExam(pool(5, 3))).toHaveLength(8);
  });

  it("重複なく選ぶ", () => {
    const picked = selectExam(pool(100));
    expect(new Set(picked.map((x) => x.id)).size).toBe(EXAM_COUNT);
  });

  it("出題順は確信度順に固まらない（選出後にシャッフルされる）", () => {
    // rng を固定しても high の直後に medium が並ぶだけの順序にはならないこと
    const picked = selectExam(pool(60, 20), () => 0.42);
    const firstMedium = picked.findIndex((x) => x.answerConfidence === "medium");
    expect(firstMedium).toBeGreaterThanOrEqual(0);
    expect(firstMedium).toBeLessThan(EXAM_COUNT - 1);
  });
});

describe("buildQueue: exam", () => {
  it("exam は65問を返す", () => {
    expect(buildQueue(pool(100), "exam", {})).toHaveLength(EXAM_COUNT);
  });

  it("exam は limit 指定を無視して65問固定", () => {
    expect(buildQueue(pool(100), "exam", {}, Math.random, 10)).toHaveLength(EXAM_COUNT);
  });

  it("exam は確信度:高を優先する", () => {
    const items = buildQueue(pool(70, 70), "exam", {});
    expect(items.every((x) => x.answerConfidence === "high")).toBe(true);
  });
});
