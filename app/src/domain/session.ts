// 学習セッション（中断/再開）のドメインロジック。
// 正答数は「カウンタとして保存」せず、回答明細(answers)から必ず導出する。
// カウンタと明細を二重に持つと中断時に片方だけが失われ、正答率が100%を超える。

import { isAnswered, tally, type SessionAnswers } from "./sessionAnswers";

export interface Session {
  queueIds: string[];
  index: number;
  /** 回答明細（初回回答のみ）。集計・振り返り・読み取り専用表示の唯一の基準。 */
  answers: SessionAnswers;
  /** 誤答復習ラウンド中か（この間はグローバルな苦手記録を更新しない）。 */
  reviewMode: boolean;
}

/**
 * 再開可能なセッションか。
 * `answers` を持たない旧形式（正答数カウンタのみ保存していた版）は、
 * 回答明細を復元できないため再開不可として扱う。
 */
export function isResumable(session: Session | null): boolean {
  if (!session) return false;
  if (!Array.isArray(session.queueIds)) return false;
  if (!session.answers || typeof session.answers !== "object") return false;
  if (typeof session.index !== "number") return false;
  return session.index < session.queueIds.length;
}

/**
 * 中断していたセッションを現在の問題集に突き合わせ、出題リストと再開位置を解決する。
 * 位置は配列の添字ではなく問題idを基準に解決するので、データ更新で問題が
 * 増減しても「中断した問題」から再開できる。再開できない場合は null。
 */
export function resolveResume<T extends { id: string }>(
  session: Session | null,
  byId: Map<string, T>,
): { items: T[]; index: number } | null {
  if (!session || !isResumable(session)) return null;
  const items = session.queueIds
    .map((id) => byId.get(id))
    .filter((q): q is T => q !== undefined);
  if (items.length === 0) return null;

  const at = items.findIndex((q) => q.id === session.queueIds[session.index]);
  if (at >= 0) return { items, index: at };

  // 中断していた問題が問題集から消えている場合は未回答の先頭へ。
  // 全て回答済みなら結果画面の位置（= 出題数）を返す。
  const firstUnanswered = items.findIndex((q) => !isAnswered(session.answers, q.id));
  return { items, index: firstUnanswered >= 0 ? firstUnanswered : items.length };
}

export interface SessionResult {
  /** 出題数（分母）。 */
  total: number;
  /** 正答数（分子）。answers から導出。 */
  correct: number;
  wrongIds: string[];
  /** 正答率(%)。分子・分母が同じ回答集合由来なので 100% を超えない。 */
  accuracy: number;
}

/** セッションの成績を回答明細から導出する。total は出題数を渡す。 */
export function sessionResult(session: Session | null, total: number): SessionResult {
  const { correct, wrongIds } = session
    ? tally(session.answers)
    : { correct: 0, wrongIds: [] as string[] };
  return {
    total,
    correct,
    wrongIds,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
  };
}
