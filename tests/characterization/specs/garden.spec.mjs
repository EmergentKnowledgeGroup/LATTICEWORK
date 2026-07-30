import { expect, test } from "@playwright/test";

import { persistenceContract } from "../support/contracts.mjs";
import {
  attachScreenshot,
  dismissWelcome,
  installEvidenceCapture,
  openBaseline,
  waitForCanvasCount,
} from "../support/harness.mjs";

test("skip opens the initialized Garden and writes completion state", async ({
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
    await dismissWelcome(page);
    await waitForCanvasCount(
      page,
      persistenceContract.expected_canvas_count,
    );

    await expect(page.locator("#gardenContainer")).toBeVisible();
    await expect(page.locator(".garden-title")).toContainText(
      "The Fractal Garden",
    );
    await expect(page.locator("#gardenModeObserve")).toBeVisible();
    await expect(page.locator("#gardenModeExplore")).toBeVisible();
    await expect(page.locator("#gardenContainer canvas").first()).toBeVisible();

    const completion = await page.evaluate(() => ({
      welcomed: localStorage.getItem("fl-welcomed"),
      onboarding: localStorage.getItem("fl_onboardingComplete"),
    }));
    expect(completion).toEqual({
      welcomed:
        persistenceContract.completion_keys_after_skip["fl-welcomed"],
      onboarding:
        persistenceContract.completion_keys_after_skip[
          "fl_onboardingComplete"
        ],
    });
    await attachScreenshot(
      testInfo,
      "garden-after-skip.png",
      page,
    );
  } finally {
    await evidence.finalize();
  }
});
