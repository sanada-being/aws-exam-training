// URL列挙: amazonディスカッション索引(/discussions/amazon/N/)を巡回し、
// SAA-C03 のディスカッションURLを重複なく収集して data/disc-urls.json に保存する。
//
// 使い方:
//   node enumerate.mjs [開始ページ] [最大ページ]   例) node enumerate.mjs 1 20
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const INDEX = "https://www.examtopics.com/discussions/amazon";
const THROTTLE_MS = 3000;
const EXAM_RE = /saa-c03/i;

const startPage = Number(process.argv[2] || 1);
const maxPage = Number(process.argv[3] || 1000);
const STOP_AFTER_EMPTY = 5; // 総リンク0(索引末尾)がこのページ数続いたら停止

const DATA = path.resolve("..", "data");
await mkdir(DATA, { recursive: true });
const outFile = path.join(DATA, "disc-urls.json");

// 既存分を読み込み（再開）
const found = new Map(); // url -> {url, indexPage}
if (existsSync(outFile)) {
  for (const r of JSON.parse(await readFile(outFile, "utf8"))) found.set(r.url, r);
  console.log(`既存 ${found.size} 件から再開`);
}

const context = await chromium.launchPersistentContext(path.resolve(".profile"), {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "en-US",
  userAgent: UA,
}).catch(() => null);
const ctx = context || (await (await chromium.launch({ headless: true })).newContext({ userAgent: UA }));
const page = ctx.pages?.()[0] || (await ctx.newPage());

let dry = 0;
for (let p = startPage; p <= maxPage; p++) {
  const url = `${INDEX}/${p}/`;
  let links = [];
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    links = await page.$$eval("a[href*='/discussions/amazon/view/']", (as) =>
      as.map((a) => a.getAttribute("href"))
    );
  } catch (e) {
    console.error(`index ${p}: 失敗 ${e.message}`);
    continue;
  }
  const allLinks = [...new Set(links)];
  const before = found.size;
  for (let href of allLinks) {
    if (!EXAM_RE.test(href)) continue;
    if (href.startsWith("/")) href = "https://www.examtopics.com" + href;
    if (!found.has(href)) found.set(href, { url: href, indexPage: p });
  }
  const added = found.size - before;
  if (p % 10 === 0 || added > 0)
    console.log(`index ${String(p).padStart(4)}/${maxPage}: +${added} SAA-C03 (累計 ${found.size})`);
  await writeFile(outFile, JSON.stringify([...found.values()], null, 2), "utf8");

  // 索引の真の末尾(総リンク0)が続いたら停止。SAA-C03が0でも索引途中なら継続
  dry = allLinks.length === 0 ? dry + 1 : 0;
  if (dry >= STOP_AFTER_EMPTY) {
    console.log(`総リンク0が${STOP_AFTER_EMPTY}ページ連続(索引末尾) → 停止`);
    break;
  }
  await page.waitForTimeout(THROTTLE_MS);
}

await (context ? context.close() : ctx.close());
console.log(`\n列挙完了: ${found.size} 件 -> ${outFile}`);
