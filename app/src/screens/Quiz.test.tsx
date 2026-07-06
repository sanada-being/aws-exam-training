import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Quiz } from "./Quiz";
import { useStore } from "../store/useStore";
import type { Question } from "../types";

function makeQ(n: number, answer: string): Question {
  return {
    id: `q${n}`,
    questionNumber: n,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: `en${n}`, ja: `問題${n}` },
    options: [
      { key: "A", en: "a", ja: `選択肢A(${n})` },
      { key: "B", en: "b", ja: `選択肢B(${n})` },
    ],
    adoptedAnswer: [answer],
    communityVote: [{ answer, count: 10, percent: 100 }],
    answerConfidence: "high",
    needsReview: false,
  };
}

// Q1の正解はA、Q2の正解はB
const queue = [makeQ(1, "A"), makeQ(2, "B")];

beforeEach(() => useStore.getState().resetProgress());

async function answer(labelText: string) {
  await userEvent.click(screen.getByText(labelText));
  await userEvent.click(screen.getByRole("button", { name: "採点する" }));
  await userEvent.click(screen.getByRole("button", { name: /次へ/ }));
}

describe("Quiz 結果画面の誤答復習", () => {
  it("Q1を誤答・Q2を正答 → 結果に『間違えた問題を復習（1問）』が出る", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢B(1)"); // Q1: 正解Aに対しB=誤答
    await answer("選択肢B(2)"); // Q2: 正解B=正答
    expect(screen.getByText(/1 問中|2 問中/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "間違えた問題を復習（1問）" }),
    ).toBeInTheDocument();
  });

  it("復習ボタンで誤答問題だけの新セッションが始まる", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢B(1)"); // Q1 誤答
    await answer("選択肢B(2)"); // Q2 正答
    await userEvent.click(screen.getByRole("button", { name: "間違えた問題を復習（1問）" }));
    // 1問だけの出題に切り替わる
    expect(screen.getByTestId("progress")).toHaveTextContent("1 / 1");
    expect(screen.getByText("問題1")).toBeInTheDocument();
  });

  it("直後の誤答復習で正解しても、苦手（未正解）状態は維持される", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢B(1)"); // Q1(正解A)を誤答 → 記録: lastCorrect=false
    await answer("選択肢B(2)"); // Q2 正答
    expect(useStore.getState().records.q1.lastCorrect).toBe(false);
    // 誤答復習へ
    await userEvent.click(screen.getByRole("button", { name: "間違えた問題を復習（1問）" }));
    // 復習でQ1を正解しても、記録は更新されない（苦手のまま）
    await answer("選択肢A(1)");
    expect(useStore.getState().records.q1.lastCorrect).toBe(false);
  });

  it("全問正解なら復習ボタンは出ない", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢A(1)"); // Q1 正答
    await answer("選択肢B(2)"); // Q2 正答
    expect(screen.getByText(/全問正解/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /間違えた問題を復習/ })).not.toBeInTheDocument();
  });
});

describe("Quiz 前へ戻る（初回回答のみ採用）", () => {
  it("先頭では「前へ」が無効、回答して進むと有効になる", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    expect(screen.getByRole("button", { name: "前の問題へ" })).toBeDisabled();
    await answer("選択肢B(1)"); // Q1回答→Q2へ
    expect(screen.getByText("問題2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前の問題へ" })).toBeEnabled();
  });

  it("前へ戻ると初回回答が読み取り専用で表示され、再回答できない", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢B(1)"); // Q1(正解A)を誤答 → Q2へ
    await userEvent.click(screen.getByRole("button", { name: "前の問題へ" }));
    // Q1が採点済み(不正解)・注記つきで表示
    expect(screen.getByText("問題1")).toBeInTheDocument();
    expect(screen.getByTestId("verdict")).toHaveTextContent("不正解");
    expect(screen.getByText(/初回の回答が使われます/)).toBeInTheDocument();
    // 読み取り専用: 採点ボタンは無く、選択肢は無効
    expect(screen.queryByRole("button", { name: "採点する" })).not.toBeInTheDocument();
    expect(screen.getByText("選択肢A(1)").closest("button")).toBeDisabled();
  });

  it("戻っても苦手（未正解）記録は初回のまま維持される", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢B(1)"); // Q1 誤答 → 記録 lastCorrect=false
    expect(useStore.getState().records.q1.lastCorrect).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "前の問題へ" }));
    // 戻っても記録は初回のまま（読み取り専用なので変更不可）
    expect(useStore.getState().records.q1.lastCorrect).toBe(false);
    // 前へ→次へで元に戻れる
    await userEvent.click(screen.getByRole("button", { name: /次へ/ }));
    expect(screen.getByText("問題2")).toBeInTheDocument();
  });
});
