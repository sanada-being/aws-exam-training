// App を通した中断→再開の結合テスト。
// 「中断しても問題なく再開できる」という仕様を、Home→Quiz→中断→続きから の実経路で検証する。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useStore } from "./store/useStore";

function raw(n: number) {
  return {
    id: `saa-c03-000${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: `en${n}`, ja: `問題${n}` },
    options: [
      { key: "A", en: "a", ja: `選択肢A(${n})` },
      { key: "B", en: "b", ja: `選択肢B(${n})` },
    ],
    adoptedAnswer: ["A"], // 正解は常に A
    communityVote: [{ answer: "A", count: 10, percent: 100 }],
    answerConfidence: "high",
    needsReview: false,
  };
}

const DATA = [raw(1), raw(2), raw(3), raw(4)];

beforeEach(() => {
  useStore.getState().resetProgress();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) })),
  );
});

afterEach(() => vi.unstubAllGlobals());

/** 表示中の問題に解答して次へ進む。 */
async function pick(n: number, choice: "A" | "B") {
  await userEvent.click(screen.getByText(`選択肢${choice}(${n})`));
  await userEvent.click(screen.getByRole("button", { name: "採点する" }));
  await userEvent.click(screen.getByRole("button", { name: /次へ/ }));
}

async function startSequential() {
  await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
  await userEvent.click(screen.getByRole("button", { name: "順番に学習" }));
  await waitFor(() => screen.getByText("問題1"));
}

describe("App: 中断しても問題なく再開できる", () => {
  it("中断すると解いた位置が「続きから」に出て、その問題から再開する", async () => {
    render(<App />);
    await startSequential();
    await pick(1, "A");
    await pick(2, "B");
    // 3問目を表示中に中断
    expect(screen.getByText("問題3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "中断" }));

    // ホームに「続きから（3 / 4）」が出る
    const resumeBtn = await waitFor(() => screen.getByRole("button", { name: /続きから/ }));
    expect(resumeBtn).toHaveAccessibleName("続きから（3 / 4）");

    await userEvent.click(resumeBtn);
    // 中断した問題から再開する
    expect(await waitFor(() => screen.getByText("問題3"))).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toHaveTextContent("3 / 4");
  });

  it("中断前の正誤が保たれ、最終結果と振り返りが全問分になる", async () => {
    render(<App />);
    await startSequential();
    await pick(1, "B"); // 誤答
    await pick(2, "B"); // 誤答
    await userEvent.click(screen.getByRole("button", { name: "中断" }));
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));

    await waitFor(() => screen.getByText("問題3"));
    await pick(3, "B"); // 誤答
    await pick(4, "A"); // 正答

    // 中断前の2問を含んだ集計になる
    expect(screen.getByText(/問中/).textContent).toMatch(/4 問中\s*1 問正解（25%）/);
    expect(screen.getByText("間違い 3 問")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "間違えた問題を復習（3問）" }),
    ).toBeInTheDocument();
  });

  it("採点だけして「次へ」を押さずに中断しても、その回答は失われない", async () => {
    render(<App />);
    await startSequential();
    await userEvent.click(screen.getByText("選択肢B(1)"));
    await userEvent.click(screen.getByRole("button", { name: "採点する" }));
    // 「次へ」を押さずに中断
    await userEvent.click(screen.getByRole("button", { name: "中断" }));
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));

    // 同じ問題に戻り、採点済み（読み取り専用）で表示される
    await waitFor(() => screen.getByText("問題1"));
    expect(screen.getByTestId("verdict")).toHaveTextContent("不正解");
    expect(screen.queryByRole("button", { name: "採点する" })).not.toBeInTheDocument();
  });

  it("アプリを閉じて開き直しても（再マウント）再開できる", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "B");
    first.unmount(); // 中断ボタンを押さずにアプリを閉じる（PWA/リロード相当）

    render(<App />);
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));
    await waitFor(() => screen.getByText("問題2"));
    await pick(2, "A");
    await pick(3, "A");
    await pick(4, "A");
    expect(screen.getByText(/問中/).textContent).toMatch(/4 問中\s*3 問正解（75%）/);
  });

  it("最後まで解き終えてホームへ戻ると「続きから」は消える", async () => {
    render(<App />);
    await startSequential();
    await pick(1, "A");
    await pick(2, "A");
    await pick(3, "A");
    await pick(4, "A");
    await userEvent.click(screen.getByRole("button", { name: "ホームへ戻る" }));
    await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
    expect(screen.queryByRole("button", { name: /続きから/ })).not.toBeInTheDocument();
  });

  it("中断中に別モードを開始すると、その新しいセッションに置き換わる", async () => {
    render(<App />);
    await startSequential();
    await pick(1, "B");
    await userEvent.click(screen.getByRole("button", { name: "中断" }));
    await waitFor(() => screen.getByRole("button", { name: /続きから/ }));

    // 「順番に学習」で解き直す → 新セッションなので1問目から、明細も空
    await userEvent.click(screen.getByRole("button", { name: "順番に学習" }));
    await waitFor(() => screen.getByText("問題1"));
    expect(screen.getByTestId("progress")).toHaveTextContent("1 / 4");
    expect(screen.queryByRole("button", { name: "採点する" })).toBeInTheDocument();
  });
});

describe("App: 中断中にデータが更新されても再開できる", () => {
  it("中断していた問題より前の問題が消えても、同じ問題から再開する", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "B"); // 問題1を誤答 → 問題2を表示中に中断
    first.unmount();

    // データ更新で問題1が消えた状態でアプリを開き直す
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([raw(2), raw(3), raw(4)]) })),
    );
    render(<App />);
    const btn = await waitFor(() => screen.getByRole("button", { name: /続きから/ }));
    // 残り3問の1問目として案内される
    expect(btn).toHaveAccessibleName("続きから（1 / 3）");
    await userEvent.click(btn);
    await waitFor(() => screen.getByText("問題2"));
    expect(screen.getByTestId("progress")).toHaveTextContent("1 / 3");
  });

  it("中断していた問題自体が消えたら、未回答の先頭から続ける", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "A"); // 問題1を正答 → 問題2を表示中に中断
    first.unmount();

    // 中断中だった問題2が消えた
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([raw(1), raw(3), raw(4)]) })),
    );
    render(<App />);
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));
    // 問題1は回答済みなので問題3から
    await waitFor(() => screen.getByText("問題3"));
  });

  it("セッションの問題が全て消えたら「続きから」を出さない", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "B");
    first.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ ...raw(9) }]) })),
    );
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "順番に学習" }));
    expect(screen.queryByRole("button", { name: /続きから/ })).not.toBeInTheDocument();
  });

  it("正解済みの問題が消えても、その正解を数えず正答率が100%を超えない", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "A"); // 正答
    await pick(2, "A"); // 正答
    await pick(3, "A"); // 正答 → 問題4を表示中に中断
    first.unmount();

    // 正解済みの3問がデータ更新で消え、未回答の問題4だけが残った
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([raw(4)]) })),
    );
    render(<App />);
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));
    await waitFor(() => screen.getByText("問題4"));
    await pick(4, "B"); // 誤答

    // 消えた3問の正解を数えないので 1問中0問正解
    expect(screen.getByText(/問中/).textContent).toMatch(/1 問中\s*0 問正解（0%）/);
    expect(screen.getByText("間違い 1 問")).toBeInTheDocument();
  });

  it("消えた問題の誤答は振り返りの件数に含めない", async () => {
    const first = render(<App />);
    await startSequential();
    await pick(1, "B"); // 誤答
    await pick(2, "B"); // 誤答 → 問題3を表示中に中断
    first.unmount();

    // 誤答した問題1が消えた
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([raw(2), raw(3), raw(4)]) })),
    );
    render(<App />);
    await userEvent.click(await waitFor(() => screen.getByRole("button", { name: /続きから/ })));
    await waitFor(() => screen.getByText("問題3"));
    await pick(3, "A");
    await pick(4, "A");

    // 残っている誤答は問題2だけ。ボタンの件数と実際の出題数が一致する
    expect(screen.getByText(/問中/).textContent).toMatch(/3 問中\s*2 問正解（67%）/);
    const btn = screen.getByRole("button", { name: /間違えた問題を復習/ });
    expect(btn).toHaveAccessibleName("間違えた問題を復習（1問）");
    await userEvent.click(btn);
    expect(screen.getByTestId("progress")).toHaveTextContent("1 / 1");
    expect(screen.getByText("問題2")).toBeInTheDocument();
  });
});
