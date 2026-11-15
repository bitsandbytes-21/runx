import { expect, test } from "@playwright/test";

// CI and local E2E run without Supabase credentials, so these check the
// redirect and the "not configured" path; account flows are unit-tested.
test("protected pages send anonymous visitors to login", async ({ page }) => {
  await page.goto("/editor");
  await expect(page).toHaveURL(/\/login\?next=%2Feditor$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Log in" }),
  ).toBeVisible();
});

test("the guest demo stays open without an account", async ({ page }) => {
  await page.goto("/run?demo=1&audio=silent");
  await expect(page.getByText(/Demo/)).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
});
