// ログイン補助: 永続プロファイル(.profile)でブラウザを開き、利用者が examtopics に
// 手動ログインする。ログインを検出したらセッションを保存して自動で閉じる。
// 以降 scrape.mjs は同じ .profile を使うためログイン状態が引き継がれる。
//
// 使い方: node login.mjs   → 開いたブラウザでログイン（最大10分待機）
import { chromium } from "playwright";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const PROFILE = path.resolve(".profile");

const opts = {
  headless: false,
  viewport: { width: 1366, height: 900 },
  locale: "en-US",
  userAgent: UA,
};
const context = await chromium
  .launchPersistentContext(PROFILE, { ...opts, channel: "chrome" })
  .catch(() => chromium.launchPersistentContext(PROFILE, opts));
const page = context.pages()[0] || (await context.newPage());

await page.goto("https://www.examtopics.com/login/", { waitUntil: "domcontentloaded" });
console.log("ブラウザでログインしてください。完了を自動検出します（最大10分）...");

let loggedIn = false;
for (let i = 0; i < 200; i++) {
  // 3秒 x 200 = 10分
  await page.waitForTimeout(3000);
  const ok = await page
    .evaluate(() => {
      const hasLogout = !!document.querySelector("a[href*='/logout']");
      const hasLoginLink = !!document.querySelector("a[href*='/login']");
      const txt = document.body ? document.body.innerText : "";
      // ログアウトリンクがある、もしくはナビに Sign up が出ていない
      return hasLogout || (!hasLoginLink && !/Sign up/i.test(txt.slice(0, 1500)));
    })
    .catch(() => false);
  if (ok) {
    loggedIn = true;
    break;
  }
}

if (loggedIn) {
  console.log("✓ ログインを検出しました。セッションを .profile に保存しました。");
  await page.waitForTimeout(2000);
} else {
  console.log("⚠ ログインを検出できませんでした（タイムアウト）。再実行してください。");
}
await context.close();
