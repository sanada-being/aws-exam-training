// ディスカッションページ収集(無料ルート):
// data/disc-urls.json のURL（または引数のURL）を巡回し、問題＋投票＋コメントを
// 正規化JSONにして data/questions.en.json に累積保存する。
//
// 個別ディスカッションページは無料・captcha無しで取得できる（/view/の課金壁を回避）。
//
// 使い方:
//   node scrape-disc.mjs                 # disc-urls.json 全件
//   node scrape-disc.mjs <URL>           # 単一URLのみ
//   node scrape-disc.mjs --limit 20      # 先頭20件のみ（試験用）
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// exam切替（EXAM=sap-c02 等）。既定は saa-c03 で従来通り。
const EXAM = process.env.EXAM || "saa-c03";
const EXAMS = {
  "saa-c03": {
    code: "SAA-C03",
    idPrefix: "saa-c03",
    dir: path.resolve("..", "data"),
    cache: path.resolve("cache", "disc"),
    failLog: "disc-failures.json",
  },
  "sap-c02": {
    code: "SAP-C02",
    idPrefix: "sap-c02",
    dir: path.resolve("..", "data", "sap-c02"),
    cache: path.resolve("cache", "disc-sap"),
    failLog: "disc-failures-sap.json",
  },
};
// 未登録の試験は自動導出（新試験は EXAM=<code> だけで動く）
const CFG =
  EXAMS[EXAM] ??
  {
    code: EXAM.toUpperCase(),
    idPrefix: EXAM,
    dir: path.resolve("..", "data", EXAM),
    cache: path.resolve("cache", `disc-${EXAM}`),
    failLog: `disc-failures-${EXAM}.json`,
  };

const EXAM_CODE = CFG.code;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const THROTTLE_MS = 2500;
const REFRESH = !!process.env.REFRESH;
const MAX_COMMENTS = 12; // 1問あたり保存する上位コメント数
const COLLECTED_AT = "2026-06-30";

const CACHE = CFG.cache;
const LOGS = path.resolve("logs");
const DATA = CFG.dir;
await mkdir(CACHE, { recursive: true });
await mkdir(LOGS, { recursive: true });
await mkdir(DATA, { recursive: true });

// 対象URLの決定
const arg = process.argv[2];
let urls = [];
const fileIdx = process.argv.indexOf("--file");
if (arg && arg.startsWith("http")) {
  urls = [arg];
} else if (fileIdx >= 0) {
  // 指定したURLリストファイル(配列 of string、または {url} 配列)のみ収集
  const raw = JSON.parse(await readFile(process.argv[fileIdx + 1], "utf8"));
  urls = raw.map((r) => (typeof r === "string" ? r : r.url)).filter(Boolean);
} else {
  const f = path.join(DATA, "disc-urls.json");
  if (!existsSync(f)) {
    console.error("data/disc-urls.json がありません。先に enumerate を実行してください。");
    process.exit(1);
  }
  urls = JSON.parse(await readFile(f, "utf8")).map((r) => r.url);
  const li = process.argv.indexOf("--limit");
  if (li >= 0) urls = urls.slice(0, Number(process.argv[li + 1] || 20));
}
const discId = (url) => (url.match(/\/view\/(\d+)-/) || [])[1] || url.replace(/\W+/g, "_").slice(-20);

function extractDiscussion() {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const header = clean(
    document.querySelector(".question-discussion-header, h1")?.textContent
  );
  const m = header.match(/TOPIC\s+(\d+)\s+QUESTION\s+(\d+)/i);
  const topic = m ? Number(m[1]) : 0;
  const qNum = m ? Number(m[2]) : 0;

  const qEl = document.querySelector(".question-body .card-text, .card-text");
  let questionText = "";
  if (qEl) {
    const tmp = document.createElement("div");
    tmp.innerHTML = qEl.innerHTML.replace(/<br\s*\/?>/gi, "\n");
    questionText = (tmp.textContent || "").replace(/[ \t]+/g, " ").trim();
  }

  const options = [...document.querySelectorAll("li.multi-choice-item")].map((li) => {
    const key =
      li.querySelector(".multi-choice-letter")?.getAttribute("data-choice-letter") || "";
    const clone = li.cloneNode(true);
    clone.querySelectorAll(".multi-choice-letter, .badge").forEach((e) => e.remove());
    return { key, text: { en: clean(clone.textContent), ja: null } };
  });

  const suggested = clean(document.querySelector(".correct-answer")?.textContent);

  let tally = [];
  const scriptEl = document.querySelector(".voted-answers-tally script[type='application/json']");
  if (scriptEl) {
    try {
      tally = JSON.parse(scriptEl.textContent);
    } catch {}
  }

  const comments = [...document.querySelectorAll(".comment-container")].map((c) => {
    const author = clean(c.querySelector(".comment-username")?.textContent);
    const highlyVoted = [...c.querySelectorAll(".badge")].some((b) =>
      /Highly Voted/i.test(b.textContent)
    );
    const selM = (c.querySelector(".comment-selected-answers")?.textContent || "").match(
      /Selected Answer:\s*([A-E]+)/i
    );
    const content = clean(c.querySelector(".comment-content")?.textContent);
    const upvotes = Number(clean(c.querySelector(".upvote-count")?.textContent) || 0);
    const date = c.querySelector(".comment-date")?.getAttribute("title") || null;
    return {
      author,
      highlyVoted,
      selectedAnswer: selM ? selM[1] : null,
      upvotes,
      date,
      comment: { en: content, ja: null },
    };
  });

  return { qNum, topic, questionText, options, suggested, tally, comments };
}

