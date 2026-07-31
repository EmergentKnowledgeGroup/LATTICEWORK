import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  findUnauthorizedPhase5Paths,
  validatePhase5ActiveScope,
} from "../../tools/reengineering/validate-phase5-active-scope.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const SYNTHETIC_GIT_ROOT = path.join(
  REPO_ROOT,
  "runtime",
  "tmp",
  "phase5-git-scope-tests",
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

function initializeSyntheticRepository() {
  fs.mkdirSync(SYNTHETIC_GIT_ROOT, { recursive: true });
  git(SYNTHETIC_GIT_ROOT, ["init", "-b", "main"]);
  git(SYNTHETIC_GIT_ROOT, ["config", "user.email", "scope@example.invalid"]);
  git(SYNTHETIC_GIT_ROOT, ["config", "user.name", "Scope Test"]);
  writeSynthetic("PROJECT_STATE.md", "base\n");
  writeSynthetic("apps/web/working.ts", "base\n");
  writeSynthetic(".gitignore", "runtime/tmp/\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "."]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "phase4 terminal"]);
  return git(SYNTHETIC_GIT_ROOT, ["rev-parse", "HEAD"]);
}

test.afterEach(() => {
  assert.equal(
    path.dirname(SYNTHETIC_GIT_ROOT),
    path.join(REPO_ROOT, "runtime", "tmp"),
  );
  fs.rmSync(SYNTHETIC_GIT_ROOT, { recursive: true, force: true });
});

test("canonical Phase 5 active scope accepts the current control packet", () => {
  const result = validatePhase5ActiveScope({ workspaceRoot: REPO_ROOT });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(
    result.baseCommit,
    "1b7e1d10456e0a1e9aaa91df25db17e236bbea3e",
  );
  assert.equal(result.scopeChecked, true);
});

test("Phase 5 allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    findUnauthorizedPhase5Paths([
      "docs/agents/claims/LW-P5-CTRL-001.md",
      "docs/agents/claims/LW-P5-MEM-CHAR-001.md",
      "tests/characterization/specs/phase5-lattice-memory.spec.mjs",
      "tools/reengineering/validate-phase5-active-scope.mjs",
      "reengineering/evidence/phase-5/LW-P5-CTRL-001/summary.json",
      "reengineering/evidence/phase-5/LW-P5-MEM-CHAR-001/summary.json",
      "apps/web/src/unauthorized.ts",
      "packages/providers/src/unauthorized.ts",
      "runtime/tmp/private.json",
    ]),
    [
      "apps/web/src/unauthorized.ts",
      "packages/providers/src/unauthorized.ts",
      "runtime/tmp/private.json",
    ],
  );
});

test("Phase 5 active scope sees committed, staged, unstaged, untracked, and force-added ignored paths", () => {
  const base = initializeSyntheticRepository();

  writeSynthetic("apps/web/committed.ts", "committed\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "."]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "unauthorized committed"]);
  writeSynthetic("apps/web/working.ts", "unstaged\n");
  writeSynthetic("packages/providers/staged.ts", "staged\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "packages/providers/staged.ts"]);
  writeSynthetic("modules/untracked.js", "untracked\n");
  writeSynthetic("runtime/tmp/forced.json", "{}\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "-f", "runtime/tmp/forced.json"]);

  const result = validatePhase5ActiveScope({
    workspaceRoot: SYNTHETIC_GIT_ROOT,
    baseCommit: base,
  });
  assert.equal(result.valid, false);
  for (const expected of [
    "apps/web/committed.ts",
    "apps/web/working.ts",
    "modules/untracked.js",
    "packages/providers/staged.ts",
    "runtime/tmp/forced.json",
  ]) {
    assert.match(
      result.failures.join("\n"),
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("Phase 5 active scope retains committed add-then-delete paths", () => {
  const base = initializeSyntheticRepository();
  writeSynthetic("apps/web/ephemeral.ts", "unauthorized\n");
  git(SYNTHETIC_GIT_ROOT, ["add", "."]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "add unauthorized"]);
  fs.rmSync(path.join(SYNTHETIC_GIT_ROOT, "apps", "web", "ephemeral.ts"));
  git(SYNTHETIC_GIT_ROOT, ["add", "-u"]);
  git(SYNTHETIC_GIT_ROOT, ["commit", "-m", "delete unauthorized"]);

  const result = validatePhase5ActiveScope({
    workspaceRoot: SYNTHETIC_GIT_ROOT,
    baseCommit: base,
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /apps\/web\/ephemeral\.ts/);
});

test("canonical Phase 5 active-scope CLI cannot disable or rebase validation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "tools/reengineering/validate-phase5-active-scope.mjs",
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
    /always checks Git scope from the pinned Phase 5 base commit/i,
  );
});
