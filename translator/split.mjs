// 翻訳前処理: data/questions.json の未翻訳分(ja=null)だけを抽出し、
// 小さな入力バッチ data/ja-input/batch-NNN.json に分割する。
// questions.json が無ければ questions.en.json から初期化する。
//
// 使い方:
//   node split.mjs                 # 未翻訳を全件、17問/バッチ
//   node split.mjs --limit 10      # 未翻訳の先頭10問だけ(試験用)
//   node split.mjs --batch 20      # バッチサイズ変更
import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA = path.resolve("..", "data");
const IN = path.join(DATA, "ja-input");
const QJSON = path.join(DATA, "questions.json");
const QEN = path.join(DATA, "questions.en.json");
await mkdir(IN, { recursive: true });

const argn = (flag, def) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const LIMIT = argn("--limit", 0); // 0 = 全件
const BATCH = argn("--batch", 17);

// questions.json を初期化(無ければ en から)
if (!existsSync(QJSON)) {
  await writeFile(QJSON, await readFile(QEN, "utf8"), "utf8");
  console.log("questions.json を questions.en.json から初期化しました");
}
const all = JSON.parse(await readFile(QJSON, "utf8"));

const isUntranslated = (q) =>
  q.question.ja == null || (q.options || []).some((o) => o.text.ja == null);

let pending = all.filter(isUntranslated);
console.log(`未翻訳: ${pending.length} / ${all.length} 問`);
if (LIMIT > 0) pending = pending.slice(0, LIMIT);

// 既存の入力バッチを掃除
for (const f of (await readdir(IN)).filter((f) => f.endsWith(".json"))) {
  await unlink(path.join(IN, f));
}

let n = 0;
const files = [];
for (let i = 0; i < pending.length; i += BATCH) {
  const slice = pending.slice(i, i + BATCH).map((q) => ({
    id: q.id,
    question: q.question.en,
    options: q.options.map((o) => ({ key: o.key, en: o.text.en })),
  }));
  const file = path.join(IN, `batch-${String(n).padStart(3, "0")}.json`);
  await writeFile(file, JSON.stringify(slice, null, 2), "utf8");
  files.push(file.replace(/\\/g, "/"));
  n++;
}

console.log(`作成バッチ: ${n} 件 (今回対象 ${pending.length} 問, ${BATCH}問/バッチ)`);
console.log(JSON.stringify(files));
