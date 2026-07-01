import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountSection } from "./AccountSection";

describe("AccountSection", () => {
  it("Supabase未設定なら案内文を表示する", () => {
    render(<AccountSection />);
    expect(screen.getByText(/未設定です/)).toBeInTheDocument();
    expect(screen.getByText("アカウントでログイン（実験的）")).toBeInTheDocument();
  });
});
