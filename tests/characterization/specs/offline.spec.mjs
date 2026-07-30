import { expect, test } from "@playwright/test";

import {
  attachJson,
  attachScreenshot,
  installEvidenceCapture,
  openBaseline,
} from "../support/harness.mjs";

test("warm offline reload preserves the observed navigation failure", async ({
  context,
  page,
}, testInfo) => {
  const evidence = await installEvidenceCapture(
    context,
    page,
    testInfo,
  );
  try {
    await openBaseline(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload({
      waitUntil: "domcontentloaded",
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(navigator.serviceWorker.controller),
        ),
      )
      .toBe(true);

    await context.setOffline(true);
    let reloadError = null;
    try {
      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: 12_000,
      });
    } catch (error) {
      reloadError = String(error);
    }

    const observation = {
      reload_error: reloadError,
      final_url: page.url(),
      title: await page.title().catch(() => null),
    };
    const observedFailure =
      Boolean(reloadError) ||
      observation.final_url.startsWith(
        "chrome-error://chromewebdata/",
      );
    expect(observedFailure).toBe(true);
    expect(
      `${reloadError ?? ""} ${observation.final_url}`,
    ).toMatch(/ERR_INTERNET_DISCONNECTED|chrome-error:/i);

    await attachJson(
      testInfo,
      "offline-reload-observation.json",
      observation,
    );
    await attachScreenshot(
      testInfo,
      "offline-reload-failure.png",
      page,
    );
  } finally {
    await context.setOffline(false);
    await evidence.finalize();
  }
});
