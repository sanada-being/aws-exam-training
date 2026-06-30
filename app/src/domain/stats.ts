import type { Question } from "../types";
import type { Records } from "./progress";

export interface Stats {
  total: number;
  answered: number; // 一度でも解答した問題数
  correct: number; // 直近正解の問題数
  weak: number; // 直近誤答の問題数
  accuracy: number; // correct / answered (%)
  bookmarks: number;
}

/** 学習成績の集計（純粋関数）。正答率は直近の正誤で算出。 */
export function computeStats(
  questions: Question[],
  records: Records,
  bookmarks: Record<string, true>,
): Stats {
  let answered = 0;
  let correct = 0;
  let weak = 0;
  for (const q of questions) {
    const r = records[q.id];
    if (!r) continue;
    answered += 1;
    if (r.lastCorrect) correct += 1;
    else weak += 1;
  }
  return {
    total: questions.length,
    answered,
    correct,
    weak,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    bookmarks: Object.keys(bookmarks).length,
  };
}
