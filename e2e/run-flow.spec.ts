import { expect, test } from "@playwright/test";

// Silent audio and a 60x clock: a 20 minute plan plays in about 20 seconds.
const FAST_RUN = "/run?min=20&audio=silent&speed=60";

test("a run shows captions, pauses, resumes and stops with Save", async ({ page }) => {
  await page.goto(FAST_RUN);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("status", { name: "Caption" })).toContainText("Sancho");

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused")).toBeVisible();
  const frozen = await page.getByRole("timer").textContent();
  await page.waitForTimeout(1500);
  await expect(page.getByRole("timer")).toHaveText(frozen!);
  await page.getByRole("button", { name: "Resume" }).click();

  await page.getByRole("button", { name: "Stop" }).click();
  const sheet = page.getByRole("dialog", { name: "Retreat for now?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /Keep running/ }).click();
  await expect(sheet).toBeHidden();

  // Wait for the opening to finish so Finish now is offered, then save instead.
  await expect(page.getByText(/Scene 2 of/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(sheet.getByRole("button", { name: /Finish the story now/ })).toBeVisible();
  await sheet.getByRole("button", { name: /Save for next time/ }).click();
  await expect(page.getByRole("heading", { name: "You were there" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Saved at: After the departure/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "RunX" })).toBeVisible();
});

test("an uninterrupted run plays to the end and completes the episode", async ({ page }) => {
  await page.goto("/run?min=15&audio=silent&speed=120");
  await expect(page.getByRole("heading", { name: "You were there" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Episode complete/)).toBeVisible();
});
