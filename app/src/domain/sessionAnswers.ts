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

/**
 * 初回回答基準で正答数・誤答idを集計する。集計はこの関数に集約する。
 * `ids` を渡すとその範囲・その順序だけを対象にする（現在の出題に含まれない
 * 回答を数えないため。省略時は記録済みの全件を回答順で集計）。
 */
export function tally(
  a: SessionAnswers,
  ids: readonly string[] = Object.keys(a),
): { answered: number; correct: number; wrongIds: string[] } {
  let answered = 0;
  let correct = 0;
  const wrongIds: string[] = [];
  for (const id of ids) {
    const r = a[id];
    if (!r) continue;
    answered += 1;
    if (r.correct) correct += 1;
    else wrongIds.push(id);
  }
  return { answered, correct, wrongIds };
}
