import { expect, test } from "@playwright/test";

// Full flow from AGENTS.md: pick a length, run, stop, save, resume. Silent
// audio and a 60x clock, so nothing waits real minutes.
test("pick a length, run, stop and save, then resume from the checkpoint", async ({
  page,
}) => {
  await page.goto("/?audio=silent&speed=60");
  // The radio is visually hidden; people tap its label.
  await page
    .getByRole("radiogroup", { name: "Run length" })
    .getByText("20 min")
    .click();
  await expect(page.getByRole("radio", { name: "20 min" })).toBeChecked();
  await page.getByRole("button", { name: "Ride out" }).click();
  await expect(page.getByRole("timer")).toBeVisible();

  await expect(page.getByText(/Scene 2 of/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: /Save for next time/ }).click();
  await expect(page.getByText(/Saved at: After the departure/)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page).toHaveURL(/\/$/);

  // Progress survives a reload and Home offers to continue.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "After the departure" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "20 min" })).toBeChecked();
  await page.goto("/resume?audio=silent&speed=60");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  // An immediate continuation never offers the recap.
  await expect(
    page.getByRole("switch", { name: "Play the recap" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue the story" }).click();

  await expect(page.getByText(/Scene 1 of/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Story part 1 of 4|Story part 2 of 4/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You were there" }),
  ).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/Episode complete/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText(/You finished this episode/)).toBeVisible();
});
