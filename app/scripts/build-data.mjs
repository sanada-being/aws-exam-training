// データ生成: ../../data の翻訳済み正本から、アプリ用の配信データを生成する。
//   public/data/<試験id>.json … 試験ごとの問題（Discussion除外で軽量化）
//   public/data/index.json    … 試験一覧（問題数・問題id）
// 生成物はリポジトリに入れない（prebuild / predev で毎回作る）。
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toSlim, examIdOf, buildIndex } from "./slim.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "..", "..", "data");
const OUT_DIR = path.resolve(__dirname, "..", "public", "data");

/** 正本の一覧。SAA は data/ 直下、他の試験は data/<試験id>/ にある。 */
async function sources() {
  const list = [path.join(DATA, "questions.json")];
  for (const d of await readdir(DATA, { withFileTypes: true })) {
    const file = path.join(DATA, d.name, "questions.json");
    if (d.isDirectory() && existsSync(file)) list.push(file);
  }
  return list;
}

const byExam = {};
for (const file of await sources()) {
  const slim = toSlim(JSON.parse(await readFile(file, "utf8")));
  if (slim.length === 0) continue;
  byExam[examIdOf(slim[0].id)] = slim;
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });
let total = 0;
for (const [id, slim] of Object.entries(byExam)) {
  const json = JSON.stringify(slim);
  await writeFile(path.join(OUT_DIR, `${id}.json`), json, "utf8");
  total += Buffer.byteLength(json);
  console.log(`生成: ${id} ${slim.length}問 / ${(Buffer.byteLength(json) / 1048576).toFixed(2)}MB`);
}
await writeFile(path.join(OUT_DIR, "index.json"), JSON.stringify(buildIndex(byExam)), "utf8");
console.log(`合計 ${Object.keys(byExam).length}試験 / ${(total / 1048576).toFixed(2)}MB -> ${OUT_DIR}`);
