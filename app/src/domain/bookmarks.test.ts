import { describe, it, expect } from "vitest";
import {
  activeBookmarks,
  marksFromLegacy,
  mergeMarks,
  snapshotMarks,
  toggleMark,
  type BookmarkMarks,
} from "./bookmarks";

describe("toggleMark", () => {
  it("未設定→on、on→off、off→on を時刻付きで記録する", () => {
    let m: BookmarkMarks = {};
    m = toggleMark(m, "q1", 100);
    expect(m.q1).toEqual({ on: true, at: 100 });
    m = toggleMark(m, "q1", 200);
    expect(m.q1).toEqual({ on: false, at: 200 });
    m = toggleMark(m, "q1", 300);
    expect(m.q1).toEqual({ on: true, at: 300 });
  });
  it("元のオブジェクトを変更しない", () => {
    const m: BookmarkMarks = { q1: { on: true, at: 1 } };
    toggleMark(m, "q1", 2);
    expect(m.q1).toEqual({ on: true, at: 1 });
  });
});

describe("activeBookmarks", () => {
  it("on のものだけを Record<string,true> にする", () => {
    const m: BookmarkMarks = { q1: { on: true, at: 1 }, q2: { on: false, at: 2 } };
    expect(activeBookmarks(m)).toEqual({ q1: true });
  });
});

describe("marksFromLegacy", () => {
  it("旧形式(★のみ)は at=0 の on として扱う", () => {
    expect(marksFromLegacy({ q1: true, q2: true })).toEqual({
      q1: { on: true, at: 0 },
      q2: { on: true, at: 0 },
    });
  });
});

describe("mergeMarks", () => {
  it("id ごとに at が新しい方を採用する（解除が古い★に負けない）", () => {
    const local: BookmarkMarks = { q1: { on: false, at: 200 } };
    const remote: BookmarkMarks = { q1: { on: true, at: 100 } };
    expect(mergeMarks(local, remote).q1).toEqual({ on: false, at: 200 });
    expect(mergeMarks(remote, local).q1).toEqual({ on: false, at: 200 });
  });
  it("片側にしか無い id はそのまま採用する", () => {
    const m = mergeMarks({ q1: { on: true, at: 1 } }, { q2: { on: false, at: 2 } });
    expect(m).toEqual({ q1: { on: true, at: 1 }, q2: { on: false, at: 2 } });
  });
  it("at が同じなら on を優先する（旧形式同士は従来どおり和集合）", () => {
    const m = mergeMarks({ q1: { on: false, at: 0 } }, { q1: { on: true, at: 0 } });
    expect(m.q1).toEqual({ on: true, at: 0 });
  });
  it("旧端末の古い★(at=0)はタイムスタンプ付きの解除に負ける", () => {
    const legacy = marksFromLegacy({ q1: true, q2: true, q3: true });
    const current: BookmarkMarks = { q1: { on: false, at: 500 }, q2: { on: false, at: 500 } };
    const m = mergeMarks(current, legacy);
    expect(activeBookmarks(m)).toEqual({ q3: true });
  });
});

describe("snapshotMarks", () => {
  it("bookmarkMarks があればそれを使う", () => {
    const marks: BookmarkMarks = { q1: { on: false, at: 9 } };
    expect(snapshotMarks({ bookmarks: { q1: true }, bookmarkMarks: marks })).toEqual(marks);
  });
  it("bookmarkMarks が無ければ旧形式 bookmarks から復元する", () => {
    expect(snapshotMarks({ bookmarks: { q1: true } })).toEqual({ q1: { on: true, at: 0 } });
  });
  it("bookmarkMarks に無い旧形式の★は at=0 で補う", () => {
    const m = snapshotMarks({
      bookmarks: { q1: true, q2: true },
      bookmarkMarks: { q1: { on: true, at: 5 } },
    });
    expect(m).toEqual({ q1: { on: true, at: 5 }, q2: { on: true, at: 0 } });
  });
  it("bookmarks も無ければ空", () => {
    expect(snapshotMarks({})).toEqual({});
  });
});
