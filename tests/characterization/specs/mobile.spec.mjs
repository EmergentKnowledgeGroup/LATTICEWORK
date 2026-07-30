import { expect, test } from "@playwright/test";

import {
  attachJson,
  attachScreenshot,
  dismissWelcome,
  installEvidenceCapture,
  openBaseline,
  rectangleIntersection,
} from "../support/harness.mjs";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});

test("mobile preserves the observed Garden crowding and Presence overlap", async ({
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
    await expect(page.locator("#flMobileNav")).toBeVisible();
    await expect(page.locator("#mnav-garden")).toHaveClass(
      /(?:^|\s)active(?:\s|$)/,
    );
    await expect(page.locator("#sp-minds-indicator")).toBeVisible({
      timeout: 15_000,
    });
    const presenceButton = page.getByRole("button", {
      name: "✦ Presence",
      exact: true,
    });
    await expect(presenceButton).toBeVisible();

    const title = await page.locator(".garden-title").boundingBox();
    const controls = await page
      .locator(".garden-controls")
      .boundingBox();
    const observe = await page
      .locator("#gardenModeObserve")
      .boundingBox();
    const explore = await page
      .locator("#gardenModeExplore")
      .boundingBox();
    const presence = await page
      .locator("#sp-minds-indicator")
      .boundingBox();
    const presenceButtonBox = await presenceButton.boundingBox();
    const geometry = {
      viewport: { width: 390, height: 844 },
      title,
      controls,
      observe,
      explore,
      presence,
      presence_button: presenceButtonBox,
      title_controls_intersection: rectangleIntersection(
        title,
        controls,
      ),
      observe_explore_intersection: rectangleIntersection(
        observe,
        explore,
      ),
      title_presence_intersection: rectangleIntersection(
        title,
        presence,
      ),
      controls_presence_intersection: rectangleIntersection(
        controls,
        presence,
      ),
      title_presence_button_intersection: rectangleIntersection(
        title,
        presenceButtonBox,
      ),
    };

    await attachJson(testInfo, "mobile-overlap.json", geometry);
    await attachScreenshot(
      testInfo,
      "garden-mobile-390x844.png",
      page,
    );
    expect(
      geometry.title_presence_button_intersection,
    ).toBeGreaterThan(0);
  } finally {
    await evidence.finalize();
  }
});
