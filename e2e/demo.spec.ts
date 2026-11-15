import { expect, test } from "@playwright/test";

test("the demo runs without an account and never touches real progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "runx:progress:ep1",
      JSON.stringify({
        episodeId: "ep1",
        manifestVersion: 1,
        checkpoint: "CP2",
        status: "in_progress",
        lastPlayedAt: new Date().toISOString(),
        lastDurationMin: 30,
      }),
    ),
  );
  await page.goto("/run?demo=1&audio=silent&speed=120");
  await expect(page.getByText(/Demo/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You were there" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/demo progress stays separate/i)).toBeVisible();

  const real = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("runx:progress:ep1")!),
  );
  expect(real.checkpoint).toBe("CP2");
  const demo = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("runx:demo-progress:ep1")!),
  );
  expect(demo.status).toBe("complete");
});
