import { describe, it, expect, beforeEach } from "vitest";
import { useStore, getSnapshot, migrateProgress } from "./useStore";

beforeEach(() => useStore.getState().resetProgress());

describe("useStore", () => {
  it("recordAnswer で記録が増える", () => {
    useStore.getState().recordAnswer("q1", true, 100);
    expect(useStore.getState().records.q1).toEqual({
      attempts: 1,
      correctCount: 1,
      lastCorrect: true,
      lastAt: 100,
    });
  });

  it("toggleBookmark で追加/削除", () => {
    useStore.getState().toggleBookmark("q1");
    expect(useStore.getState().bookmarks.q1).toBe(true);
    useStore.getState().toggleBookmark("q1");
    expect(useStore.getState().bookmarks.q1).toBeUndefined();
  });

  it("mergeRemote でリモート進捗を統合", () => {
    useStore.getState().recordAnswer("q1", false, 100);
    useStore.getState().mergeRemote({
      records: { q1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 200 } },
      bookmarks: { q2: true },
    });
    // lastAtが新しいリモートの正誤を採用
    expect(useStore.getState().records.q1.lastCorrect).toBe(true);
    expect(useStore.getState().bookmarks.q2).toBe(true);
  });
});

describe("useStore ★のLWW同期", () => {
  it("toggleBookmark は bookmarkMarks にも時刻付きで記録する", () => {
    useStore.getState().toggleBookmark("q1", 100);
    expect(useStore.getState().bookmarkMarks.q1).toEqual({ on: true, at: 100 });
    useStore.getState().toggleBookmark("q1", 200);
    expect(useStore.getState().bookmarkMarks.q1).toEqual({ on: false, at: 200 });
    expect(useStore.getState().bookmarks.q1).toBeUndefined();
  });

  it("mergeRemote: 旧形式リモートの★は、ローカルで解除済みなら復活しない", () => {
    useStore.getState().toggleBookmark("q1", 100);
    useStore.getState().toggleBookmark("q1", 200); // 解除
    useStore.getState().mergeRemote({ records: {}, bookmarks: { q1: true, q2: true } });
    expect(useStore.getState().bookmarks).toEqual({ q2: true });
  });

  it("mergeRemote: リモートの新しい解除がローカルの古い★に勝つ", () => {
    useStore.getState().toggleBookmark("q1", 100);
    useStore.getState().mergeRemote({
      records: {},
      bookmarks: {},
      bookmarkMarks: { q1: { on: false, at: 500 } },
    });
    expect(useStore.getState().bookmarks).toEqual({});
    expect(useStore.getState().bookmarkMarks.q1).toEqual({ on: false, at: 500 });
  });

  it("getSnapshot は bookmarkMarks を含む", () => {
    useStore.getState().toggleBookmark("q1", 100);
    expect(getSnapshot()).toEqual({
      records: {},
      bookmarks: { q1: true },
      bookmarkMarks: { q1: { on: true, at: 100 } },
    });
  });

  it("resetProgress で bookmarkMarks も消える", () => {
    useStore.getState().toggleBookmark("q1", 100);
    useStore.getState().resetProgress();
    expect(useStore.getState().bookmarkMarks).toEqual({});
  });
});

describe("useStore 永続データの移行", () => {
  it("v1(bookmarkMarks無し)の保存データは at=0 の marks に移行される", () => {
    const migrated = migrateProgress({ records: {}, bookmarks: { q1: true }, session: null }, 1);
    expect(migrated.bookmarkMarks).toEqual({ q1: { on: true, at: 0 } });
    expect(migrated.bookmarks).toEqual({ q1: true });
  });
  it("v2 の保存データはそのまま", () => {
    const p = { records: {}, bookmarks: {}, bookmarkMarks: { q1: { on: false, at: 5 } } };
    expect(migrateProgress(p, 2)).toEqual(p);
  });
});
