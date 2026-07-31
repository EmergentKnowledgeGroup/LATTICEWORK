import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");

function insideWorkspace(target: string, label: string): string {
  const resolved = resolve(target);
  const rel = relative(workspaceRoot, resolved).replaceAll("\\", "/");
  if (rel.length === 0 || rel.startsWith("../") || isAbsolute(rel)) {
    throw new Error(`${label} must stay inside the workspace.`);
  }
  return resolved;
}

const runRoot = insideWorkspace(
  resolve(workspaceRoot, "runtime/tmp/p4-browser-harness"),
  "Phase 4 browser profile root",
);
const syntheticPrompt = "P4_BROWSER_SYNTHETIC_PROMPT";
const forbiddenDiagnostics = [syntheticPrompt, "P4_BROWSER_SYNTHETIC_RESPONSE"];

type Boundary = {
  readonly blocked: string[];
};

async function preparePage(page: Page): Promise<Boundary> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Phase 4 browser base URL is required.");
  const origin = new URL(baseURL).origin;
  const blocked: string[] = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      blocked.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  return { blocked };
}

async function assertP4Shell(page: Page): Promise<void> {
  await expect(page.locator("[data-testid=p4-shell]")).toBeVisible();
  await expect(page.getByTestId("synthetic-badge")).toBeVisible();
  for (const id of ["provider-select", "conversation-list", "message-list", "chat-input", "send-button", "cancel-button", "diagnostics-toggle", "status"]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
}

async function send(page: Page, provider: "mock-local" | "mock-cloud", prompt = syntheticPrompt): Promise<void> {
  await page.getByTestId("provider-select").selectOption(provider);
  await page.getByTestId("chat-input").fill(prompt);
  await page.getByTestId("send-button").click();
  await expect(page.getByTestId("status")).toContainText(/completed|complete/i);
}

async function withDisposableProfile(
  callback: (page: Page, context: BrowserContext, boundary: Boundary, profile: string) => Promise<void>,
): Promise<void> {
  await mkdir(runRoot, { recursive: true });
  const profile = await mkdtemp(resolve(runRoot, "profile-"));
  const browserType = test.info().project.use.browserName;
  if (browserType !== "chromium") throw new Error("Phase 4 harness is pinned to Chromium.");
  const { chromium } = await import("@playwright/test");
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Phase 4 browser base URL is required.");
  const context = await chromium.launchPersistentContext(profile, {
    baseURL,
    channel: "chrome",
    headless: true,
  });
  let callbackFailed = false;
  try {
    const page = context.pages()[0] ?? await context.newPage();
    const boundary = await preparePage(page);
    await callback(page, context, boundary, profile);
    expect(boundary.blocked).toEqual([]);
  } catch (error) {
    callbackFailed = true;
    throw error;
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
    if (!callbackFailed) expect(existsSync(profile)).toBe(false);
  }
}

test.afterAll(async () => {
  await rm(runRoot, { recursive: true, force: true });
  expect(existsSync(runRoot)).toBe(false);
});

test("/p4.html is visibly synthetic and sends exactly through selected local and cloud mocks", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/p4.html");
    await assertP4Shell(page);
    const emptyContent = await page.getByTestId("message-list").evaluate((element) =>
      getComputedStyle(element, "::before").content
    );
    expect(emptyContent).toContain("Ask the mock, prove the seam.");
    expect(emptyContent).not.toMatch(/^["']L/u);
    await page.getByTestId("chat-input").fill("   ");
    await page.getByTestId("chat-input").press("Control+Enter");
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(0);
    await expect(page.getByTestId("status")).not.toContainText("not ready");
    await expect(page.getByTestId("provider-select")).toHaveValue("mock-local");
    await send(page, "mock-local");
    await send(page, "mock-cloud", "P4_BROWSER_SYNTHETIC_CLOUD_PROMPT");
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(4);
    await page.screenshot({
      path: test.info().outputPath("p4-desktop.png"),
      fullPage: true,
    });
  });
});

test("fragment completion persists only completed assistant output and reload restores the disposable candidate", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/p4.html");
    await send(page, "mock-local", "P4_BROWSER_SYNTHETIC_FRAGMENTED_PROMPT");
    await expect(page.getByTestId("message-list")).toContainText(/synthetic|mock/i);
    await page.reload();
    await assertP4Shell(page);
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(2);
    const databases = await page.evaluate(() => indexedDB.databases());
    expect(databases.map((database) => database.name)).toContain("latticework::conversation");
  });
});

