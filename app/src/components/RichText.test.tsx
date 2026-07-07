import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RichText } from "./RichText";

describe("RichText", () => {
  it("フェンス付きコードブロックを codeblock として描画する", () => {
    const { container } = render(
      <RichText text={'次のJSON:\n```json\n{\n  "a": 1\n}\n```\nどれ？'} />,
    );
    const code = container.querySelector(".codeblock");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('{\n  "a": 1\n}');
    // 前後テキストも描画
    expect(container.textContent).toContain("次のJSON:");
    expect(container.textContent).toContain("どれ？");
  });

  it("コードブロックが無ければ codeblock は生成しない", () => {
    const { container } = render(<RichText text="ただのテキスト" />);
    expect(container.querySelector(".codeblock")).toBeNull();
    expect(container.textContent).toBe("ただのテキスト");
  });
});
