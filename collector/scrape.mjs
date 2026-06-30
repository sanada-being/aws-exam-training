// 全問収集(半自動): exam-topics の一覧ページ(/view/N/)を巡回し、正規化JSONを生成する。
//
// examtopics は2回目以降のアクセスで reCAPTCHA 検証を挟むため完全無人化は不可。
// 本スクリプトは「ヘッドあり(画面表示)ブラウザ + セッション永続化」で巡回し、
// 検証ページを検出したら一時停止 → 利用者がブラウザ上で解除 → 自動で続行する。
//
// 特徴:
//   - 永続プロファイル(.profile)でクッキー保持 → 一度解除すれば再チャレンジは激減
//   - rawHTMLをページ単位でキャッシュ(有効ページのみ) → 再実行はキャッシュから即パース
//   - 失敗ページは logs/failures.json に記録
//
// 使い方:
//   node scrape.mjs              # 全ページ(ヘッドあり)
//   node scrape.mjs 1 5          # 1〜5ページのみ
//   HEADLESS=1 node scrape.mjs   # キャッシュ再パース等の無人用途(検証ページは解けない)
//   REFRESH=1 node scrape.mjs    # キャッシュ無視で再取得
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const EXAM_CODE = "SAA-C03";
const BASE =
  "https://www.examtopics.com/exams/amazon/aws-certified-solutions-architect-associate-saa-c03/view";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const THROTTLE_MS = 4000;
const REFRESH = !!process.env.REFRESH;
const HEADLESS = !!process.env.HEADLESS;
const COLLECTED_AT = "2026-06-30";

const PROFILE = path.resolve(".profile");
const CACHE = path.resolve("cache", "pages");
const LOGS = path.resolve("logs");
const DATA = path.resolve("..", "data");
await mkdir(CACHE, { recursive: true });
await mkdir(LOGS, { recursive: true });
await mkdir(DATA, { recursive: true });

const pagePath = (p) => path.join(CACHE, `page-${String(p).padStart(3, "0")}.html`);

