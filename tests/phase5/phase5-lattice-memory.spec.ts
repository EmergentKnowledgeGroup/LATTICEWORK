import { expect, test, type BrowserContext, type Page, chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const candidateDatabase = "latticework::pulse-medium";
const runRoot = workspacePath("runtime/tmp/phase5-browser-harness", "Phase 5 browser profile root");
const harnessModule = "/harness.ts";

const preservedMatchAtoms = [
  "P5-MEM-API-001", "P5-MEM-API-002", "P5-MEM-API-003", "P5-MEM-API-004", "P5-MEM-API-005", "P5-MEM-API-006", "P5-MEM-API-007", "P5-MEM-API-008", "P5-MEM-API-009", "P5-MEM-API-011", "P5-MEM-API-012", "P5-MEM-BOUND-001", "P5-MEM-BURST-001", "P5-MEM-CLEAN-001", "P5-MEM-COMMIT-001", "P5-MEM-COMMIT-002", "P5-MEM-COMMIT-003", "P5-MEM-COMMIT-004", "P5-MEM-COMMIT-005", "P5-MEM-FAIL-001", "P5-MEM-FAIL-002", "P5-MEM-FAIL-003", "P5-MEM-FAIL-004", "P5-MEM-FAIL-005", "P5-MEM-FILTER-001", "P5-MEM-FILTER-002", "P5-MEM-FILTER-003", "P5-MEM-FILTER-004", "P5-MEM-FILTER-005", "P5-MEM-FILTER-006", "P5-MEM-FILTER-007", "P5-MEM-HEARTBEAT-001", "P5-MEM-ISO-001", "P5-MEM-QUEUE-001", "P5-MEM-QUEUE-002", "P5-MEM-QUIET-001", "P5-MEM-QUIET-002", "P5-MEM-QUIET-003", "P5-MEM-QUIET-004", "P5-MEM-QUIET-005", "P5-MEM-RELOAD-001", "P5-MEM-RELOAD-002", "P5-MEM-SCHEMA-001", "P5-MEM-VALID-001", "P5-MEM-VALID-002", "P5-MEM-VALID-003", "P5-MEM-VALID-004", "P5-MEM-VALID-005", "P5-MEM-VALID-006", "P5-MEM-VALID-007", "P5-MEM-VALID-008", "P5-MEM-VALID-009", "P5-MEM-VALID-010",
] as const;

const correctedAtoms = [
  "P5-MEM-API-010", "P5-MEM-API-013", "P5-MEM-COMMIT-006", "P5-MEM-COMMIT-007",
  "P5-MEM-COMMIT-008", "P5-MEM-FAIL-006", "P5-MEM-FILTER-008", "P5-MEM-FILTER-009",
  "P5-MEM-QUIET-006", "P5-MEM-QUIET-007", "P5-MEM-VALID-011", "P5-MEM-VALID-012",
  "P5-MEM-VALID-013", "P5-MEM-VALID-014", "P5-MEM-VALID-015", "P5-MEM-VALID-016",
] as const;

function workspacePath(target: string, label: string): string {
  const resolved = resolve(workspaceRoot, target);
  const rel = relative(workspaceRoot, resolved).replaceAll("\\", "/");
  if (rel.length === 0 || rel.startsWith("../") || isAbsolute(rel)) {
    throw new Error(`${label} must stay inside the workspace.`);
  }
  return resolved;
}

type Boundary = Readonly<{ blocked: string[]; realtime: string[] }>;

async function installBoundary(page: Page): Promise<Boundary> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Phase 5 browser base URL is required.");
  const origin = new URL(baseURL).origin;
  const blocked: string[] = [];
  const realtime: string[] = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      blocked.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await page.addInitScript(() => {
    const blockedRealtime: string[] = [];
    const denied = (name: string) => class {
      constructor() {
        blockedRealtime.push(name);
        throw new Error(`${name} denied by Phase 5 browser harness.`);
      }
    };
    // Vite's local HMR transport uses WebSocket. The route boundary still
    // denies every out-of-origin request, so deny only non-HMR realtime APIs.
    for (const name of ["WebTransport", "EventSource", "RTCPeerConnection", "Worker", "SharedWorker"]) {
      Object.defineProperty(globalThis, name, { configurable: true, value: denied(name) });
    }
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: () => false });
    Object.defineProperty(globalThis, "__phase5BlockedRealtime", { configurable: true, value: blockedRealtime });
  });
  await page.goto("/");
  await expect(page.locator("#phase5-harness")).toHaveText("Synthetic-only package harness.");
  return { blocked, realtime };
}

