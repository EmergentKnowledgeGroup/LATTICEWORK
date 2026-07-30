import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { generateDataRegistry } from "../../tools/reengineering/generate-data-preservation-registry.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";

function parseJsonText(value) {
  return JSON.parse(value.replace(/^\uFEFF/, ""));
}

const staticIdentifiers = parseJsonText(
  fs.readFileSync(
    path.join(REPO_ROOT, "reengineering/evidence/phase-0/LW-M0-INV-001/storage-identifiers.json"),
    "utf8",
  ),
);
const runtimeProbeOuter = parseJsonText(
  fs.readFileSync(
    path.join(REPO_ROOT, "reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log"),
    "utf8",
  ),
);
const runtimeProbe = parseJsonText(runtimeProbeOuter.result);

test("data registry preserves every unique static and runtime storage identifier", () => {
  const registry = generateDataRegistry(staticIdentifiers, runtimeProbe, BASELINE_SHA);
  const uniqueStatic = new Set(
    staticIdentifiers.map((item) => `${item.kind}\0${item.name}`),
  );

  assert.ok(registry.counts.total >= uniqueStatic.size);
  assert.equal(new Set(registry.rows.map((row) => row.id)).size, registry.counts.total);
  assert.equal(registry.counts.by_kind.localStorage >= 194, true);
  assert.equal(registry.counts.by_kind.sessionStorage >= 2, true);
  assert.equal(registry.counts.by_kind.indexedDB_database >= 17, true);
  assert.equal(registry.counts.by_kind.indexedDB_store_runtime, 24);
  assert.ok(
    registry.rows.every(
      (row) =>
        row.migration_rule === "PRESERVE_UNKNOWN_STORE_RECORD_AND_FIELD"
        && row.owner_approval_required_for_removal === true,
    ),
  );
});

test("propagates the supplied baseline SHA and rejects malformed runtime names", () => {
  const registry = generateDataRegistry([], {
    localStorageKeys: ["fixture"],
    sessionStorageKeys: [],
    indexedDB: [],
  }, "a".repeat(40));
  assert.equal(registry.baseline_sha, "a".repeat(40));
  assert.throws(
    () => generateDataRegistry([], { indexedDB: [] }),
    /Baseline SHA must be a 40-character Git SHA/i,
  );
  assert.throws(
    () => generateDataRegistry([], { localStorageKeys: [42] }, BASELINE_SHA),
    /localStorage keys must be non-empty strings/i,
  );
  assert.throws(
    () =>
      generateDataRegistry(
        [],
        { indexedDB: [{ name: "fixture", stores: [null] }] },
        BASELINE_SHA,
      ),
    /store names must be non-empty strings/i,
  );
});

test("runtime database rows retain versions and qualified store ownership", () => {
  const registry = generateDataRegistry(
    staticIdentifiers,
    runtimeProbe,
    BASELINE_SHA,
  );
  const database = registry.rows.find(
    (row) => row.kind === "indexedDB_database" && row.name === "FreeLatticeDB",
  );
  const store = registry.rows.find(
    (row) =>
      row.kind === "indexedDB_store_runtime"
      && row.name === "FreeLatticeDB/conversations",
  );

  assert.equal(database.runtime_observed, true);
  assert.equal(database.runtime_details.version, 3);
  assert.deepEqual(
    database.runtime_details.stores,
    ["conversations", "memoryIndex", "messages", "meta"],
  );
  assert.equal(store.runtime_observed, true);
  assert.equal(store.runtime_details.database, "FreeLatticeDB");
});
