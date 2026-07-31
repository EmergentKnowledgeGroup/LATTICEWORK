import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  IMPLEMENTATION_BASE_SHA,
  PACKET_PATH,
  isOwnedImplementationPath,
  isProtectedImplementationPath,
  validatePhase5LatticeMemoryImplementationScope,
} from "../../tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(ROOT, "runtime", "tmp", "phase5-lattice-memory-implementation-scope-tests");

function fixture(name) {
  const root = path.join(TMP, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "reengineering"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, PACKET_PATH), path.join(root, PACKET_PATH));
  return root;
}
function mutate(root, from, to) {
  const target = path.join(root, PACKET_PATH);
  const text = fs.readFileSync(target, "utf8");
  assert.ok(text.includes(from), `missing ${from}`);
  fs.writeFileSync(target, text.replace(from, to), "utf8");
}
function write(root, relativePath, text) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}
test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("canonical packet is valid and pins the requested implementation base", () => {
  const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: ROOT });
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.implementationBaseSha, IMPLEMENTATION_BASE_SHA);
  assert.equal(result.scopeChecked, true);
  assert.ok(result.inspectedPathCount > 0);
  assert.equal(IMPLEMENTATION_BASE_SHA, "ac45408307e91ee8d850c24753ce6b4d6e903f12");
});

test("ownership is package-only and protected paths win independently", () => {
  for (const pathname of ["apps/web/src/main.ts", "packages/storage/src/index.ts", "docs/modules/lattice-memory.js", "tests/characterization/specs/phase5-lattice-memory.spec.mjs"]) {
    assert.equal(isProtectedImplementationPath(pathname), true, pathname);
    assert.equal(isOwnedImplementationPath(pathname), false, pathname);
  }
  assert.equal(isOwnedImplementationPath("packages/lattice-memory/src/index.ts"), true);
  assert.equal(isOwnedImplementationPath("packages/contracts/src/lattice-memory.ts"), true);
});

test("rejects unowned and protected paths even with a valid packet", () => {
  const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: ROOT, checkGitScope: false, activePaths: [PACKET_PATH, "outside/unauthorized.ts", "docs/modules/lattice-memory.js"] });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /unowned implementation path changed: outside\//u);
  assert.match(result.failures.join("\n"), /protected implementation path changed: docs\/modules/u);
});

for (const [name, from, to, expected] of [
  ["implementation gate", '"implementation_authorization_gate": "independent-green"', '"implementation_authorization_gate": "self-approved"'],
  ["descriptor", '"candidate_database": "latticework::pulse-medium"', '"candidate_database": "LatticeMemory"'],
  ["schema", '"schema_version": 1', '"schema_version": 2'],
  ["store", '"store": "pulses"', '"store": "memory"'],
  ["snapshot", '"snapshot_contract": "deep-isolated-immutable"', '"snapshot_contract": "shallow"'],
  ["timestamp", '"explicit": "finite-number-only"', '"explicit": "legacy-any"'],
  ["filter", '"subscribe": "throw-TypeError-synchronously"', '"subscribe": "ignore"'],
  ["quiet", '"recent": "empty-array"', '"recent": "legacy-read"'],
  ["diagnostics", '"diagnostics": "redacted-code-only"', '"diagnostics": "raw"'],
  ["match preservation", '"P5-MEM-API-001",', '"P5-MEM-API-001-X",'],
  ["divergence correction", '"P5-MEM-VALID-016": "rejection-diagnostic-code-only"', '"P5-MEM-VALID-016": "legacy"'],
  ["descriptor sensitivity", '"sensitivity": "synthetic-fixture-only"', '"sensitivity": "real-user-data"'],
  ["descriptor retention", '"retention": "bounded-newest-10000-disposable"', '"retention": "unbounded"'],
  ["descriptor source", '"legacy_read_authorized": false', '"legacy_read_authorized": true'],
  ["descriptor key path", '"key_path": "_id"', '"key_path": "ts"'],
  ["descriptor auto increment", '"auto_increment": true', '"auto_increment": false'],
  ["descriptor codec", '"codec": "PulseMediumV1SyntheticCodec"', '"codec": "unknown"'],
  ["descriptor lifecycle", '"backup_export_restore_purge_rollback": "not-authorized"', '"backup_export_restore_purge_rollback": "enabled"'],
  ["harness bind", '"bind": "127.0.0.1"', '"bind": "0.0.0.0"'],
  ["harness egress", '"external_egress": false', '"external_egress": true'],
  ["future ownership", '"packages/lattice-memory/",', '"packages/lattice-memory-drift/",'],
]) test(`rejects packet drift: ${name}`, () => {
  const root = fixture(`drift-${name}`); mutate(root, from, to);
  const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: root, checkGitScope: false, activePaths: [PACKET_PATH] });
  assert.equal(result.valid, false);
});

