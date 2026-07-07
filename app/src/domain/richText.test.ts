import { describe, it, expect } from "vitest";
import { parseSegments } from "./richText";

describe("parseSegments（フェンス付きコードブロック解析）", () => {
  it("コードブロックが無ければ text セグメント1つ", () => {
    expect(parseSegments("ただのテキスト")).toEqual([
      { type: "text", content: "ただのテキスト" },
    ]);
  });

  it("空文字は空配列", () => {
    expect(parseSegments("")).toEqual([]);
  });

  it("前後テキスト＋コードブロックを分割し、言語を取得する", () => {
    const t = '次のJSON:\n```json\n{\n  "a": 1\n}\n```\nどれ？';
    expect(parseSegments(t)).toEqual([
      { type: "text", content: "次のJSON:\n" },
      { type: "code", content: '{\n  "a": 1\n}', lang: "json" },
      { type: "text", content: "\nどれ？" },
    ]);
  });

  it("言語指定なしのフェンスも扱える", () => {
    expect(parseSegments("```\nabc\n```")).toEqual([
      { type: "code", content: "abc" },
    ]);
  });

  it("複数のコードブロックを扱える", () => {
    const t = "A\n```\nx\n```\nB\n```\ny\n```";
    expect(parseSegments(t)).toEqual([
      { type: "text", content: "A\n" },
      { type: "code", content: "x" },
      { type: "text", content: "\nB\n" },
      { type: "code", content: "y" },
    ]);
  });

  it("空のテキスト区間は生成しない", () => {
    const t = "```\nx\n```";
    expect(parseSegments(t)).toEqual([{ type: "code", content: "x" }]);
  });
});
