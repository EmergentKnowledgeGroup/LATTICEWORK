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

export const phase4Subcases = phase4Contract.groups.flatMap((group) =>
  group.subcases.map((subcase) => ({
    ...subcase,
    group_id: group.id,
  })),
);

const baseURL =
  process.env.LATTICEWORK_CHARACTERIZATION_BASE_URL ??
  "http://127.0.0.1:4174";
const allowedOrigin = new URL(baseURL).origin;
const privateSentinels = [
  "P4_SYNTHETIC_DRAFT_DO_NOT_EXPORT",
  "P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT",
  "P4_SYNTHETIC_RESPONSE_DO_NOT_EXPORT",
  "P4_SYNTHETIC_CREDENTIAL_DO_NOT_EXPORT",
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

export async function installPhase4Capture(context, scenario) {
  const receipt = {
    allowed_origin: allowedOrigin,
    expected_target:
      scenario.provider
        ? phase4Contract.providers[scenario.provider].target
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
      if (scenario.probe === "timeout") {
        receipt.fixture_probes.push({
          status: 0,
          content_type: "synthetic-timeout-abort",
        });
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
