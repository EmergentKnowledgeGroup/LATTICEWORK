import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectActiveRangePaths } from "./git-scope-common.mjs";

export const IMPLEMENTATION_BASE_SHA =
  "ac45408307e91ee8d850c24753ce6b4d6e903f12";
export const PACKET_PATH =
  "reengineering/PHASE5_LATTICE_MEMORY_IMPLEMENTATION_PACKET.md";
const SCHEMA = "latticework.phase5-lattice-memory-implementation-packet.v1";

export const OWNED_FUTURE_EXACT_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/lattice-memory.ts",
  "tests/reengineering/phase5-active-scope.test.mjs",
  "tests/reengineering/phase5-lattice-memory-implementation-packet.test.mjs",
  "tests/reengineering/phase5-lattice-memory-implementation-scope.test.mjs",
  "tests/reengineering/phase5-lattice-memory-implementation-evidence.test.mjs",
  "tools/reengineering/validate-phase5-active-scope.mjs",
  "tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs",
  "tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs",
  "tools/reengineering/run-phase5-lattice-memory-verification.ps1",
  PACKET_PATH,
  "docs/agents/claims/LW-P5-MEM-IMPL-PREFLIGHT-001.md",
  "docs/agents/handoffs/LW-P5-MEM-IMPL-PREFLIGHT-001.md",
  "docs/agents/claims/LW-P5-MEM-001.md",
  "docs/agents/handoffs/LW-P5-MEM-001.md",
  "PROJECT_STATE.md",
  "docs/ARCHITECTURE.md",
  "docs/COMPATIBILITY.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "runtime/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "reengineering/checkpoints/LATEST.json",
]);
export const OWNED_FUTURE_PREFIXES = Object.freeze([
  "packages/lattice-memory/",
  "tests/phase5/",
  "reengineering/evidence/phase-5/LW-P5-MEM-IMPL-PREFLIGHT-001/",
  "reengineering/evidence/phase-5/LW-P5-MEM-001/",
]);
export const PROTECTED_EXACT_PATHS = Object.freeze([
  "docs/modules/lattice-memory.js",
  "docs/app.html",
  "app.html",
  "index.html",
  "LICENSE",
  "tests/smoke.js",
]);
export const PROTECTED_PREFIXES = Object.freeze([
  "apps/", "packages/chat/", "packages/kernel/", "packages/providers/",
  "packages/storage/", "modules/", "docs/modules/", "server/", "desktop/",
  "worker/", "deployment/", "service-worker/", "tests/characterization/",
  "reengineering/evidence/phase-0/", "reengineering/evidence/phase-1/",
  "reengineering/evidence/phase-2/", "reengineering/evidence/phase-3/",
  "reengineering/evidence/phase-4/",
]);

