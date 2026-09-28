import { describe, it, expect } from "vitest";
import { EXAM_CATALOG, findExam, examIdOf, summarizeExams, DEFAULT_EXAM_ID } from "./exams";
import type { Records } from "./progress";

const rec = (lastCorrect: boolean, lastAt: number) => ({
  attempts: 1,
  correctCount: lastCorrect ? 1 : 0,
  lastCorrect,
  lastAt,
});

describe("試験の一覧情報", () => {
  it("SOA-C02 と MLA-C01 は載せない", () => {
    const ids = EXAM_CATALOG.map((e) => e.id);
    expect(ids).not.toContain("soa-c02");
    expect(ids).not.toContain("mla-c01");
    expect(ids).toHaveLength(10);
  });

  it("本番モードの問題数は試験ごと（プロフェッショナルは75問）", () => {
    expect(findExam("saa-c03")?.examCount).toBe(65);
    expect(findExam("sap-c02")?.examCount).toBe(75);
    expect(findExam("dop-c02")?.examCount).toBe(75);
  });

  it("一覧に無い試験は undefined", () => {
    expect(findExam("soa-c02")).toBeUndefined();
  });

  it("既定の試験は SAA-C03", () => {
    expect(findExam(DEFAULT_EXAM_ID)?.code).toBe("SAA-C03");
  });
});

describe("examIdOf", () => {
  it("問題idから試験idを取り出す", () => {
    expect(examIdOf("saa-c03-0001")).toBe("saa-c03");
    expect(examIdOf("sap-c02-0493")).toBe("sap-c02");
  });
});

describe("summarizeExams", () => {
  const index = [
    { id: "saa-c03", count: 3, ids: ["saa-c03-0001", "saa-c03-0002", "saa-c03-0003"] },
    { id: "sap-c02", count: 2, ids: ["sap-c02-0001", "sap-c02-0002"] },
    { id: "clf-c02", count: 1, ids: ["clf-c02-0001"] },
    { id: "soa-c02", count: 1, ids: ["soa-c02-0001"] }, // 一覧に載せない試験
  ];

  it("解いた試験を「学習中」にまとめ、最後に解いた順に並べる", () => {
    const records: Records = {
      "saa-c03-0001": rec(true, 100),
      "saa-c03-0002": rec(false, 200),
      "sap-c02-0001": rec(true, 300),
    };
    const s = summarizeExams(index, records);
    expect(s.learning.map((e) => e.info.id)).toEqual(["sap-c02", "saa-c03"]);
    expect(s.learning[1]).toMatchObject({ total: 3, answered: 2, accuracy: 50 });
  });

  it("まだ解いていない試験はレベル別に並べ、空のレベルは出さない", () => {
    const s = summarizeExams(index, { "saa-c03-0001": rec(true, 1) });
    expect(s.levels.map((l) => [l.level, l.items.map((e) => e.info.id)])).toEqual([
      ["foundational", ["clf-c02"]],
      ["professional", ["sap-c02"]],
    ]);
  });

  it("配信データに無い試験・一覧に載せない試験は出さない", () => {
    const s = summarizeExams(index, { "soa-c02-0001": rec(true, 1) });
    const all = [...s.learning, ...s.levels.flatMap((l) => l.items)].map((e) => e.info.id);
    expect(all).not.toContain("soa-c02");
    expect(all).not.toContain("dva-c02"); // index に無い
  });

  it("問題集から消えた問題の記録は数えない", () => {
    const s = summarizeExams(index, { "saa-c03-0999": rec(true, 1) });
    expect(s.learning).toEqual([]);
  });
});
