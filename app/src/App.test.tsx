import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "./screens/Home";
import { useStore } from "./store/useStore";
import type { Question } from "./types";

const sample: Question[] = [
  {
    id: "saa-c03-0001",
    questionNumber: 1,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e", ja: "問題1" },
    options: [{ key: "A", en: "a", ja: "選択肢A" }],
    adoptedAnswer: ["A"],
    communityVote: [{ answer: "A", count: 5, percent: 100 }],
    answerConfidence: "high",
    needsReview: false,
  },
];

describe("Home", () => {
  it("総問数と開始ボタンを表示する", () => {
    render(<Home questions={sample} onStart={() => {}} />);
    expect(screen.getByText(/全/)).toHaveTextContent("全 1 問");
    expect(screen.getByRole("button", { name: "順番に学習" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ランダム出題" })).toBeInTheDocument();
  });

  it("開始ボタンで onStart が呼ばれる", async () => {
    const onStart = vi.fn();
    render(<Home questions={sample} onStart={onStart} />);
    await userEvent.click(screen.getByRole("button", { name: "順番に学習" }));
    expect(onStart).toHaveBeenCalledWith("sequential");
  });

  it("4つの出題モードを表示し、未解答時は苦手復習が無効", () => {
    useStore.getState().resetProgress();
    render(<Home questions={sample} onStart={() => {}} />);
    expect(screen.getByRole("button", { name: /順番に学習/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ランダム出題/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /未回答のみ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /苦手を復習/ })).toBeDisabled();
  });
});
