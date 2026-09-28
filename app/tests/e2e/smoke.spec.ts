import { test, expect, type Page } from "@playwright/test";

/** 初めて開いた状態から SAA-C03 を選んでホームを開く。 */
async function openSaa(page: Page) {
  await page.goto("/");
  await expect(page.getByText("解く試験を選んでください")).toBeVisible();
  await page.getByRole("button", { name: /SAA-C03/ }).click();
  await expect(page.getByRole("button", { name: /試験を切り替える/ })).toHaveText(/SAA-C03/);
}

/** ページが横にはみ出していないか。 */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("試験を選ぶ→出題→選択→採点→解説→次へ の主要フロー", async ({ page }) => {
  await openSaa(page);

  // 順番に学習を開始
  await page.getByRole("button", { name: "順番に学習" }).click();
  await expect(page.getByTestId("progress")).toBeVisible();

  // 最初の選択肢を選んで採点
  await page.getByRole("listitem").first().click();
  await page.getByRole("button", { name: "採点する" }).click();

  // 判定と解説（投票分布）が表示される
  await expect(page.getByTestId("verdict")).toBeVisible();
  await expect(page.getByText("コミュニティ投票分布")).toBeVisible();

  // 次へ
  await page.getByRole("button", { name: /次へ/ }).click();
  await expect(page.getByTestId("progress")).toHaveText(/^2 \/ \d+$/);
});

test("ブックマークと原文切替が動作する", async ({ page }) => {
  await openSaa(page);
  await page.getByRole("button", { name: "順番に学習" }).click();

  // 原文(EN)に切替
  await page.getByRole("button", { name: "原文(EN)" }).click();
  await expect(page.getByRole("button", { name: "日本語" })).toBeVisible();

  // ブックマーク
  const bm = page.getByRole("button", { name: "ブックマーク" });
  await bm.click();
  await expect(bm).toHaveAttribute("aria-pressed", "true");
});

test("次に開くと前回の試験のホームから始まり、試験を切り替えられる", async ({ page }) => {
  await openSaa(page);
  await page.reload();
  await expect(page.getByRole("button", { name: /試験を切り替える/ })).toHaveText(/SAA-C03/);

  await page.getByRole("button", { name: /試験を切り替える/ }).click();
  await page.getByRole("button", { name: /SAP-C02/ }).click();
  await expect(page.getByRole("button", { name: /本番モード（75問）/ })).toBeVisible();
});

test.describe("スマホ幅(360px)で見切れ・押せない箇所が無い", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test("試験一覧", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("解く試験を選んでください")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const cards = page.locator(".examcard");
    const n = await cards.count();
    expect(n).toBe(8);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const box = (await card.boundingBox())!;
      // 押しやすい高さがあり、画面の横幅に収まっている
      expect(box.height).toBeGreaterThanOrEqual(64);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      // 中の文字が切れていない（はみ出しを隠していない）
      const clipped = await card.evaluate((el) =>
        [...el.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 1),
      );
      expect(clipped).toBe(false);
    }

    // 画面下の方のカードもスクロールして押せる
    await cards.last().scrollIntoViewIfNeeded();
    await cards.last().tap();
    await expect(page.getByRole("button", { name: /試験を切り替える/ })).toBeVisible();
  });

  test("ホーム", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /SAP-C02/ }).tap();
    const sw = page.getByRole("button", { name: /試験を切り替える/ });
    await expect(sw).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const box = (await sw.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    // 長い試験名も折り返して全部見える
    const name = page.getByRole("heading", { name: "ソリューションアーキテクト – プロフェッショナル" });
    await expect(name).toBeVisible();
    await sw.tap();
    await expect(page.getByText("試験を選んでください", { exact: true })).toBeVisible();
  });
});
