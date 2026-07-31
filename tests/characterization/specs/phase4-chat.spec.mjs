import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect, test } from "@playwright/test";

import {
  attachScenarioResult,
  captureStorageProjection,
  configureCloudThroughWelcome,
  configureLocalThroughWelcome,
  configureLoopbackLocalProvider,
  dismissWelcomeToChat,
  installPhase4Capture,
  newScenarioResult,
  openFreshBaseline,
  phase4Subcases,
  privateSentinelLeak,
} from "../support/phase4-chat.mjs";
import {
  startPhase4LoopbackStreamFixture,
} from "../support/phase4-loopback-stream.mjs";

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
const amendmentRetests = process.env.LATTICEWORK_PHASE4_AMENDMENT_RETESTS === "1";
const loopbackRetests =
  process.env.LATTICEWORK_PHASE4_LOOPBACK_RETESTS === "1";
const invalidConfigurationSentinel = "P4_SYNTHETIC_INVALID_CONFIG_DO_NOT_EXPORT";
let loopbackFixture = null;

test.beforeAll(async () => {
  if (!loopbackRetests) return;
  loopbackFixture = await startPhase4LoopbackStreamFixture({
    runRoot,
    allowedOrigin: new URL(baseURL).origin,
  });
});

test.afterAll(async () => {
  if (loopbackFixture) {
    await loopbackFixture.stop();
    loopbackFixture = null;
  }
});

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

async function configureLoopbackProvider(page, scenario) {
  expect(loopbackRetests).toBe(true);
  expect(scenario.provider).toBe("P4-PRV-OLLAMA");
  expect(loopbackFixture).not.toBeNull();
  await configureLocalThroughWelcome(page);
  await configureLoopbackLocalProvider(page, loopbackFixture.endpoint);
}

async function observeLoopbackStream(page, scenario, receipt, result) {
  await configureLoopbackProvider(page, scenario);
  const session = loopbackFixture.arm(scenario.id);
  const assistantBefore = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  await page.locator("#chatInput").fill("P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT");
  await page.locator("#sendBtn").click();
  await session.waitForRequest(12_000);

  if (scenario.probe === "duplicate-activation") {
    await page.evaluate(() => window.sendMessage());
    await page.waitForTimeout(100);
    expect(receipt.expected_requests).toHaveLength(1);
  }

  if (scenario.probe === "navigation-before-first-delta") {
    await page.reload({ waitUntil: "domcontentloaded" });
    await session.waitForClose(12_000);
    const afterReload = await page
      .locator("#chatMessages .chat-message.assistant")
      .count();
    const stream = session.receipt();
    expect(stream.closed_before_first_delta).toBe(true);
    expect(stream.closed_before_terminal).toBe(true);
    expect(afterReload).toBeLessThanOrEqual(assistantBefore);
    result.status = "PASS";
    result.terminal_count = 0;
    result.loopback_stream = stream;
    result.observed_contract = {
      navigation: "BEFORE_FIRST_DELTA",
      client_close: "BEFORE_FIRST_DELTA_AND_TERMINAL",
      duplicate_assistant_terminal: false,
    };
    session.release();
    return;
  }

  session.emitDelta("P4 synthetic first");
  await expect(page.locator("#chatMessages .chat-message.assistant").last()).toContainText(
    "P4 synthetic first",
  );

  if (scenario.probe === "navigation-after-first-delta") {
    await page.reload({ waitUntil: "domcontentloaded" });
    await session.waitForClose(12_000);
    const afterReload = await page
      .locator("#chatMessages .chat-message.assistant")
      .count();
    const stream = session.receipt();
    expect(stream.closed_before_first_delta).toBe(false);
    expect(stream.closed_before_terminal).toBe(true);
    expect(stream.terminal_emitted).toBe(false);
    expect(afterReload).toBeLessThanOrEqual(assistantBefore);
    result.status = "PASS";
    result.terminal_count = 0;
    result.loopback_stream = stream;
    result.observed_contract = {
      navigation: "AFTER_FIRST_DELTA",
      client_close: "AFTER_FIRST_DELTA_BEFORE_TERMINAL",
      late_delta_accepted: false,
      duplicate_assistant_terminal: false,
    };
    session.release();
    return;
  }

  session.emitDelta("P4 synthetic success");
  session.finish();
  await session.waitForClose(12_000);
  await expect(page.locator("#sendBtn")).toBeEnabled({ timeout: 12_000 });
  const assistantAfter = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  expect(assistantAfter - assistantBefore).toBe(1);
  const terminal = page.locator("#chatMessages .chat-message.assistant").last();
  await expect(terminal).toContainText("P4 synthetic firstP4 synthetic success");
  const stream = session.receipt();
  expect(stream.fragment_count).toBe(2);
  expect(stream.terminal_emitted).toBe(true);
  expect(receipt.expected_requests).toHaveLength(1);

  if (scenario.probe === "mobile-bounded-flow") {
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      viewport: { width: innerWidth, height: innerHeight },
      input: (() => {
        const rect = document.getElementById("chatInput")?.getBoundingClientRect();
        return rect
          ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height }
          : null;
      })(),
      send: (() => {
        const rect = document.getElementById("sendBtn")?.getBoundingClientRect();
        return rect
          ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height }
          : null;
      })(),
    }));
    expect(geometry.viewport).toEqual({ width: 390, height: 844 });
    expect(geometry.overflow).toBe(false);
    for (const control of [geometry.input, geometry.send]) {
      expect(control).not.toBeNull();
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(390);
      expect(control.height).toBeGreaterThanOrEqual(24);
    }
    result.geometry = geometry;
  }

  result.status = "PASS";
  result.request_count = 1;
  result.terminal_count = 1;
  result.loopback_stream = stream;
  result.observed_contract = {
    fragmented_stream: "REPRODUCED",
    ordered_fragments: true,
    duplicate_activation_suppressed:
      scenario.probe === "duplicate-activation" ? true : null,
    terminal_count: 1,
  };
  session.release();
}

