import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase5LatticeMemoryPreflight } from "../../tools/reengineering/validate-phase5-lattice-memory-preflight.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(
  ROOT,
  "runtime",
  "tmp",
  "phase5-lattice-memory-preflight-tests",
);
const PACKET = "reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md";
const MODULE = "docs/modules/lattice-memory.js";

function fixture(name) {
  const root = path.join(TMP, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "reengineering"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "modules"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, PACKET), path.join(root, PACKET));
  fs.copyFileSync(path.join(ROOT, MODULE), path.join(root, MODULE));
  return root;
}

function mutate(root, from, to) {
  const target = path.join(root, PACKET);
  const original = fs.readFileSync(target, "utf8");
  assert.ok(original.includes(from), `missing mutation source ${from}`);
  fs.writeFileSync(target, original.replace(from, to), "utf8");
}

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("accepts the canonical locked LatticeMemory characterization packet", () => {
  const result = validatePhase5LatticeMemoryPreflight({ workspaceRoot: ROOT });
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.atomicObservations, 69);
  assert.equal(result.observationGroups, 13);
  assert.equal(result.implementationAuthorized, false);
});

for (const [name, from, to, expected] of [
  ["acceptance", '"accepted": true', '"accepted": false', /false.*true|strict/i],
  ["legacy-hash", "6c9a9f0ef9d422698ffaa5d695257c1ead003be6226b32e1cf79e59030006917", "b".repeat(64), /legacy_module|hash/i],
  ["schema", '"database": "LatticeMemory"', '"database": "Other"', /storage/i],
  ["record-bound", '"max_records": 10000', '"max_records": 0', /storage/i],
  ["queue-bound", '"max_pending": 100', '"max_pending": 1000', /storage/i],
  ["summary-bound", '"max_summary": 80', '"max_summary": 800', /max_summary/i],
  ["quiet-source", '"reserved_sources": ["quiet-room"]', '"reserved_sources": []', /reserved_sources/i],
  ["workers", '"workers": 1', '"workers": 2', /browser_contract/i],
  ["retries", '"retries": 0', '"retries": 1', /browser_contract/i],
  ["egress", '"external_http_denied": true', '"external_http_denied": false', /browser_contract/i],
  ["listener-bind", '"bind": "127.0.0.1"', '"bind": "0.0.0.0"', /fixture_listener/i],
  ["listener-port", '"requested_port": 0', '"requested_port": 8080', /fixture_listener/i],
  ["real-data", '"real_data_authorized": false', '"real_data_authorized": true', /real_data_authorized/i],
  ["real-credentials", '"real_credentials_authorized": false', '"real_credentials_authorized": true', /real_credentials_authorized/i],
  ["real-provider", '"real_provider_traffic_authorized": false', '"real_provider_traffic_authorized": true', /real_provider_traffic_authorized/i],
  ["implementation", '"implementation_authorized": false', '"implementation_authorized": true', /implementation_authorized/i],
  ["legacy-mutation", '"legacy_mutation_authorized": false', '"legacy_mutation_authorized": true', /legacy_mutation_authorized/i],
  ["candidate-storage", '"candidate_storage_authorized": false', '"candidate_storage_authorized": true', /candidate_storage_authorized/i],
  ["activation", '"activation_authorized": false', '"activation_authorized": true', /activation_authorized/i],
  ["deployment", '"deployment_authorized": false', '"deployment_authorized": true', /deployment_authorized/i],
  ["cutover", '"cutover_authorized": false', '"cutover_authorized": true', /cutover_authorized/i],
  ["atomic-contract", '"P5-MEM-COMMIT-004": "empty string summary is accepted as observed legacy behavior"', '"P5-MEM-COMMIT-004": "empty string summary is rejected"', /atomic_contracts/i],
  ["public-api", '    "_internal.clear"\n  ],', '    "_internal.clear",\n    "eraseEverything"\n  ],', /public_api/i],
  ["required-gate", '    "hygiene"\n  ],', '    "not-hygiene"\n  ],', /required_gates/i],
  ["owned-path", '    "tools/reengineering/validate-phase5-lattice-memory-characterization.mjs"\n  ],', '    "apps/web/src/main.ts"\n  ],', /characterization_owned_exact_paths/i],
  ["protected-path", '    "package-lock.json"\n  ],', '    "not-package-lock.json"\n  ],', /protected_exact_paths/i],
  ["protected-prefix", '    "reengineering/evidence/phase-4/"\n  ],', '    "reengineering/evidence/phase-3/"\n  ],', /protected_prefixes/i],
]) {
  test(`rejects packet drift: ${name}`, () => {
    const root = fixture(name);
    mutate(root, from, to);
    const result = validatePhase5LatticeMemoryPreflight({ workspaceRoot: root });
    assert.equal(result.valid, false);
    assert.match(result.failures.join("\n"), expected);
  });
}

test("rejects immutable module byte drift", () => {
  const root = fixture("module-drift");
  fs.appendFileSync(path.join(root, MODULE), "\n// drift\n", "utf8");
  const result = validatePhase5LatticeMemoryPreflight({ workspaceRoot: root });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /legacy module hash drifted/i);
});

test("canonical CLI rejects override arguments", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    [
      "tools/reengineering/validate-phase5-lattice-memory-preflight.mjs",
      "--base",
      "HEAD",
    ],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /accepts no CLI overrides/i);
});
