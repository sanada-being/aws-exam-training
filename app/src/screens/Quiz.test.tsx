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

  it("全問正解なら復習ボタンは出ない", async () => {
    render(<Quiz queue={queue} onExit={() => {}} />);
    await answer("選択肢A(1)"); // Q1 正答
    await answer("選択肢B(2)"); // Q2 正答
    expect(screen.getByText(/全問正解/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /間違えた問題を復習/ })).not.toBeInTheDocument();
  });
});
