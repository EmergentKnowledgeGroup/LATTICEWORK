import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packetPath = new URL(
  "../../reengineering/PHASE5_LATTICE_MEMORY_IMPLEMENTATION_PACKET.md",
  import.meta.url,
);

async function packet() {
  const markdown = await readFile(packetPath, "utf8");
  const match = markdown.match(/```json\s*(\{[\s\S]*?\})\s*```/u);
  assert(match, "implementation packet must contain one machine-readable JSON lock");
  return JSON.parse(match[1]);
}

test("accepted implementation packet keeps every authority boundary disabled", async () => {
  const value = await packet();
  assert.equal(value.accepted, true);
  assert.equal(value.implementation_authorized, true);
  for (const key of [
    "real_data_authorized",
    "real_credentials_authorized",
    "real_provider_traffic_authorized",
    "migration_authorized",
    "import_export_authorized",
    "legacy_mutation_authorized",
    "activation_authorized",
    "deployment_authorized",
    "cutover_authorized",
    "default_entry_authorized",
    "shared_ui_authorized",
    "service_worker_authorized",
    "listener_authorized",
    "worker_authorized",
    "peer_lan_proxy_telegram_authorized",
    "browser_global_authorized",
    "routes_authorized",
    "ui_authorized",
  ]) assert.equal(value[key], false, `${key} must remain false`);
});

test("packet pins the exact synthetic disposable descriptor and 53/16 behavior split", async () => {
  const value = await packet();
  assert.deepEqual(value.dataset_descriptor, {
    id: "pulse-medium",
    schema_version: 1,
    candidate_database: "latticework::pulse-medium",
    store: "pulses",
    synthetic_only: true,
    disposable_storage: true,
    sensitivity: "synthetic-fixture-only",
    retention: "bounded-newest-10000-disposable",
    source: { origin: "generated-synthetic-only", legacy_read_authorized: false },
    target: { key_path: "_id", auto_increment: true, indexes: [], codec: "PulseMediumV1SyntheticCodec" },
    backup_export_restore_purge_rollback: "not-authorized",
    corruption_quota_blocked: "fail-quiet-no-write",
    future_schema: "abstain-no-write",
  });
  assert.equal(value.preserved_match_atom_ids.length, 53);
  assert.equal(new Set(value.preserved_match_atom_ids).size, 53);
  assert.equal(Object.keys(value.corrected_divergences).length, 16);
});

test("packet owns only package, test, evidence, and documentation surfaces", async () => {
  const value = await packet();
  assert(value.owned_future_prefixes.includes("packages/lattice-memory/"));
  assert(value.owned_future_prefixes.includes("tests/phase5/"));
  assert(!value.owned_future_prefixes.some((prefix) => prefix.startsWith("apps/")));
  assert(value.protected_prefixes.includes("apps/"));
  assert(value.protected_prefixes.includes("docs/modules/"));
  assert.equal(value.browser_harness_listener.bind, "127.0.0.1");
  assert.equal(value.browser_harness_listener.external_egress, false);
});
