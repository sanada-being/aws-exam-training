import { describe, it, expect, vi, afterEach } from "vitest";
import { toQuestions, loadQuestions, loadExamIndex } from "./loader";
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

  it("「6肢から3つ選ぶ」問題も除外せず全件返す（本番で出題されるため）", () => {
    const out = toQuestions([q("single", ["A"]), q("three", ["A", "C", "E"]), q("two", ["A", "B"])]);
    expect(out.map((x) => x.id)).toEqual(["single", "three", "two"]);
  });
});

describe("loadQuestions / loadExamIndex", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(body: unknown, ok = true) {
    const fetch = vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("指定した試験のデータを読み込む", async () => {
    const fetch = stubFetch([q("sap-c02-0001", ["A"])]);
    const out = await loadQuestions("sap-c02");
    expect(fetch).toHaveBeenCalledWith("/data/sap-c02.json");
    expect(out.map((x) => x.id)).toEqual(["sap-c02-0001"]);
  });

  it("試験一覧を読み込む", async () => {
    const fetch = stubFetch([{ id: "saa-c03", count: 1, ids: ["saa-c03-0001"] }]);
    expect(await loadExamIndex()).toEqual([{ id: "saa-c03", count: 1, ids: ["saa-c03-0001"] }]);
    expect(fetch).toHaveBeenCalledWith("/data/index.json");
  });

  it("読み込みに失敗したら例外", async () => {
    stubFetch(null, false);
    await expect(loadQuestions("xxx-c01")).rejects.toThrow(/404/);
    await expect(loadExamIndex()).rejects.toThrow(/404/);
  });
});
