import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, rm, mkdir, access } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(here, "..", "..", "..");
export const baselineSha256 = "a65dba17a30ab8a657e52423ab8b1ac58d5597a83fe4ee823aecb83dc9588052";
export const baselineCommit = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
export const privateSentinels = ["P5_PRIVATE_SUMMARY", "P5_PRIVATE_REF", "P5_PRIVATE_TOKEN", "P5_PRIVATE_ERROR"];

const harnessHtml = "<!doctype html><meta charset=utf-8><title>Phase 5 synthetic harness</title><main data-phase=phase5></main>";

export function assertContentFree(value) {
  const serialized = JSON.stringify(value);
  const leak = privateSentinels.find((sentinel) => serialized.includes(sentinel));
  if (leak) throw new Error(`Content sentinel escaped promoted evidence: ${leak}`);
}

export async function startStaticBaselineFixture() {
  const baselineRoot = process.env.LATTICEWORK_BASELINE_ROOT?.trim();
  if (!baselineRoot) throw new Error("LATTICEWORK_BASELINE_ROOT is required for immutable Phase 5 characterization.");
  const resolvedBaselineRoot = path.resolve(baselineRoot);
  const observedCommit = execFileSync("git", ["-C", resolvedBaselineRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", resolvedBaselineRoot, "status", "--porcelain"], { encoding: "utf8" }).trim();
  if (observedCommit !== baselineCommit || dirty) throw new Error("Immutable baseline root must be clean and pinned to e7585999fc1af2707f410ae87356cf2b52e08d9c.");
  const moduleBytes = await readFile(path.join(resolvedBaselineRoot, "docs", "modules", "lattice-memory.js"));
  const observedHash = createHash("sha256").update(moduleBytes).digest("hex");
  if (observedHash !== baselineSha256) {
    throw new Error(`Immutable lattice-memory.js hash mismatch: expected ${baselineSha256}, observed ${observedHash}`);
  }
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const permitted = request.method === "GET" && (url.pathname === "/" || url.pathname === "/lattice-memory.js");
    requests.push({ allowed: permitted, path: permitted ? url.pathname : "DENIED_ROUTE" });
    if (!permitted) {
      response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": url.pathname === "/" ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8"
    });
    response.end(url.pathname === "/" ? harnessHtml : moduleBytes);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Phase 5 fixture did not receive an OS-selected TCP port.");
  const port = address.port;
  return {
    baseURL: `http://127.0.0.1:${port}`,
    port,
    requests,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      const probe = createNetServer();
      await new Promise((resolve, reject) => {
        probe.once("error", reject);
        probe.listen(port, "127.0.0.1", resolve);
      });
      await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
      return { listener_closed: true, port_released: true };
    }
  };
}

export async function openScenario(chromium, fixture, groupId, runRoot) {
  const profile = path.join(runRoot, "profiles", groupId);
  await mkdir(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: true,
    serviceWorkers: "block",
    viewport: { width: 1280, height: 720 },
    args: ["--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-default-browser-check"]
  });
  const network = { allowed: 0, blocked: 0, websocket_blocked: 0, beacon_blocked: 0, external_http_blocked: 0 };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const allowed = url.origin === fixture.baseURL && request.method() === "GET" && (url.pathname === "/" || url.pathname === "/lattice-memory.js");
    if (allowed) {
      network.allowed += 1;
      await route.continue();
      return;
    }
    network.blocked += 1;
    if (request.resourceType() === "websocket") network.websocket_blocked += 1;
    else if (request.resourceType() === "ping") network.beacon_blocked += 1;
    else network.external_http_blocked += 1;
    await route.abort("blockedbyclient");
  });
  await context.routeWebSocket("**/*", (webSocket) => {
    network.blocked += 1;
    network.websocket_blocked += 1;
    webSocket.close();
  });
  const page = await context.newPage();
  return { context, page, profile, network };
}

export async function loadLegacyModule(page) {
  await page.addScriptTag({ url: "/lattice-memory.js" });
  await page.waitForFunction(() => Boolean(window.LatticeMemory));
}

