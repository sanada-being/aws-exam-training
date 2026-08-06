import type { Confidence, Question } from "../types";
import { isWeak, type Records } from "./progress";

export type QuizMode = "sequential" | "random" | "wrong" | "unanswered" | "exam";

/** 本番試験の問題数。 */
export const EXAM_COUNT = 65;

/** 出題の優先順位（確信度の高い＝正解が信頼できる問題から出す）。 */
const CONFIDENCE_PRIORITY: Confidence[] = ["high", "medium", "low"];

/** Fisher–Yates シャッフル（非破壊）。 */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 本番モードの出題を選ぶ。確信度の高い問題を優先し、足りなければ 中 → 低 の順に補充する。
 * 各グループ内・最終的な出題順ともにランダム。
 */
export function selectExam(
  questions: Question[],
  rng: () => number = Math.random,
  limit: number = EXAM_COUNT,
): Question[] {
  const picked: Question[] = [];
  for (const conf of CONFIDENCE_PRIORITY) {
    if (picked.length >= limit) break;
    const group = shuffle(
      questions.filter((q) => q.answerConfidence === conf),
      rng,
    );
    picked.push(...group.slice(0, limit - picked.length));
  }
  // 確信度順に並んだままだと偏るので、出題順は改めてシャッフルする
  return shuffle(picked, rng);
}

/** モードに応じて対象問題を抽出（順序は未確定）。 */
export function selectByMode(questions: Question[], mode: QuizMode, records: Records): Question[] {
  switch (mode) {
    case "wrong":
      return questions.filter((q) => isWeak(records[q.id]));
    case "unanswered":
      return questions.filter((q) => !records[q.id]);
    default:
      return questions;
  }
}

/** モード別の対象数（ホームのバッジ表示に使用）。exam は本番問題数で頭打ち。 */
export function modeCount(questions: Question[], mode: QuizMode, records: Records): number {
  const n = selectByMode(questions, mode, records).length;
  return mode === "exam" ? Math.min(n, EXAM_COUNT) : n;
}

/**
 * 出題キューを構築（抽出→並べ替え→任意で先頭N問に制限）。random以外は問題番号順。
 * exam は limit によらず常に本番問題数（65問・確信度優先のランダム）。
 */
export function buildQueue(
  questions: Question[],
  mode: QuizMode,
  records: Records,
  rng: () => number = Math.random,
  limit?: number,
): Question[] {
  if (mode === "exam") return selectExam(questions, rng);
  const subset = selectByMode(questions, mode, records);
  const ordered =
    mode === "random"
      ? shuffle(subset, rng)
      : [...subset].sort((a, b) => a.questionNumber - b.questionNumber);
  return limit && limit > 0 ? ordered.slice(0, limit) : ordered;
}
