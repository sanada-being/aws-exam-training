import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./useStore";

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
