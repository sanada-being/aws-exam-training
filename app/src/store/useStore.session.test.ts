import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./useStore";

beforeEach(() => useStore.getState().resetProgress());

describe("useStore セッション（回答明細の永続化）", () => {
  it("startSession は回答明細を空で開始する", () => {
    useStore.getState().startSession(["a", "b"]);
    expect(useStore.getState().session).toEqual({
      queueIds: ["a", "b"],
      index: 0,
      answers: {},
      reviewMode: false,
    });
  });

  it("recordSessionAnswer が回答明細を session に保存する", () => {
    useStore.getState().startSession(["a", "b"]);
    useStore.getState().recordSessionAnswer("a", false, ["B"]);
    expect(useStore.getState().session!.answers).toEqual({
      a: { selected: ["B"], correct: false },
    });
  });

  it("同じ問題を再回答しても初回の記録を上書きしない", () => {
    useStore.getState().startSession(["a"]);
    useStore.getState().recordSessionAnswer("a", false, ["B"]);
    useStore.getState().recordSessionAnswer("a", true, ["A"]);
    expect(useStore.getState().session!.answers.a).toEqual({ selected: ["B"], correct: false });
  });

  it("session が無ければ recordSessionAnswer は何もしない（クラッシュしない）", () => {
    expect(() => useStore.getState().recordSessionAnswer("a", true, ["A"])).not.toThrow();
    expect(useStore.getState().session).toBeNull();
  });

  it("誤答復習は reviewMode: true の新セッションとして開始する", () => {
    useStore.getState().startSession(["a", "b"]);
    useStore.getState().recordSessionAnswer("a", false, ["B"]);
    useStore.getState().startSession(["a"], true);
    expect(useStore.getState().session).toEqual({
      queueIds: ["a"],
      index: 0,
      answers: {},
      reviewMode: true,
    });
  });

  it("Session は正答数カウンタを持たない（明細から導出するため）", () => {
    useStore.getState().startSession(["a"]);
    expect(useStore.getState().session).not.toHaveProperty("correct");
  });

  it("endSession でセッションが消える", () => {
    useStore.getState().startSession(["a"]);
    useStore.getState().endSession();
    expect(useStore.getState().session).toBeNull();
  });

  it("setSessionIndex は明細を保ったまま位置だけ進める", () => {
    useStore.getState().startSession(["a", "b"]);
    useStore.getState().recordSessionAnswer("a", true, ["A"]);
    useStore.getState().setSessionIndex(1);
    const s = useStore.getState().session!;
    expect(s.index).toBe(1);
    expect(s.answers.a).toEqual({ selected: ["A"], correct: true });
  });
});
