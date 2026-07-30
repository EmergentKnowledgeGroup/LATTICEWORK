import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect, test } from "@playwright/test";

import {
  attachScenarioResult,
  captureStorageProjection,
  configureCloudThroughWelcome,
  configureLocalThroughWelcome,
  dismissWelcomeToChat,
  installPhase4Capture,
  newScenarioResult,
  openFreshBaseline,
  phase4Subcases,
  privateSentinelLeak,
} from "../support/phase4-chat.mjs";

const specificationRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(specificationRoot, "..", "..", "..");
const runId = process.env.LATTICEWORK_PHASE4_RUN_ID ?? `manual-${process.pid}`;
const runRoot = path.resolve(
  process.env.LATTICEWORK_PHASE4_RUN_ROOT ??
    path.join(
      repositoryRoot,
      "runtime",
      "tmp",
      "phase4-characterization",
      runId,
    ),
);
const baseURL =
  process.env.LATTICEWORK_CHARACTERIZATION_BASE_URL ??
  "http://127.0.0.1:4174";

function createOwnedProfile(scenario) {
  const profilesRoot = path.join(runRoot, "profiles");
  const profilePath = path.join(profilesRoot, scenario.id);
  const relative = path.relative(runRoot, profilePath);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    fs.existsSync(profilePath)
  ) {
    throw new Error(`Unsafe or reused Phase 4 profile path: ${scenario.id}`);
  }
  fs.mkdirSync(profilePath, { recursive: true });
  if (fs.readdirSync(profilePath).length !== 0) {
    throw new Error(`Phase 4 profile was not empty at creation: ${scenario.id}`);
  }
  const marker = {
    schema: "latticework.phase4-profile-ownership.v1",
    run_id: runId,
    subcase_id: scenario.id,
    repository_root: repositoryRoot,
    profile_path: profilePath,
  };
  fs.writeFileSync(
    path.join(profilePath, ".ownership.json"),
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8",
  );
  return profilePath;
}

async function attachJson(testInfo, name, value) {
  await testInfo.attach(name, {
    body: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"),
    contentType: "application/json",
  });
}

async function configureProvider(page, scenario) {
  if (scenario.provider === "P4-PRV-OPENAI") {
    await configureCloudThroughWelcome(page);
    return;
  }
  if (scenario.provider === "P4-PRV-OLLAMA") {
    await configureLocalThroughWelcome(page);
    return;
  }
  await dismissWelcomeToChat(page);
}

async function observeOnboarding(page, scenario, receipt, result) {
  if (scenario.probe === "onboarding-visible") {
    await expect(page.locator("#flWelcomeOverlay")).toBeVisible();
    await expect(page.locator(".fl-welcome-skip")).toBeVisible();
    result.status = "PASS";
    result.notes.push("fresh onboarding and skip control are visible");
    return;
  }

  await dismissWelcomeToChat(page);
  await page.locator("#chatInput").fill("P4 synthetic setup probe");
  const before = receipt.expected_requests.length;
  await page.locator("#sendBtn").click();
  await page.waitForTimeout(250);
  if (scenario.probe === "absent-configuration") {
    result.status =
      receipt.expected_requests.length === before ? "PASS" : "FAIL";
    result.notes.push(
      "absent configuration produced no provider request; quick-connect behavior was observed",
    );
    return;
  }

  result.status = "UNKNOWN";
  result.notes.push(
    "the baseline does not expose a separately defined invalid-configuration contract that can be proven without persisting the synthetic credential sentinel",
  );
}

async function observeEmptySend(page, receipt, result) {
  await dismissWelcomeToChat(page);
  const messagesBefore = await page.locator("#chatMessages .chat-message").count();
  await page.locator("#chatInput").fill("   ");
  await page.locator("#sendBtn").click();
  await page.locator("#chatInput").press("Enter");
  await page.waitForTimeout(150);
  const messagesAfter = await page.locator("#chatMessages .chat-message").count();
  result.status =
    messagesAfter === messagesBefore && receipt.expected_requests.length === 0
      ? "PASS"
      : "FAIL";
  result.notes.push("empty Send and Enter produced no request or message");
}

