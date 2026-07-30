import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

type BlockedCapability =
  | "eventSource"
  | "sendBeacon"
  | "sharedWorker"
  | "webRtc"
  | "webSocket"
  | "webTransport"
  | "worker";

type BrowserBoundaryReceipt = {
  blockedCapabilities: BlockedCapability[];
  blockedOutOfOriginRequests: string[];
  consoleErrors: string[];
  openedWebSockets: string[];
  outOfOriginRequests: string[];
  pageErrors: string[];
  sameOriginRequests: string[];
};

declare global {
  interface Window {
    __lwP2BlockedCapabilities: BlockedCapability[];
    __lwP2LongTasks: PerformanceEntry[];
  }
}

async function hardenBrowserBoundary(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const attempts: string[] = [];
    const record = (name: string) => {
      attempts.push(name);
      throw new Error(`Blocked candidate capability: ${name}`);
    };

    Object.defineProperty(window, "__lwP2BlockedCapabilities", {
      configurable: false,
      value: attempts
    });

    class BlockedWebSocket {
      constructor() {
        record("webSocket");
      }
    }

    class BlockedPeerConnection {
      constructor() {
        record("webRtc");
      }
    }

    class BlockedWebTransport {
      constructor() {
        record("webTransport");
      }
    }

    class BlockedEventSource {
      constructor() {
        record("eventSource");
      }
    }

    class BlockedWorker {
      constructor() {
        record("worker");
      }
    }

    class BlockedSharedWorker {
      constructor() {
        record("sharedWorker");
      }
    }

    Object.defineProperty(window, "WebSocket", { configurable: true, value: BlockedWebSocket });
    Object.defineProperty(window, "RTCPeerConnection", { configurable: true, value: BlockedPeerConnection });
    Object.defineProperty(window, "WebTransport", { configurable: true, value: BlockedWebTransport });
    Object.defineProperty(window, "EventSource", { configurable: true, value: BlockedEventSource });
    Object.defineProperty(window, "Worker", { configurable: true, value: BlockedWorker });
    Object.defineProperty(window, "SharedWorker", { configurable: true, value: BlockedSharedWorker });
    Object.defineProperty(Navigator.prototype, "sendBeacon", {
      configurable: true,
      value: () => record("sendBeacon"),
    });
  });
}

function candidateOrigin(testInfo: TestInfo): string {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL !== "string") {
    throw new Error("Phase 2 Playwright baseURL must be configured.");
  }
  return new URL(configuredBaseURL).origin;
}

async function visitCandidate(
  page: Page,
  testInfo: TestInfo,
): Promise<BrowserBoundaryReceipt> {
  const blockedOutOfOriginRequests: string[] = [];
  const outOfOriginRequests: string[] = [];
  const sameOriginRequests: string[] = [];
  const openedWebSockets: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const allowedOrigin = candidateOrigin(testInfo);

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== allowedOrigin) {
      blockedOutOfOriginRequests.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== allowedOrigin) {
      outOfOriginRequests.push(request.url());
    } else {
      sameOriginRequests.push(`${requestUrl.pathname}${requestUrl.search}`);
    }
  });
  page.on("websocket", (webSocket) => openedWebSockets.push(webSocket.url()));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await hardenBrowserBoundary(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(
    page.getByTestId("candidate-ready"),
    `candidate boot errors: ${JSON.stringify({ consoleErrors, pageErrors })}`,
  ).toHaveAttribute("data-ready", "true");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(outOfOriginRequests).toEqual([]);
  expect(blockedOutOfOriginRequests).toEqual([]);
  expect(sameOriginRequests).toHaveLength(3);
  expect(sameOriginRequests).toContain("/");
  expect(sameOriginRequests.filter((url) => /^\/assets\/index-[\w-]+\.js$/.test(url))).toHaveLength(1);
  expect(sameOriginRequests.filter((url) => /^\/assets\/index-[\w-]+\.css$/.test(url))).toHaveLength(1);
  expect(openedWebSockets).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__lwP2BlockedCapabilities as BlockedCapability[]))
    .toEqual([]);
  const blockedCapabilities = await page.evaluate(
    () => window.__lwP2BlockedCapabilities as BlockedCapability[],
  );
  return {
    blockedCapabilities,
    blockedOutOfOriginRequests,
    consoleErrors,
    openedWebSockets,
    outOfOriginRequests,
    pageErrors,
    sameOriginRequests,
  };
}

