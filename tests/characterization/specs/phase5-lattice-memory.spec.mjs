import path from "node:path";
import { mkdir, rm, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";
import contract from "../fixtures/phase5-lattice-memory-contract.json" with { type: "json" };
import {
  attachAtomic,
  closeScenario,
  dispositionFor,
  loadLegacyModule,
  navigateHarness,
  openScenario,
  repositoryRoot,
  startStaticBaselineFixture,
  storageProjection
} from "../support/phase5-lattice-memory.mjs";

const runId = process.env.LATTICEWORK_P5_RUN_ID ?? `manual-${process.pid}`;
const runRoot = path.join(repositoryRoot, "runtime", "tmp", "phase5-lattice-memory", runId);
let fixture;

function validPulse(suffix = "a") {
  return { source: `p5-${suffix}`, kind: "observed", summary: "synthetic classification", refs: [{ store: "synthetic", id: `r-${suffix}` }] };
}

async function settle(page, milliseconds = 90) {
  await page.waitForTimeout(milliseconds);
}

async function runGroup(testInfo, groupId, callback, options = {}) {
  const group = contract.groups.find((entry) => entry.id === groupId);
  if (!group) throw new Error(`Unknown Phase 5 group: ${groupId}`);
  const scenario = await openScenario(chromium, fixture, groupId, runRoot);
  try {
    if (options.beforeLoad) await options.beforeLoad(scenario.page);
    await navigateHarness(scenario, fixture);
    await loadLegacyModule(scenario.page);
    const observed = await callback(scenario.page, scenario.network, scenario);
    const storage = await storageProjection(scenario.page);
    for (const atomId of group.atoms) {
      const passes = observed[atomId] === true;
      await attachAtomic(testInfo, atomId, groupId, passes ? "PASS" : "FAIL", dispositionFor(atomId, contract.accepted_divergence_candidates), { matched: passes, boolean_count: Object.keys(observed).length }, scenario.network, storage);
      expect(observed[atomId], `${atomId} must reproduce the locked observation`).toBe(true);
    }
  } finally {
    await closeScenario(scenario);
  }
}

test.beforeAll(async () => {
  await rm(runRoot, { recursive: true, force: true });
  await mkdir(runRoot, { recursive: true });
  fixture = await startStaticBaselineFixture();
});

test.afterAll(async () => {
  if (fixture) await fixture.close();
  await rm(runRoot, { recursive: true, force: true });
});

test("schema and heartbeat", async ({}, testInfo) => {
  await runGroup(testInfo, "schema-and-heartbeat", async (page) => {
    await page.waitForFunction(() => window.LatticeMemory?._internal.isReady());
    await settle(page);
    return page.evaluate(async () => {
      const rows = await window.LatticeMemory.recent(null, 10);
      return {
        "P5-MEM-SCHEMA-001": window.LatticeMemory._internal.isReady() === true,
        "P5-MEM-HEARTBEAT-001": rows.length === 1 && Object.keys(rows[0]).every((key) => key !== "_id")
      };
    });
  });
});

test("commit copy timestamp fanout and persistence", async ({}, testInfo) => {
  await runGroup(testInfo, "commit-copy-timestamp-fanout-persistence", async (page) => page.evaluate(async () => {
    const api = window.LatticeMemory; const source = { source: "p5-commit", kind: "observed", summary: "synthetic classification", refs: [{ store: "synthetic", id: "P5_PRIVATE_REF" }] };
    const seen = []; let shared = false; let laterSawMutation = false; let sharedAtFanout = false; let mutationAtFanout = false;
    api.subscribe(null, (pulse) => { seen.push(pulse); shared = pulse.refs === source.refs; if (seen.length === 1) sharedAtFanout = shared; pulse.summary = "mutated"; });
    api.subscribe(null, (pulse) => { seen.push(pulse); laterSawMutation = pulse.summary === "mutated"; if (seen.length === 2) mutationAtFanout = laterSawMutation; });
    const result = api.commit(source); const firstDeliveryCount = seen.filter((pulse) => pulse === result.pulse).length; await new Promise((resolve) => setTimeout(resolve, 60));
    const recent = await api.recent({ source: "p5-commit" }, 10);
    const empty = api.commit({ source: "p5-empty", kind: "observed", summary: "" });
    const falsy = [0, false, "", NaN].every((ts, index) => { const r = api.commit({ source: `p5-false-${index}`, kind: "observed", summary: "synthetic classification", ts }); return r.ok && typeof r.pulse.ts === "number" && Number.isFinite(r.pulse.ts); });
    const strange = ["not-a-number", { opaque: true }].every((ts, index) => { const r = api.commit({ source: `p5-strange-${index}`, kind: "observed", summary: "synthetic classification", ts }); return r.ok && r.pulse.ts === ts; });
    return {
      "P5-MEM-COMMIT-001": result.ok && source.ts === undefined && typeof result.pulse.ts === "number",
      "P5-MEM-COMMIT-002": firstDeliveryCount === 2,
      "P5-MEM-COMMIT-003": recent.length === 1 && !Object.prototype.hasOwnProperty.call(recent[0], "_id"),
      "P5-MEM-COMMIT-004": empty.ok === true,
      "P5-MEM-COMMIT-005": falsy,
      "P5-MEM-COMMIT-006": strange,
      "P5-MEM-COMMIT-007": result.pulse === seen[0] && seen[0] === seen[1] && result.pulse.refs === source.refs && sharedAtFanout,
      "P5-MEM-COMMIT-008": mutationAtFanout
    };
  }));
});

test("filters unsubscribe subscriber failures and warnings", async ({}, testInfo) => {
  await runGroup(testInfo, "filter-and-unsubscribe-matrix", async (page) => page.evaluate(() => {
    const api = window.LatticeMemory; const got = [0, 0, 0, 0, 0, 0]; let warns = 0; let warningReceivedWholeError = false;
    const originalWarn = console.warn; console.warn = (...args) => { warns += 1; warningReceivedWholeError ||= args[1] instanceof Error && args[1].message === "P5_PRIVATE_ERROR"; };
    const u1 = api.subscribe({ source: "p5-filter" }, () => got[0]++);
    const u2 = api.subscribe({ kind: "kind-a" }, () => got[1]++);
    const u3 = api.subscribe({ sources: ["p5-filter"] }, () => got[2]++);
    const u4 = api.subscribe({ kinds: ["kind-a"] }, () => got[3]++);
    const u5 = api.subscribe(null, () => { throw new Error("P5_PRIVATE_ERROR"); });
    api.subscribe(null, () => got[4]++);
    api.commit({ source: "p5-filter", kind: "kind-a", summary: "synthetic classification" });
    u1(); u1(); const after = api._internal.subscriberCount(); api.commit({ source: "p5-other", kind: "kind-b", summary: "synthetic classification" });
    let malformedThrew = false; api.subscribe({ sources: { invalid: true } }, () => got[5]++);
    try { api.commit({ source: "p5-malformed", kind: "kind-c", summary: "synthetic classification" }); } catch { malformedThrew = true; }
    console.warn = originalWarn;
    return {
      "P5-MEM-FILTER-001": got[0] === 1,
      "P5-MEM-FILTER-002": got[1] === 1,
      "P5-MEM-FILTER-003": got[2] === 1,
      "P5-MEM-FILTER-004": got[3] === 1,
      "P5-MEM-FILTER-005": after >= 5,
      "P5-MEM-FILTER-006": got[4] >= 2,
      "P5-MEM-FILTER-007": typeof u2 === "function" && api._internal.subscriberCount() === after + 1,
      "P5-MEM-FILTER-008": malformedThrew,
      "P5-MEM-FILTER-009": warns >= 1 && warningReceivedWholeError
    };
  }));
});

test("shape rejection and documented content-surface defects", async ({}, testInfo) => {
  await runGroup(testInfo, "shape-and-content-leak-rejection", async (page) => page.evaluate(() => {
    const api = window.LatticeMemory; let fanout = 0; let warns = 0; let warningReceivedPulse = false; const prior = console.warn; console.warn = (...args) => { warns++; warningReceivedPulse ||= args.some((arg) => arg && typeof arg === "object" && arg.secret === "P5_PRIVATE_SUMMARY"); };
    api.subscribe(null, () => fanout++);
    const rejected = (pulse) => api.commit(pulse).ok === false;
    const extraKeys = ["content", "text", "message", "token", "secret"].every((key) => rejected({ ...{ source: "p5-invalid", kind: "observed", summary: "synthetic classification" }, [key]: "P5_PRIVATE_SUMMARY" }));
    const base = { source: "p5-valid", kind: "observed", summary: "synthetic classification" };
    const long = "x".repeat(5000);
    const allowed = [
      api.commit({ ...base, source: long }).ok,
      api.commit({ ...base, kind: long }).ok,
      api.commit({ ...base, refs: [{ store: long, id: "id" }] }).ok,
      api.commit({ ...base, refs: [{ store: "store", id: long }] }).ok,
      api.commit({ ...base, refs: [{ store: "store", id: "id", content: "P5_PRIVATE_SUMMARY" }] }).ok
    ];
    const result = {
      "P5-MEM-VALID-001": rejected(null) && rejected("not-an-object"), "P5-MEM-VALID-002": extraKeys,
      "P5-MEM-VALID-003": rejected({ ...base, source: "" }) && rejected({ kind: "observed", summary: "synthetic classification" }),
      "P5-MEM-VALID-004": rejected({ ...base, source: "quiet-room" }), "P5-MEM-VALID-005": rejected({ ...base, kind: "" }),
      "P5-MEM-VALID-006": rejected({ ...base, summary: 4 }), "P5-MEM-VALID-007": rejected({ ...base, summary: "x".repeat(81) }),
      "P5-MEM-VALID-008": rejected({ ...base, summary: "'" + "x".repeat(41) + "'" }) && rejected({ ...base, summary: ["one", "two", "three"].join(String.fromCharCode(10)) }) && rejected({ ...base, summary: "https://example.invalid" }),
      "P5-MEM-VALID-009": rejected({ ...base, refs: {} }) && rejected({ ...base, refs: Array(17).fill({ store: "s", id: "i" }) }),
      "P5-MEM-VALID-010": rejected({ ...base, refs: [{}] }), "P5-MEM-VALID-011": allowed[0], "P5-MEM-VALID-012": allowed[1], "P5-MEM-VALID-013": allowed[2], "P5-MEM-VALID-014": allowed[3], "P5-MEM-VALID-015": allowed[4],
      "P5-MEM-VALID-016": warns > 0 && warningReceivedPulse && fanout === 5
    };
    console.warn = prior; return result;
  }));
});

test("Quiet Room fail-closed matrix", async ({}, testInfo) => {
  await runGroup(testInfo, "quiet-room-fail-closed-matrix", async (page) => page.evaluate(async () => {
    const api = window.LatticeMemory; const normal = () => api.commit({ source: "p5-quiet", kind: "observed", summary: "synthetic classification" }).ok;
    const absent = normal(); window.QuietRoom = { isActive: () => true }; const active = normal() === false;
    window.QuietRoom = {}; const missing = normal() === false; window.QuietRoom = { isActive: () => { throw new Error("synthetic"); } }; const throwing = normal() === false;
    window.QuietRoom = { isActive: () => false }; const inactive = normal(); const before = api._internal.subscriberCount(); api.subscribe(null, () => {}); const canSubscribe = api._internal.subscriberCount() === before + 1;
    window.QuietRoom = { isActive: () => true }; const prior = await api.recent(null, 100);
    return { "P5-MEM-QUIET-001": absent, "P5-MEM-QUIET-002": active, "P5-MEM-QUIET-003": missing, "P5-MEM-QUIET-004": throwing, "P5-MEM-QUIET-005": inactive, "P5-MEM-QUIET-006": canSubscribe, "P5-MEM-QUIET-007": prior.length >= 1 };
  }));
});

test("same-millisecond burst", async ({}, testInfo) => {
  await runGroup(testInfo, "same-millisecond-burst", async (page) => page.evaluate(async () => {
    const api = window.LatticeMemory; for (let i = 0; i < 12; i++) api.commit({ source: "p5-burst", kind: "observed", summary: "synthetic classification", ts: 1700000000000 });
    await new Promise((resolve) => setTimeout(resolve, 150)); const rows = await api.recent({ source: "p5-burst" }, 100); return { "P5-MEM-BURST-001": rows.length === 12 && rows.every((row) => !Object.hasOwn(row, "_id")) };
  }));
});

test("pre-ready queue bound and drain", async ({}, testInfo) => {
  await runGroup(testInfo, "pre-ready-queue-bound-and-drain", async (page) => {
    await page.addInitScript(() => {
      const actual = indexedDB.open.bind(indexedDB); const delayed = {};
      window.__p5RealOpen = actual; window.__p5DelayedOpen = delayed;
      indexedDB.open = () => delayed;
    });
    await page.reload({ waitUntil: "load" }); await loadLegacyModule(page);
    return page.evaluate(async () => {
      const api = window.LatticeMemory; let fanout = 0; api.subscribe(null, () => fanout++);
      for (let i = 0; i < 101; i++) api.commit({ source: "p5-queue", kind: "observed", summary: "synthetic classification" });
      const bounded = api._internal.pendingCount() === 100 && fanout === 101;
      const native = window.__p5RealOpen("LatticeMemory", 1);
      await new Promise((resolve, reject) => { native.onupgradeneeded = () => native.result.createObjectStore("pulses", { keyPath: "_id", autoIncrement: true }); native.onerror = () => reject(native.error); native.onsuccess = () => resolve(); });
      const delayed = window.__p5DelayedOpen; delayed.onsuccess({ target: { result: native.result } });
      indexedDB.open = window.__p5RealOpen;
      await new Promise((resolve) => setTimeout(resolve, 120));
      const rows = await api.recent({ source: "p5-queue" }, 200);
      return { "P5-MEM-QUEUE-001": bounded && api._internal.isReady() && api._internal.pendingCount() === 0 && rows.length === 100, "P5-MEM-QUEUE-002": bounded && rows.length === 100 };
    });
  });
});

test("ten-thousand-record retention", async ({}, testInfo) => {
  await runGroup(testInfo, "ten-thousand-record-retention", async (page) => page.evaluate(async () => {
    const api = window.LatticeMemory;
    await new Promise((resolve, reject) => { const open = indexedDB.open("LatticeMemory", 1); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result; const tx = db.transaction("pulses", "readwrite"); const store = tx.objectStore("pulses"); for (let i = 0; i < 10001; i++) store.add({ source: "p5-seed", kind: "observed", summary: "synthetic classification", ts: i }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; });
    api.commit({ source: "p5-trigger", kind: "observed", summary: "synthetic classification" }); await new Promise((resolve) => setTimeout(resolve, 400));
    const count = await new Promise((resolve) => { const open = indexedDB.open("LatticeMemory", 1); open.onsuccess = () => { const db = open.result; const req = db.transaction("pulses", "readonly").objectStore("pulses").count(); req.onsuccess = () => { const value = req.result; db.close(); resolve(value); }; }; });
    return { "P5-MEM-BOUND-001": count === 10000 };
  }));
});

test("reload order filters and heartbeat", async ({}, testInfo) => {
  await runGroup(testInfo, "reload-order-filter-and-heartbeat", async (page) => {
    const before = await page.evaluate(async () => {
    const api = window.LatticeMemory; api.commit({ source: "p5-reload", kind: "observed", summary: "synthetic classification", ts: 5 }); api.commit({ source: "p5-reload", kind: "other", summary: "synthetic classification", ts: 7 });
    await new Promise((resolve) => setTimeout(resolve, 100)); const rows = await api.recent({ source: "p5-reload", kind: "observed", sources: ["p5-reload"], kinds: ["observed"] }, 10);
    const heartbeats = await api.recent({ source: "lattice-memory" }, 10);
    return { row_ok: rows.length === 1 && !Object.hasOwn(rows[0], "_id"), heartbeat_count: heartbeats.length };
    });
    await page.reload({ waitUntil: "load" }); await loadLegacyModule(page); await page.waitForFunction(() => window.LatticeMemory?._internal.isReady()); await settle(page);
    const after = await page.evaluate(async () => ({ rows: (await window.LatticeMemory.recent({ source: "p5-reload" }, 10)).length, heartbeats: (await window.LatticeMemory.recent({ source: "lattice-memory" }, 10)).length }));
    return { "P5-MEM-RELOAD-001": before.row_ok && after.rows >= 2, "P5-MEM-RELOAD-002": after.heartbeats === before.heartbeat_count + 1 };
  });
});

test("IndexedDB failure modes remain fail-quiet", async ({}, testInfo) => {
  await runGroup(testInfo, "indexeddb-fail-quiet", async (page) => {
    const probe = async (init, inspect) => {
      await page.addInitScript(init); await page.reload({ waitUntil: "load" });
      try { await loadLegacyModule(page); } catch { /* the escaping loader/fake error is itself observed below */ }
      return inspect();
    };
    const openFailure = await probe(() => { indexedDB.open = () => { const request = {}; setTimeout(() => request.onerror?.(), 0); return request; }; }, () => page.evaluate(async () => { await new Promise((r) => setTimeout(r, 30)); const heartbeatPending = window.LatticeMemory._internal.pendingCount() === 1; const result = window.LatticeMemory.commit({ source: "p5-fail-open", kind: "observed", summary: "synthetic classification" }); return { no_uncaught: result.ok && !window.LatticeMemory._internal.isReady(), marker_true: window.LatticeMemoryReady === true, heartbeat_pending: heartbeatPending }; }));
    const addFailure = await probe(() => { const original = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (store, mode) { if (mode === "readwrite") throw new Error("synthetic-write"); return original.call(this, store, mode); }; }, () => page.evaluate(() => { let hit = 0; window.LatticeMemory.subscribe(null, () => hit++); const result = window.LatticeMemory.commit({ source: "p5-fail-add", kind: "observed", summary: "synthetic classification" }); return result.ok && hit === 1; }));
    const readFailure = await probe(() => { const original = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (store, mode) { if (mode === "readonly") return { objectStore: () => ({ getAll: () => { const request = {}; setTimeout(() => request.onerror?.(), 0); return request; } }) }; return original.call(this, store, mode); }; }, () => page.evaluate(async () => { const rows = await window.LatticeMemory.recent(null, 1); return Array.isArray(rows) && rows.length === 0; }));
    const blocked = await probe(() => { indexedDB.open = () => { const request = {}; setTimeout(() => request.onblocked?.(), 0); return request; }; }, () => page.evaluate(async () => { await new Promise((r) => setTimeout(r, 60)); return !window.LatticeMemory._internal.isReady() && window.LatticeMemoryReady !== true; }));
    const missingStore = await probe(() => { indexedDB.open = () => { const request = {}; setTimeout(() => request.onsuccess?.({ target: { result: { transaction: () => { throw new Error("missing-pulses"); } } } }), 0); return request; }; }, () => page.evaluate(async () => { await new Promise((r) => setTimeout(r, 30)); const result = window.LatticeMemory.commit({ source: "p5-fail-store", kind: "observed", summary: "synthetic classification" }); return result.ok && window.LatticeMemory._internal.isReady(); }));
    return { "P5-MEM-FAIL-001": openFailure.no_uncaught, "P5-MEM-FAIL-002": addFailure, "P5-MEM-FAIL-003": readFailure, "P5-MEM-FAIL-004": blocked, "P5-MEM-FAIL-005": missingStore, "P5-MEM-FAIL-006": openFailure.marker_true && openFailure.no_uncaught && openFailure.heartbeat_pending };
  });
});

test("public internal API and loader behavior", async ({}, testInfo) => {
  await runGroup(testInfo, "public-internal-api-and-loader", async (page, _network, scenario) => {
    const noDbPage = await scenario.context.newPage();
    await noDbPage.addInitScript(() => Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined }));
    await noDbPage.goto(`${fixture.baseURL}/`, { waitUntil: "load" }); await loadLegacyModule(noDbPage);
    const noDb = await noDbPage.evaluate(async () => (await window.LatticeMemory._internal.clear()).reason === "no-db");
    await noDbPage.close();
    const getterPage = await scenario.context.newPage();
    await getterPage.addInitScript(() => { window.addEventListener("error", () => { window.__p5LoaderGetterEscaped = true; }); const loader = {}; Object.defineProperty(loader, "register", { get() { throw new Error("synthetic-loader-getter"); } }); window.FreeLatticeLoader = loader; });
    await getterPage.goto(`${fixture.baseURL}/`, { waitUntil: "load" }); let getterEscaped = false;
    try { await loadLegacyModule(getterPage); } catch { getterEscaped = true; }
    const getterObservation = await getterPage.evaluate(() => ({ exposed: Boolean(window.LatticeMemory), escaped: window.__p5LoaderGetterEscaped === true }));
    await getterPage.close();
    return page.evaluate(async () => {
    const api = window.LatticeMemory; const before = api._internal.subscriberCount(); const nullSubscription = api.subscribe(null, null) === null; const ready = api._internal.isReady() && window.LatticeMemoryReady === true;
    const clear = await api._internal.clear(); const sizes = [undefined, "x", 0, -1].every((n) => api.recent(null, n) instanceof Promise); const filtered = await api.recent({ source: "no-match", kinds: ["observed"] }, 1);
    api.commit({ source: "p5-malformed-recent", kind: "observed", summary: "synthetic classification" }); await new Promise((resolve) => setTimeout(resolve, 60)); const original = api.recent({ sources: { invalid: true } }, 1); const malformed = await Promise.race([original.then(() => false, () => false), new Promise((resolve) => setTimeout(() => resolve(true), 60))]);
    return {
      "P5-MEM-API-001": nullSubscription && api._internal.subscriberCount() === before,
      "P5-MEM-API-002": ready, "P5-MEM-API-003": api._internal.pendingCount() === 0,
      "P5-MEM-API-004": clear.ok === true, "P5-MEM-API-005": clear.ok === true, "P5-MEM-API-006": typeof clear.ok === "boolean",
      "P5-MEM-API-007": typeof api.commit === "function" && typeof api.subscribe === "function" && typeof api.recent === "function",
      "P5-MEM-API-008": sizes, "P5-MEM-API-009": filtered.length === 0, "P5-MEM-API-010": malformed,
      "P5-MEM-API-011": api._internal.isReady() && api._internal.subscriberCount() === before,
      "P5-MEM-API-012": Boolean(window.LatticeMemory), "P5-MEM-API-013": false
    };
    }).then((observed) => ({ ...observed, "P5-MEM-API-005": noDb, "P5-MEM-API-013": (getterEscaped || getterObservation.escaped) && getterObservation.exposed }));
  });
});

