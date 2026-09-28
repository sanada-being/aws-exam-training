import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamPicker } from "./ExamPicker";
import { useStore } from "../store/useStore";
import type { ExamIndexItem } from "../domain/exams";

const ids = (exam: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${exam}-${String(i + 1).padStart(4, "0")}`);

const INDEX: ExamIndexItem[] = ["clf-c02", "saa-c03", "sap-c02", "soa-c02", "scs-c02"].map((id) => ({
  id,
  count: 4,
  ids: ids(id, 4),
}));

beforeEach(() => useStore.getState().resetProgress());

describe("ExamPicker", () => {
  it("初めて開いたときは案内を出し、試験をレベル別に並べる（載せない試験は出さない）", () => {
    render(<ExamPicker index={INDEX} currentExam={null} onSelect={() => {}} />);
    expect(screen.getByText("解く試験を選んでください")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "基礎" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "プロフェッショナル" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "学習中" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /SAP-C02/ })).toHaveTextContent(
      "収録 4問 · 本番 75問/180分",
    );
    expect(screen.queryByRole("button", { name: /SOA-C02/ })).not.toBeInTheDocument();
  });

  it("解いた試験は「学習中」に解答数と正答率を出す", () => {
    const st = useStore.getState();
    st.recordAnswer("saa-c03-0001", true, 1);
    st.recordAnswer("saa-c03-0002", false, 2);
    render(<ExamPicker index={INDEX} currentExam="saa-c03" onSelect={() => {}} />);
    const learning = screen.getByRole("region", { name: "学習中" });
    const card = within(learning).getByRole("button", { name: /SAA-C03/ });
    expect(card).toHaveTextContent("解答 2 / 4問");
    expect(card).toHaveTextContent("50%");
  });

  it("選んでいる試験に印を付ける", () => {
    render(<ExamPicker index={INDEX} currentExam="sap-c02" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /SAP-C02/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /CLF-C02/ })).not.toHaveAttribute("aria-current");
  });

  it("カードを押すとその試験を選ぶ", async () => {
    const onSelect = vi.fn();
    render(<ExamPicker index={INDEX} currentExam={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /SAP-C02/ }));
    expect(onSelect).toHaveBeenCalledWith("sap-c02");
  });

  it("戻る先があるときだけ戻るボタンを出す", async () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <ExamPicker index={INDEX} currentExam={null} onSelect={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "戻る" })).not.toBeInTheDocument();
    rerender(
      <ExamPicker index={INDEX} currentExam="saa-c03" onSelect={() => {}} onBack={onBack} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(onBack).toHaveBeenCalled();
  });
});