function extractCards(nodes) {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  return nodes.map((card) => {
    const header = clean(card.querySelector(".card-header")?.textContent);
    const qNum = Number((header.match(/Question #(\d+)/) || [])[1] || 0);
    const topic = Number((header.match(/Topic (\d+)/) || [])[1] || 0);

    const qEl = card.querySelector(".card-text");
    let questionText = "";
    if (qEl) {
      const html = qEl.innerHTML.replace(/<br\s*\/?>/gi, "\n");
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      questionText = (tmp.textContent || "").replace(/[ \t]+/g, " ").trim();
    }

    const options = [...card.querySelectorAll("li.multi-choice-item")].map((li) => {
      const key =
        li.querySelector(".multi-choice-letter")?.getAttribute("data-choice-letter") || "";
      const clone = li.cloneNode(true);
      clone.querySelectorAll(".multi-choice-letter, .badge").forEach((e) => e.remove());
      return { key, text: { en: clean(clone.textContent), ja: null } };
    });

    const suggested = clean(card.querySelector(".correct-answer")?.textContent);

    let tally = [];
    const scriptEl = card.querySelector(".voted-answers-tally script[type='application/json']");
    if (scriptEl) {
      try {
        tally = JSON.parse(scriptEl.textContent);
      } catch {}
    }

    const discBtn = card.querySelector(".question-discussion-button .badge");
    const discussionCount = Number(clean(discBtn?.textContent) || 0);
    const dataId = card.querySelector(".question-body")?.getAttribute("data-id") || null;

    return { qNum, topic, questionText, options, suggested, tally, discussionCount, dataId };
  });
}

function confidenceOf(topShare, total) {
  if (total >= 20 && topShare >= 0.7) return "high";
  if (total >= 10 && topShare >= 0.6) return "medium";
  return "low";
}

function normalize(c, url) {
  const valid = (c.tally || []).filter((t) => t.voted_answers && t.voted_answers !== "U");
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
  const isMulti = adopted.length > 1 || /\(Choose (two|three|TWO|THREE)\)/.test(c.questionText);

  return {
    id: `saa-c03-${String(c.qNum).padStart(4, "0")}`,
    examCode: EXAM_CODE,
    questionNumber: c.qNum,
    topic: c.topic,
    sourceUrl: url,
    isMultipleAnswer: isMulti,
    question: { en: c.questionText, ja: null },
    options: c.options,
    siteSuggestedAnswer: c.suggested ? c.suggested.split("") : [],
    communityVote,
    adoptedAnswer: adopted,
    answerConfidence: confidenceOf(topShare, total),
    needsReview: total < 5 || topShare < 0.5,
    discussion: [],
    discussionMeta: { count: c.discussionCount, dataId: c.dataId },
    explanation: { en: null, ja: null },
    tags: [],
    collectedAt: COLLECTED_AT,
    translatedAt: null,
  };
}

// --- 起動(永続プロファイル) ---
const context = await chromium.launchPersistentContext(PROFILE, {
  headless: HEADLESS,
  channel: "chrome", // 実Chromeがあれば検知されにくい。無ければ下のcatchでchromiumに切替
  viewport: { width: 1366, height: 900 },
  locale: "en-US",
  userAgent: UA,
}).catch(async () =>
  chromium.launchPersistentContext(PROFILE, {
    headless: HEADLESS,
    viewport: { width: 1366, height: 900 },
    locale: "en-US",
    userAgent: UA,
  })
);
const page = context.pages()[0] || (await context.newPage());

// ページ状態を判定: 'ok'(問題あり) | 'captcha'(reCAPTCHA検証) | 'paywall'(課金) | 'empty'
async function pageState() {
  const title = await page.title().catch(() => "");
  if (/Validation/i.test(title)) return "captcha";
  const cards = await page.$$eval(".exam-question-card", (n) => n.length).catch(() => 0);
  if (cards > 0) return "ok";
  const paywall = await page
    .evaluate(() => /Unlock All Questions|Captcha-Free Browsing|\/day/i.test(document.body?.innerText || ""))
    .catch(() => false);
  return paywall ? "paywall" : "empty";
}

async function waitForManualSolve(p) {
  console.log(`\n⚠ ページ ${p}: reCAPTCHA検証を検出しました。`);
  console.log("   表示中のブラウザで認証を解いてください。解除後は自動で続行します（最大10分待機）...");
  for (let i = 0; i < 300; i++) {
    // 2秒 x 300 = 10分
    await page.waitForTimeout(2000);
    const title = await page.title().catch(() => "");
    if (!/Validation/i.test(title)) {
      // 検証クリア。目的ページへ再遷移
      await page.goto(`${BASE}/${p}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
      const cards = await page.$$eval(".exam-question-card", (n) => n.length).catch(() => 0);
      if (cards > 0) {
        console.log("   ✓ 検証解除を確認、収集を再開します。");
        return true;
      }
    }
  }
  return false;
}

async function loadPage(p) {
  const file = pagePath(p);
  if (!REFRESH && existsSync(file)) {
    const html = await readFile(file, "utf8");
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return { fromCache: true };
  }
  const url = `${BASE}/${p}/`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    for (const sel of [".modal", ".modal-backdrop", "#login-modal", ".overlay", ".popup"]) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
    document.body.style.overflow = "auto";
  });
  let state = await pageState();
  if (state === "captcha") {
    if (HEADLESS) throw new Error("reCAPTCHA検証(HEADLESSでは解除不可)");
    if (!(await waitForManualSolve(p))) throw new Error("reCAPTCHA未解除(タイムアウト)");
    state = await pageState();
  }
  if (state === "paywall") throw new Error("課金ページ(PRO/ログインが必要)");
  if (state !== "ok") throw new Error(`問題カードなし(${state})`);
  const html = await page.content();
  await writeFile(file, html, "utf8"); // 有効ページのみ到達
  return { fromCache: false };
}

// 総ページ数を算出
const firstPage = Number(process.argv[2] || 1);
let lastPage = Number(process.argv[3] || 0);
if (!lastPage) {
  await loadPage(firstPage);
  const total = await page.evaluate(() => {
    const m = document.body.innerText.match(/([\d,]+)\s+questions?/i);
    return m ? Number(m[1].replace(/,/g, "")) : 0;
  });
  lastPage = total ? Math.ceil(total / 10) : firstPage;
  console.log(`総問数: ${total} → 総ページ数: ${lastPage}`);
}

// 既存の収集結果を読み込み（複数回の実行で累積・再開できるように）
const records = new Map();
const outDataPath = path.join(DATA, "questions.en.json");
if (existsSync(outDataPath)) {
  try {
    for (const r of JSON.parse(await readFile(outDataPath, "utf8"))) records.set(r.id, r);
    console.log(`既存 ${records.size}問 を読み込み（累積モード）`);
  } catch {}
}
const failures = [];

for (let p = firstPage; p <= lastPage; p++) {
  try {
    const { fromCache } = await loadPage(p);
    const cards = await page.$$eval(".exam-question-card", extractCards);
    if (cards.length === 0) {
      console.log(`page ${p}: 0件 → 失敗扱い`);
      failures.push({ page: p, error: "0 cards" });
      continue;
    }
    const url = `${BASE}/${p}/`;
    for (const c of cards) {
      if (!c.qNum) continue;
      records.set(normalize(c, url).id, normalize(c, url));
    }
    console.log(
      `page ${String(p).padStart(3)}/${lastPage} ${fromCache ? "[cache]" : "[live] "} +${cards.length}問 (累計 ${records.size})`
    );
    // 途中経過を逐次保存（中断耐性）
    const partial = [...records.values()].sort((a, b) => a.questionNumber - b.questionNumber);
    await writeFile(path.join(DATA, "questions.en.json"), JSON.stringify(partial, null, 2), "utf8");
    if (!fromCache && p < lastPage) await page.waitForTimeout(THROTTLE_MS);
  } catch (e) {
    console.error(`page ${p}: 失敗 - ${e.message}`);
    failures.push({ page: p, error: e.message });
  }
}

await context.close();

await writeFile(path.join(LOGS, "failures.json"), JSON.stringify(failures, null, 2), "utf8");
console.log(`\n収集完了: ${records.size}問 -> data/questions.en.json`);
if (failures.length) {
  console.log(`失敗 ${failures.length}ページ。再実行例: node scrape.mjs ` + failures.map((f) => f.page).join(" "));
}
