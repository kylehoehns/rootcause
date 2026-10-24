import { expect, test } from "@playwright/test";

test("a missing data file shows a plain error under a heading", async ({ page }) => {
  await page.route("**/data/county-losses.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  await page.goto("/county/19153");
  await expect(page.getByRole("heading", { level: 1, name: "Iowa county" })).toBeVisible();
  await expect(page.getByText("Could not load the county data. Try reloading the page.")).toBeVisible();
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await page.screenshot({ path: "test-results/county-load-failure.png", fullPage: true });
});

test("an unknown county still has a heading", async ({ page }) => {
  await page.goto("/county/19999");
  await expect(page.getByRole("heading", { level: 1, name: "Iowa county" })).toBeVisible();
  await expect(page.getByText("No such Iowa county.")).toBeVisible();
});