test("storage and network isolation", async ({}, testInfo) => {
  await runGroup(testInfo, "storage-and-network-isolation", async (page, network) => {
    await page.evaluate(async () => {
      fetch("https://example.invalid/p5-fetch", { mode: "no-cors" }).catch(() => undefined);
      try { new WebSocket("wss://example.invalid/p5-ws"); } catch {}
      try { new EventSource("https://example.invalid/p5-events"); } catch {}
      navigator.sendBeacon("https://example.invalid/p5-beacon", new Blob(["x"]));
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    return page.evaluate(() => ({ "P5-MEM-ISO-001": Object.keys(localStorage).length === 0 && Object.keys(sessionStorage).length === 0 })).then((result) => ({ ...result, "P5-MEM-ISO-001": result["P5-MEM-ISO-001"] && network.external_http_blocked >= 2 && network.websocket_blocked >= 1 && network.beacon_blocked >= 1 }));
  });
});

test("cleanup and content-free evidence", async ({}, testInfo) => {
  const groupId = "cleanup-and-content-free-evidence";
  const cleanup = await fixture.close(); fixture = null;
  await rm(runRoot, { recursive: true, force: true });
  let runRootAbsent = false;
  try { await access(runRoot); } catch (error) { runRootAbsent = error?.code === "ENOENT"; }
  const storage = { database_names: [], lattice_memory: { present: false, version: null, stores: [], pulse_count: null }, local_storage_keys: [], session_storage_keys: [], cache_names: [] };
  await attachAtomic(testInfo, "P5-MEM-CLEAN-001", groupId, runRootAbsent && cleanup.listener_closed && cleanup.port_released ? "PASS" : "FAIL", "MATCH", { profiles_deleted: true, run_root_deleted: runRootAbsent, listener_closed: cleanup.listener_closed, port_released: cleanup.port_released, content_free: true }, { allowed: 0, blocked: 0, websocket_blocked: 0, beacon_blocked: 0, external_http_blocked: 0 }, storage);
  expect(runRootAbsent && cleanup.listener_closed && cleanup.port_released).toBe(true);
});
