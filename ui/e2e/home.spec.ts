import { expect, test } from "@playwright/test";

test("the home page shows a county's losses from the published data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Polk County, 2012")).toContainText("$3,776,155");
  await page.screenshot({ path: "test-results/home.png", fullPage: true });
});
