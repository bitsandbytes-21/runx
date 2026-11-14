import { expect, test } from "@playwright/test";

test("home shows the episode with 30 minutes chosen", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "RunX" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Giants on the Horizon" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "30 min" })).toBeChecked();
  await expect(page.getByText(/Story ends at/)).toBeVisible();
});
