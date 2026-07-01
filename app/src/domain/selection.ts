import type { Question } from "../types";
import { isWeak, type Records } from "./progress";

export type QuizMode = "sequential" | "random" | "wrong" | "unanswered";

/** Fisher–Yates シャッフル（非破壊）。 */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

/** モード別の対象数（ホームのバッジ表示に使用）。 */
export function modeCount(questions: Question[], mode: QuizMode, records: Records): number {
  return selectByMode(questions, mode, records).length;
}

/** 出題キューを構築（抽出→並べ替え→任意で先頭N問に制限）。random以外は問題番号順。 */
export function buildQueue(
  questions: Question[],
  mode: QuizMode,
  records: Records,
  rng: () => number = Math.random,
  limit?: number,
): Question[] {
  const subset = selectByMode(questions, mode, records);
  const ordered =
    mode === "random"
      ? shuffle(subset, rng)
      : [...subset].sort((a, b) => a.questionNumber - b.questionNumber);
  return limit && limit > 0 ? ordered.slice(0, limit) : ordered;
}
