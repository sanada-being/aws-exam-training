import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionView } from "./QuestionView";
import type { Question } from "../types";

const single: Question = {
  id: "q1",
  questionNumber: 1,
  topic: 1,
  isMultipleAnswer: false,
  question: { en: "EN text", ja: "日本語の問題文" },
  options: [
    { key: "A", en: "a", ja: "選択肢A" },
    { key: "B", en: "b", ja: "選択肢B" },
  ],
  adoptedAnswer: ["B"],
  communityVote: [],
  answerConfidence: "high",
  needsReview: false,
};

describe("QuestionView", () => {
  it("日本語の問題文と選択肢を表示する", () => {
    render(<QuestionView question={single} onResult={() => {}} onNext={() => {}} />);
    expect(screen.getByText("日本語の問題文")).toBeInTheDocument();
    expect(screen.getByText("選択肢A")).toBeInTheDocument();
  });

  it("正解を選んで採点すると正解判定し onResult(true)", async () => {
    const onResult = vi.fn();
    render(<QuestionView question={single} onResult={onResult} onNext={() => {}} />);
    await userEvent.click(screen.getByText("選択肢B"));
    await userEvent.click(screen.getByRole("button", { name: "採点する" }));
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("verdict")).toHaveTextContent("正解");
  });

  it("誤答を選ぶと onResult(false) で不正解表示", async () => {
    const onResult = vi.fn();
    render(<QuestionView question={single} onResult={onResult} onNext={() => {}} />);
    await userEvent.click(screen.getByText("選択肢A"));
    await userEvent.click(screen.getByRole("button", { name: "採点する" }));
    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("verdict")).toHaveTextContent("不正解");
  });

  it("採点前は採点ボタンが無効", () => {
    render(<QuestionView question={single} onResult={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("button", { name: "採点する" })).toBeDisabled();
  });

  it("原文(EN)トグルで英語表示に切り替わる", async () => {
    render(<QuestionView question={single} onResult={() => {}} onNext={() => {}} />);
    expect(screen.queryByText("EN text")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "原文(EN)" }));
    expect(screen.getByText("EN text")).toBeInTheDocument();
  });
});