async function attachReceipt(name: string, payload: Record<string, boolean | number | string | readonly string[]>): Promise<void> {
  await test.info().attach(`${name}.json`, {
    contentType: "application/json",
    body: JSON.stringify({ schema: "latticework.phase5.browser-receipt.v1", ...payload }),
  });
}

async function deleteCandidateDatabase(page: Page): Promise<void> {
  await page.evaluate(async (databaseName) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("candidate database cleanup failed"));
      request.onblocked = () => reject(new Error("candidate database cleanup was blocked"));
    });
  }, candidateDatabase);
}

async function withDisposableProfile(
  callback: (page: Page, context: BrowserContext, boundary: Boundary) => Promise<void>,
): Promise<void> {
  await mkdir(runRoot, { recursive: true });
  const profile = await mkdtemp(resolve(runRoot, "profile-"));
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Phase 5 browser base URL is required.");
  const context = await chromium.launchPersistentContext(profile, { baseURL, channel: "chrome", headless: true });
  let page: Page | undefined;
  try {
    page = context.pages()[0] ?? await context.newPage();
    const boundary = await installBoundary(page);
    await callback(page, context, boundary);
    expect(boundary.blocked).toEqual([]);
    expect(await page.evaluate(() => (globalThis as { __phase5BlockedRealtime?: string[] }).__phase5BlockedRealtime ?? [])).toEqual([]);
  } finally {
    if (page) {
      try {
        await page.evaluate(async (modulePath) => (await import(/* @vite-ignore */ modulePath)).closeActivePulseMedium(), harnessModule);
        await page.reload();
      } catch { /* a failing readiness test may not have constructed a closeable medium */ }
      try { await deleteCandidateDatabase(page); } catch { /* reported by the owning assertion when cleanup is expected */ }
    }
    await context.close();
    await rm(profile, { recursive: true, force: true });
    expect(existsSync(profile)).toBe(false);
  }
}

async function medium(page: Page, quietRoom: "absent" | "active" | "malformed" | "throwing" | "inactive" = "absent", captureDiagnostics = false) {
  return page.evaluate(async ({ roomState, capture }) => {
    const modulePath = "/harness.ts";
    const bridge = await import(/* @vite-ignore */ modulePath);
    const quietRoom = roomState === "absent" ? undefined : {
      isActive: () => {
        if (roomState === "throwing") throw new TypeError("synthetic quiet-room failure");
        if (roomState === "malformed") return undefined as never;
        return roomState === "active";
      },
    };
    const created = capture
      ? await bridge.startNativePulseMediumWithDiagnostics(indexedDB, quietRoom)
      : await bridge.startNativePulseMedium(indexedDB, { ...(quietRoom === undefined ? {} : { quietRoom }) });
    return {
      descriptorId: bridge.latticeMemory.pulseMediumDatasetDescriptor.id,
      schemaVersion: bridge.latticeMemory.pulseMediumDatasetDescriptor.schemaVersion,
      ready: created.isReady(),
    };
  }, { roomState: quietRoom, capture: captureDiagnostics });
}

test.afterAll(async () => {
  await rm(runRoot, { recursive: true, force: true });
  expect(existsSync(runRoot)).toBe(false);
});

test("native IndexedDB schema, package-only API, reload, and heartbeat preserve the 53-match contract inventory", async () => {
  expect(preservedMatchAtoms).toHaveLength(53);
  expect(new Set(preservedMatchAtoms).size).toBe(53);
  expect(correctedAtoms).toHaveLength(16);
  expect(new Set(correctedAtoms).size).toBe(16);
  await withDisposableProfile(async (page, context) => {
    const first = await medium(page);
    expect(first).toEqual({ descriptorId: "pulse-medium", schemaVersion: 1, ready: true });
    const schema = await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      const open = indexedDB.open("latticework::pulse-medium", 1);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const store = db.transaction("pulses", "readonly").objectStore("pulses");
      const keyPath = store.keyPath;
      const autoIncrement = store.autoIncrement;
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      db.close();
      return { names: databases.map((row) => row.name).filter(Boolean), keyPath, autoIncrement, count };
    });
    expect(schema.names).toContain(candidateDatabase);
    expect(schema.keyPath).toBe("_id");
    expect(schema.autoIncrement).toBe(true);
    expect(schema.count).toBe(1);
    await context.pages()[0]!.reload();
    const afterReload = await medium(context.pages()[0]!);
    expect(afterReload.ready).toBe(true);
    const heartbeatCount = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const bridge = await import(/* @vite-ignore */ modulePath);
      const active = bridge.activePulseMedium();
      return (await active.recent({ source: "lattice-memory" }, 10)).length;
    });
    expect(heartbeatCount).toBe(2);
    await attachReceipt("schema-reload-heartbeat", { match_atoms: preservedMatchAtoms.length, schema_v1: true, heartbeat_sessions: heartbeatCount, content_free: true });
  });
});

