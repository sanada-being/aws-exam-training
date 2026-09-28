import type { Question } from "../types";
import type { ExamIndexEntry } from "../../scripts/slim.mjs";

export type { ExamIndexEntry };

/** 生データ(JSON)を Question[] に正規化する純粋関数（テスト容易）。 */
export function toQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) throw new Error("questions data must be an array");
  return raw as Question[];
}

async function fetchJson(file: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`failed to load ${file}: ${res.status}`);
  return res.json();
}

/** 指定した試験の問題（public/data/<試験id>.json）を読み込む。 */
export async function loadQuestions(examId: string): Promise<Question[]> {
  return toQuestions(await fetchJson(`${examId}.json`));
}

/** 試験一覧（public/data/index.json: 試験ごとの問題数・問題id）を読み込む。 */
export async function loadExamIndex(): Promise<ExamIndexEntry[]> {
  const raw = await fetchJson("index.json");
  if (!Array.isArray(raw)) throw new Error("exam index must be an array");
  return raw as ExamIndexEntry[];
}
