import type { ProgressSnapshot } from "../domain/merge";

const API = "https://api.github.com/gists";
const FILE = "saa-progress.json";

export interface SyncPayload extends ProgressSnapshot {
  version: 1;
  updatedAt: number;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

export function buildPayload(snapshot: ProgressSnapshot, at: number): SyncPayload {
  return { version: 1, updatedAt: at, records: snapshot.records, bookmarks: snapshot.bookmarks };
}

/** 非公開Gistを新規作成し gistId を返す。 */
export async function createGist(token: string, payload: SyncPayload): Promise<string> {
  const res = await fetch(API, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      description: "AWS SAA 問題集 進捗データ",
      public: false,
      files: { [FILE]: { content: JSON.stringify(payload) } },
    }),
  });
  if (!res.ok) throw new Error(`Gist作成失敗: ${res.status}`);
  const json = await res.json();
  return json.id as string;
}

/** Gistから進捗を取得。 */
export async function fetchGist(token: string, gistId: string): Promise<SyncPayload> {
  const res = await fetch(`${API}/${gistId}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Gist取得失敗: ${res.status}`);
  const json = await res.json();
  const content = json.files?.[FILE]?.content;
  if (!content) throw new Error("進捗ファイルが見つかりません");
  return JSON.parse(content) as SyncPayload;
}

/** Gistを更新。 */
export async function updateGist(
  token: string,
  gistId: string,
  payload: SyncPayload,
): Promise<void> {
  const res = await fetch(`${API}/${gistId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload) } } }),
  });
  if (!res.ok) throw new Error(`Gist更新失敗: ${res.status}`);
}
