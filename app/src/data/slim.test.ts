import { describe, it, expect } from "vitest";
import { toSlim, examIdOf, buildIndex } from "../../scripts/slim.mjs";

function raw(n: number, over: Record<string, unknown> = {}) {
  return {
    id: `sap-c02-000${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: `en${n}`, ja: `問題${n}` },
    options: [
      { key: "A", text: { en: "a", ja: "あ" } },
      { key: "B", text: { en: "b", ja: "い" } },
    ],
    adoptedAnswer: ["A"],
    communityVote: [{ answer: "A", count: 3, percent: 100 }],
    answerConfidence: "high",
    needsReview: false,
    explanation: { en: "x", ja: "解説" },
    discussion: [{ body: "重いので配信しない" }],
    ...over,
  };
}

describe("toSlim", () => {
  it("配信用の形に変換し、問題番号順に並べる（Discussion は含めない）", () => {
    const out = toSlim([raw(2), raw(1)]);
    expect(out.map((q) => q.id)).toEqual(["sap-c02-0001", "sap-c02-0002"]);
    expect(out[0]).toMatchObject({
      question: { en: "en1", ja: "問題1" },
      options: [
        { key: "A", en: "a", ja: "あ" },
        { key: "B", en: "b", ja: "い" },
      ],
      explanation: "解説",
    });
    expect(out[0]).not.toHaveProperty("discussion");
  });

  it("未翻訳の問題は含めない", () => {
    const untranslated = raw(3, { question: { en: "e", ja: null } });
    const optionMissing = raw(4, {
      options: [{ key: "A", text: { en: "a", ja: null } }],
    });
    expect(toSlim([raw(1), untranslated, optionMissing]).map((q) => q.id)).toEqual([
      "sap-c02-0001",
    ]);
  });

  it("出典の注記は、ある問題だけに付ける", () => {
    const out = toSlim([raw(1), raw(2, { sourceNote: "注記" })]);
    expect(out[0]).not.toHaveProperty("sourceNote");
    expect(out[1].sourceNote).toBe("注記");
  });
});

describe("examIdOf", () => {
  it("問題idの先頭の試験コードを返す", () => {
    expect(examIdOf("saa-c03-0001")).toBe("saa-c03");
    expect(examIdOf("sap-c02-0493")).toBe("sap-c02");
  });
});

describe("buildIndex", () => {
  it("試験ごとの問題数と問題idを、試験id順にまとめる", () => {
    const index = buildIndex({
      "sap-c02": toSlim([raw(1), raw(2)]),
      "clf-c02": [],
    });
    expect(index).toEqual([
      { id: "clf-c02", count: 0, ids: [] },
      { id: "sap-c02", count: 2, ids: ["sap-c02-0001", "sap-c02-0002"] },
    ]);
  });
});
