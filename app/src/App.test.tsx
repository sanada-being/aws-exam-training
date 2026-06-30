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
    expect(screen.getByText(/\/ 1 解答/)).toBeInTheDocument();
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

  it("解答するとダッシュボードに解答数・正答率が反映される", () => {
    useStore.getState().resetProgress();
    useStore.getState().recordAnswer("saa-c03-0001", true, 1);
    render(<Home questions={sample} onStart={() => {}} />);
    expect(screen.getByTestId("answered")).toHaveTextContent("1");
    expect(screen.getByTestId("accuracy")).toHaveTextContent("100%");
  });

  it("セッションがあれば続きからボタンを表示", () => {
    render(
      <Home
        questions={sample}
        onStart={() => {}}
        onResume={() => {}}
        resumeInfo={{ index: 2, total: 10 }}
      />,
    );
    expect(screen.getByRole("button", { name: /続きから（3 \/ 10）/ })).toBeInTheDocument();
  });
});
