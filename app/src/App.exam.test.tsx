// App を通した試験の選択・切り替えの結合テスト。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useStore } from "./store/useStore";

function raw(exam: string, n: number) {
  return {
    id: `${exam}-000${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: `en${n}`, ja: `${exam} 問題${n}` },
    options: [
      { key: "A", en: "a", ja: `選択肢A(${n})` },
      { key: "B", en: "b", ja: `選択肢B(${n})` },
    ],
    adoptedAnswer: ["A"],
    communityVote: [],
    answerConfidence: "high",
    needsReview: false,
  };
}

const FILES: Record<string, unknown> = {
  "index.json": ["saa-c03", "sap-c02"].map((id) => ({
    id,
    count: 2,
    ids: [`${id}-0001`, `${id}-0002`],
  })),
  "saa-c03.json": [raw("saa-c03", 1), raw("saa-c03", 2)],
  "sap-c02.json": [raw("sap-c02", 1), raw("sap-c02", 2)],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  useStore.getState().resetProgress();
  useStore.setState({ currentExam: null, session: null, sessions: {} });
  fetchMock = vi.fn((url: string) => {
    const body = FILES[url.split("/").pop() ?? ""];
    return Promise.resolve({
      ok: body !== undefined,
      status: body !== undefined ? 200 : 404,
      json: () => Promise.resolve(body),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const switcher = () => screen.getByRole("button", { name: /試験を切り替える/ });

describe("App: 試験の選択", () => {
  it("初めて開いたときは試験一覧を出し、選んだ試験のホームへ進む", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("解く試験を選んでください"));
    await userEvent.click(screen.getByRole("button", { name: /SAP-C02/ }));

    await waitFor(switcher);
    expect(switcher()).toHaveTextContent("SAP-C02");
    expect(screen.getByRole("button", { name: "75問" })).toBeInTheDocument(); // 出題数チップも本番の問題数
    expect(useStore.getState().currentExam).toBe("sap-c02");
  });

  it("2回目以降は前回の試験のホームから始まる（一覧は読み込まない）", async () => {
    useStore.setState({ currentExam: "saa-c03" });
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
    expect(switcher()).toHaveTextContent("SAA-C03");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringMatching(/index\.json$/));
  });

  it("ホームの試験名から一覧に戻って別の試験に切り替えられる", async () => {
    useStore.setState({ currentExam: "saa-c03" });
    render(<App />);
    await userEvent.click(await waitFor(switcher));
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /SAP-C02/ })));
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: "順番に学習" })));
    expect(await waitFor(() => screen.getByText("sap-c02 問題1"))).toBeInTheDocument();
  });

  it("一覧の戻るボタンで元の試験のホームに戻る", async () => {
    useStore.setState({ currentExam: "saa-c03" });
    render(<App />);
    await userEvent.click(await waitFor(switcher));
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: "戻る" })));
    await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
    expect(switcher()).toHaveTextContent("SAA-C03");
  });

  it("「続きから」は試験ごと: 別の試験に切り替えると出ず、戻ると出る", async () => {
    useStore.setState({ currentExam: "saa-c03" });
    render(<App />);
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: "順番に学習" })));
    await userEvent.click(await waitFor(() => screen.getByText("選択肢A(1)")));
    await userEvent.click(screen.getByRole("button", { name: "採点する" }));
    await userEvent.click(screen.getByRole("button", { name: /次へ/ }));
    await userEvent.click(screen.getByRole("button", { name: "中断" }));
    await waitFor(() => screen.getByRole("button", { name: "続きから（2 / 2）" }));

    await userEvent.click(switcher());
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /SAP-C02/ })));
    await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
    expect(screen.queryByRole("button", { name: /続きから/ })).not.toBeInTheDocument();

    await userEvent.click(switcher());
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /SAA-C03/ })));
    expect(
      await waitFor(() => screen.getByRole("button", { name: "続きから（2 / 2）" })),
    ).toBeInTheDocument();
  });

  it("選んだ試験のデータが読めないときは、理由と一覧に戻る手段を出す", async () => {
    useStore.setState({ currentExam: "dva-c02" }); // 配信データが無い
    render(<App />);
    await waitFor(() => screen.getByText(/問題を読み込めませんでした/));
    await userEvent.click(screen.getByRole("button", { name: "試験一覧へ" }));
    await waitFor(() => screen.getByRole("button", { name: /SAP-C02/ }));
  });
});
