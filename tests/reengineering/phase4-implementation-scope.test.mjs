import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  IMPLEMENTATION_BASE_SHA,
  isOwnedImplementationPath,
  isProtectedImplementationPath,
  validatePhase4ImplementationScope,
} from "../../tools/reengineering/validate-phase4-implementation-scope.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(
  ROOT,
  "runtime",
  "tmp",
  "phase4-implementation-scope-tests",
);
const PACKET = "reengineering/PHASE4_IMPLEMENTATION_PACKET.md";

function fixture(name) {
  const root = path.join(TMP, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "reengineering"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, PACKET), path.join(root, PACKET));
  return root;
}

function mutatePacket(root, from, to) {
  const target = path.join(root, PACKET);
  const original = fs.readFileSync(target, "utf8");
  assert.ok(original.includes(from), `missing mutation source ${from}`);
  fs.writeFileSync(target, original.replace(from, to), "utf8");
}

function write(root, relativePath, text) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("canonical accepted packet and active implementation range are valid", () => {
  const result = validatePhase4ImplementationScope({ workspaceRoot: ROOT });
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.scopeChecked, true);
  assert.equal(result.implementationBaseSha, IMPLEMENTATION_BASE_SHA);
  assert.equal(result.applicationListener, false);
  assert.equal(result.testListener, true);
});

test("protected paths are rejected even if broad ownership could match", () => {
  for (const relativePath of [
    "packages/contracts/src/provider.ts",
    "packages/providers/src/index.ts",
    "packages/storage/src/index.ts",
    "apps/web/src/main.ts",
    "modules/chat.js",
    "tests/characterization/specs/phase4-chat.spec.mjs",
  ]) {
    assert.equal(isProtectedImplementationPath(relativePath), true, relativePath);
    assert.equal(isOwnedImplementationPath(relativePath), false, relativePath);
  }
});

test("rejects one unowned path", () => {
  const result = validatePhase4ImplementationScope({
    workspaceRoot: ROOT,
    checkGitScope: false,
    activePaths: ["apps/web/src/not-owned.ts"],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /unowned implementation path changed/);
});

test("rejects one protected path independently", () => {
  const result = validatePhase4ImplementationScope({
    workspaceRoot: ROOT,
    checkGitScope: false,
    activePaths: ["packages/providers/src/router.ts"],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /protected implementation path changed/);
});

for (const [name, from, to, expected] of [
  [
    "implementation-authority",
    '"implementation_authorized": true',
    '"implementation_authorized": false',
    /implementation_authorized/u,
  ],
  [
    "application-listener",
    '"application_listener": false',
    '"application_listener": true',
    /application_listener/u,
  ],
  [
    "test-listener",
    '"test_listener": true',
    '"test_listener": false',
    /test_listener/u,
  ],
  [
    "wildcard-bind",
    '"bind": "127.0.0.1"',
    '"bind": "0.0.0.0"',
    /test_listener_contract/u,
  ],
  [
    "fixed-port",
    '"port": "os-selected"',
    '"port": 8080',
    /test_listener_contract/u,
  ],
  [
    "listener-egress",
    '"external_egress": false',
    '"external_egress": true',
    /test_listener_contract/u,
  ],
  [
    "real-provider",
    '"real_provider_traffic_authorized": false',
    '"real_provider_traffic_authorized": true',
    /real_provider_traffic_authorized/u,
  ],
  [
    "real-data",
    '"real_data_authorized": false',
    '"real_data_authorized": true',
    /real_data_authorized/u,
  ],
  [
    "real-credentials",
    '"real_credentials_authorized": false',
    '"real_credentials_authorized": true',
    /real_credentials_authorized/u,
  ],
  [
    "activation",
    '"activation_authorized": false',
    '"activation_authorized": true',
    /activation_authorized/u,
  ],
  [
    "deployment",
    '"deployment_authorized": false',
    '"deployment_authorized": true',
    /deployment_authorized/u,
  ],
  [
    "cutover",
    '"cutover_authorized": false',
    '"cutover_authorized": true',
    /cutover_authorized/u,
  ],
]) {
  test(`rejects packet drift: ${name}`, () => {
    const root = fixture(name);
    mutatePacket(root, from, to);
    const result = validatePhase4ImplementationScope({
      workspaceRoot: root,
      checkGitScope: false,
      activePaths: [PACKET],
    });
    assert.equal(result.valid, false);
    assert.match(result.failures.join("\n"), expected);
  });
}

test("rejects omitted narrow existing-file ownership", () => {
  const root = fixture("omitted-owned-path");
  mutatePacket(root, '    "package-lock.json",\n', "");
  const result = validatePhase4ImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /owned_exact_paths/u);
});

test("rejects protected-array drift", () => {
  const root = fixture("protected-array-drift");
  mutatePacket(
    root,
    '"packages/contracts/src/storage.ts"',
    '"packages/contracts/src/storage-drift.ts"',
  );
  const result = validatePhase4ImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /protected_phase3_exact_paths/u);
});

