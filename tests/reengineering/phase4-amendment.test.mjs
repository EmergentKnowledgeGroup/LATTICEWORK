import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase4Amendment } from "../../tools/reengineering/validate-phase4-amendment.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(ROOT, "runtime", "tmp", "phase4-amendment-tests");

function copyFixture(name) {
  const target = path.join(TMP, name);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.join(target, "reengineering"), { recursive: true });
  for (const file of [
    "PHASE4_CHARACTERIZATION_AMENDMENT.md",
    "PHASE4_IMPLEMENTATION_PACKET.md",
  ]) fs.copyFileSync(path.join(ROOT, "reengineering", file), path.join(target, "reengineering", file));
  return target;
}

function replace(target, file, from, to) {
  const absolute = path.join(target, "reengineering", file);
  fs.writeFileSync(absolute, fs.readFileSync(absolute, "utf8").replace(from, to));
}

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("accepts the locked no-runtime amendment and packet", () => {
  const result = validatePhase4Amendment(ROOT);
  assert.equal(result.valid, true, result.failures.join("\n"));
});

test("rejects implementation, provider traffic, and deployment authority", () => {
  const target = copyFixture("runtime-authority");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"implementation_authorized": false', '"implementation_authorized": true');
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"real_provider_traffic_authorized": false', '"real_provider_traffic_authorized": true');
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"deployment_authorized": false', '"deployment_authorized": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /implementation_authorized|provider|deployment/i);
});

test("rejects wildcard listener, fixed port, and application listener", () => {
  const target = copyFixture("listener");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"bind": "127.0.0.1"', '"bind": "0.0.0.0"');
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"port": "os-selected"', '"port": 8080');
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"application_listener_authorized": false', '"application_listener_authorized": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /bind|port|application_listener/i);
});

test("rejects a non-fixture amendment listener", () => {
  const target = copyFixture("listener-fixture");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"fixture_only": true', '"fixture_only": false');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /fixture-only/i);
});

test("rejects a non-synthetic packet listener", () => {
  const target = copyFixture("listener-synthetic");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"synthetic_only": true', '"synthetic_only": false');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /synthetic-only/i);
});

test("rejects divergence drift and default entrypoint", () => {
  const target = copyFixture("scope-drift");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"P4-CHAT-002A",', "");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"entrypoint_default": false', '"entrypoint_default": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /divergence|entrypoint/i);
});

test("rejects owned path drift", () => {
  const target = copyFixture("owned-path-drift");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '    "packages/chat/src/chat-controller.ts",\n', "");
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /owned implementation paths drifted/i);
});

test("rejects protected path drift", () => {
  const target = copyFixture("protected-path-drift");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '    "apps/web/src/main.ts",\n', "");
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /protected paths drifted/i);
});