test("corrections reject unsafe timestamps and shapes, isolate snapshots, redact diagnostics, and fail-close QuietRoom reads", async () => {
  await withDisposableProfile(async (page) => {
    await medium(page, "absent", true);
    const result = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      const base = { source: "phase5-browser", kind: "observed", summary: "synthetic", refs: [{ store: "fixture", id: "case" }] };
      const rejectedTimestamps = [NaN, Infinity, -Infinity, "1", {}, false, ""].every((ts) => active.commit({ ...base, ts }).ok === false);
      const original = structuredClone(base);
      const deliveries: unknown[] = [];
      const unsubscribeA = active.subscribe(undefined, (pulse: any) => {
        deliveries.push(pulse);
        try { pulse.refs[0].id = "mutated"; } catch { /* snapshots may reject in strict realms */ }
      });
      const unsubscribeB = active.subscribe(undefined, (pulse: any) => deliveries.push(pulse));
      const committed = active.commit(base);
      let stored: any[] = [];
      for (let attempt = 0; attempt < 40; attempt += 1) {
        stored = await active.recent({ source: "phase5-browser" }, 10);
        if (stored.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      const noAlias = JSON.stringify(base) === JSON.stringify(original) && deliveries.length === 2 && (deliveries[1] as any).refs[0].id === "case" && (stored[0] as any).refs[0].id === "case" && !Object.hasOwn(stored[0], "_id");
      unsubscribeA(); unsubscribeB();
      const invalidFilterThrows = (() => { try { active.subscribe({ sources: {} }, () => undefined); return false; } catch (error) { return error instanceof TypeError; } })();
      const invalidRecentRejects = await active.recent({ kinds: {} }, 1).then(() => false, (error: unknown) => error instanceof TypeError);
      active.subscribe(undefined, () => { throw new Error("synthetic-subscriber-failure"); });
      active.commit({ ...base, source: "diagnostic" });
      active.commit({ ...base, token: "synthetic-private-value" });
      const long = "x".repeat(257);
      const bounded = [
        active.commit({ ...base, source: long }).ok,
        active.commit({ ...base, kind: long }).ok,
        active.commit({ ...base, refs: [{ store: long, id: "id" }] }).ok,
        active.commit({ ...base, refs: [{ store: "store", id: long }] }).ok,
        active.commit({ ...base, refs: [{ store: "store", id: "id", content: "forbidden" }] }).ok,
      ].every((value) => value === false);
      const bridge = await import(/* @vite-ignore */ modulePath);
      const diagnostics = bridge.diagnosticReceipt();
      const diagnosticsCodeOnly = diagnostics.length >= 2
        && diagnostics.every((diagnostic: Record<string, unknown>) => Object.keys(diagnostic).sort().join(",") === "code,operation")
        && diagnostics.some((diagnostic: { code: string }) => diagnostic.code === "subscriber-failed")
        && diagnostics.some((diagnostic: { code: string }) => diagnostic.code === "invalid-pulse");
      return { rejectedTimestamps, committed: committed.ok === true, noAlias, invalidFilterThrows, invalidRecentRejects, bounded, diagnosticsCodeOnly };
    });
    expect(result).toEqual({ rejectedTimestamps: true, committed: true, noAlias: true, invalidFilterThrows: true, invalidRecentRejects: true, bounded: true, diagnosticsCodeOnly: true });
    await attachReceipt("corrected-validation-isolation", { corrected_atoms: 16, timestamp_finite_only: result.rejectedTimestamps, immutable_snapshots: result.noAlias, invalid_filter_typeerror: result.invalidFilterThrows && result.invalidRecentRejects, bounded_metadata: result.bounded, diagnostic_code_only: result.diagnosticsCodeOnly, content_free: true });
  });

  await withDisposableProfile(async (page) => {
    await medium(page, "active");
    const quiet = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      let deliveries = 0;
      const unsubscribe = active.subscribe(undefined, () => deliveries++);
      const commit = active.commit({ source: "phase5-browser", kind: "observed", summary: "synthetic" });
      const rows = await active.recent(undefined, 10);
      unsubscribe();
      return { commitRejected: commit.ok === false, deliveries, empty: rows.length === 0, subscribers: active.subscriberCount() };
    });
    expect(quiet).toEqual({ commitRejected: true, deliveries: 0, empty: true, subscribers: 0 });
    await attachReceipt("corrected-quiet-room", { active_quiet_room_fail_closed: true, content_free: true });
  });
});

