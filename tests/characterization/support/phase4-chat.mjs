import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "@playwright/test";

const supportRoot = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.resolve(
  supportRoot,
  "..",
  "fixtures",
  "phase4-chat-contract.json",
);

export const phase4Contract = JSON.parse(
  fs.readFileSync(contractPath, "utf8"),
);

const amendmentRetests = process.env.LATTICEWORK_PHASE4_AMENDMENT_RETESTS === "1";
const loopbackRetests =
  process.env.LATTICEWORK_PHASE4_LOOPBACK_RETESTS === "1";
const amendmentRetestIds = new Set([
  "P4-A11Y-001A",
  "P4-A11Y-001B",
  "P4-A11Y-001C",
  "P4-CHAT-008A",
  "P4-DEG-001A",
  "P4-ONB-001C",
]);
const loopbackRetestIds = new Set([
  "P4-CHAT-001A",
  "P4-CHAT-003B",
  "P4-CHAT-010A",
  "P4-CHAT-010B",
  "P4-RESP-001A",
]);
const requestedSubcaseIds = process.env.LATTICEWORK_PHASE4_SUBCASES
  ? process.env.LATTICEWORK_PHASE4_SUBCASES.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  : null;
const allPhase4Subcases = phase4Contract.groups.flatMap((group) =>
  group.subcases.map((subcase) => ({
    ...subcase,
    group_id: group.id,
  })),
);
if (amendmentRetests) {
  if (!requestedSubcaseIds) {
    throw new Error("LATTICEWORK_PHASE4_AMENDMENT_RETESTS=1 requires LATTICEWORK_PHASE4_SUBCASES");
  }
  const requested = new Set(requestedSubcaseIds);
  if (
    requested.size !== amendmentRetestIds.size ||
    [...requested].some((id) => !amendmentRetestIds.has(id))
  ) {
    throw new Error("Phase 4 amendment retests require the exact approved six-subcase allowlist");
  }
}
if (loopbackRetests) {
  if (!requestedSubcaseIds) {
    throw new Error(
      "LATTICEWORK_PHASE4_LOOPBACK_RETESTS=1 requires LATTICEWORK_PHASE4_SUBCASES",
    );
  }
  const requested = new Set(requestedSubcaseIds);
  if (
    requested.size !== loopbackRetestIds.size ||
    [...requested].some((id) => !loopbackRetestIds.has(id))
  ) {
    throw new Error(
      "Phase 4 loopback retests require the exact approved five-subcase allowlist",
    );
  }
}
if (amendmentRetests && loopbackRetests) {
  throw new Error("Phase 4 existing-harness and loopback retest modes are separate.");
}
if (
  requestedSubcaseIds &&
  (new Set(requestedSubcaseIds).size !== requestedSubcaseIds.length ||
    requestedSubcaseIds.some((id) => !allPhase4Subcases.some((scenario) => scenario.id === id)))
) {
  throw new Error("LATTICEWORK_PHASE4_SUBCASES must contain unique exact Phase 4 subcase IDs");
}
export const phase4Subcases = requestedSubcaseIds
  ? allPhase4Subcases.filter((scenario) => requestedSubcaseIds.includes(scenario.id))
  : allPhase4Subcases;

const baseURL =
  process.env.LATTICEWORK_CHARACTERIZATION_BASE_URL ??
  "http://127.0.0.1:4174";
const allowedOrigin = new URL(baseURL).origin;
const privateSentinels = [
  "P4_SYNTHETIC_DRAFT_DO_NOT_EXPORT",
  "P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT",
  "P4_SYNTHETIC_RESPONSE_DO_NOT_EXPORT",
  "P4_SYNTHETIC_CREDENTIAL_DO_NOT_EXPORT",
  "P4_SYNTHETIC_INVALID_CONFIG_DO_NOT_EXPORT",
];

