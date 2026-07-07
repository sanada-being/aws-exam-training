import { parseSegments } from "../domain/richText";

/**
 * 問題文・選択肢テキストを描画する。フェンス付きコードブロック(```)は
 * 等幅・改行保持のコードブロックとして表示する。
 * <button> 内でも有効になるよう、ブロック要素ではなく display:block の <span> を使う。
 */
export function RichText({ text }: { text: string }) {
  const segments = parseSegments(text);
  return (
    <>
      {segments.map((s, i) =>
        s.type === "code" ? (
          <span className="codeblock" key={i}>
            {s.content}
          </span>
        ) : (
          <span className="rt-text" key={i}>
            {s.content}
          </span>
        ),
      )}
    </>
  );
}
