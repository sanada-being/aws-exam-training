import type { Question, Confidence } from "../types";

export interface DatasetSummary {
  total: number;
  byTopic: Record<number, number>;
  byConfidence: Record<Confidence, number>;
  multipleAnswer: number;
}

/** 問題集全体の集計（ホーム画面の概要表示などに使う純粋関数）。 */
export function summarize(questions: Question[]): DatasetSummary {
  const byTopic: Record<number, number> = {};
  const byConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  let multipleAnswer = 0;

  for (const q of questions) {
    byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
    byConfidence[q.answerConfidence] = (byConfidence[q.answerConfidence] ?? 0) + 1;
    if (q.isMultipleAnswer) multipleAnswer += 1;
  }

  return { total: questions.length, byTopic, byConfidence, multipleAnswer };
}
