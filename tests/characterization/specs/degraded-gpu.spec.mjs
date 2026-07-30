import { expect, test } from "@playwright/test";

import { persistenceContract } from "../support/contracts.mjs";
import {
  attachScreenshot,
  dismissWelcome,
  installEvidenceCapture,
  openBaseline,
  waitForCanvasCount,
} from "../support/harness.mjs";

test("Garden still renders through its fallback when navigator.gpu is unavailable", async ({
  context,
  page,
}, testInfo) => {
  const evidence = await installEvidenceCapture(
    context,
    page,
    testInfo,
  );
  try {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "gpu", {
        configurable: true,
        get: () => undefined,
      });
    });
    await openBaseline(page);
    expect(await page.evaluate(() => Boolean(navigator.gpu))).toBe(false);

    await dismissWelcome(page);
    await waitForCanvasCount(
      page,
      persistenceContract.expected_canvas_count,
    );
    await expect(page.locator("#gardenContainer")).toBeVisible();
    await expect(page.locator("#gardenContainer canvas").first()).toBeVisible();
    await expect(
      page.getByText(/WebGPU.*(?:unavailable|unsupported)/i),
    ).toHaveCount(0);
    await attachScreenshot(
      testInfo,
      "garden-no-webgpu.png",
      page,
    );
  } finally {
    await evidence.finalize();
  }
});
