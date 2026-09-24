/**
 * ★(ブックマーク)の同期用表現。
 * 「付けた/外した」を時刻付きで保持し、端末間マージは id ごとに新しい方を採用する(LWW)。
 * 解除も墓標(on:false)として残すため、他端末の古い★に上書きされない。
 */
export interface BookmarkMark {
  on: boolean;
  at: number; // epoch ms。旧形式(タイムスタンプ無し)から復元したものは 0
}
export type BookmarkMarks = Record<string, BookmarkMark>;

/** 旧形式(★のid→true)。UI・フィルタ・統計はこの形を使い続ける。 */
export type LegacyBookmarks = Record<string, true>;

/** ★を付ける/外すを反転し、操作時刻を記録する。 */
export function toggleMark(marks: BookmarkMarks, id: string, at: number): BookmarkMarks {
  const on = !marks[id]?.on;
  return { ...marks, [id]: { on, at } };
}

/** on のものだけを旧形式(id→true)に落とす。 */
export function activeBookmarks(marks: BookmarkMarks): LegacyBookmarks {
  const out: LegacyBookmarks = {};
  for (const [id, m] of Object.entries(marks)) if (m.on) out[id] = true;
  return out;
}

/** 旧形式の★を at=0 の on として扱う（タイムスタンプ付きの状態が常に勝つ）。 */
export function marksFromLegacy(bookmarks: LegacyBookmarks): BookmarkMarks {
  const out: BookmarkMarks = {};
  for (const id of Object.keys(bookmarks)) out[id] = { on: true, at: 0 };
  return out;
}

/** id ごとに at が新しい方を採用。同時刻なら on を優先（旧形式同士は従来どおり和集合）。 */
export function mergeMarks(a: BookmarkMarks, b: BookmarkMarks): BookmarkMarks {
  const out: BookmarkMarks = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id];
    const y = b[id];
    if (!x) out[id] = y;
    else if (!y) out[id] = x;
    else if (x.at !== y.at) out[id] = x.at > y.at ? x : y;
    else out[id] = x.on ? x : y;
  }
  return out;
}

/** スナップショット(新旧どちらの形式でも)から marks を取り出す。 */
export function snapshotMarks(s: {
  bookmarks?: LegacyBookmarks;
  bookmarkMarks?: BookmarkMarks;
}): BookmarkMarks {
  const marks: BookmarkMarks = { ...(s.bookmarkMarks ?? {}) };
  // 旧端末が bookmarkMarks を落として保存した場合に備え、marks に無い★は at=0 で補う
  for (const id of Object.keys(s.bookmarks ?? {})) {
    if (!marks[id]) marks[id] = { on: true, at: 0 };
  }
  return marks;
}
