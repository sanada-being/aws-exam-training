import { describe, it, expect } from "vitest";
import { expectedOptionCount, auditQuestion, type AuditTarget } from "./integrity";

function target(over: Partial<AuditTarget> = {}): AuditTarget {
  return {
    id: "x-0001",
    questionEn: "Which solution will meet these requirements?",
    options: ["A", "B", "C", "D"].map((key) => ({ key, en: `Do the thing ${key}.` })),
    adoptedAnswer: ["A"],
    ...over,
  };
}

describe("expectedOptionCount", () => {
  it("単一選択は4肢", () => {
    expect(expectedOptionCount("Which solution will meet these requirements?")).toBe(4);
  });

  it("(Choose two.) は5肢", () => {
    expect(expectedOptionCount("Which steps should the engineer take? (Choose two.)")).toBe(5);
  });

  it("(Choose three.) は6肢", () => {
    expect(expectedOptionCount("What should the team do? (Choose three.)")).toBe(6);
  });

  it("大文字小文字・末尾ピリオド無しにも対応する", () => {
    expect(expectedOptionCount("Pick some. (choose TWO)")).toBe(5);
  });
});

describe("auditQuestion", () => {
  it("正常な問題は指摘なし", () => {
    expect(auditQuestion(target())).toEqual([]);
  });

  it("肢数が足りなければ missing-option", () => {
    const issues = auditQuestion(target({ options: [{ key: "A", en: "a" }, { key: "B", en: "b" }, { key: "C", en: "c" }] }));
    expect(issues.map((i) => i.kind)).toContain("missing-option");
    expect(issues[0].detail).toContain("D");
  });

  it("キーが中抜けなら missing-option（欠けたレターを示す）", () => {
    const issues = auditQuestion(
      target({ options: [{ key: "A", en: "a" }, { key: "B", en: "b" }, { key: "D", en: "d" }] }),
    );
    expect(issues.map((i) => i.kind)).toEqual(["missing-option"]);
    expect(issues[0].detail).toContain("C");
  });

  it("欠けたレターが他の選択肢テキストに埋め込まれていれば embedded-label も返す", () => {
    const issues = auditQuestion(
      target({
        options: [
          { key: "A", en: "a" },
          { key: "B", en: "Use a batch process on EC2.C. Use a web application on EC2." },
          { key: "D", en: "d" },
        ],
      }),
    );
    expect(issues.map((i) => i.kind).sort()).toEqual(["embedded-label", "missing-option"]);
    expect(issues.find((i) => i.kind === "embedded-label")!.detail).toContain("B");
  });

  it("ピリオドなし・ハイフン付きのラベル埋め込みも検出する", () => {
    const dash = auditQuestion(
      target({
        options: [
          { key: "A", en: "a" },
          { key: "B", en: "b" },
          { key: "C", en: "Detailed Billing Reports -D AWS Cost Explorer reports" },
        ],
      }),
    );
    expect(dash.map((i) => i.kind)).toContain("embedded-label");

    const noDot = auditQuestion(
      target({
        options: [
          { key: "A", en: "a" },
          { key: "B", en: "b" },
          { key: "C", en: "c" },
          { key: "E", en: "Update each stack. F Add a policy to each member role." },
        ],
        questionEn: "What should the engineer do? (Choose three.)",
        adoptedAnswer: ["B", "C", "E"],
      }),
    );
    expect(noDot.map((i) => i.kind)).toContain("embedded-label");
  });

  it("自分と同じラベルが本文中に再出現する重複も embedded-label", () => {
    const issues = auditQuestion(
      target({
        options: [
          { key: "A", en: "a" },
          { key: "B", en: "b" },
          { key: "C", en: "Deploy the appliance.C. Create and review a portfolio." },
          { key: "D", en: "d" },
        ],
        adoptedAnswer: ["C"],
      }),
    );
    expect(issues.map((i) => i.kind)).toEqual(["embedded-label"]);
  });

  it("欠落レターと無関係な大文字始まりの文は誤検出しない", () => {
    const issues = auditQuestion(
      target({
        options: [
          { key: "A", en: "Store the data in Amazon S3. A Lambda function reads the object." },
          { key: "B", en: "b" },
          { key: "C", en: "c" },
          { key: "D", en: "d" },
        ],
      }),
    );
    expect(issues).toEqual([]);
  });

  it("採用正解が選択肢に存在しなければ orphan-answer", () => {
    const issues = auditQuestion(
      target({
        options: [{ key: "A", en: "a" }, { key: "B", en: "b" }, { key: "C", en: "c" }, { key: "D", en: "d" }],
        adoptedAnswer: ["E"],
      }),
    );
    expect(issues.map((i) => i.kind)).toContain("orphan-answer");
  });

  it("auditWaivers で免除した種別は指摘しない（復元不能と確認済みの問題）", () => {
    const issues = auditQuestion(
      target({
        options: [{ key: "A", en: "a" }, { key: "B", en: "b" }, { key: "C", en: "c" }],
        sourceNote: "出典元のページで選択肢 D が欠落しています。",
        auditWaivers: ["missing-option"],
      }),
    );
    expect(issues).toEqual([]);
  });

  it("注記（sourceNote）だけでは検査は緩まない", () => {
    const issues = auditQuestion(
      target({
        options: [{ key: "A", en: "a" }, { key: "B", en: "b" }, { key: "C", en: "c" }],
        sourceNote: "出典元のページで選択肢 D が欠落しています。",
      }),
    );
    expect(issues.map((i) => i.kind)).toEqual(["missing-option"]);
  });

  it("免除していない種別は auditWaivers があっても指摘する", () => {
    const issues = auditQuestion(
      target({
        options: [
          { key: "A", en: "a" },
          { key: "B", en: "Use a batch process.C. Use a web application." },
          { key: "D", en: "d" },
        ],
        auditWaivers: ["missing-option"],
      }),
    );
    expect(issues.map((i) => i.kind)).toEqual(["embedded-label"]);
  });
});
