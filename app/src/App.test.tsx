import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Summary } from "./App";
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

describe("Summary", () => {
  it("総問数を表示する", () => {
    render(<Summary questions={sample} />);
    expect(screen.getByTestId("total")).toHaveTextContent("全 1 問");
  });
});
