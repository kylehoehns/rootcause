import { expect, test } from "@playwright/test";

test("the drought page compares this week with last year, then the worst year, and the choice is in the URL", async ({
  page,
}) => {
  await page.goto("/drought");
  await expect(page.locator("main svg [aria-label=geo] path").first()).toBeVisible();
  await expect(page.getByText(/^Latest week: \d{4}-\d{2}-\d{2}$/)).toBeVisible();
  const lastYear = String(Number((await page.getByText(/^Latest week: /).textContent())?.slice(13, 17)) - 1);
  await expect(page.getByLabel("Compare with")).toHaveValue(lastYear);
  await expect(page.getByText(new RegExp(`^Same week in ${lastYear}: ${lastYear}-\\d{2}-\\d{2}$`))).toBeVisible();
  await expect(page).toHaveURL(/\/drought$/);

  await page.getByRole("button", { name: /^Worst year/ }).click();
  await expect(page).toHaveURL(/\/drought\?year=\d{4}$/);
  const worst = new URL(page.url()).searchParams.get("year") ?? "";
  await expect(page.getByLabel("Compare with")).toHaveValue(worst);
  await expect(page.getByText(new RegExp(`^Same week in ${worst}: ${worst}-`))).toBeVisible();

  await page.getByLabel("Compare with").selectOption(lastYear);
  await expect(page).toHaveURL(/\/drought$/);
  await page.getByRole("button", { name: /^Worst year/ }).click();
  await page.reload();
  await expect(page.getByLabel("Compare with")).toHaveValue(worst);

  await page.locator("main svg [aria-label=geo] path[aria-label]").first().hover();
  await expect(page.getByRole("tooltip")).toContainText(
    /Severe drought or worse, [\d-]+: [\d.]+%[\s\S]*Loss ratio \d{4}:/,
  );
  await page.screenshot({ path: "test-results/drought.png", fullPage: true });
});
