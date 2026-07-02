// url-batches/*.json をマージして disc-urls.json を生成し、網羅率と欠番を報告する。
// EXAM=sap-c02 等で対象試験を切替（既定 saa-c03）。
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const EXAM = process.env.EXAM || "saa-c03";
const EXAMS = {
  "saa-c03": { total: 1019, re: /saa-c03/i, dir: path.resolve("..", "data"), missing: "missing-qnums.json" },
  "sap-c02": {
    total: 529,
    re: /sap-c02/i,
    dir: path.resolve("..", "data", "sap-c02"),
    missing: "missing-qnums-sap.json",
  },
};
// 未登録の試験は自動導出（EXAM=<code> と EXAM_TOTAL=<総問数> で動く）
const CFG =
  EXAMS[EXAM] ??
  {
    total: Number(process.env.EXAM_TOTAL || 0),
    re: new RegExp(EXAM, "i"),
    dir: path.resolve("..", "data", EXAM),
    missing: `missing-qnums-${EXAM}.json`,
  };

const TOTAL = CFG.total;
const BATCH_DIR = path.join(CFG.dir, "url-batches");
const DATA = CFG.dir;
const LOGS = path.resolve("logs");
await mkdir(LOGS, { recursive: true });
await mkdir(DATA, { recursive: true });

const files = (await readdir(BATCH_DIR)).filter((f) => f.endsWith(".json"));
const map = new Map(); // q -> url
let bad = 0;
for (const f of files) {
  try {
    const obj = JSON.parse(await readFile(path.join(BATCH_DIR, f), "utf8"));
    for (const p of obj.pairs || []) {
      if (!p || !Number.isInteger(p.q) || !p.url) continue;
      if (!CFG.re.test(p.url)) continue;
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
await writeFile(path.join(LOGS, CFG.missing), JSON.stringify(missing), "utf8");

console.log(`[${EXAM}] バッチ ${files.length}(壊れ ${bad}) / 列挙 ${urls.length}/${TOTAL} / 欠番 ${missing.length}`);
if (missing.length) console.log(`欠番(先頭30): ${missing.slice(0, 30).join(", ")}`);
