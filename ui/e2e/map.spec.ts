import { expect, test } from "@playwright/test";

test("the map colors counties by loss ratio, filters live in the URL, and a click opens the county", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main svg [aria-label=geo] path").first()).toBeVisible();
  await expect(page.getByText(/^Iowa: loss ratio/)).toBeVisible();
  const before = await page.getByText(/^Iowa: loss ratio/).textContent();

  await page.getByLabel("Cause").selectOption("Drought");
  await page.getByLabel("Crop").selectOption("CORN");
  await expect(page).toHaveURL(/\?cause=Drought&crop=CORN$/);
  await expect(page.getByText(/^Iowa: loss ratio/)).not.toHaveText(before ?? "");

  await page.reload();
  await expect(page.getByLabel("Cause")).toHaveValue("Drought");
  await expect(page.getByLabel("Crop")).toHaveValue("CORN");

  const county = page.locator("main svg a path").first();
  await county.hover();
  await expect(page.getByRole("tooltip")).toContainText(/County\s+Payouts: \$[\d,]+\s+Loss ratio: \d\.\d\d/);
  await page.screenshot({ path: "test-results/map.png", fullPage: true });

  await county.click();
  await expect(page).toHaveURL(/\/county\/19\d{3}\?cause=Drought&crop=CORN$/);
  await expect(page.getByRole("heading", { name: /^County 19\d{3}$/ })).toBeVisible();
});

test("every page has the header and the credits footer", async ({ page }) => {
  for (const path of ["/", "/drought", "/county/19153"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Drought", exact: true })).toHaveAttribute("href", "/drought");
    await expect(page.getByRole("link", { name: "Map", exact: true })).toHaveAttribute("href", "/");
    await expect(page.getByRole("contentinfo")).toContainText("Crop insurance data: USDA Risk Management Agency.");
    await expect(page.getByRole("contentinfo")).toContainText("map courtesy of NDMC");
  }
});