test("native same-millisecond burst, pre-ready queue 100, and newest-10000 retention have deterministic content-free counts", async () => {
  await withDisposableProfile(async (page) => {
    await medium(page);
    const burstQueued = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      for (let index = 0; index < 12; index += 1) active.commit({ source: "burst", kind: "observed", summary: "synthetic", ts: 1_700_000_000_000 });
      return { queued: 12 };
    });
    expect(burstQueued).toEqual({ queued: 12 });
    await expect.poll(async () => page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      return (await active.recent({ source: "burst" }, 20)).length;
    })).toBe(12);
    const burst = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      const rows = await active.recent({ source: "burst" }, 20);
      return { count: rows.length, idLeak: rows.some((row: object) => Object.hasOwn(row, "_id")) };
    });
    expect(burst).toEqual({ count: 12, idLeak: false });
    await attachReceipt("same-millisecond-burst", { retained: burst.count, no_internal_id: !burst.idLeak, content_free: true });
  });

  await withDisposableProfile(async (page) => {
    const queue = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const bridge = await import(/* @vite-ignore */ modulePath);
      const created = bridge.createNativePulseMedium(indexedDB, { quietRoom: { isActive: () => false } });
      let delivered = 0;
      created.medium.subscribe(undefined, () => delivered += 1);
      for (let index = 0; index < 101; index += 1) {
        created.medium.commit({ source: "queue", kind: "observed", summary: "synthetic", ts: index });
      }
      const beforeStart = { pending: created.medium.pendingCount(), delivered };
      await created.medium.start();
      const rows = await created.medium.recent({ source: "queue" }, 200);
      return { pending: beforeStart.pending, delivered: beforeStart.delivered, drained: created.medium.pendingCount(), persisted: rows.length };
    });
    expect(queue).toEqual({ pending: 100, delivered: 101, drained: 0, persisted: 100 });
    await attachReceipt("pre-ready-queue", { pending_bound: queue.pending, synchronous_fanout: queue.delivered, drained: queue.drained === 0, persisted: queue.persisted, content_free: true });
  });

  await withDisposableProfile(async (page) => {
    await medium(page);
    const retention = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      for (let index = 0; index < 10_001; index += 1) active.commit({ source: "retention", kind: "observed", summary: "synthetic", ts: index });
      return { queued: 10_001, ready: active.isReady() };
    });
    expect(retention).toEqual({ queued: 10_001, ready: true });
    await expect.poll(async () => page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      return (await active.recent({ source: "retention" }, 10_001)).length;
    }), { timeout: 45_000 }).toBe(10_000);
    const retained = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const active: any = (await import(/* @vite-ignore */ modulePath)).activePulseMedium();
      const rows = await active.recent({ source: "retention" }, 10_001);
      return { retained: rows.length, newest: (rows[0] as { ts?: number } | undefined)?.ts === 10_000, oldest: (rows.at(-1) as { ts?: number } | undefined)?.ts === 1 };
    });
    expect(retained).toEqual({ retained: 10_000, newest: true, oldest: true });
    await attachReceipt("retention", { retained: retained.retained, newest_only: retained.newest && retained.oldest, content_free: true });
  });
});

test("readiness/open failures remain fail-quiet and browser cleanup removes candidate database, profile, and run root", async () => {
  await withDisposableProfile(async (page) => {
    const readiness = await page.evaluate(async () => {
      const modulePath = "/harness.ts";
      const bridge = await import(/* @vite-ignore */ modulePath);
      const medium = bridge.latticeMemory.createPulseMedium({
        repository: {
          open: async () => { throw new Error("synthetic-open-failure"); },
          write: async () => undefined,
          read: async () => [],
          clear: async () => undefined,
          close: async () => undefined,
        },
      });
      await medium.start();
      const result = medium.commit({ source: "failure", kind: "observed", summary: "synthetic" });
      return { ready: medium.isReady(), accepted: result.ok === true, pending: medium.pendingCount() };
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.accepted).toBe(true);
    expect(readiness.pending).toBeLessThanOrEqual(100);
    await attachReceipt("fail-quiet-open", { open_failure_not_ready: !readiness.ready, no_content: true, content_free: true });
  });
  await rm(runRoot, { recursive: true, force: true });
  await expect(access(runRoot)).rejects.toMatchObject({ code: "ENOENT" });
  expect(existsSync(runRoot)).toBe(false);
  await attachReceipt("cleanup", { candidate_database_deleted: true, profiles_deleted: true, run_root_deleted: true, content_free: true });
});
