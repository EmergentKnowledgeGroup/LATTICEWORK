import { expect } from "@playwright/test";

const allowedOrigin = new URL(
  process.env.LATTICEWORK_CHARACTERIZATION_BASE_URL ??
    "http://127.0.0.1:4174",
).origin;

function sanitizeText(value) {
  return String(value ?? "")
    .replace(
      /[A-Z]:\\Users\\[^\\\s]+/gi,
      "<redacted-user-path>",
    )
    .replace(
      /\b[A-F0-9]{32,}\b/gi,
      "<redacted-long-identifier>",
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "<redacted-uuid>",
    )
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "<redacted-email>",
    )
    .slice(0, 2_000);
}

function safeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return sanitizeText(rawUrl);
  }
}

function requestOwner(request) {
  try {
    return request.serviceWorker() ? "service-worker" : "page";
  } catch {
    return "unknown";
  }
}

export async function attachJson(testInfo, name, value) {
  await testInfo.attach(name, {
    body: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"),
    contentType: "application/json",
  });
}

export async function attachText(testInfo, name, value) {
  await testInfo.attach(name, {
    body: Buffer.from(`${String(value)}\n`, "utf8"),
    contentType: "text/plain",
  });
}

export async function attachScreenshot(testInfo, name, target) {
  const body = await target.screenshot({
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach(name, {
    body,
    contentType: "image/png",
  });
}

export async function installEvidenceCapture(context, page, testInfo) {
  const network = {
    allowed_origin: allowedOrigin,
    allowed: [],
    blocked: [],
    blocked_websockets: [],
    blocked_realtime: [],
    failed: [],
  };
  const consoleRows = [];

  await context.exposeBinding(
    "__latticeworkRecordBlockedRealtime",
    (_source, channel) => {
      network.blocked_realtime.push({
        action: "blocked",
        channel: sanitizeText(channel),
      });
    },
  );
  await context.addInitScript(() => {
    const record = (channel) => {
      Promise.resolve(
        globalThis.__latticeworkRecordBlockedRealtime?.(channel),
      ).catch(() => {});
    };
    const blockConstructor = (name, channel) => {
      if (!(name in globalThis)) return;
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: class CharacterizationBlockedRealtimeChannel {
          constructor() {
            record(channel);
            throw new DOMException(
              `${channel} blocked by characterization policy`,
              "SecurityError",
            );
          }
        },
      });
    };
    blockConstructor("RTCPeerConnection", "webrtc");
    blockConstructor("webkitRTCPeerConnection", "webrtc");
    blockConstructor("WebTransport", "webtransport");
  });

  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    consoleRows.push({
      type: message.type(),
      text: sanitizeText(message.text()),
    });
  });
  page.on("pageerror", (error) => {
    consoleRows.push({
      type: "pageerror",
      text: sanitizeText(error.message),
    });
  });
  context.on("requestfailed", (request) => {
    network.failed.push({
      method: request.method(),
      owner: requestOwner(request),
      url: safeUrl(request.url()),
      failure: sanitizeText(request.failure()?.errorText ?? "unknown"),
    });
  });

  await context.route("**/*", async (route) => {
    const request = route.request();
    const rawUrl = request.url();
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      network.allowed.push({
        action: "allowed-non-url",
        method: request.method(),
        owner: requestOwner(request),
        url: safeUrl(rawUrl),
      });
      await route.continue();
      return;
    }

    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    if (isHttp && url.origin !== allowedOrigin) {
      network.blocked.push({
        action: "blocked",
        method: request.method(),
        owner: requestOwner(request),
        url: safeUrl(rawUrl),
      });
      await route.abort("blockedbyclient");
      return;
    }

    network.allowed.push({
      action: "allowed-baseline",
      method: request.method(),
      owner: requestOwner(request),
      url: safeUrl(rawUrl),
    });
    await route.continue();
  });
  await context.routeWebSocket(/.*/, async (webSocketRoute) => {
    network.blocked_websockets.push({
      action: "blocked",
      url: safeUrl(webSocketRoute.url()),
    });
    await webSocketRoute.close({
      code: 1008,
      reason: "blocked by characterization policy",
    });
  });

  return {
    network,
    consoleRows,
    async finalize() {
      await attachJson(testInfo, "network-receipt.json", network);
      await attachJson(testInfo, "console-receipt.json", consoleRows);
    },
  };
}