async function observeOnboarding(page, scenario, receipt, result) {
  if (scenario.probe === "onboarding-visible") {
    await expect(page.locator("#flWelcomeOverlay")).toBeVisible();
    await expect(page.locator(".fl-welcome-skip")).toBeVisible();
    result.status = "PASS";
    result.notes.push("fresh onboarding and skip control are visible");
    return;
  }

  if (amendmentRetests && scenario.id === "P4-ONB-001C") {
    await page
      .locator("#flWelcomeConnect")
      .getByRole("button", { name: "OpenAI", exact: true })
      .click();
    const input = page.locator("#flWelcomeKeyInput");
    const connect = page.locator("#flWelcomeTestBtn");
    const blockedBefore = receipt.blocked.length;
    await input.fill(invalidConfigurationSentinel);
    await connect.click();
    await expect
      .poll(
        async () => ({
          sentinel_persisted: await page.evaluate(
            (sentinel) => localStorage.getItem("fl_apiKey") === sentinel,
            invalidConfigurationSentinel,
          ),
          request_observed: receipt.blocked.length > blockedBefore,
          connected_visible: await page
            .locator("#flWelcomeConnected")
            .isVisible(),
        }),
        { timeout: 15_000 },
      )
      .toEqual({
        sentinel_persisted: true,
        request_observed: true,
        connected_visible: true,
      });
    const beforeReload = await page.evaluate((sentinel) => ({
      sentinel_persisted: localStorage.getItem("fl_apiKey") === sentinel,
      provider_key_present: localStorage.getItem("fl_provider") !== null,
    }), invalidConfigurationSentinel);
    await page.getByRole("button", { name: /Got it.*start chatting/i }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    const afterReload = {
      onboarding_visible: await page.locator("#flWelcomeOverlay").isVisible(),
      key_input_visible: await input.isVisible(),
    };
    expect(beforeReload.sentinel_persisted).toBe(true);
    expect(beforeReload.provider_key_present).toBe(true);
    expect(afterReload.onboarding_visible).toBe(false);
    result.status = "PASS";
    result.observed_contract = {
      invalid_configuration: "PERSISTED_AND_FAIL_OPEN_AFTER_TIMEOUT",
      sentinel_persisted_in_disposable_profile: true,
      provider_request_blocked_before_transmission: true,
      connected_ui_visible_after_failed_probe: true,
      onboarding_visible_after_reload: afterReload.onboarding_visible,
    };
    result.notes.push(
      "synthetic invalid configuration persisted only in the disposable profile and suppressed onboarding after reload; no sentinel value was promoted",
    );
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

async function observeTimeoutAbsence(page, scenario, receipt, result) {
  await configureProvider(page, scenario);
  const assistantBefore = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  await page.locator("#chatInput").fill("P4 synthetic timeout absence probe");
  await page.locator("#sendBtn").click();
  await expect
    .poll(() => receipt.expected_requests.length, { timeout: 12_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => receipt.timeout_observation?.harness_abort_monotonic_ms, {
      timeout: 12_000,
    })
    .not.toBeNull();
  const assistantAfter = await page
    .locator("#chatMessages .chat-message.assistant")
    .count();
  const timeout = receipt.timeout_observation;
  expect(timeout?.hold_ms).toBe(750);
  expect(timeout?.pending_at_horizon).toBe(true);
  expect(timeout?.harness_abort_monotonic_ms).toBeGreaterThan(
    timeout?.request_started_monotonic_ms,
  );
  expect(assistantAfter).toBe(assistantBefore);
  result.status = "PASS";
  result.terminal_count = 0;
  result.observed_contract = {
    application_timeout: "ABSENT",
    pending_window_ms: timeout.hold_ms,
    terminal_before_harness_abort: false,
    harness_abort_only: true,
  };
  result.notes.push(
    "the exact primary request remained pending until the harness aborted it; this records timeout-contract absence, not timeout success",
  );
}

async function observeWarmOfflineFailure(page, context, result) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  let reloadError = null;
  try {
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 12_000 });
  } catch (error) {
    reloadError = String(error);
  } finally {
    await context.setOffline(false);
  }
  const finalUrl = page.url();
  const observedFailure =
    Boolean(reloadError) || finalUrl.startsWith("chrome-error://chromewebdata/");
  expect(observedFailure).toBe(true);
  expect(`${reloadError ?? ""} ${finalUrl}`).toMatch(
    /ERR_INTERNET_DISCONNECTED|chrome-error:/i,
  );
  result.status = "PASS";
  result.observed_contract = {
    offline_recovery: "ABSENT",
    reload_failure: "ERR_INTERNET_DISCONNECTED_OR_CHROME_ERROR",
    final_url_class: finalUrl.startsWith("chrome-error://")
      ? "chrome-error"
      : "baseline-url",
  };
  result.notes.push(
    "warm offline reload reproduced the baseline navigation failure; this is an absence-of-recovery observation, not recovery success",
  );
  await page.goto("/docs/app.html", { waitUntil: "domcontentloaded" });
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
  if (amendmentRetests) {
    const input = page.locator("#chatInput");
    const send = page.locator("#sendBtn");
    let observedContract;
    if (scenario.probe === "keyboard-focus-name-live-region") {
      await input.focus();
      await page.keyboard.press("Shift+Tab");
      const previousFocus = await page.evaluate(() => document.activeElement?.id ?? null);
      await page.keyboard.press("Tab");
      const inputFocused = await page.evaluate(() => document.activeElement?.id === "chatInput");
      const inputFocusVisible = await input.evaluate((element) =>
        element.matches(":focus-visible"),
      );
      await page.keyboard.press("Tab");
      const nextFocus = await page.evaluate(() => document.activeElement?.id ?? null);
      expect(previousFocus).toBe("chatDriveBtn");
      expect(inputFocused).toBe(true);
      expect(inputFocusVisible).toBe(true);
      expect(nextFocus).toBe("sendBtn");
      expect(semantics.input_label).toBeNull();
      expect(semantics.live_regions).toBe(0);
      observedContract = {
        focus_order: [previousFocus, "chatInput", nextFocus],
        input_label: "ABSENT",
        live_region: "ABSENT",
        send_name: semantics.send_name,
      };
    } else if (scenario.probe === "forced-colors") {
      const forcedColors = await page.evaluate(() => ({
        active: matchMedia("(forced-colors: active)").matches,
        input: (() => {
          const style = getComputedStyle(document.getElementById("chatInput"));
          return { forced_color_adjust: style.forcedColorAdjust, color: style.color, background: style.backgroundColor };
        })(),
        send: (() => {
          const style = getComputedStyle(document.getElementById("sendBtn"));
          return { forced_color_adjust: style.forcedColorAdjust, color: style.color, background: style.backgroundColor };
        })(),
      }));
      expect(forcedColors.active).toBe(true);
      expect(await input.isVisible()).toBe(true);
      expect(await send.isVisible()).toBe(true);
      expect(forcedColors.input.forced_color_adjust).not.toBe("none");
      expect(forcedColors.send.forced_color_adjust).not.toBe("none");
      observedContract = { forced_colors: "ACTIVE", controls: forcedColors };
    } else {
      const reducedMotion = await page.evaluate(() => {
        const hasRule = (rules) => Array.from(rules ?? []).some((rule) => {
          if (rule.media?.mediaText?.includes("prefers-reduced-motion: reduce")) return true;
          try { return hasRule(rule.cssRules); } catch { return false; }
        });
        return {
          active: matchMedia("(prefers-reduced-motion: reduce)").matches,
          css_rule_present: Array.from(document.styleSheets).some((sheet) => {
            try { return hasRule(sheet.cssRules); } catch { return false; }
          }),
          input_animation_duration: getComputedStyle(document.getElementById("chatInput")).animationDuration,
          input_transition_duration: getComputedStyle(document.getElementById("chatInput")).transitionDuration,
        };
      });
      expect(reducedMotion.active).toBe(true);
      expect(reducedMotion.css_rule_present).toBe(true);
      expect(await input.isVisible()).toBe(true);
      expect(await send.isVisible()).toBe(true);
      observedContract = { reduced_motion: "ACTIVE", controls: reducedMotion };
    }
    result.status = "PASS";
    result.observed_contract = observedContract;
    result.notes.push("bounded accessibility mode observation completed with explicit absence fields where the baseline lacks semantics");
    return;
  }
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
      receipt = await installPhase4Capture(context, scenario, {
        loopbackFixture: loopbackRetests ? loopbackFixture : null,
      });
      const page = context.pages()[0] ?? (await context.newPage());
      await openFreshBaseline(page);

      if (loopbackRetests) {
        if (scenario.id === "P4-RESP-001A") {
          await page.setViewportSize({ width: 390, height: 844 });
        }
        await observeLoopbackStream(page, scenario, receipt, result);
      } else if (scenario.group_id === "P4-ONB-001") {
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
      } else if (amendmentRetests && scenario.id === "P4-DEG-001A") {
        await observeWarmOfflineFailure(page, context, result);
      } else if (amendmentRetests && scenario.id === "P4-CHAT-008A") {
        await observeTimeoutAbsence(page, scenario, receipt, result);
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
