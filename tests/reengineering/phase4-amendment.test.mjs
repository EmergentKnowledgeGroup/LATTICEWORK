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

test("rejects removal of accepted implementation authority", () => {
  const target = copyFixture("implementation-authority");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"implementation_authorized": true', '"implementation_authorized": false');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /implementation_authorized/i);
});

test("rejects real provider traffic authority", () => {
  const target = copyFixture("provider-authority");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"real_provider_traffic_authorized": false', '"real_provider_traffic_authorized": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /real_provider_traffic_authorized/i);
});

test("rejects deployment authority", () => {
  const target = copyFixture("deployment-authority");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"deployment_authorized": false', '"deployment_authorized": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /deployment_authorized/i);
});

test("rejects a wildcard listener", () => {
  const target = copyFixture("listener-bind");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"bind": "127.0.0.1"', '"bind": "0.0.0.0"');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /listener bind/i);
});

test("rejects a fixed listener port", () => {
  const target = copyFixture("listener-port");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"port": "os-selected"', '"port": 8080');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /listener port/i);
});

test("rejects an application listener", () => {
  const target = copyFixture("application-listener");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"application_listener": false', '"application_listener": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /application_listener/i);
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

test("rejects divergence drift", () => {
  const target = copyFixture("divergence-drift");
  replace(target, "PHASE4_CHARACTERIZATION_AMENDMENT.md", '"P4-CHAT-002A",', "");
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /divergence/i);
});

test("rejects a default candidate entrypoint", () => {
  const target = copyFixture("default-entrypoint");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '"entrypoint_default": false', '"entrypoint_default": true');
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /entrypoint/i);
});

test("rejects owned path drift", () => {
  const target = copyFixture("owned-path-drift");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '    "package.json",\n', "");
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /owned exact paths drifted/i);
});

test("rejects protected path drift", () => {
  const target = copyFixture("protected-path-drift");
  replace(target, "PHASE4_IMPLEMENTATION_PACKET.md", '    "apps/web/src/main.ts",\n', "");
  const result = validatePhase4Amendment(target);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /protected exact paths drifted/i);
});