test("cancel works before dispatch and after the first delta without persisting partial assistant text", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/p4.html");
    await page.getByTestId("chat-input").fill("P4_BROWSER_CANCEL_BEFORE_DISPATCH");
    await page.getByTestId("cancel-button").click();
    await expect(page.getByTestId("status")).toContainText(/cancel/i);
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(0);

    await page.getByTestId("chat-input").fill("P4_BROWSER_CANCEL_AFTER_DELTA");
    await page.getByTestId("send-button").click();
    await expect(page.getByTestId("message-list")).toContainText(
      "P4_BROWSER_SYNTHETIC_RESPONSE_PARTIAL",
    );
    await page.getByTestId("cancel-button").click();
    await expect(page.getByTestId("status")).toContainText(/cancel/i);
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(1);
    await expect(page.getByTestId("message-list")).not.toContainText(
      "P4_BROWSER_SYNTHETIC_RESPONSE_PARTIAL",
    );
    await page.reload();
    await expect(page.getByTestId("message-list").locator(":scope > *")).toHaveCount(1);
  });
});

test("conversation snapshot merge replaces the active conversation and preserves unrelated records", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/p4.html");
    const merged = await page.evaluate(async () => {
      const modulePath = "/src/p4-main.ts";
      const { mergeConversationSnapshot } = await import(
        /* @vite-ignore */ modulePath
      ) as {
        mergeConversationSnapshot(
          existing: Record<string, unknown>,
          state: Record<string, unknown>,
        ): {
          conversations: Array<{ key: string }>;
          messages: Array<{ key: string }>;
        };
      };
      return mergeConversationSnapshot(
        {
          descriptorId: "conversation",
          schemaVersion: 1,
          conversations: [
            { key: "other", projection: { id: "other" }, sourceValue: { id: "other" } },
            { key: "active", projection: { id: "active" }, sourceValue: { id: "active" } },
          ],
          messages: [
            {
              key: "other-message",
              projection: {
                id: "other-message",
                conversationId: "other",
                role: "user",
                createdAt: "2026-07-31T00:00:00.000Z",
              },
              sourceValue: { id: "other-message", conversationId: "other" },
            },
            {
              key: "stale",
              projection: {
                id: "stale",
                conversationId: "active",
                role: "assistant",
                createdAt: "2026-07-31T00:00:01.000Z",
              },
              sourceValue: { id: "stale", conversationId: "active" },
            },
          ],
        },
        {
          conversationId: "active",
          messages: [{
            id: "fresh",
            operationId: "operation",
            role: "user",
            content: "synthetic",
            createdAt: "2026-07-31T00:00:02.000Z",
          }],
        },
      );
    });
    expect(merged.conversations.map((record) => record.key).sort()).toEqual(["active", "other"]);
    expect(merged.messages.map((record) => record.key).sort()).toEqual(["fresh", "other-message"]);
  });
});

test("diagnostics are structured and do not expose synthetic message content", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/p4.html");
    await send(page, "mock-cloud");
    await page.getByTestId("diagnostics-toggle").click();
    const diagnostics = page.getByTestId("diagnostics-panel");
    await expect(diagnostics).toBeVisible();
    await expect(diagnostics).toContainText(/operation|attempt|adapter|trust|terminal/i);
    const contents = await diagnostics.innerText();
    for (const forbidden of forbiddenDiagnostics) expect(contents).not.toContain(forbidden);
  });
});

test("keyboard, 390x844, forced colors, and reduced motion keep the bounded shell usable", async () => {
  await withDisposableProfile(async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/p4.html");
    await assertP4Shell(page);
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("provider-select")).toBeFocused();
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("p4-mobile-forced-colors.png"),
      fullPage: true,
    });
  });
});

test("warm offline reload is verified only when the candidate explicitly declares offline support", async () => {
  await withDisposableProfile(async (page, context) => {
    await page.goto("/p4.html");
    const supported = await page.locator("[data-testid=p4-shell]").getAttribute("data-p4-offline-capable");
    test.skip(supported !== "true", "Candidate does not declare an offline contract.");
    await send(page, "mock-local", "P4_BROWSER_OFFLINE_WARM_PROMPT");
    await context.setOffline(true);
    await page.reload();
    await assertP4Shell(page);
    await expect(page.getByTestId("message-list")).toContainText(/offline|synthetic|mock/i);
  });
});

test("the default route remains separate from the non-default P4 entry", async () => {
  await withDisposableProfile(async (page) => {
    await page.goto("/");
    await expect(page.locator("[data-testid=p4-shell]")).toHaveCount(0);
  });
});
