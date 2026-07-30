import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase3Preflight } from "../../tools/reengineering/validate-phase3-preflight.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase3-preflight-tests");
const REQUIRED_FILES = [
  "reengineering/PHASE3_PREFLIGHT.json",
  "reengineering/PHASE3_PREFLIGHT.md",
];

function copyFile(relativePath, fixtureRoot) {
  const destination = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, relativePath), destination);
}

function createFixture(name) {
  const fixtureRoot = path.join(TEST_ROOT, name);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  for (const relativePath of REQUIRED_FILES) copyFile(relativePath, fixtureRoot);
  return fixtureRoot;
}

function readJson(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "reengineering", "PHASE3_PREFLIGHT.json"), "utf8"),
  );
}

function writeJson(root, value) {
  fs.writeFileSync(
    path.join(root, "reengineering", "PHASE3_PREFLIGHT.json"),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

test.after(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

test("canonical Phase 3 preflight freezes the accepted bounded implementation slice", () => {
  const result = validatePhase3Preflight({
    workspaceRoot: REPO_ROOT,
    checkGitScope: true,
  });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.status, "ACCEPTED_FOR_BOUNDED_EXECUTION");
  assert.equal(result.implementationAuthorized, true);
  assert.equal(result.gitScopeChecked, true);
  assert.equal(
    result.gitScopeBase,
    "93a36626f786a880210c53b8486c961e8b86e9ea",
  );
  assert.equal(
    result.gitScopeTerminal,
    "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd",
  );
  assert.deepEqual(result.checks, {
    packages: 2,
    requiredAcceptedAdrs: 2,
    namespaces: 3,
    requiredGates: 12,
    forbiddenPathPrefixes: 15,
  });
});

test("preflight rejects implementation authority without the accepted disposition", () => {
  const root = createFixture("authority");
  const packet = readJson(root);
  packet.authority.maintainer_disposition = "PENDING";
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /accepted implementation authority/i);
});

const unsafeMutations = [
  [
    "real user data",
    (packet) => {
      packet.safety.real_user_data = "allowed";
    },
  ],
  [
    "real provider traffic",
    (packet) => {
      packet.safety.real_provider_traffic = "allowed";
    },
  ],
  [
    "real credentials",
    (packet) => {
      packet.safety.real_credentials = "allowed";
    },
  ],
  [
    "a Phase 3 listener",
    (packet) => {
      packet.safety.listener = "loopback";
    },
  ],
  [
    "a candidate cutover",
    (packet) => {
      packet.safety.cutover = "allowed";
    },
  ],
  [
    "legacy mutation",
    (packet) => {
      packet.safety.legacy_mutation = "allowed";
    },
  ],
];

for (const [label, mutate] of unsafeMutations) {
  test(`preflight rejects ${label}`, () => {
    const root = createFixture(`unsafe-${label.replaceAll(" ", "-")}`);
    const packet = readJson(root);
    mutate(packet);
    writeJson(root, packet);

    const result = validatePhase3Preflight({
      workspaceRoot: root,
      checkGitScope: false,
    });

    assert.equal(result.valid, false);
    assert.match(result.failures.join("\n"), /safety boundary/i);
  });
}

test("preflight rejects drift in the conversation dataset contract", () => {
  const root = createFixture("dataset-drift");
  const packet = readJson(root);
  packet.storage.dataset.id = "conversation-v1";
  packet.storage.dataset.owned_legacy_stores.push("meta");
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /conversation dataset contract/i);
});

test("preflight rejects weakened provider identity, retry, or egress rules", () => {
  const root = createFixture("provider-weakened");
  const packet = readJson(root);
  packet.providers.retry.default_count = 1;
  packet.providers.identity.attempt_id = "stable";
  packet.providers.credentials.resolve_after_grant = false;
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /provider contract/i);
});

test("preflight rejects an owned implementation path outside the frozen package surface", () => {
  const root = createFixture("owned-path");
  const packet = readJson(root);
  packet.scope.implementation_owned_paths.push("apps/web/src/main.ts");
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /owned implementation paths/i);
});

test("preflight rejects a removed legacy no-touch prefix", () => {
  const root = createFixture("no-touch");
  const packet = readJson(root);
  packet.scope.forbidden_path_prefixes =
    packet.scope.forbidden_path_prefixes.filter((item) => item !== "modules/");
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /forbidden path prefixes/i);
});

test("preflight rejects a missing required verification gate", () => {
  const root = createFixture("gate");
  const packet = readJson(root);
  packet.verification.required_gates =
    packet.verification.required_gates.filter((item) => item !== "independent-clean-worktree");
  writeJson(root, packet);

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /required verification gates/i);
});

test("preflight rejects Markdown projection drift", () => {
  const root = createFixture("markdown-drift");
  const markdownPath = path.join(root, "reengineering", "PHASE3_PREFLIGHT.md");
  const markdown = fs.readFileSync(markdownPath, "utf8");
  fs.writeFileSync(
    markdownPath,
    markdown.replace("real provider traffic: forbidden", "real provider traffic: allowed"),
    "utf8",
  );

  const result = validatePhase3Preflight({
    workspaceRoot: root,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /Markdown projection/i);
});

test("canonical CLI cannot disable or rebase Git scope validation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "tools/reengineering/validate-phase3-preflight.mjs",
      "--check-git-scope",
      "false",
      "--base-sha",
      "HEAD",
      "--terminal-sha",
      "HEAD",
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 2);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /always checks Git scope from the pinned preflight base and terminal commits/i,
  );
});

test("preflight closed historical scope still rejects an over-broad earlier range", () => {
  const result = validatePhase3Preflight({
    workspaceRoot: REPO_ROOT,
    checkGitScope: true,
    gitScopeBase: "e7585999fc1af2707f410ae87356cf2b52e08d9c",
    gitScopeTerminal: "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd",
  });

  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /accepted implementation scope contains an unauthorized path/i,
  );
});

test("preflight closed historical scope rejects a non-ancestor terminal", () => {
  const result = validatePhase3Preflight({
    workspaceRoot: REPO_ROOT,
    checkGitScope: true,
    gitScopeTerminal: "0000000000000000000000000000000000000000",
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /terminal commit|ancestor/i);
});