async function attachJsonEvidence(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  const receiptPath = testInfo.outputPath(`${name}.json`);
  await writeFile(receiptPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await testInfo.attach(`${name}.json`, {
    path: receiptPath,
    contentType: "application/json",
  });
}

async function attachVisualEvidence(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const screenshotPath = testInfo.outputPath(`${name}.png`);
  const ariaPath = testInfo.outputPath(`${name}-aria.yml`);
  await page.screenshot({ fullPage: true, path: screenshotPath });
  await writeFile(ariaPath, await page.locator("body").ariaSnapshot(), "utf8");
  await testInfo.attach(`${name}.png`, {
    path: screenshotPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${name}-aria.yml`, {
    path: ariaPath,
    contentType: "text/yaml",
  });
}

test("desktop candidate shell is explicit, semantic, and bounded", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const browserBoundary = await visitCandidate(page, testInfo);

  await expect(page.getByRole("heading", { name: "Candidate status shell" })).toBeVisible();
  await expect(page.getByText("Candidate only. No migrated features are available in this shell.")).toBeVisible();
  await expect(page.locator("dt").filter({ hasText: "Kernel" })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toHaveCount(2);
  await expect(page.getByText("0 recorded", { exact: true })).toBeVisible();
  expect(await page.locator("canvas").count()).toBe(0);

  const loadedResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name)
  );
  expect(loadedResources).not.toContainEqual(expect.stringMatching(/\/(?:docs\/|modules\/|sw\.js|app\.html)/));

  const runtimeState = await page.evaluate(async () => ({
    cacheNames: await caches.keys(),
    indexedDatabases: "databases" in indexedDB ? await indexedDB.databases() : [],
    localStorageEntries: localStorage.length,
    sessionStorageEntries: sessionStorage.length,
    serviceWorkers: await navigator.serviceWorker.getRegistrations()
  }));
  expect(runtimeState.cacheNames).toEqual([]);
  expect(runtimeState.indexedDatabases).toEqual([]);
  expect(runtimeState.localStorageEntries).toBe(0);
  expect(runtimeState.sessionStorageEntries).toBe(0);
  expect(runtimeState.serviceWorkers).toEqual([]);
  await attachJsonEvidence(testInfo, "candidate-browser-boundary", {
    browserBoundary,
    loadedResources,
    runtimeState,
  });
  await attachVisualEvidence(page, testInfo, "candidate-desktop");
});

test("mobile shell remains readable without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visitCandidate(page, testInfo);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.getByRole("heading", { name: "Candidate status shell" })).toBeVisible();
  await expect(page.getByText("0 recorded", { exact: true })).toBeVisible();
  await attachVisualEvidence(page, testInfo, "candidate-mobile-390x844");
});

test("keyboard focus is visible", async ({ page }, testInfo) => {
  await visitCandidate(page, testInfo);
  await page.keyboard.press("Tab");

  const boundaryLink = page.getByRole("link", { name: "Read the candidate boundary" });
  await expect(boundaryLink).toBeFocused();
  expect(
    await boundaryLink.evaluate((link) => {
      const style = getComputedStyle(link);
      return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
    })
  ).toBe(true);
});

test.describe("accessibility media profiles", () => {
  test("reduced motion disables decorative timing", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visitCandidate(page, testInfo);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
      "auto"
    );
  });
});

test.describe("forced colors", () => {
  test("forced colors preserves readable candidate status", async ({ page }, testInfo) => {
    await page.emulateMedia({ forcedColors: "active" });
    await visitCandidate(page, testInfo);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    const heading = page.getByRole("heading", { name: "Candidate status shell" });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((element) => getComputedStyle(element).color)).not.toBe("");
    await expect(page.getByText("0 recorded", { exact: true })).toBeVisible();
    await attachVisualEvidence(page, testInfo, "candidate-forced-colors");
  });
});

test("candidate stays within provisional navigation and long-task ceilings", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const longTasks: PerformanceEntry[] = [];
    new PerformanceObserver((list) => longTasks.push(...list.getEntries())).observe({
      entryTypes: ["longtask"]
    });
    Object.defineProperty(window, "__lwP2LongTasks", { value: longTasks });
  });
  await visitCandidate(page, testInfo);
  await page.waitForTimeout(100);

  const performance = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      load: navigation.loadEventEnd,
      longTaskCount: window.__lwP2LongTasks.length,
      transferSize: navigation.transferSize
    };
  });
  expect(performance.domContentLoaded).toBeLessThanOrEqual(2_000);
  expect(performance.load).toBeLessThanOrEqual(2_250);
  expect(performance.transferSize).toBeLessThanOrEqual(3_000_000);
  expect(performance.longTaskCount).toBe(0);
  await attachJsonEvidence(testInfo, "candidate-performance", performance);
});