export const PRESERVED_MATCH_ATOMS = Object.freeze([
  "P5-MEM-API-001", "P5-MEM-API-002", "P5-MEM-API-003", "P5-MEM-API-004", "P5-MEM-API-005", "P5-MEM-API-006", "P5-MEM-API-007", "P5-MEM-API-008", "P5-MEM-API-009", "P5-MEM-API-011", "P5-MEM-API-012", "P5-MEM-BOUND-001", "P5-MEM-BURST-001", "P5-MEM-CLEAN-001", "P5-MEM-COMMIT-001", "P5-MEM-COMMIT-002", "P5-MEM-COMMIT-003", "P5-MEM-COMMIT-004", "P5-MEM-COMMIT-005", "P5-MEM-FAIL-001", "P5-MEM-FAIL-002", "P5-MEM-FAIL-003", "P5-MEM-FAIL-004", "P5-MEM-FAIL-005", "P5-MEM-FILTER-001", "P5-MEM-FILTER-002", "P5-MEM-FILTER-003", "P5-MEM-FILTER-004", "P5-MEM-FILTER-005", "P5-MEM-FILTER-006", "P5-MEM-FILTER-007", "P5-MEM-HEARTBEAT-001", "P5-MEM-ISO-001", "P5-MEM-QUEUE-001", "P5-MEM-QUEUE-002", "P5-MEM-QUIET-001", "P5-MEM-QUIET-002", "P5-MEM-QUIET-003", "P5-MEM-QUIET-004", "P5-MEM-QUIET-005", "P5-MEM-RELOAD-001", "P5-MEM-RELOAD-002", "P5-MEM-SCHEMA-001", "P5-MEM-VALID-001", "P5-MEM-VALID-002", "P5-MEM-VALID-003", "P5-MEM-VALID-004", "P5-MEM-VALID-005", "P5-MEM-VALID-006", "P5-MEM-VALID-007", "P5-MEM-VALID-008", "P5-MEM-VALID-009", "P5-MEM-VALID-010",
]);
export const CORRECTED_DIVERGENCES = Object.freeze({
  "P5-MEM-API-010": "recent-invalid-filter-rejects-TypeError",
  "P5-MEM-API-013": "loader-absent-no-global-loader-coupling",
  "P5-MEM-COMMIT-006": "explicit-timestamp-finite-number-only",
  "P5-MEM-COMMIT-007": "deep-isolated-immutable-snapshots",
  "P5-MEM-COMMIT-008": "subscriber-mutation-isolated",
  "P5-MEM-FAIL-006": "readiness-state-is-coherent-no-window-marker",
  "P5-MEM-FILTER-008": "commit-invalid-filter-rejected-before-fanout",
  "P5-MEM-FILTER-009": "subscriber-diagnostic-code-only",
  "P5-MEM-QUIET-006": "active-quiet-room-subscribe-noop-unsubscribe",
  "P5-MEM-QUIET-007": "active-quiet-room-recent-empty-array",
  "P5-MEM-VALID-011": "bounded-source-length",
  "P5-MEM-VALID-012": "bounded-kind-length",
  "P5-MEM-VALID-013": "bounded-ref-store-length",
  "P5-MEM-VALID-014": "bounded-ref-id-length",
  "P5-MEM-VALID-015": "refs-deep-shape-validated-no-content-keys",
  "P5-MEM-VALID-016": "rejection-diagnostic-code-only",
});

function extractPacket(text) {
  for (const match of text.matchAll(/```json\s*([\s\S]*?)```/gu)) {
    const packet = JSON.parse(match[1]);
    if (packet.schema === SCHEMA) return packet;
  }
  throw new Error(`missing ${SCHEMA} machine lock`);
}
function starts(pathname, prefixes) { return prefixes.some((prefix) => pathname.startsWith(prefix)); }
export function isProtectedImplementationPath(relativePath) {
  return PROTECTED_EXACT_PATHS.includes(relativePath) || starts(relativePath, PROTECTED_PREFIXES);
}
export function isOwnedImplementationPath(relativePath) {
  return !isProtectedImplementationPath(relativePath) &&
    (OWNED_FUTURE_EXACT_PATHS.includes(relativePath) || starts(relativePath, OWNED_FUTURE_PREFIXES));
}

