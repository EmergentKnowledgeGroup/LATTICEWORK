import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  findUnauthorizedPhase4Paths,
  validatePhase4ActiveScope,
} from "../../tools/reengineering/validate-phase4-active-scope.mjs";
import {
  collectActiveRangePaths,
  collectClosedRangePaths,
} from "../../tools/reengineering/git-scope-common.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const SYNTHETIC_GIT_ROOT = path.join(
  REPO_ROOT,
  "runtime",
  "tmp",
  "phase4-git-scope-tests",
);

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(
    result.status,
    0,
    `${args.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
  return result.stdout.trim();
}

function writeSynthetic(relativePath, value) {
  const destination = path.join(SYNTHETIC_GIT_ROOT, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, value, "utf8");
}

test.afterEach(() => {
  assert.equal(
    path.dirname(SYNTHETIC_GIT_ROOT),
    path.join(REPO_ROOT, "runtime", "tmp"),
  );
  fs.rmSync(SYNTHETIC_GIT_ROOT, { recursive: true, force: true });
});

test("canonical Phase 4 active scope accepts the currently claimed packet", () => {
  const result = validatePhase4ActiveScope({ workspaceRoot: REPO_ROOT });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(
    result.baseCommit,
    "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd",
  );
  assert.equal(result.scopeChecked, true);
});

test("active scope rejects unauthorized tracked and untracked path classes", () => {
  assert.deepEqual(
    findUnauthorizedPhase4Paths([
      "apps/web/src/unauthorized.ts",
      "packages/providers/src/unauthorized.ts",
      "reengineering/PHASE4_PREFLIGHT.md",
      "runtime/tmp/phase4-characterization/run-id/raw.json",
      "docs/agents/claims/LW-P4-CHAR-001.md",
      "docs/agents/claims/LW-P4-IMPL-PREFLIGHT-001.md",
      "docs/agents/handoffs/LW-P4-RETEST-001.md",
      "docs/agents/handoffs/LW-P4-IMPL-PREFLIGHT-001.md",
      "docs/TESTING_AND_VERIFICATION.md",
      "tests/characterization/specs/phase4-chat.spec.mjs",
      "tests/characterization/support/phase4-loopback-stream.mjs",
      "tools/reengineering/validate-phase4-characterization.mjs",
      "tools/reengineering/validate-phase4-amended-characterization.mjs",
      "tools/reengineering/validate-phase4-implementation-scope.mjs",
      "tests/reengineering/phase4-implementation-scope.test.mjs",
      "reengineering/evidence/phase-4/LW-P4-CHAR-001/summary.json",
      "reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json",
    ]),
    [
      "apps/web/src/unauthorized.ts",
      "packages/providers/src/unauthorized.ts",
      "runtime/tmp/phase4-characterization/run-id/raw.json",
    ],
  );
});

test("Git range collection retains add-then-delete paths and all active states", () => {
  fs.mkdirSync(SYNTHETIC_GIT_ROOT, { recursive: true });
  git(SYNTHETIC_GIT_ROOT, ["init", "-b", "main"]);
  git(SYNTHETIC_GIT_ROOT, ["config", "user.email", "scope@example.invalid"]);
  git(SYNTHETIC_GIT_ROOT, ["config", "user.name", "Scope Test"]);
  writeSynthetic("apps/web/working.ts", "base\n");
  writeSynthetic("PROJECT_STATE.md", "base\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "."]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "base"]);
  const base = git(SYNTHETIC_GIT_ROOT, ["rev-parse", "HEAD"]);

  writeSynthetic("apps/web/ephemeral.ts", "unauthorized\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "."]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "add unauthorized"]);
  fs.rmSync(path.join(SYNTHETIC_GIT_ROOT, "apps", "web", "ephemeral.ts"));
  git(SYNTHETIC_GIT_ROOT, ["add", "-u"]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "delete unauthorized"]);
  const terminal = git(SYNTHETIC_GIT_ROOT, ["rev-parse", "HEAD"]);

  assert.ok(
    collectClosedRangePaths(SYNTHETIC_GIT_ROOT, base, terminal).includes(
      "apps/web/ephemeral.ts",
    ),
  );

  writeSynthetic("apps/web/working.ts", "unstaged\n");
  writeSynthetic("packages/providers/staged.ts", "staged\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "packages/providers/staged.ts"]);
  writeSynthetic("runtime/tmp/private-trace.json", "{}\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "-f", "runtime/tmp/private-trace.json"]);
  writeSynthetic("modules/untracked.js", "untracked\n");

  const activePaths = collectActiveRangePaths(SYNTHETIC_GIT_ROOT, base);
  for (const expected of [
    "apps/web/ephemeral.ts",
    "apps/web/working.ts",
    "modules/untracked.js",
    "packages/providers/staged.ts",
    "runtime/tmp/private-trace.json",
  ]) {
    assert.ok(activePaths.includes(expected), `missing active path ${expected}`);
  }
  assert.ok(
    findUnauthorizedPhase4Paths(activePaths).includes(
      "runtime/tmp/private-trace.json",
    ),
  );
});

test("active scope rejects a real current untracked unauthorized path", () => {
  const negativePath = path.join(
    REPO_ROOT,
    "reengineering",
    "PHASE4_ACTIVE_SCOPE_NEGATIVE.tmp",
  );
  fs.writeFileSync(negativePath, "negative control\n", "utf8");
  try {
    const result = validatePhase4ActiveScope({ workspaceRoot: REPO_ROOT });
    assert.equal(result.valid, false);
    assert.match(
      result.failures.join("\n"),
      /unauthorized Phase 4 active-scope path.*PHASE4_ACTIVE_SCOPE_NEGATIVE\.tmp/i,
    );
  } finally {
    fs.rmSync(negativePath, { force: true });
  }
});

test("canonical Phase 4 active-scope CLI cannot disable or rebase validation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "tools/reengineering/validate-phase4-active-scope.mjs",
      "--check-git-scope",
      "false",
      "--base-sha",
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
    /always checks Git scope from the pinned Phase 4 base commit/i,
  );
});
