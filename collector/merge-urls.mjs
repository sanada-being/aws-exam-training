// url-batches/*.json をマージして data/disc-urls.json を生成し、網羅率と欠番を報告する。
// 欠番リストは logs/missing-qnums.json に保存(再列挙の args に使える)。
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const TOTAL = 1019;
const BATCH_DIR = path.resolve("..", "data", "url-batches");
const DATA = path.resolve("..", "data");
const LOGS = path.resolve("logs");
await mkdir(LOGS, { recursive: true });

const files = (await readdir(BATCH_DIR)).filter((f) => f.endsWith(".json"));
const map = new Map(); // q -> url
let bad = 0;
for (const f of files) {
  try {
    const obj = JSON.parse(await readFile(path.join(BATCH_DIR, f), "utf8"));
    for (const p of obj.pairs || []) {
      if (!p || !Number.isInteger(p.q) || !p.url) continue;
      if (!/saa-c03/i.test(p.url)) continue;
      if (!/\/discussions\/amazon\/view\/\d+-/.test(p.url)) continue;
      if (p.q < 1 || p.q > TOTAL) continue;
      if (!map.has(p.q)) map.set(p.q, p.url);
    }
  } catch {
    bad++;
  }
}

const urls = [...map.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([q, url]) => ({ questionNumber: q, url }));
await writeFile(path.join(DATA, "disc-urls.json"), JSON.stringify(urls, null, 2), "utf8");

const missing = [];
for (let n = 1; n <= TOTAL; n++) if (!map.has(n)) missing.push(n);
await writeFile(path.join(LOGS, "missing-qnums.json"), JSON.stringify(missing), "utf8");

console.log(`バッチファイル: ${files.length} (壊れ ${bad})`);
console.log(`列挙済み: ${urls.length}/${TOTAL}  欠番: ${missing.length}`);
if (missing.length) console.log(`欠番例(先頭30): ${missing.slice(0, 30).join(", ")}`);
console.log(`-> data/disc-urls.json / logs/missing-qnums.json`);