function confidenceOf(topShare, total) {
  if (total >= 20 && topShare >= 0.7) return "high";
  if (total >= 10 && topShare >= 0.6) return "medium";
  return "low";
}

function normalize(d, url) {
  const valid = (d.tally || []).filter((t) => t.voted_answers && t.voted_answers !== "U");
  const total = valid.reduce((s, t) => s + (t.vote_count || 0), 0);
  const sorted = [...valid].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  const communityVote = sorted.map((t) => ({
    answer: t.voted_answers,
    count: t.vote_count,
    percent: total ? Math.round((t.vote_count / total) * 100) : null,
  }));
  const mostVoted = valid.find((t) => t.is_most_voted) || sorted[0] || null;
  const adopted = mostVoted ? mostVoted.voted_answers.split("") : [];
  const topShare = total && mostVoted ? mostVoted.vote_count / total : 0;
  const isMulti = adopted.length > 1 || /\(Choose (two|three|TWO|THREE)\)/.test(d.questionText);

  // コメントは Highly Voted 優先 + upvote降順で上位のみ保存
  const discussion = [...d.comments]
    .filter((c) => c.comment.en || c.selectedAnswer)
    .sort((a, b) => Number(b.highlyVoted) - Number(a.highlyVoted) || b.upvotes - a.upvotes)
    .slice(0, MAX_COMMENTS);

  return {
    id: `${CFG.idPrefix}-${String(d.qNum).padStart(4, "0")}`,
    examCode: EXAM_CODE,
    questionNumber: d.qNum,
    topic: d.topic,
    sourceUrl: url,
    isMultipleAnswer: isMulti,
    question: { en: d.questionText, ja: null },
    options: d.options,
    siteSuggestedAnswer: d.suggested ? d.suggested.split("") : [],
    communityVote,
    adoptedAnswer: adopted,
    answerConfidence: confidenceOf(topShare, total),
    needsReview: total < 5 || topShare < 0.5,
    discussion,
    discussionMeta: { count: d.comments.length, dataId: null },
    explanation: { en: null, ja: null },
    tags: [],
    collectedAt: COLLECTED_AT,
    translatedAt: null,
  };
}

// 既存分を読み込み（累積・再開）
const records = new Map();
const outDataPath = path.join(DATA, "questions.en.json");
if (existsSync(outDataPath)) {
  try {
    for (const r of JSON.parse(await readFile(outDataPath, "utf8"))) records.set(r.id, r);
    console.log(`既存 ${records.size}問 を読み込み`);
  } catch {}
}

const opts = { headless: true, userAgent: UA, locale: "en-US", viewport: { width: 1366, height: 900 } };
const context = await chromium
  .launchPersistentContext(path.resolve(".profile"), { ...opts, channel: "chrome" })
  .catch(() => chromium.launchPersistentContext(path.resolve(".profile"), opts));
const page = context.pages()[0] || (await context.newPage());

const failures = [];
let n = 0;
for (const url of urls) {
  n++;
  const id = discId(url);
  const file = path.join(CACHE, `${id}.html`);
  try {
    if (!REFRESH && existsSync(file)) {
      await page.setContent(await readFile(file, "utf8"), { waitUntil: "domcontentloaded" });
    } else {
      const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!r || r.status() !== 200) throw new Error(`HTTP ${r?.status()}`);
      const paywall = await page
        .evaluate(() => /Unlock All Questions|Captcha-Free Browsing/i.test(document.body?.innerText || ""))
        .catch(() => false);
      const validation = /Validation/i.test(await page.title());
      if (paywall || validation) throw new Error(paywall ? "paywall" : "captcha");
      await writeFile(file, await page.content(), "utf8");
    }
    const d = await page.evaluate(extractDiscussion);
    if (!d.qNum || d.options.length === 0) throw new Error("解析失敗(問題なし)");
    const rec = normalize(d, url);
    records.set(rec.id, rec);
    console.log(
      `[${String(n).padStart(4)}/${urls.length}] Q${String(rec.questionNumber).padStart(4)} ` +
        `votes=${rec.communityVote.map((v) => v.answer + ":" + v.count).join("/") || "なし"} ` +
        `comments=${rec.discussion.length} (累計 ${records.size})`
    );
    const all = [...records.values()].sort((a, b) => a.questionNumber - b.questionNumber);
    await writeFile(outDataPath, JSON.stringify(all, null, 2), "utf8");
  } catch (e) {
    console.error(`[${n}] ${url} 失敗: ${e.message}`);
    failures.push({ url, error: e.message });
  }
  await page.waitForTimeout(THROTTLE_MS);
}

await context.close();
await writeFile(path.join(LOGS, CFG.failLog), JSON.stringify(failures, null, 2), "utf8");
console.log(`\n[${EXAM}] 完了: ${records.size}問 -> ${outDataPath} / 失敗 ${failures.length}件`);