async function observeCancellationSupport(page, result) {
  await dismissWelcomeToChat(page);
  const controls = await page
    .locator("#tab-chat button")
    .evaluateAll((buttons) =>
      buttons.map((button) => ({
        id: button.id || null,
        name:
          button.getAttribute("aria-label") ||
          button.getAttribute("title") ||
          button.textContent?.trim() ||
          "",
      })),
    );
  const cancellation = controls.filter((control) =>
    /cancel|stop generating|abort/i.test(control.name),
  );
  result.status = "UNKNOWN";
  result.notes.push(
    cancellation.length === 0
      ? "primary Chat exposes no visible cancellation or abort control; the locked packet forbids simulating one"
      : "a possible cancellation control exists but its terminal semantics were not established",
  );
  result.control_count = controls.length;
  result.cancel_control_count = cancellation.length;
}

async function observeProviderFlow(page, scenario, receipt, result) {
  await configureProvider(page, scenario);

  const messagesBefore = await page.locator("#chatMessages .chat-message").count();
  const assistantMessagesBefore = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  await page
    .locator("#chatInput")
    .fill("P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT");
  await page.locator("#sendBtn").click();
  await expect
    .poll(() => receipt.expected_requests.length, { timeout: 12_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(
      () => page.locator("#chatMessages .chat-message").count(),
      { timeout: 12_000 },
    )
    .toBeGreaterThan(messagesBefore);
  await expect(page.locator("#sendBtn")).toBeEnabled({ timeout: 12_000 });

  result.request_count = receipt.expected_requests.length;
  result.message_count_before = messagesBefore;
  result.message_count_after =
    await page.locator("#chatMessages .chat-message").count();
  const assistantMessagesAfter = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  result.assistant_message_count_before = assistantMessagesBefore;
  result.assistant_message_count_after = assistantMessagesAfter;
  result.terminal_count = Math.max(
    0,
    assistantMessagesAfter - assistantMessagesBefore,
  );
  result.operation.duplicate_terminal = result.terminal_count > 1;
  const firstDeltaProbe = receipt.fixture_probes.findIndex(
    (probe) => probe.emitted_delta === true,
  );
  result.operation.post_delta_retry =
    firstDeltaProbe >= 0 &&
    receipt.fixture_probes.slice(firstDeltaProbe + 1).length > 0;

  const necessarilyUnknown = new Set([
    "fragmented-success",
    "duplicate-activation",
    "navigation-before-first-delta",
    "navigation-after-first-delta",
    "warm-offline-reload",
  ]);
  if (necessarilyUnknown.has(scenario.probe)) {
    result.status = "UNKNOWN";
    result.notes.push(
      scenario.probe === "fragmented-success"
        ? "route fulfillment exercised the exact request and parser but cannot prove timed incremental fragmentation without an additional provider listener, which is forbidden"
        : "the required race/reload behavior was not safely established by the bounded intercepted fixture",
    );
    return;
  }

  if (scenario.probe === "timeout") {
    result.status = "UNKNOWN";
    result.notes.push(
      "the baseline primary request has no timeout contract; a synthetic route abort cannot establish elapsed-time semantics",
    );
    return;
  }

  result.status = "PASS";
  result.notes.push(
    "exact intercepted provider request and one user-visible terminal outcome were observed",
  );
}

async function observeSignalReport(page, scenario, receipt, result) {
  if (scenario.probe === "signal-report-cancelled") {
    await observeCancellationSupport(page, result);
    result.notes.push("cancelled Signal Report state cannot exist without cancellation");
    return;
  }

  await observeProviderFlow(page, scenario, receipt, result);
  await page
    .locator("#chatInput")
    .fill("P4_SYNTHETIC_DRAFT_DO_NOT_EXPORT");
  await page.getByRole("button", { name: "Signal Report" }).click();
  const report = page.locator("#flsrReport");
  await expect(report).toBeVisible();
  const privacy = await report.evaluate((element) => ({
    excludes_draft: !element.textContent.includes(
      "P4_SYNTHETIC_DRAFT_DO_NOT_EXPORT",
    ),
    excludes_prompt: !element.textContent.includes(
      "P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT",
    ),
    excludes_credential: !element.textContent.includes(
      "P4_SYNTHETIC_CREDENTIAL_DO_NOT_EXPORT",
    ),
    byte_count: new TextEncoder().encode(element.textContent ?? "").length,
  }));
  if (
    privacy.excludes_draft &&
    privacy.excludes_prompt &&
    privacy.excludes_credential
  ) {
    if (scenario.probe === "signal-report-failed") result.status = "PASS";
  } else {
    result.status = "FAIL";
  }
  result.signal_report = privacy;
}

async function observeResponsive(page, scenario, receipt, result) {
  await page.setViewportSize({ width: 390, height: 844 });
  await observeProviderFlow(page, scenario, receipt, result);
  const geometry = await page.evaluate(() => {
    const ids = ["chatInput", "sendBtn"];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth,
      controls: Object.fromEntries(
        ids.map((id) => {
          const rect = document.getElementById(id)?.getBoundingClientRect();
          return [
            id,
            rect
              ? {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                }
              : null,
          ];
        }),
      ),
    };
  });
  result.geometry = geometry;
  result.status = geometry.overflow ? "FAIL" : "UNKNOWN";
  result.notes.push(
    geometry.overflow
      ? "mobile document overflow blocks the bounded flow"
      : "mobile geometry was captured, but local fragmented streaming remains UNKNOWN under the no-listener packet",
  );
}

async function observeAccessibility(page, scenario, result) {
  if (scenario.probe === "forced-colors") {
    await page.emulateMedia({ forcedColors: "active" });
  }
  if (scenario.probe === "reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await dismissWelcomeToChat(page);
  const semantics = await page.evaluate(() => ({
    input_label:
      document.getElementById("chatInput")?.getAttribute("aria-label") ?? null,
    send_name: document.getElementById("sendBtn")?.textContent?.trim() ?? null,
    live_regions: document.querySelectorAll(
      "[aria-live], [role='status'], [role='alert']",
    ).length,
    signal_report_name:
      document
        .querySelector("[aria-label='Signal Report']")
        ?.getAttribute("aria-label") ?? null,
  }));
  result.accessibility = semantics;
  result.status = "UNKNOWN";
  result.notes.push(
    "runtime semantics were captured; the baseline lacks an explicit primary-Chat live region and the locked accessibility contract is not fully established",
  );
}

async function observeEgress(page, context, scenario, receipt, result) {
  await dismissWelcomeToChat(page);
  const blockedBefore = receipt.blocked.length;
  const socketsBefore = receipt.blocked_websockets.length;
  await page.evaluate(async (probe) => {
    if (probe === "unexpected-http-origin" || probe === "redirect") {
      await fetch(`https://phase4.invalid/${probe}`).catch(() => {});
      return;
    }
    if (probe === "websocket") {
      await new Promise((resolve) => {
        const socket = new WebSocket("wss://phase4.invalid/socket");
        socket.onerror = () => resolve();
        socket.onclose = () => resolve();
        setTimeout(resolve, 500);
      });
      return;
    }
    if (probe === "eventsource") {
      await new Promise((resolve) => {
        const source = new EventSource("https://phase4.invalid/events");
        source.onerror = () => {
          source.close();
          resolve();
        };
        setTimeout(() => {
          source.close();
          resolve();
        }, 500);
      });
      return;
    }
    if (probe === "worker-realtime") {
      try {
        const worker = new Worker("https://phase4.invalid/worker.js");
        worker.onerror = () => worker.terminate();
        await new Promise((resolve) => setTimeout(resolve, 500));
        worker.terminate();
        return null;
      } catch (error) {
        return {
          browser_preflight_block: true,
          error_name: error?.name ?? "Error",
        };
      }
    }
    if (probe === "beacon") {
      navigator.sendBeacon(
        "https://phase4.invalid/beacon",
        new Uint8Array([1, 2, 3]),
      );
      await new Promise((resolve) => setTimeout(resolve, 250));
      return;
    }
    if (probe === "navigation") {
      const frame = document.createElement("iframe");
      frame.src = "https://phase4.invalid/navigation";
      document.body.appendChild(frame);
      await new Promise((resolve) => setTimeout(resolve, 500));
      frame.remove();
    }
  }, scenario.probe).then((observation) => {
    if (observation?.browser_preflight_block) {
      result.browser_preflight_block = {
        observed: true,
        error_name: observation.error_name,
        transmitted: false,
      };
    }
  });
  await page.waitForTimeout(100);
  const blockedDelta = receipt.blocked.length - blockedBefore;
  const socketDelta = receipt.blocked_websockets.length - socketsBefore;
  result.blocked_count =
    blockedDelta +
    socketDelta +
    (result.browser_preflight_block?.observed === true ? 1 : 0);
  result.status = result.blocked_count > 0 ? "PASS" : "FAIL";
  result.notes.push(
    result.status === "PASS"
      ? "injected transport was blocked before transmission"
      : "injected transport produced no provable block receipt",
  );
}

for (const scenario of phase4Subcases) {
  test(`${scenario.id} ${scenario.probe}`, async ({}, testInfo) => {
    const result = newScenarioResult(scenario, testInfo);
    const profilePath = createOwnedProfile(scenario);
    result.profile_id = `P4-PROFILE-${scenario.id}`;
    result.profile_path = profilePath;
    result.profile_empty_at_creation = true;
    result.profile_ownership_marker = "phase4-run-marker-v1";
    let context = null;
    let receipt = {
      allowed_origin: new URL(baseURL).origin,
      expected_target: null,
      expected_requests: [],
      fixture_probes: [],
      blocked: [],
      blocked_websockets: [],
      console: [],
    };
    let storage = null;
    try {
      context = await chromium.launchPersistentContext(profilePath, {
        baseURL,
        headless: true,
        viewport: { width: 1440, height: 900 },
        colorScheme: "dark",
        locale: "en-US",
        timezoneId: "UTC",
        permissions: ["clipboard-read", "clipboard-write"],
        serviceWorkers: "allow",
        args: [
          "--disable-background-networking",
          "--disable-component-update",
          "--disable-default-apps",
          "--disable-sync",
          "--no-default-browser-check",
        ],
      });
      receipt = await installPhase4Capture(context, scenario);
      const page = context.pages()[0] ?? (await context.newPage());
      await openFreshBaseline(page);

      if (scenario.group_id === "P4-ONB-001") {
        await observeOnboarding(page, scenario, receipt, result);
      } else if (scenario.probe === "empty-send") {
        await observeEmptySend(page, receipt, result);
      } else if (
        scenario.probe.includes("cancel") ||
        scenario.probe === "late-delta-after-cancel"
      ) {
        await observeCancellationSupport(page, result);
      } else if (scenario.group_id === "P4-SIG-001") {
        await observeSignalReport(page, scenario, receipt, result);
      } else if (scenario.group_id === "P4-RESP-001") {
        await observeResponsive(page, scenario, receipt, result);
      } else if (scenario.group_id === "P4-A11Y-001") {
        await observeAccessibility(page, scenario, result);
      } else if (scenario.group_id === "P4-EGR-001") {
        await observeEgress(page, context, scenario, receipt, result);
      } else {
        await observeProviderFlow(page, scenario, receipt, result);
      }

      storage = await captureStorageProjection(page);
    } catch (error) {
      result.status = "FAIL";
      const unexpectedProviderTarget = receipt.blocked.find(
        (entry) =>
          entry.method === "POST" &&
          entry.url !== receipt.expected_target &&
          /\/chat\/completions$/u.test(entry.url),
      );
      if (
        scenario.provider === "P4-PRV-OPENAI" &&
        receipt.expected_requests.length === 0 &&
        unexpectedProviderTarget
      ) {
        result.notes.push(
          `visible OpenAI setup dispatched ${unexpectedProviderTarget.url} instead of the locked OpenAI target; the unexpected request was blocked before transmission`,
        );
      } else {
        result.notes.push(
          `bounded observation failed with ${error?.name ?? "Error"}`,
        );
      }
    } finally {
      if (context) {
        await context.close();
        result.context_closed = true;
        result.cleanup_status = "persistent-browser-context-closed";
      }
      result.request_count = receipt.expected_requests.length;
      result.blocked_count =
        receipt.blocked.length +
        receipt.blocked_websockets.length +
        (result.browser_preflight_block?.observed === true ? 1 : 0);
      result.fixture_request_observed =
        !scenario.provider || receipt.expected_requests.length > 0;
      result.private_sentinel_leak = privateSentinelLeak({
        result,
        receipt,
        storage,
      });
      if (result.private_sentinel_leak) result.status = "FAIL";
      await attachJson(testInfo, "network-receipt.json", receipt);
      await attachJson(
        testInfo,
        "storage-projection.json",
        storage ?? { unavailable: true },
      );
      await attachScenarioResult(testInfo, result);
    }
  });
}
