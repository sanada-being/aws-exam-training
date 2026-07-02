// 解説マージ: data/expl-output/*.json を data/questions.json の explanation.ja へ書き戻す。
// 出力形式(各ファイル): {"explanations":[{"id":"saa-c03-0001","text":"..."}]}
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAM = process.env.EXAM || "saa-c03";
const DATA =
  EXAM === "saa-c03"
    ? path.resolve(__dirname, "..", "data")
    : path.resolve(__dirname, "..", "data", EXAM);
const OUT = path.join(DATA, "expl-output");
const QJSON = path.join(DATA, "questions.json");

const all = JSON.parse(await readFile(QJSON, "utf8"));
const byId = new Map(all.map((q) => [q.id, q]));

let applied = 0;
let bad = 0;
for (const f of (await readdir(OUT)).filter((f) => f.endsWith(".json"))) {
  let obj;
  try {
    obj = JSON.parse(await readFile(path.join(OUT, f), "utf8"));
  } catch {
    bad++;
    continue;
  }
  for (const r of obj.explanations || []) {
    const q = byId.get(r.id);
    if (q && r.text) {
      q.explanation = { en: q.explanation?.en ?? null, ja: r.text };
      applied++;
    }
  }
}

await writeFile(QJSON, JSON.stringify(all, null, 2), "utf8");
const done = all.filter((q) => q.explanation?.ja).length;
console.log(`出力ファイル(壊れ ${bad}) / 適用 ${applied} 件`);
console.log(`解説あり: ${done} / ${all.length} 問 -> data/questions.json`);
