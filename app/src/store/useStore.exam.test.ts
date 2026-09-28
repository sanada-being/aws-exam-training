import { describe, it, expect, beforeEach } from "vitest";
import { useStore, migrateProgress } from "./useStore";

beforeEach(() => {
  useStore.getState().resetProgress();
  useStore.setState({ currentExam: null });
});

describe("試験の選択", () => {
  it("選んだ試験を覚える", () => {
    useStore.getState().selectExam("sap-c02");
    expect(useStore.getState().currentExam).toBe("sap-c02");
  });

  it("中断した出題は試験ごとに持ち、戻ると元の続きが出る", () => {
    const st = useStore.getState;
    st().selectExam("saa-c03");
    st().startSession(["saa-c03-0001", "saa-c03-0002"]);
    st().setSessionIndex(1);

    st().selectExam("sap-c02");
    expect(st().session).toBeNull(); // SAP ではまだ中断した出題が無い
    st().startSession(["sap-c02-0001"]);

    st().selectExam("saa-c03");
    expect(st().session).toMatchObject({ queueIds: ["saa-c03-0001", "saa-c03-0002"], index: 1 });
    st().selectExam("sap-c02");
    expect(st().session?.queueIds).toEqual(["sap-c02-0001"]);
  });

  it("同じ試験を選び直しても中断した出題は消えない", () => {
    const st = useStore.getState;
    st().selectExam("saa-c03");
    st().startSession(["saa-c03-0001"]);
    st().selectExam("saa-c03");
    expect(st().session?.queueIds).toEqual(["saa-c03-0001"]);
  });

  it("記録のリセットで全試験の中断データも消える（選んだ試験は残す）", () => {
    const st = useStore.getState;
    st().selectExam("saa-c03");
    st().startSession(["saa-c03-0001"]);
    st().selectExam("sap-c02");
    st().resetProgress();
    st().selectExam("saa-c03");
    expect(st().session).toBeNull();
    expect(st().currentExam).toBe("saa-c03");
  });
});

describe("migrateProgress（v2 → v3）", () => {
  const rec = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 };

  it("SAA の記録がある利用者は SAA を選んだ状態で引き継ぐ", () => {
    const out = migrateProgress({ records: { "saa-c03-0001": rec }, bookmarkMarks: {}, session: null }, 2);
    expect(out.currentExam).toBe("saa-c03");
    expect(out.sessions).toEqual({});
  });

  it("中断した出題だけある利用者も SAA を引き継ぎ、出題はそのまま残す", () => {
    const session = { queueIds: ["saa-c03-0001"], index: 0, answers: {}, reviewMode: false };
    const out = migrateProgress({ records: {}, bookmarkMarks: {}, session }, 2);
    expect(out.currentExam).toBe("saa-c03");
    expect(out.session).toEqual(session);
  });

  it("何も記録が無ければ試験は未選択（初回は一覧を出す）", () => {
    const out = migrateProgress({ records: {}, bookmarkMarks: {}, session: null }, 2);
    expect(out.currentExam).toBeNull();
  });

  it("v1 からも続けて移行できる", () => {
    const out = migrateProgress({ records: { "saa-c03-0001": rec }, bookmarks: { "saa-c03-0001": true } }, 1);
    expect(out.currentExam).toBe("saa-c03");
    expect(out.bookmarkMarks).toEqual({ "saa-c03-0001": { on: true, at: 0 } });
  });
});
