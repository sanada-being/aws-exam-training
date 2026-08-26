// 出題データの構造的な破損を検出する純粋関数群。
// ExamTopics 由来のデータには「選択肢が丸ごと欠落」「隣の選択肢の本文に
// 別ラベルごと埋め込まれている」という収集元由来の破損が混ざるため、
// データ側の回帰を防ぐ検査をここに集約する。

export interface AuditOption {
  key: string;
  en: string;
}

export type IssueKind = "missing-option" | "embedded-label" | "orphan-answer";

export interface AuditTarget {
  id: string;
  questionEn: string;
  options: AuditOption[];
  adoptedAnswer: string[];
  /** 学習者に見せる注記（出典元の不備を説明する文。検査結果には影響しない） */
  sourceNote?: string | null;
  /** 復元不能と確認済みで、検査を明示的に免除する指摘種別 */
  auditWaivers?: IssueKind[] | null;
}

export interface Issue {
  kind: IssueKind;
  detail: string;
}

const CHOOSE = /\(choose\s+(two|three|four)\.?\)/i;
const NEED: Record<string, number> = { two: 2, three: 3, four: 4 };

/** ExamTopics の出題形式は 単一選択=4肢 / 2つ選択=5肢 / 3つ選択=6肢 で固定。 */
export function expectedOptionCount(questionEn: string): number {
  const m = CHOOSE.exec(questionEn ?? "");
  return (m ? NEED[m[1].toLowerCase()] : 1) + 3;
}

function letters(count: number): string[] {
  return [...Array(count)].map((_, i) => String.fromCharCode(65 + i));
}

/**
 * 文中に別の選択肢ラベルが埋め込まれている位置を返す（見つからなければ -1）。
 * requireDot=true のときはラベル直後の「.」「:」を必須にする（誤検出を避けるため）。
 */
function findEmbeddedLabel(text: string, label: string, requireDot: boolean): number {
  const dot = requireDot ? "[.:]" : "[.:]?";
  const patterns = [
    // 前段が文末/改行/括弧: "...the PII.C. Create a web application..."
    `(?:[.!?)\\]]|<br\\s*/?>)\\s*-?\\s*${label}${dot}\\s+(?=[A-Z])`,
    // ハイフン区切り: "Detailed Billing Reports -D AWS Cost Explorer reports"
    `\\s+-\\s*${label}${dot}\\s+(?=[A-Z])`,
  ];
  for (const p of patterns) {
    const m = new RegExp(p).exec(text);
    if (m) return m.index;
  }
  return -1;
}

export function auditQuestion(t: AuditTarget): Issue[] {
  const issues: Issue[] = [];
  const waived = new Set(t.auditWaivers ?? []);
  const keys = t.options.map((o) => o.key).filter(Boolean);
  const expected = expectedOptionCount(t.questionEn);
  const missing = letters(Math.max(expected, keys.length)).filter((l) => !keys.includes(l));

  if (missing.length && !waived.has("missing-option")) {
    issues.push({
      kind: "missing-option",
      detail: `選択肢 ${missing.join(",")} が欠落（${keys.join("")} / 期待 ${expected} 肢）`,
    });
  }

  // 欠落レター、または自身のキーと同じラベルが本文中に再出現するものだけを疑う。
  // （無関係な "... Amazon S3. A Lambda function ..." のような文を誤検出しないため）
  for (const o of t.options) {
    // 欠落レターはラベル直後のピリオド無しでも拾う。自キーの重複は誤検出を避けてピリオド必須。
    const suspects = [...missing.map((l) => [l, false] as const), [o.key, true] as const];
    for (const [label, requireDot] of suspects) {
      const at = findEmbeddedLabel(o.en ?? "", label, requireDot);
      if (at >= 0 && !waived.has("embedded-label")) {
        issues.push({
          kind: "embedded-label",
          detail: `選択肢 ${o.key} の本文に "${label}" 以降が埋め込まれている（位置 ${at}）`,
        });
        break;
      }
    }
  }

  const orphans = t.adoptedAnswer.filter((a) => !keys.includes(a));
  if (orphans.length) {
    issues.push({ kind: "orphan-answer", detail: `採用正解 ${orphans.join(",")} が選択肢に存在しない` });
  }

  return issues;
}
