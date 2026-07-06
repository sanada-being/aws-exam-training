// セッション内の回答記録（純粋関数）。
// 「初回回答のみ」を集計・苦手収集・誤答振り返りに使うためのロジック。
// 前の問題に戻って回答し直しても、初回の結果を上書きしない。

export interface AnswerRecord {
  selected: string[];
  correct: boolean;
}
export type SessionAnswers = Record<string, AnswerRecord>;

/** その問題が既にこのセッションで回答済みか。 */
export function isAnswered(a: SessionAnswers, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(a, id);
}

/**
 * 初回回答を記録する。既に回答済みの id は無視し、元の記録を維持する。
 * 変化が無い場合は同一参照を返す（Reactの無駄な再描画を避ける）。
 */
export function recordFirst(
  a: SessionAnswers,
  id: string,
  correct: boolean,
  selected: string[],
): SessionAnswers {
  if (isAnswered(a, id)) return a;
  return { ...a, [id]: { selected: [...selected], correct } };
}

/** 初回回答基準で正答数・誤答id（挿入順）を集計する。 */
export function tally(a: SessionAnswers): {
  answered: number;
  correct: number;
  wrongIds: string[];
} {
  let correct = 0;
  const wrongIds: string[] = [];
  for (const id of Object.keys(a)) {
    if (a[id].correct) correct += 1;
    else wrongIds.push(id);
  }
  return { answered: Object.keys(a).length, correct, wrongIds };
}
