import { expect, test } from "@playwright/test";

test("the cause filter lists each cause once, under its cleaned name", async ({ page }) => {
  await page.goto("/");
  const options = await page.getByLabel("Cause").locator("option").allTextContents();

  expect(options).toContain("Other (Snow, Lightning, Etc.)");
  expect(options).toContain("Area plan (no cause recorded)");
  expect(options).toContain("Not recorded");
  expect(options).toContain("Mycotoxin");
  expect(options).not.toContain("Mycotoxin (Aflatoxin)");
  expect(options.filter((name) => /irrigation supply/i.test(name))).toEqual(["Failure of Irrigation Supply"]);
  expect(options.filter((name) => /snow/i.test(name))).toHaveLength(1);
  expect(options.filter((name) => /[`"]|\s{2}|crops only/i.test(name))).toEqual([]);
  expect(new Set(options).size).toBe(options.length);

  await page.getByLabel("Cause").selectOption("Area plan (no cause recorded)");
  await expect(page).toHaveURL(/\?cause=Area(%20|\+)plan/);
  await page.screenshot({ path: "test-results/causes.png", fullPage: true });
});
