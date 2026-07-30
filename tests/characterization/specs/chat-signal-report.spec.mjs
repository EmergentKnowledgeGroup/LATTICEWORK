import { expect, test } from "@playwright/test";

import { syntheticProvider } from "../support/contracts.mjs";
import {
  attachScreenshot,
  attachText,
  dismissWelcome,
  installEvidenceCapture,
  openBaseline,
} from "../support/harness.mjs";

test("Chat exposes a privacy-bounded Signal Report and working copy action", async ({
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
    await page.locator('button[data-tab="chat"]').click();

    await expect(page.locator("#tab-chat")).toHaveClass(
      /(?:^|\s)active(?:\s|$)/,
    );
    await expect(page.locator("#chatMessages")).toBeVisible();
    await expect(page.locator("#chatInput")).toBeVisible();
    await expect(
      page.getByText("Connect an AI to start chatting", {
        exact: true,
      }),
    ).toBeVisible();

    await page
      .locator("#chatInput")
      .fill(syntheticProvider.unsent_message_sentinel);
    await page
      .getByRole("button", { name: "Signal Report" })
      .click();

    const modal = page.locator("#flSignalReportModal");
    const report = page.locator("#flsrReport");
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole("heading", { name: "Signal Report" }),
    ).toBeVisible();
    await expect(report).toContainText(
      "privacy-locked — no message content",
    );
    await expect(report).toContainText("Last 0 browser errors");
    await expect(report).not.toContainText(
      syntheticProvider.unsent_message_sentinel,
    );
    await expect(report).not.toContainText(
      syntheticProvider.credential,
    );

    const reportText = await report.textContent();
    await modal.getByRole("button", { name: "Copy" }).click();
    await expect(
      modal.getByRole("button", { name: "Copied ✓" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("FreeLattice Signal Report");
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    const normalizeLineEndings = (value) =>
      String(value ?? "").replace(/\r\n/g, "\n").trimEnd();
    expect(normalizeLineEndings(clipboardText)).toBe(
      normalizeLineEndings(reportText),
    );

    await attachText(
      testInfo,
      "signal-report-aria.yml",
      await modal.ariaSnapshot(),
    );
    await attachScreenshot(
      testInfo,
      "signal-report.png",
      modal,
    );
    await expect(modal).toHaveScreenshot("signal-report.png", {
      animations: "disabled",
      caret: "hide",
      mask: [report],
    });
  } finally {
    await evidence.finalize();
  }
});
