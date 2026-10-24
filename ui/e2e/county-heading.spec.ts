import { expect, test } from "@playwright/test";

// The real boundaries name counties "Polk County" already; the page must not add "County" again.
test("the county page names the county once", async ({ page }) => {
  await page.goto("/county/19153");
  await expect(page.getByRole("heading", { level: 1, name: "Polk County", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /County County/ })).toHaveCount(0);
  await expect(page.getByText("County FIPS 19153")).toBeVisible();
  await page.screenshot({ path: "test-results/county-heading.png", fullPage: true });
});