for (const [name, source, expected] of [
  ["fetch", "export const run = () => fetch('/x');\n", /forbidden fetch/u],
  ["websocket", "export const socket = new WebSocket('ws://x');\n", /WebSocket/u],
  ["ambient-env", "export const token = process.env.API_TOKEN;\n", /process\.env/u],
  [
    "migration",
    "export const migration = new ConversationMigrationService();\n",
    /migration service/u,
  ],
  [
    "deep-import",
    "export { x } from '@latticework/storage/src/index.ts';\n",
    /deep import/u,
  ],
  [
    "application-listen",
    "import { createServer } from 'node:http';\ncreateServer().listen(0);\n",
    /application listener primitive/u,
  ],
]) {
  test(`rejects candidate source primitive: ${name}`, () => {
    const root = fixture(`source-${name}`);
    const relativePath = "packages/chat/src/forbidden.ts";
    write(root, relativePath, source);
    const result = validatePhase4ImplementationScope({
      workspaceRoot: root,
      checkGitScope: false,
      activePaths: [PACKET, relativePath],
    });
    assert.equal(result.valid, false);
    assert.match(result.failures.join("\n"), expected);
  });
}

test("accepts only the exact synthetic loopback port-zero listener shape", () => {
  const root = fixture("safe-listener");
  const relativePath = "tests/phase4/support/synthetic-stream-fixture.mjs";
  write(
    root,
    relativePath,
    [
      'import { createServer } from "node:http";',
      "export function start() {",
      "  const server = createServer((_request, response) => response.end('synthetic'));",
      "  server.listen(0, '127.0.0.1');",
      "  server.close();",
      "  return server;",
      "}",
      "",
    ].join("\n"),
  );
  const result = validatePhase4ImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET, relativePath],
  });
  assert.equal(result.valid, true, result.failures.join("\n"));
});

test("rejects a test listener without an explicit close lifecycle", () => {
  const root = fixture("listener-without-close");
  const relativePath = "tests/phase4/support/synthetic-stream-fixture.mjs";
  write(
    root,
    relativePath,
    [
      'import { createServer } from "node:http";',
      "const server = createServer((_request, response) => response.end('synthetic'));",
      "server.listen(0, '127.0.0.1');",
      "",
    ].join("\n"),
  );
  const result = validatePhase4ImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET, relativePath],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /explicit close lifecycle/u);
});

test("rejects unsafe test-listener source", () => {
  const root = fixture("unsafe-listener");
  const relativePath = "tests/phase4/support/synthetic-stream-fixture.mjs";
  write(
    root,
    relativePath,
    'import { createServer } from "node:http";\ncreateServer().listen(8080, "0.0.0.0");\n',
  );
  const result = validatePhase4ImplementationScope({
    workspaceRoot: root,
    checkGitScope: false,
    activePaths: [PACKET, relativePath],
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /exact loopback port 0/u);
});

test("CLI rejects base or scope overrides", () => {
  const validator = path.join(
    ROOT,
    "tools/reengineering/validate-phase4-implementation-scope.mjs",
  );
  for (const args of [
    ["--base", "HEAD"],
    ["--no-scope"],
    ["--check-git-scope", "false"],
  ]) {
    const result = spawnSync(process.execPath, [validator, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 2, `${args.join(" ")}: ${result.stdout}`);
    assert.match(result.stderr, /accepts no CLI base or scope overrides/u);
  }
});