function sanitizeUrl(raw) {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function headerNames(request) {
  return Object.keys(request.headers()).map((name) => name.toLowerCase()).sort();
}

function payloadShape(request) {
  try {
    const body = request.postDataJSON();
    return {
      keys: Object.keys(body ?? {}).sort(),
      message_count: Array.isArray(body?.messages) ? body.messages.length : 0,
      roles: Array.isArray(body?.messages)
        ? body.messages.map((message) => String(message?.role ?? "unknown"))
        : [],
      stream: body?.stream === true,
      model_present: typeof body?.model === "string" && body.model.length > 0,
    };
  } catch {
    return {
      keys: [],
      message_count: 0,
      roles: [],
      stream: false,
      model_present: false,
    };
  }
}

function openAiDelta(content) {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content } }],
  })}\n\n`;
}

function responseForProbe(probe, request) {
  let body;
  try {
    body = request.postDataJSON();
  } catch {
    body = {};
  }

  if (body?.stream !== true) {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: "hello" } }],
      }),
    };
  }

  if (probe === "http-429") {
    return {
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "synthetic rate limit" } }),
    };
  }
  if (probe === "context-limit") {
    return {
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "synthetic context limit" } }),
    };
  }
  if (probe === "http-401") {
    return {
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "synthetic auth failure" } }),
    };
  }
  if (probe === "policy-refusal") {
    return {
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "synthetic policy refusal" } }),
    };
  }
  if (probe === "malformed-fragment") {
    return {
      status: 200,
      contentType: "text/event-stream",
      body: "data: {not-json}\n\ndata: [DONE]\n\n",
    };
  }
  if (probe === "empty-success") {
    return {
      status: 200,
      contentType: "text/event-stream",
      body: "data: [DONE]\n\n",
    };
  }
  if (probe === "missing-terminal") {
    return {
      status: 200,
      contentType: "text/event-stream",
      body: openAiDelta("P4 synthetic missing terminal"),
    };
  }
  if (probe === "duplicate-terminal") {
    return {
      status: 200,
      contentType: "text/event-stream",
      body: `${openAiDelta("P4 synthetic duplicate terminal")}data: [DONE]\n\ndata: [DONE]\n\n`,
    };
  }
  if (probe === "out-of-order-fragments") {
    return {
      status: 200,
      contentType: "text/event-stream",
      body: `${openAiDelta("second")}${openAiDelta("first")}data: [DONE]\n\n`,
    };
  }

  return {
    status: 200,
    contentType: "text/event-stream",
    body: `${openAiDelta("P4 synthetic ")}${openAiDelta("success")}data: [DONE]\n\n`,
  };
}

export async function installPhase4Capture(
  context,
  scenario,
  { loopbackFixture = null } = {},
) {
  const loopbackTarget = loopbackFixture?.endpoint ?? null;
  const loopbackOrigin = loopbackTarget ? new URL(loopbackTarget).origin : null;
  const receipt = {
    allowed_origin: allowedOrigin,
    expected_target:
      scenario.provider
        ? loopbackTarget ??
          phase4Contract.providers[scenario.provider].target
        : null,
    expected_requests: [],
    fixture_probes: [],
    blocked: [],
    blocked_websockets: [],
    console: [],
  };

  context.on("page", (page) => {
    page.on("console", (message) => {
      if (!["warning", "error"].includes(message.type())) return;
      receipt.console.push({
        type: message.type(),
        text_class: "redacted-console-message",
        bytes: Buffer.byteLength(message.text(), "utf8"),
      });
    });
  });

  await context.routeWebSocket(/.*/, async (route) => {
    receipt.blocked_websockets.push({ url: sanitizeUrl(route.url()) });
    await route.close({
      code: 1008,
      reason: "blocked by Phase 4 characterization",
    });
  });

  await context.route("**/*", async (route) => {
    const request = route.request();
    const rawUrl = request.url();
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      await route.abort("blockedbyclient");
      return;
    }

    if (url.origin === allowedOrigin) {
      await route.continue();
      return;
    }

    const expected = receipt.expected_target;
    if (expected && rawUrl === expected) {
      receipt.expected_requests.push({
        method: request.method(),
        url: sanitizeUrl(rawUrl),
        header_names: headerNames(request),
        payload_shape: payloadShape(request),
      });
      if (loopbackTarget) {
        if (url.origin !== loopbackOrigin || request.method() !== "POST") {
          receipt.blocked.push({
            method: request.method(),
            url: sanitizeUrl(rawUrl),
            resource_type: request.resourceType(),
          });
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue({
          headers: {
            ...request.headers(),
            "x-latticework-phase4-fixture-id": loopbackFixture.fixtureId,
          },
        });
        return;
      }
      if (scenario.probe === "timeout") {
        const amendmentTimeoutHold =
          process.env.LATTICEWORK_PHASE4_AMENDMENT_RETESTS === "1";
        const holdMs = 750;
        receipt.fixture_probes.push({
          status: 0,
          content_type: amendmentTimeoutHold
            ? "synthetic-timeout-hold"
            : "synthetic-timeout-abort",
        });
        if (amendmentTimeoutHold) {
          receipt.timeout_observation = {
            hold_ms: holdMs,
            request_started_monotonic_ms: Number(process.hrtime.bigint() / 1_000_000n),
            pending_at_horizon: false,
            harness_abort_monotonic_ms: null,
          };
          await new Promise((resolve) => setTimeout(resolve, holdMs));
          receipt.timeout_observation.pending_at_horizon = true;
          receipt.timeout_observation.harness_abort_monotonic_ms = Number(
            process.hrtime.bigint() / 1_000_000n,
          );
        }
        await route.abort("timedout");
        return;
      }
      if (scenario.probe === "network-abort") {
        receipt.fixture_probes.push({
          status: 0,
          content_type: "synthetic-network-abort",
        });
        await route.abort("connectionrefused");
        return;
      }
      const fixture = responseForProbe(scenario.probe, request);
      receipt.fixture_probes.push({
        status: fixture.status,
        content_type: fixture.contentType,
        emitted_delta: /"delta"\s*:/u.test(fixture.body ?? ""),
        terminal_markers: (fixture.body?.match(/data:\s*\[DONE\]/gu) ?? [])
          .length,
      });
      await route.fulfill(fixture);
      return;
    }

    if (
      url.origin === "http://localhost:11434" &&
      url.pathname === "/api/tags"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          models: [
            {
              name: phase4Contract.providers["P4-PRV-OLLAMA"].model,
            },
          ],
        }),
      });
      return;
    }

    receipt.blocked.push({
      method: request.method(),
      url: sanitizeUrl(rawUrl),
      resource_type: request.resourceType(),
    });
    await route.abort("blockedbyclient");
  });

  return receipt;
}

export async function openFreshBaseline(page) {
  await page.goto("/docs/app.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#flWelcomeOverlay")).toBeVisible({
    timeout: 15_000,
  });
}

export async function dismissWelcomeToChat(page) {
  await page.locator(".fl-welcome-skip").click();
  await expect(page.locator("#flWelcomeOverlay")).toBeHidden();
  await page.locator('button[data-tab="chat"]').click();
  await expect(page.locator("#tab-chat")).toHaveClass(
    /(?:^|\s)active(?:\s|$)/,
  );
}

export async function configureCloudThroughWelcome(page) {
  await page
    .locator("#flWelcomeConnect")
    .getByRole("button", { name: "OpenAI", exact: true })
    .click();
  await page
    .locator("#flWelcomeKeyInput")
    .fill("P4_SYNTHETIC_CREDENTIAL_DO_NOT_EXPORT");
  await page.locator("#flWelcomeTestBtn").click();
  await expect(
    page.getByRole("button", { name: /Got it.*start chatting/i }),
  ).toBeVisible({ timeout: 12_000 });
  await page.getByRole("button", { name: /Got it.*start chatting/i }).click();
  await expect(page.locator("#tab-chat")).toHaveClass(
    /(?:^|\s)active(?:\s|$)/,
  );
}

export async function configureLocalThroughWelcome(page) {
  await page
    .locator("#flWelcomeConnect")
    .getByRole("button", { name: /^Ollama\b/i })
    .click();
  await expect(page.locator("#flWelcomeOverlay")).toBeHidden();
  const localAction = page
    .getByRole("button", {
      name: /start exploring|use ollama|connect.*ollama|use local|connect local/i,
    })
    .first();
  if (await localAction.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await localAction.click();
  }
  await expect
    .poll(() =>
      page.evaluate(() => ({
        local: localStorage.getItem("fl_isLocal"),
        provider: localStorage.getItem("fl_provider"),
      })),
    )
    .toEqual({ local: "true", provider: "ollama" });
  await page.evaluate(() => window.switchTab?.("chat"));
  await expect(page.locator("#tab-chat")).toHaveClass(
    /(?:^|\s)active(?:\s|$)/,
  );
}

export async function configureLoopbackLocalProvider(page, endpoint) {
  const parsed = new URL(endpoint);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/v1/chat/completions" ||
    !parsed.port
  ) {
    throw new Error("Loopback provider endpoint is outside the approved fixture.");
  }
  await page.evaluate(
    ({ endpointValue, model }) => {
      window.__latticeworkPhase4Endpoint = endpointValue;
      window.__latticeworkPhase4Model = model;
      window.eval(
        "PROVIDERS.ollama.url = window.__latticeworkPhase4Endpoint;" +
          "state.ollamaModel = window.__latticeworkPhase4Model;",
      );
      delete window.__latticeworkPhase4Endpoint;
      delete window.__latticeworkPhase4Model;
      const input = document.getElementById("ollamaModel");
      if (input) input.value = model;
    },
    {
      endpointValue: endpoint,
      model: "latticework-synthetic-local",
    },
  );
}

export async function captureStorageProjection(page) {
  return page.evaluate(async () => {
    const databases =
      typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : [];
    const rows = [];
    for (const metadata of databases) {
      if (!metadata.name) continue;
      rows.push(
        await new Promise((resolve) => {
          const request = indexedDB.open(metadata.name);
          request.onerror = () =>
            resolve({
              name: metadata.name,
              version: metadata.version ?? null,
              stores: [],
            });
          request.onsuccess = () => {
            const database = request.result;
            const stores = Array.from(database.objectStoreNames).sort();
            const row = {
              name: database.name,
              version: database.version,
              stores,
            };
            database.close();
            resolve(row);
          };
        }),
      );
    }
    return {
      databases: rows.sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      local_storage_keys: Object.keys(localStorage).sort(),
      session_storage_keys: Object.keys(sessionStorage).sort(),
    };
  });
}

export async function attachScenarioResult(testInfo, result) {
  await testInfo.attach("scenario-result.json", {
    body: Buffer.from(`${JSON.stringify(result, null, 2)}\n`, "utf8"),
    contentType: "application/json",
  });
}

export function newScenarioResult(scenario, testInfo) {
  return {
    schema: "latticework.phase4.atomic-result.v1",
    group_id: scenario.group_id,
    subcase_id: scenario.id,
    probe: scenario.probe,
    provider: scenario.provider ?? null,
    status: "UNKNOWN",
    evidence_label: "OBSERVED",
    profile_id: `${process.env.LATTICEWORK_PHASE4_RUN_ID ?? "manual"}:${scenario.id}:${testInfo.workerIndex}`,
    fresh_profile: true,
    notes: [],
    request_count: 0,
    blocked_count: 0,
    terminal_count: null,
    operation: {
      post_delta_retry: false,
      duplicate_terminal: false,
    },
    cleanup_status: "playwright-context-owned",
  };
}

export function privateSentinelLeak(value) {
  const serialized = JSON.stringify(value);
  return privateSentinels.find((sentinel) => serialized.includes(sentinel)) ??
    null;
}
