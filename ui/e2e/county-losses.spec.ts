import { expect, test } from "@playwright/test";

test("the home page reads county-losses.json and totals Polk County's 2012 losses", async ({ page }) => {
  const published = page.waitForResponse((response) => response.url().endsWith("/data/county-losses.json"));
  await page.goto("/");
  expect((await published).ok()).toBe(true);
  await expect(page.getByText("Polk County, 2012")).toContainText("$3,776,155");
  await page.screenshot({ path: "test-results/county-losses.png", fullPage: true });
});
