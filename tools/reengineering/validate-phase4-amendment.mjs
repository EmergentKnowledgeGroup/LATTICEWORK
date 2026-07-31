import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AMENDMENT = "reengineering/PHASE4_CHARACTERIZATION_AMENDMENT.md";
const PACKET = "reengineering/PHASE4_IMPLEMENTATION_PACKET.md";

function extractJson(document, schema) {
  const matches = [...document.matchAll(/```json\s*([\s\S]*?)```/gu)];
  for (const match of matches) {
    const value = JSON.parse(match[1]);
    if (value.schema === schema) return value;
  }
  throw new Error(`missing ${schema} lock`);
}

function same(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
}

export function validatePhase4Amendment(root) {
  const failures = [];
  try {
    const amendmentText = fs.readFileSync(path.join(root, AMENDMENT), "utf8");
    const packetText = fs.readFileSync(path.join(root, PACKET), "utf8");
    const amendment = extractJson(
      amendmentText,
      "latticework.phase4-characterization-amendment.v1",
    );
    const packet = extractJson(
      packetText,
      "latticework.phase4-implementation-packet.v2",
    );
    assert.match(
      amendmentText,
      /Approved\. Treat confirmed FreeLattice defects as documented divergences/,
    );
    for (const key of [
      "implementation_authorized",
      "real_data_authorized",
      "real_credentials_authorized",
      "real_provider_traffic_authorized",
      "activation_authorized",
      "deployment_authorized",
      "cutover_authorized",
    ]) assert.equal(amendment[key], false, `amendment ${key} must remain false`);
    for (const key of [
        "real_data_authorized",
        "real_credentials_authorized",
        "real_provider_traffic_authorized",
        "activation_authorized",
        "deployment_authorized",
        "cutover_authorized",
    ]) assert.equal(packet[key], false, `${key} must remain false`);
    assert.equal(
      packet.implementation_authorized,
      true,
      "implementation_authorized must be true",
    );
    assert.equal(packet.accepted, true);
    same(amendment.accepted_divergence_ids, [
      "P4-CHAT-002A", "P4-CHAT-004A", "P4-CHAT-005A", "P4-CHAT-005B",
      "P4-CHAT-005C", "P4-CHAT-007A", "P4-CHAT-007B", "P4-SIG-001B",
    ], "accepted divergence IDs drifted");
    same(amendment.loopback_retest_ids, [
      "P4-CHAT-001A", "P4-CHAT-003B", "P4-CHAT-010A",
      "P4-CHAT-010B", "P4-RESP-001A",
    ], "loopback retest IDs drifted");
    same(amendment.existing_harness_retest_ids, [
      "P4-A11Y-001A", "P4-A11Y-001B", "P4-A11Y-001C",
      "P4-CHAT-008A", "P4-DEG-001A", "P4-ONB-001C",
    ], "existing-harness retest IDs drifted");
    for (const listener of [amendment.listener, packet.test_listener_contract]) {
      assert.equal(listener.bind, "127.0.0.1", "listener bind must be exact loopback");
      assert.equal(listener.port, "os-selected", "listener port must be OS-selected");
      assert.equal(listener.run_owned, true, "listener must be run-owned");
      assert.equal(listener.external_egress, false, "listener external egress must be false");
    }
    assert.equal(amendment.listener.application_runtime, false, "listener cannot be application runtime");
    assert.equal(amendment.listener.fixture_only, true, "amendment listener must be fixture-only");
    assert.equal(packet.application_listener, false, "application_listener must be false");
    assert.equal(packet.test_listener, true, "test_listener must be true");
    assert.equal(packet.test_listener_contract.synthetic_only, true, "packet test listener must be synthetic-only");
    assert.equal(packet.entrypoint, "apps/web/p4.html");
    assert.equal(packet.entrypoint_default, false, "entrypoint_default must be false");
    assert.equal(packet.production_build_authorized, false);
    assert.equal(packet.candidate_storage, "latticework::conversation");
    assert.equal(packet.candidate_storage_synthetic_only, true);
    same(packet.provider_adapters, ["mock-local", "mock-cloud"], "mock adapters drifted");
    same(packet.owned_exact_paths, [
      "package.json",
      "package-lock.json",
      "packages/contracts/src/index.ts",
      "packages/contracts/src/chat.ts",
      "apps/web/package.json",
      "apps/web/p4.html",
      "apps/web/src/p4-main.ts",
      "apps/web/src/p4-chat-app.ts",
      "apps/web/src/p4-chat-app.css",
      "tests/reengineering/phase4-implementation-scope.test.mjs",
      "tests/reengineering/phase4-amendment.test.mjs",
      "tools/reengineering/validate-phase4-implementation-scope.mjs",
      "tools/reengineering/validate-phase4-amendment.mjs",
      "tools/reengineering/run-phase4-verification.ps1",
      "docs/agents/claims/LW-P4-IMPL-PREFLIGHT-001.md",
      "docs/agents/handoffs/LW-P4-IMPL-PREFLIGHT-001.md",
      "docs/agents/claims/LW-P4-001.md",
      "docs/agents/handoffs/LW-P4-001.md",
      "PROJECT_STATE.md",
      "docs/ARCHITECTURE.md",
      "docs/COMPATIBILITY.md",
      "docs/TESTING_AND_VERIFICATION.md",
      "reengineering/BLOCKERBOARD.md",
      "reengineering/EXECUTION_CHECKLIST.md",
      "reengineering/PHASE4_IMPLEMENTATION_PACKET.md",
      "runtime/checkpoints/LATEST.md",
      "runtime/checkpoints/LATEST.json",
      "reengineering/checkpoints/LATEST.md",
      "reengineering/checkpoints/LATEST.json",
    ], "owned exact paths drifted");
    same(packet.owned_path_prefixes, [
      "packages/chat/",
      "tests/phase4/",
      "reengineering/evidence/phase-4/LW-P4-001/",
    ], "owned path prefixes drifted");
    same(packet.protected_phase3_exact_paths, [
      "packages/contracts/src/provider.ts",
      "packages/contracts/src/storage.ts",
    ], "protected Phase 3 exact paths drifted");
    same(packet.protected_phase3_path_prefixes, [
      "packages/providers/",
      "packages/storage/",
    ], "protected Phase 3 prefixes drifted");
    same(packet.protected_exact_paths, [
      "app.html",
      "index.html",
      "docs/app.html",
      "sw.js",
      "docs/sw.js",
      "server.js",
      "server.py",
      "telegram-worker.js",
      "apps/web/index.html",
      "apps/web/src/main.ts",
      "apps/web/src/empty-status-shell.ts",
      "apps/web/src/styles.css",
      "apps/web/vite.config.ts",
      "apps/web/tsconfig.json",
    ], "protected exact paths drifted");
    same(packet.protected_path_prefixes, [
      "modules/",
      "docs/modules/",
      "desktop/",
      "worker/",
      "deployment/",
      "service-worker/",
      "server/",
      "tests/smoke",
      "tests/characterization/",
    ], "protected path prefixes drifted");
    assert.equal(packet.retry_count, 0);
    assert.equal(packet.fallback_authorized, false);
    assert.equal(packet.required_next_authority, "none-within-this-packet");
    assert.match(amendmentText, /never relabeled baseline `PASS`/i);
    assert.match(packetText, /FreeLatticeConversationSourceReader/);
    assert.match(packetText, /ConversationMigrationService/);
    assert.match(packetText, /Stop immediately for real data/);
  } catch (error) {
    failures.push(error.message);
  }
  return {
    schema: "latticework.phase4-amendment-validation.v1",
    valid: failures.length === 0,
    failures,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePhase4Amendment(process.cwd());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}