for (const flag of ["real_data_authorized", "real_credentials_authorized", "real_provider_traffic_authorized", "migration_authorized", "import_export_authorized", "legacy_mutation_authorized", "activation_authorized", "deployment_authorized", "cutover_authorized", "default_entry_authorized", "shared_ui_authorized", "service_worker_authorized", "listener_authorized", "worker_authorized", "peer_lan_proxy_telegram_authorized", "browser_global_authorized", "routes_authorized", "ui_authorized"]) test(`rejects false authority flag drift: ${flag}`, () => {
  const root = fixture(`flag-${flag}`); mutate(root, `"${flag}": false`, `"${flag}": true`);
  const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: root, checkGitScope: false, activePaths: [PACKET_PATH] });
  assert.equal(result.valid, false); assert.match(result.failures.join("\n"), new RegExp(flag, "u"));
});

test("candidate storage cannot become real or nondisposable", () => {
  for (const [name, from, to] of [["synthetic", '"candidate_storage_synthetic_only": true', '"candidate_storage_synthetic_only": false'], ["disposable", '"disposable_storage": true', '"disposable_storage": false']]) {
    const root = fixture(`storage-${name}`); mutate(root, from, to);
    const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: root, checkGitScope: false, activePaths: [PACKET_PATH] });
    assert.equal(result.valid, false);
  }
});

for (const [name, source, expected] of [
  ["browser-global", "export const x = window.indexedDB;", /browser\/global primitive/u],
  ["network", "export const x = fetch('/x');", /network\/peer primitive/u],
  ["listener", "createServer().listen(0);", /listener\/worker primitive/u],
  ["credential", "export const x = process.env.API_TOKEN;", /credential primitive/u],
  ["legacy-migration-ui", "export const x = new FreeLatticeDB();", /legacy\/migration\/UI primitive/u],
]) test(`rejects forbidden source primitive: ${name}`, () => {
  const root = fixture(`source-${name}`); const pathname = "packages/lattice-memory/src/forbidden.ts"; write(root, pathname, source);
  const result = validatePhase5LatticeMemoryImplementationScope({ workspaceRoot: root, checkGitScope: false, activePaths: [PACKET_PATH, pathname] });
  assert.equal(result.valid, false); assert.match(result.failures.join("\n"), expected);
});

test("permits normal module syntax and IndexedDB only in the isolated repository", () => {
  const root = fixture("safe-repository");
  const repository = "packages/lattice-memory/src/indexeddb-pulse-repository.ts";
  write(root, repository, "export function openRepository() { return indexedDB.open('latticework::pulse-medium', 1); }\n");
  const safe = validatePhase5LatticeMemoryImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET_PATH, repository],
  });
  assert.equal(safe.valid, true, safe.failures.join("\n"));

  const wrongPlace = "packages/lattice-memory/src/pulse-medium.ts";
  write(root, wrongPlace, "export const open = () => indexedDB.open('latticework::pulse-medium', 1);\n");
  const unsafe = validatePhase5LatticeMemoryImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET_PATH, wrongPlace],
  });
  assert.equal(unsafe.valid, false);
  assert.match(unsafe.failures.join("\n"), /forbidden IndexedDB outside the isolated repository/u);
});

test("CLI rejects every override", () => {
  const validator = path.join(ROOT, "tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs");
  for (const args of [["--base", "HEAD"], ["--scope", "none"], ["--no-check"]]) {
    const result = spawnSync(process.execPath, [validator, ...args], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 2, result.stdout); assert.match(result.stderr, /accepts no CLI overrides/u);
  }
});
