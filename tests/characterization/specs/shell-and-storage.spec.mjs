import { expect, test } from "@playwright/test";

import { persistenceContract } from "../support/contracts.mjs";
import {
  assertPersistenceContract,
  attachJson,
  attachScreenshot,
  attachText,
  captureRuntimeSnapshot,
  installEvidenceCapture,
  openBaseline,
  waitForCanvasCount,
} from "../support/harness.mjs";

test("first run initializes storage while HTTP, WebSocket, and realtime egress stay blocked", async ({
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
    await expect
      .poll(() => page.title())
      .toMatch(/^FreeLattice(?: ✦ .+)?$/);
    await expect(
      page.getByRole("button", {
        name: /Skip\s+—\s+just explore/,
      }),
    ).toBeVisible();
    await waitForCanvasCount(
      page,
      persistenceContract.expected_canvas_count,
    );

    await expect
      .poll(
        () =>
          page.evaluate(async () =>
            typeof indexedDB.databases === "function"
              ? (await indexedDB.databases()).length
              : 0,
          ),
        { timeout: 20_000 },
      )
      .toBeGreaterThanOrEqual(
        persistenceContract.required_indexed_db.length,
      );
    await expect
      .poll(
        () =>
          evidence.network.blocked.some(
            (request) =>
              request.url.includes("localhost:11434") ||
              request.url.includes("raw.githubusercontent.com"),
          ),
        { timeout: 20_000 },
      )
      .toBe(true);
    await page.evaluate(() => {
      const socket = new WebSocket(
        "wss://example.invalid/latticework-characterization",
      );
      socket.addEventListener("error", () => {});
      try {
        new RTCPeerConnection({
          iceServers: [{ urls: "stun:example.invalid:3478" }],
        });
      } catch {
        // The characterization policy must synchronously deny WebRTC.
      }
    });
    await expect
      .poll(() => evidence.network.blocked_websockets.length)
      .toBeGreaterThanOrEqual(1);
    await expect
      .poll(
        () =>
          evidence.network.blocked_realtime.filter(
            (row) => row.channel === "webrtc",
          ).length,
      )
      .toBeGreaterThanOrEqual(1);

    const snapshot = await captureRuntimeSnapshot(page);
    await attachJson(testInfo, "runtime-snapshot.json", snapshot);
    expect(
      evidence.network.blocked.every(
        (request) => new URL(request.url).origin !== evidence.network.allowed_origin,
      ),
    ).toBe(true);
    assertPersistenceContract(snapshot, persistenceContract);

    await attachText(
      testInfo,
      "onboarding-aria.yml",
      await page.locator("#flWelcomeOverlay").ariaSnapshot(),
    );
    await attachScreenshot(
      testInfo,
      "onboarding-first-run.png",
      page.locator("#flWelcomeOverlay"),
    );
    await expect(page.locator("#flWelcomeOverlay")).toHaveScreenshot(
      "onboarding-first-run.png",
      {
        animations: "disabled",
        caret: "hide",
      },
    );
  } finally {
    await evidence.finalize();
  }
});
