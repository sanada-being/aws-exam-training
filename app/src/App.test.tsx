import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "./screens/Home";
import { useStore } from "./store/useStore";
import { emptyFilter, type Filter } from "./domain/filter";
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
  {
    id: "saa-c03-0002",
    questionNumber: 2,
    topic: 1,
    isMultipleAnswer: false,
    question: { en: "e2", ja: "問題2" },
    options: [{ key: "A", en: "a", ja: "選択肢A" }],
    adoptedAnswer: ["A"],
    communityVote: [],
    answerConfidence: "low",
    needsReview: true,
  },
];

function renderHome(props: Partial<Parameters<typeof Home>[0]> = {}) {
  return render(
    <Home
      questions={sample}
      onStart={() => {}}
      filter={emptyFilter}
      onFilterChange={() => {}}
      {...props}
    />,
  );
}

describe("Home", () => {
  it("解答ラベルと開始ボタンを表示する", () => {
    renderHome();
    expect(screen.getByText(/\/ 2 解答/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "順番に学習" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ランダム出題" })).toBeInTheDocument();
  });

  it("開始ボタンで onStart が呼ばれる", async () => {
    const onStart = vi.fn();
    renderHome({ onStart });
    await userEvent.click(screen.getByRole("button", { name: "順番に学習" }));
    expect(onStart).toHaveBeenCalledWith("sequential");
  });

  it("4つの出題モードを表示し、未解答時は苦手復習が無効", () => {
    useStore.getState().resetProgress();
    renderHome();
    expect(screen.getByRole("button", { name: /未回答のみ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /苦手を復習/ })).toBeDisabled();
  });

  it("解答するとダッシュボードに解答数・正答率が反映される", () => {
    useStore.getState().resetProgress();
    useStore.getState().recordAnswer("saa-c03-0001", true, 1);
    renderHome();
    expect(screen.getByTestId("answered")).toHaveTextContent("1");
    expect(screen.getByTestId("accuracy")).toHaveTextContent("100%");
  });

  it("セッションがあれば続きからボタンを表示", () => {
    renderHome({ onResume: () => {}, resumeInfo: { index: 2, total: 10 } });
    expect(screen.getByRole("button", { name: /続きから（3 \/ 10）/ })).toBeInTheDocument();
  });

  it("確信度フィルタの変更で onFilterChange が呼ばれる", async () => {
    const onFilterChange = vi.fn();
    renderHome({ onFilterChange });
    await userEvent.click(screen.getByRole("button", { name: "確信度:高" }));
    expect(onFilterChange).toHaveBeenCalled();
    const arg = onFilterChange.mock.calls[0][0] as Filter;
    expect(arg.confidences).toContain("high");
  });

  it("絞り込み適用で対象数が変わる", () => {
    renderHome({ filter: { ...emptyFilter, needsReviewOnly: true } });
    expect(screen.getByTestId("pool")).toHaveTextContent("1");
  });

  it("設定ボタンで onOpenSettings が呼ばれる", async () => {
    const onOpenSettings = vi.fn();
    renderHome({ onOpenSettings });
    await userEvent.click(screen.getByRole("button", { name: "設定・同期" }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
