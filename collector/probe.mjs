// 収集試作: まず1ページの実DOMを観測し、セレクタ設計の材料を得る探索スクリプト。
// 使い方: node probe.mjs "<URL>"
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url =
  process.argv[2] ||
  "https://www.examtopics.com/exams/amazon/aws-certified-solutions-architect-associate-saa-c03/view/1/";

const OUT = path.resolve("cache");
await mkdir(OUT, { recursive: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: UA,
  locale: "en-US",
  viewport: { width: 1366, height: 900 },
});
const page = await ctx.newPage();

let status = null;
page.on("response", (r) => {
  if (r.url() === url || r.url() === url + "/") status = r.status();
});

console.log("GET", url);
const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
console.log("HTTP status:", resp?.status());

// オーバーレイ/モーダルをDOMから除去（閲覧制限の解除）
await page.evaluate(() => {
  for (const sel of [".modal", ".modal-backdrop", "#login-modal", ".overlay", ".popup"]) {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  }
  document.body.style.overflow = "auto";
});

await page.waitForTimeout(1500);

const title = await page.title();
console.log("title:", title);

// 問題カードらしき要素の候補数を観測
const counts = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  return {
    card_examQuestionCard: q(".exam-question-card"),
    card_questionBody: q(".question-body"),
    card_questionText: q(".card-text"),
    voteBar: q(".vote-bar, .voted-answers, .vote-distribution"),
    revealBtn: q(".reveal-solution, .btn-primary"),
    discussionLink: q("a[href*='/discussions/']"),
  };
});
console.log("element counts:", counts);

const html = await page.content();
await writeFile(path.join(OUT, "probe.html"), html, "utf8");
await page.screenshot({ path: path.join(OUT, "probe.png"), fullPage: true });
console.log("saved cache/probe.html and cache/probe.png");

await browser.close();
