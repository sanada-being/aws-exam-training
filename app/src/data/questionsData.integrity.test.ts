// 実データ（data/*/questions.json と配信用 questions.slim.json）の構造検査。
// 収集元由来の「選択肢欠落 / ラベル埋め込み」の再発をここで止める。
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import process from "node:process";
import { auditQuestion, type AuditTarget, type Issue } from "../domain/integrity";

// vitest は app/ を作業ディレクトリとして実行される。
const ROOT = `${process.cwd()}/..`;
const DATA = `${ROOT}/data`;

interface RawOption {
  key: string;
  text: { en: string; ja: string | null };
}
interface RawQuestion {
  id: string;
  question: { en: string; ja: string | null };
  options: RawOption[];
  adoptedAnswer: string[];
  sourceNote?: string | null;
  auditWaivers?: ("missing-option" | "embedded-label" | "orphan-answer")[] | null;
}

function datasets(): { name: string; file: string }[] {
  const list = [{ name: "saa-c03", file: `${DATA}/questions.json` }];
  for (const d of readdirSync(DATA, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const file = `${DATA}/${d.name}/questions.json`;
    if (existsSync(file)) list.push({ name: d.name, file });
  }
  return list;
}

function format(name: string, id: string, issues: Issue[]): string[] {
  return issues.map((i) => `${name} ${id}: [${i.kind}] ${i.detail}`);
}

describe("収集データの構造検査", () => {
  for (const { name, file } of datasets()) {
    it(`${name}: 選択肢の欠落・ラベル埋め込みが無い`, () => {
      const all: RawQuestion[] = JSON.parse(readFileSync(file, "utf8"));
      const found: string[] = [];
      for (const q of all) {
        const target: AuditTarget = {
          id: q.id,
          questionEn: q.question?.en ?? "",
          options: (q.options ?? []).map((o) => ({ key: o.key, en: o.text?.en ?? "" })),
          adoptedAnswer: q.adoptedAnswer ?? [],
          sourceNote: q.sourceNote ?? null,
          auditWaivers: q.auditWaivers ?? null,
        };
        found.push(...format(name, q.id, auditQuestion(target)));
      }
      expect(found).toEqual([]);
    });

    it(`${name}: 日本語訳が全選択肢に付いている`, () => {
      const all: RawQuestion[] = JSON.parse(readFileSync(file, "utf8"));
      const missing = all
        .filter((q) => q.question?.ja) // 未翻訳の問題自体はここでは対象外
        .filter((q) => (q.options ?? []).some((o) => !o.text?.ja))
        .map((q) => q.id);
      expect(missing).toEqual([]);
    });
  }

  it("配信用 questions.slim.json も同じ検査を満たす", () => {
    const file = `${ROOT}/app/public/questions.slim.json`;
    const all = JSON.parse(readFileSync(file, "utf8")) as {
      id: string;
      question: { en: string };
      options: { key: string; en: string }[];
      adoptedAnswer: string[];
      sourceNote?: string | null;
      auditWaivers?: ("missing-option" | "embedded-label" | "orphan-answer")[] | null;
    }[];
    const found: string[] = [];
    for (const q of all) {
      found.push(
        ...format("slim", q.id, auditQuestion({
          id: q.id,
          questionEn: q.question?.en ?? "",
          options: q.options ?? [],
          adoptedAnswer: q.adoptedAnswer ?? [],
          sourceNote: q.sourceNote ?? null,
          auditWaivers: q.auditWaivers ?? null,
        })),
      );
    }
    expect(found).toEqual([]);
  });
});