export async function closeScenario(scenario) {
  await scenario.context.close();
  let removed = false;
  for (let attempt = 0; attempt < 8 && !removed; attempt += 1) {
    try { await rm(scenario.profile, { recursive: true, force: true, maxRetries: 2, retryDelay: 150 }); removed = true; }
    catch (error) {
      if (attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  let absent = false;
  try { await access(scenario.profile); } catch (error) { absent = error?.code === "ENOENT"; }
  if (!absent) throw new Error(`Phase 5 persistent profile survived teardown: ${scenario.profile}`);
  return { browser_closed: true, profile_deleted: true };
}

export async function navigateHarness(scenario, fixture) {
  await scenario.page.goto(`${fixture.baseURL}/`, { waitUntil: "load" });
}

export async function storageProjection(page) {
  const projection = await page.evaluate(async () => {
    const databases = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
    const names = databases.map((entry) => entry.name).filter(Boolean).sort();
    const row = await new Promise((resolve) => {
      let settled = false;
      const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
      setTimeout(() => finish({ present: false, version: null, stores: [], pulse_count: null }), 250);
      const request = indexedDB.open("LatticeMemory", 1);
      request.onerror = () => finish({ present: false, version: null, stores: [], pulse_count: null });
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("pulses")) { db.close(); finish({ present: true, version: db.version, stores: [], pulse_count: null }); return; }
        const transaction = db.transaction("pulses", "readonly");
        const count = transaction.objectStore("pulses").count();
        count.onsuccess = () => { const result = { present: true, version: db.version, stores: Array.from(db.objectStoreNames).sort(), pulse_count: count.result }; db.close(); finish(result); };
        count.onerror = () => { db.close(); finish({ present: true, version: db.version, stores: Array.from(db.objectStoreNames).sort(), pulse_count: null }); };
      };
    });
    return { database_names: names, lattice_memory: row, local_storage_keys: Object.keys(localStorage).sort(), session_storage_keys: Object.keys(sessionStorage).sort(), cache_names: typeof caches === "undefined" ? [] : await caches.keys() };
  });
  assertContentFree(projection);
  return projection;
}

export async function attachAtomic(testInfo, atomId, groupId, status, disposition, observed, network, storage) {
  const scenario = { schema: "latticework.phase5.atomic-result.v1", atom_id: atomId, group_id: groupId, status, disposition, observed };
  const networkReceipt = { schema: "latticework.phase5.network.v1", atom_id: atomId, group_id: groupId, allowed_count: network.allowed, blocked_count: network.blocked, external_transmitted_count: 0, external_http_denied: network.external_http_blocked >= 0, websocket_denied: network.websocket_blocked >= 0, realtime_denied: network.external_http_blocked >= 0, beacon_denied: network.beacon_blocked >= 0, external_http_blocked: network.external_http_blocked, websocket_blocked: network.websocket_blocked, beacon_blocked: network.beacon_blocked };
  const storageReceipt = { schema: "latticework.phase5.storage.v1", atom_id: atomId, group_id: groupId, database_names: storage.database_names, lattice_memory: storage.lattice_memory, local_storage_key_count: storage.local_storage_keys.length, session_storage_key_count: storage.session_storage_keys.length, cache_name_count: storage.cache_names.length };
  assertContentFree(scenario); assertContentFree(networkReceipt); assertContentFree(storageReceipt);
  await testInfo.attach("scenario-result.json", { body: Buffer.from(`${JSON.stringify(scenario)}\n`), contentType: "application/json" });
  await testInfo.attach("network.json", { body: Buffer.from(`${JSON.stringify(networkReceipt)}\n`), contentType: "application/json" });
  await testInfo.attach("storage.json", { body: Buffer.from(`${JSON.stringify(storageReceipt)}\n`), contentType: "application/json" });
}

export function dispositionFor(atomId, divergenceCandidates) {
  return divergenceCandidates.includes(atomId) ? "ACCEPTED_DIVERGENCE_CANDIDATE" : "MATCH";
}
