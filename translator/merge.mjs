// 翻訳マージ: data/ja-output/*.json の翻訳結果を data/questions.json に書き戻す。
// 出力形式(各ファイル): {"results":[{"id":"saa-c03-0001","question_ja":"...","options":[{"key":"A","ja":"..."}]}]}
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const DATA = path.resolve("..", "data");
const OUT = path.join(DATA, "ja-output");
const QJSON = path.join(DATA, "questions.json");

const all = JSON.parse(await readFile(QJSON, "utf8"));
const byId = new Map(all.map((q) => [q.id, q]));

const files = (await readdir(OUT)).filter((f) => f.endsWith(".json"));
let applied = 0,
  bad = 0,
  missing = 0;
for (const f of files) {
  let obj;
  try {
    obj = JSON.parse(await readFile(path.join(OUT, f), "utf8"));
  } catch {
    bad++;
    continue;
  }
  const results = Array.isArray(obj) ? obj : obj.results || [];
  for (const r of results) {
    const q = byId.get(r.id);
    if (!q) {
      missing++;
      continue;
    }
    if (r.question_ja) q.question.ja = r.question_ja;
    for (const o of r.options || []) {
      const opt = q.options.find((x) => x.key === o.key);
      if (opt && o.ja) opt.text.ja = o.ja;
    }
    q.translatedAt = "2026-06-30";
    applied++;
  }
}

await writeFile(QJSON, JSON.stringify(all, null, 2), "utf8");

const translated = all.filter(
  (q) => q.question.ja != null && (q.options || []).every((o) => o.text.ja != null)
).length;
console.log(`出力ファイル: ${files.length} (壊れ ${bad})`);
console.log(`適用: ${applied} 件 (該当なしid ${missing})`);
console.log(`翻訳完了: ${translated} / ${all.length} 問 -> data/questions.json`);
