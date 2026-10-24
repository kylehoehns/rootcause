import { expect, test } from "@playwright/test";

test("a county opened from the map shows payouts by cause, top crops and worst years", async ({ page }) => {
  await page.goto("/?cause=Drought");
  await page.locator("main svg a path").first().click();
  await expect(page).toHaveURL(/\/county\/19\d{3}\?cause=Drought$/);
  await expect(page.getByRole("heading", { name: "Top crops by payouts" })).toBeVisible();
  await expect(page.locator("main svg").first()).toBeVisible();
  await expect(page.getByRole("list", { name: "Worst years" }).getByRole("listitem").first()).toContainText(
    /^\d{4}: \$[\d,]+, loss ratio (\d+\.\d\d|n\/a)$/,
  );
  await expect(page.getByText("cause: Drought")).toBeVisible();
  await page.screenshot({ path: "test-results/county.png", fullPage: true });

  await page.getByRole("link", { name: /Back to the map/ }).click();
  await expect(page).toHaveURL(/\/\?cause=Drought$/);
});

test("Polk County has its page", async ({ page }) => {
  await page.goto("/county/19153");
  await expect(page.getByRole("heading", { name: "Polk County" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Top crops" }).getByRole("listitem").first()).toBeVisible();
  await expect(page.getByRole("list", { name: "Worst years" }).getByRole("listitem").first()).toContainText("2012");
});

test("an unknown county says so plainly", async ({ page }) => {
  await page.goto("/county/19999");
  await expect(page.getByText("No such Iowa county.")).toBeVisible();
});