function assertPacket(packet) {
  assert.equal(packet.accepted, true);
  assert.equal(packet.implementation_base_sha, IMPLEMENTATION_BASE_SHA);
  assert.equal(packet.characterization_work_id, "LW-P5-MEM-CHAR-001");
  assert.equal(packet.characterization_status, "GREEN");
  assert.equal(packet.characterization_result_count, 69);
  assert.equal(packet.preserved_match_count, 53);
  assert.equal(packet.corrected_divergence_count, 16);
  assert.equal(packet.implementation_authorized, true);
  assert.equal(packet.implementation_authorization_gate, "independent-green");
  assert.equal(packet.candidate_runtime_source_present, false);
  assert.equal(packet.package_only_api, true);
  assert.deepEqual(packet.dataset_descriptor, { id: "pulse-medium", schema_version: 1, candidate_database: "latticework::pulse-medium", store: "pulses", synthetic_only: true, disposable_storage: true, sensitivity: "synthetic-fixture-only", retention: "bounded-newest-10000-disposable", source: { origin: "generated-synthetic-only", legacy_read_authorized: false }, target: { key_path: "_id", auto_increment: true, indexes: [], codec: "PulseMediumV1SyntheticCodec" }, backup_export_restore_purge_rollback: "not-authorized", corruption_quota_blocked: "fail-quiet-no-write", future_schema: "abstain-no-write" });
  assert.equal(packet.candidate_storage_authorized, true);
  assert.equal(packet.candidate_storage_synthetic_only, true);
  for (const key of ["real_data_authorized", "real_credentials_authorized", "real_provider_traffic_authorized", "migration_authorized", "import_export_authorized", "legacy_mutation_authorized", "activation_authorized", "deployment_authorized", "cutover_authorized", "default_entry_authorized", "shared_ui_authorized", "service_worker_authorized", "listener_authorized", "worker_authorized", "peer_lan_proxy_telegram_authorized", "browser_global_authorized", "routes_authorized", "ui_authorized"]) assert.equal(packet[key], false, `${key} must remain false`);
  assert.deepEqual(packet.browser_harness_listener, {
    bind: "127.0.0.1",
    port_source: "LATTICEWORK_P5_PORT",
    canonical_port: 5195,
    independent_port: 5295,
    run_owned: true,
    synthetic_only: true,
    external_egress: false,
  });
  assert.deepEqual(packet.timestamp_contract, { omitted: "now-finite-number", explicit: "finite-number-only", invalid_explicit: "reject" });
  assert.equal(packet.snapshot_contract, "deep-isolated-immutable");
  assert.deepEqual(packet.invalid_filter_contract, { subscribe: "throw-TypeError-synchronously", recent: "reject-TypeError" });
  assert.deepEqual(packet.active_quiet_room, { commit: "reject-no-fanout-no-write", subscribe: "noop-unsubscribe", recent: "empty-array" });
  assert.equal(packet.diagnostics, "redacted-code-only");
  assert.deepEqual(packet.preserved_match_atom_ids, [...PRESERVED_MATCH_ATOMS]);
  assert.deepEqual(packet.corrected_divergences, CORRECTED_DIVERGENCES);
  assert.deepEqual(packet.owned_future_exact_paths, [...OWNED_FUTURE_EXACT_PATHS]);
  assert.deepEqual(packet.owned_future_prefixes, [...OWNED_FUTURE_PREFIXES]);
  assert.deepEqual(packet.protected_exact_paths, [...PROTECTED_EXACT_PATHS]);
  assert.deepEqual(packet.protected_prefixes, [...PROTECTED_PREFIXES]);
}

