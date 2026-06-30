import { test, expect } from "@playwright/test";

test("ホーム→出題→選択→採点→解説→次へ の主要フロー", async ({ page }) => {
  await page.goto("/");

  // ホーム表示（データ読込後にタイトルが出る）
  await expect(page.getByRole("heading", { name: "AWS SAA 問題集" })).toBeVisible();

  // 順番に学習を開始
  await page.getByRole("button", { name: "順番に学習" }).click();

  // 出題画面（進捗表示）
  await expect(page.getByTestId("progress")).toBeVisible();

  // 最初の選択肢を選んで採点
  await page.getByRole("listitem").first().click();
  await page.getByRole("button", { name: "採点する" }).click();

  // 判定と解説（投票分布）が表示される
  await expect(page.getByTestId("verdict")).toBeVisible();
  await expect(page.getByText("コミュニティ投票分布")).toBeVisible();

  // 次へ
  await page.getByRole("button", { name: /次へ/ }).click();
  await expect(page.getByTestId("progress")).toHaveText("2 / 1011");
});

test("ブックマークと原文切替が動作する", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "順番に学習" }).click();

  // 原文(EN)に切替
  await page.getByRole("button", { name: "原文(EN)" }).click();
  await expect(page.getByRole("button", { name: "日本語" })).toBeVisible();

  // ブックマーク
  const bm = page.getByRole("button", { name: "ブックマーク" });
  await bm.click();
  await expect(bm).toHaveAttribute("aria-pressed", "true");
});
