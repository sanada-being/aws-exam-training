import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Explanation } from "./Explanation";
import type { Question } from "../types";

const q: Question = {
  id: "q1",
  questionNumber: 1,
  topic: 1,
  isMultipleAnswer: false,
  question: { en: "e", ja: "j" },
  options: [
    { key: "A", en: "a", ja: "あ" },
    { key: "B", en: "b", ja: "い" },
  ],
  adoptedAnswer: ["A"],
  communityVote: [
    { answer: "A", count: 90, percent: 90 },
    { answer: "B", count: 10, percent: 10 },
  ],
  answerConfidence: "high",
  needsReview: false,
};

describe("Explanation", () => {
  it("投票分布を表示し採用正解に✓を付ける", () => {
    render(<Explanation question={q} />);
    expect(screen.getByText("コミュニティ投票分布")).toBeInTheDocument();
    expect(screen.getByText(/A ✓/)).toBeInTheDocument();
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });

  it("総投票数を表示する", () => {
    render(<Explanation question={q} />);
    expect(screen.getByText(/総投票 100/)).toBeInTheDocument();
  });

  it("解説があれば表示する", () => {
    render(<Explanation question={{ ...q, explanation: "正解は A。\n- B: だめ" }} />);
    const el = screen.getByTestId("explanation");
    expect(el).toHaveTextContent("正解は A。");
    expect(el).toHaveTextContent("- B: だめ");
  });

  it("解説が無ければ解説見出しは出ない", () => {
    render(<Explanation question={{ ...q, explanation: null }} />);
    expect(screen.queryByTestId("explanation")).not.toBeInTheDocument();
  });

  it("出典元の不備に関する注記があれば表示する", () => {
    render(
      <Explanation
        question={{ ...q, sourceNote: "出典元ページに選択肢 E の本文が存在せず復元できないため、この問題は本来より1つ少ない選択肢で出題しています。" }}
      />,
    );
    expect(screen.getByTestId("source-note")).toHaveTextContent("選択肢 E の本文が存在せず");
  });

  it("注記が無ければ注記は出ない", () => {
    render(<Explanation question={q} />);
    expect(screen.queryByTestId("source-note")).not.toBeInTheDocument();
  });
});
