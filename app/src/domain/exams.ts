// 試験の一覧情報と、試験一覧画面に出す集計（純粋関数）。
import type { Records } from "./progress";

export type ExamLevel = "foundational" | "associate" | "professional" | "specialty";

export interface ExamInfo {
  /** 問題idの先頭と同じ（例: saa-c03）。配信データのファイル名にも使う。 */
  id: string;
  code: string;
  name: string;
  level: ExamLevel;
  /** 本番の問題数（本番モードの出題数）。 */
  examCount: number;
  /** 本番の試験時間（分）。 */
  minutes: number;
}

export const LEVELS: { level: ExamLevel; label: string }[] = [
  { level: "foundational", label: "基礎" },
  { level: "associate", label: "アソシエイト" },
  { level: "professional", label: "プロフェッショナル" },
  { level: "specialty", label: "専門知識" },
];

/**
 * 一覧に載せる試験。問題数・時間は AWS 公式の試験ガイドによる（2026-09 確認）。
 * 次の試験は載せない: SOA-C02（旧版。現行は SOA-C03）、SCS-C02（2025-12 終了。現行は SCS-C03）、
 * MLS-C01（2026-03 終了）、MLA-C01（収録が57問と少ない）。
 * データは data/ に残してあるので、ここに足せば一覧に戻せる。
 */
export const EXAM_CATALOG: ExamInfo[] = [
  { id: "clf-c02", code: "CLF-C02", name: "クラウドプラクティショナー", level: "foundational", examCount: 65, minutes: 90 },
  { id: "aif-c01", code: "AIF-C01", name: "AI プラクティショナー", level: "foundational", examCount: 65, minutes: 90 },
  { id: "saa-c03", code: "SAA-C03", name: "ソリューションアーキテクト – アソシエイト", level: "associate", examCount: 65, minutes: 130 },
  { id: "dva-c02", code: "DVA-C02", name: "デベロッパー – アソシエイト", level: "associate", examCount: 65, minutes: 130 },
  { id: "dea-c01", code: "DEA-C01", name: "データエンジニア – アソシエイト", level: "associate", examCount: 65, minutes: 130 },
  { id: "sap-c02", code: "SAP-C02", name: "ソリューションアーキテクト – プロフェッショナル", level: "professional", examCount: 75, minutes: 180 },
  { id: "dop-c02", code: "DOP-C02", name: "DevOps エンジニア – プロフェッショナル", level: "professional", examCount: 75, minutes: 180 },
  { id: "ans-c01", code: "ANS-C01", name: "高度なネットワーキング – 専門知識", level: "specialty", examCount: 65, minutes: 170 },
];

/** 既存の利用者（SAA のみだった頃の記録を持つ人）が引き継ぐ試験。 */
export const DEFAULT_EXAM_ID = "saa-c03";

export function findExam(id: string): ExamInfo | undefined {
  return EXAM_CATALOG.find((e) => e.id === id);
}

/** 問題id（例: saa-c03-0001）から試験id（saa-c03）を取り出す。 */
export function examIdOf(questionId: string): string {
  return questionId.replace(/-\d+$/, "");
}

/** 配信データの試験一覧（scripts/build-data.mjs が出力する index.json の1件）。 */
export interface ExamIndexItem {
  id: string;
  count: number;
  ids: string[];
}

export interface ExamEntry {
  info: ExamInfo;
  total: number;
  answered: number;
  /** 直近正解の割合(%)。未解答なら 0。 */
  accuracy: number;
  /** 最後に解いた時刻（未解答なら 0）。 */
  lastAt: number;
}

export interface ExamSummary {
  /** 1問でも解いた試験。最後に解いた順。 */
  learning: ExamEntry[];
  /** まだ解いていない試験のレベル別の並び（空のレベルは含めない）。 */
  levels: { level: ExamLevel; label: string; items: ExamEntry[] }[];
}

/** 試験一覧画面の集計。今の問題集にある問題の記録だけを数える。 */
export function summarizeExams(index: ExamIndexItem[], records: Records): ExamSummary {
  const byId = new Map(index.map((x) => [x.id, x]));
  const entries: ExamEntry[] = [];
  for (const info of EXAM_CATALOG) {
    const item = byId.get(info.id);
    if (!item) continue;
    let answered = 0;
    let correct = 0;
    let lastAt = 0;
    for (const id of item.ids) {
      const r = records[id];
      if (!r) continue;
      answered += 1;
      if (r.lastCorrect) correct += 1;
      lastAt = Math.max(lastAt, r.lastAt);
    }
    entries.push({
      info,
      total: item.count,
      answered,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      lastAt,
    });
  }
  const learning = entries.filter((e) => e.answered > 0).sort((a, b) => b.lastAt - a.lastAt);
  const levels = LEVELS.map(({ level, label }) => ({
    level,
    label,
    items: entries.filter((e) => e.answered === 0 && e.info.level === level),
  })).filter((l) => l.items.length > 0);
  return { learning, levels };
}
