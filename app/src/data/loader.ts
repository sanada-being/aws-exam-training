import type { Question } from "../types";

/** 生データ(JSON)を Question[] に正規化する純粋関数（テスト容易）。 */
export function toQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) throw new Error("questions data must be an array");
  return raw as Question[];
}

/** public/questions.slim.json を読み込む。 */
export async function loadQuestions(): Promise<Question[]> {
  const url = `${import.meta.env.BASE_URL}questions.slim.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load questions: ${res.status}`);
  return toQuestions(await res.json());
}