const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".html"]);
const FORBIDDEN_ALL_SOURCE_PATTERNS = [
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|WebTransport|RTCPeerConnection)\b/u, "network/peer primitive"],
  [/\b(?:createServer|\.listen\s*\(|Deno\.serve|Bun\.serve|Worker|SharedWorker|serviceWorker)\b/u, "listener/worker primitive"],
  [/\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|credential)\b/iu, "credential primitive"],
];
const FORBIDDEN_CANDIDATE_SOURCE_PATTERNS = [
  [/\b(?:window|globalThis|document|navigator|location|localStorage|sessionStorage|caches)\b/u, "browser/global primitive"],
  [/\bprocess\.env\b/u, "ambient environment primitive"],
  [/\b(?:FreeLatticeDB|LatticeMemory|MigrationService|import(?:Data|File|Legacy)|export(?:Data|File|Legacy)|activateCandidate|setReadOwner|Telegram|proxy|router|route|HTMLElement|customElements)\b/iu, "legacy/migration/UI primitive"],
];
function scanSources(root, activePaths, failures) {
  for (const relativePath of activePaths) {
    if (!SOURCE_EXTENSIONS.has(path.extname(relativePath))) continue;
    if (!(relativePath.startsWith("packages/lattice-memory/") || relativePath === "packages/contracts/src/lattice-memory.ts" || relativePath.startsWith("tests/phase5/"))) continue;
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const text = fs.readFileSync(absolute, "utf8");
    if (!relativePath.startsWith("tests/phase5/")) {
      for (const [pattern, label] of FORBIDDEN_ALL_SOURCE_PATTERNS) if (pattern.test(text)) failures.push(`${relativePath}: forbidden ${label}`);
      for (const [pattern, label] of FORBIDDEN_CANDIDATE_SOURCE_PATTERNS) if (pattern.test(text)) failures.push(`${relativePath}: forbidden ${label}`);
    } else {
      if (/\b(?:createServer|\.listen\s*\(|Deno\.serve|Bun\.serve)\b/u.test(text)) {
        failures.push(`${relativePath}: forbidden test listener primitive`);
      }
      const externalUrls = [...text.matchAll(/https?:\/\/[^"'`\s)]+/gu)]
        .map((match) => match[0])
        .filter((url) => !/^http:\/\/127\.0\.0\.1(?::(?:\d+|\$\{port\}))?(?:\/|$)/u.test(url));
      if (externalUrls.length > 0) failures.push(`${relativePath}: forbidden external test URL`);
      const environmentReads = [...text.matchAll(/\bprocess\.env\.([A-Z0-9_]+)/gu)].map((match) => match[1]);
      for (const name of environmentReads) {
        if (name !== "LATTICEWORK_P5_PORT") failures.push(`${relativePath}: forbidden test environment key ${name}`);
      }
    }
    if (/\bindexedDB\b/u.test(text) && !relativePath.endsWith("indexeddb-pulse-repository.ts") && !relativePath.startsWith("tests/phase5/")) failures.push(`${relativePath}: forbidden IndexedDB outside the isolated repository`);
  }
}

export function validatePhase5LatticeMemoryImplementationScope({ workspaceRoot, activePaths, checkGitScope = true } = {}) {
  const root = path.resolve(workspaceRoot ?? process.cwd());
  const failures = [];
  try { assertPacket(extractPacket(fs.readFileSync(path.join(root, PACKET_PATH), "utf8"))); } catch (error) { failures.push(error.message); }
  let inspectedPaths = activePaths ?? [];
  try {
    if (checkGitScope) inspectedPaths = collectActiveRangePaths(root, IMPLEMENTATION_BASE_SHA);
  } catch (error) { failures.push(error.message); }
  for (const relativePath of inspectedPaths) {
    if (isProtectedImplementationPath(relativePath)) failures.push(`protected implementation path changed: ${relativePath}`);
    else if (!isOwnedImplementationPath(relativePath)) failures.push(`unowned implementation path changed: ${relativePath}`);
  }
  if (checkGitScope) for (const relativePath of PROTECTED_EXACT_PATHS) {
    const result = spawnSync("git", ["diff", "--quiet", IMPLEMENTATION_BASE_SHA, "--", relativePath], { cwd: root, windowsHide: true });
    if (result.status !== 0) failures.push(`protected path is not byte-identical to base: ${relativePath}`);
  }
  scanSources(root, inspectedPaths, failures);
  return { schema: "latticework.phase5-lattice-memory-implementation-scope-validation.v1", valid: failures.length === 0, scopeChecked: checkGitScope, implementationBaseSha: IMPLEMENTATION_BASE_SHA, inspectedPathCount: new Set(inspectedPaths).size, failures: [...new Set(failures)].sort() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) { process.stderr.write("Phase 5 LatticeMemory implementation validator accepts no CLI overrides.\n"); process.exitCode = 2; }
  else { const result = validatePhase5LatticeMemoryImplementationScope(); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); process.exitCode = result.valid ? 0 : 1; }
}
