// 解説生成の前処理: data/questions.json の explanation.ja が未設定の問題を抽出し、
// 生成用の入力バッチ data/expl-input/batch-NNN.json に分割する。
//
// 使い方:
//   node split.mjs --limit 200   # 未生成の先頭200問
//   node split.mjs               # 未生成すべて
//   node split.mjs --batch 17
import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAM = process.env.EXAM || "saa-c03";
const DATA =
  EXAM === "saa-c03"
    ? path.resolve(__dirname, "..", "data")
    : path.resolve(__dirname, "..", "data", EXAM);
const IN = path.join(DATA, "expl-input");
const QJSON = path.join(DATA, "questions.json");
await mkdir(IN, { recursive: true });

const argn = (flag, def) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const LIMIT = argn("--limit", 0);
const BATCH = argn("--batch", 17);

const all = JSON.parse(await readFile(QJSON, "utf8"));
let pending = all
  .filter((q) => !q.explanation?.ja)
  .sort((a, b) => a.questionNumber - b.questionNumber);
console.log(`解説 未生成: ${pending.length} / ${all.length} 問`);
if (LIMIT > 0) pending = pending.slice(0, LIMIT);

for (const f of (await readdir(IN)).filter((f) => f.endsWith(".json"))) {
  await unlink(path.join(IN, f));
}

let n = 0;
for (let i = 0; i < pending.length; i += BATCH) {
  const slice = pending.slice(i, i + BATCH).map((q) => ({
    id: q.id,
    questionNumber: q.questionNumber,
    question: q.question.ja,
    options: q.options.map((o) => ({ key: o.key, text: o.text.ja })),
    adoptedAnswer: q.adoptedAnswer,
    vote: q.communityVote.map((v) => `${v.answer}:${v.percent}%`).join(" / "),
  }));
  await writeFile(
    path.join(IN, `batch-${String(n).padStart(3, "0")}.json`),
    JSON.stringify(slice, null, 2),
    "utf8",
  );
  n++;
}
console.log(`作成バッチ: ${n} 件（今回対象 ${pending.length} 問, ${BATCH}問/バッチ）`);
const names = [];
for (let i = 0; i < n; i++) names.push(`batch-${String(i).padStart(3, "0")}.json`);
console.log(JSON.stringify(names));
