// 問題文・選択肢テキスト内のフェンス付きコードブロック(```lang ... ```)を解析する純粋関数。
// 画像だったJSON/表をテキスト再構築して埋め込むため、等幅・改行保持で描画する。

export type Segment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; lang?: string };

const FENCE = /```([\w-]*)\n([\s\S]*?)```/g;

/** テキストを text/code セグメントに分割する。空のtext区間は生成しない。 */
export function parseSegments(text: string): Segment[] {
  if (!text) return [];
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(text))) {
    if (m.index > last) {
      segments.push({ type: "text", content: text.slice(last, m.index) });
    }
    const lang = m[1];
    const code = m[2].replace(/\n$/, ""); // 末尾の改行1つを除去
    segments.push(lang ? { type: "code", content: code, lang } : { type: "code", content: code });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }
  return segments;
}
