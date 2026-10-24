import { expect, test } from "@playwright/test";

test("a saved link with a cause name that no longer exists shows every cause", async ({ page }) => {
  await page.goto("/?cause=Mycotoxin%20(Aflatoxin)");
  await expect(page.locator("main svg [aria-label=geo] path").first()).toBeVisible();
  await expect(page.getByLabel("Cause")).toHaveValue("");
  await expect(page.locator("main svg a path").first()).toBeVisible();

  await page.goto("/county/19153?cause=Mycotoxin%20(Aflatoxin)");
  await expect(page.getByRole("heading", { name: "Polk County" })).toBeVisible();
  await expect(page.getByText(/cause: /)).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Worst years" }).getByRole("listitem").first()).toBeVisible();
  await page.screenshot({ path: "test-results/stale-cause.png", fullPage: true });
});