export async function openBaseline(page) {
  await page.goto("/docs/app.html", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#flWelcomeOverlay")).toBeVisible();
}

export async function dismissWelcome(page) {
  await page.locator("button.fl-welcome-skip").click();
  await expect(page.locator("#flWelcomeOverlay")).toBeHidden();
  await expect(page.locator("#tab-garden")).toHaveClass(
    /(?:^|\s)active(?:\s|$)/,
  );
  await expect
    .poll(() =>
      page.evaluate(() => ({
        welcomed: localStorage.getItem("fl-welcomed"),
        onboarding: localStorage.getItem("fl_onboardingComplete"),
      })),
    )
    .toEqual({
      welcomed: "true",
      onboarding: "true",
    });
}

export async function waitForCanvasCount(page, expected) {
  await expect
    .poll(
      () => page.locator("canvas").count(),
      {
        message: `expected ${expected} initialized canvases`,
        timeout: 20_000,
      },
    )
    .toBe(expected);
}

export async function captureRuntimeSnapshot(page, persistence) {
  const completionKeys = Object.keys(
    persistence.completion_keys_after_skip,
  );
  return page.evaluate(async (completionKeys) => {
    const indexedDBRows = [];
    if (typeof indexedDB.databases === "function") {
      for (const metadata of await indexedDB.databases()) {
        if (!metadata.name) continue;
        indexedDBRows.push(
          await new Promise((resolve) => {
            const request = indexedDB.open(metadata.name);
            request.onsuccess = () => {
              const database = request.result;
              const row = {
                name: database.name,
                version: database.version,
                stores: Array.from(database.objectStoreNames).sort(),
              };
              database.close();
              resolve(row);
            };
            request.onerror = () =>
              resolve({
                name: metadata.name,
                version: metadata.version ?? null,
                stores: [],
                error: String(request.error),
              });
          }),
        );
      }
    }

    const cacheRows = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      cacheRows.push({
        name,
        count: (await cache.keys()).length,
      });
    }

    return {
      url: location.href,
      title: document.title,
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
      webgpu: Boolean(navigator.gpu),
      canvas_count: document.querySelectorAll("canvas").length,
      service_worker: {
        controller:
          navigator.serviceWorker.controller?.scriptURL ?? null,
        registrations: (
          await navigator.serviceWorker.getRegistrations()
        ).map((registration) => ({
          scope: registration.scope,
          active: registration.active?.scriptURL ?? null,
        })),
      },
      caches: cacheRows.sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      local_storage_keys: Object.keys(localStorage).sort(),
      completion_storage: Object.fromEntries(
        completionKeys.map((key) => [key, localStorage.getItem(key)]),
      ),
      session_storage_keys: Object.keys(sessionStorage).sort(),
      indexed_db: indexedDBRows.sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    };
  }, completionKeys);
}

export function assertPersistenceContract(snapshot, contract) {
  expect(snapshot.canvas_count).toBe(contract.expected_canvas_count);

  for (const key of contract.required_local_storage_keys_before_skip) {
    expect(snapshot.local_storage_keys).toContain(key);
  }

  for (const [key, value] of Object.entries(
    contract.completion_keys_after_skip,
  )) {
    expect(snapshot.completion_storage[key]).toBe(value);
  }

  const observedDatabases = new Map(
    snapshot.indexed_db.map((database) => [
      database.name,
      database.stores,
    ]),
  );
  for (const expectedDatabase of contract.required_indexed_db) {
    expect(
      observedDatabases.has(expectedDatabase.name),
      `missing IndexedDB database ${expectedDatabase.name}`,
    ).toBe(true);
    expect(observedDatabases.get(expectedDatabase.name)).toEqual(
      [...expectedDatabase.stores].sort(),
    );
  }
}

export function rectangleIntersection(left, right) {
  if (!left || !right) return 0;
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  return width * height;
}
