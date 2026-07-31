import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isStrictDescendant,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";
import { collectActiveRangePaths } from "./git-scope-common.mjs";

const EXPECTED_PHASE4_BASE_COMMIT =
  "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd";

const ALLOWED_PATHS = new Set([
  "PROJECT_STATE.md",
  "ROADMAP.md",
  "docs/agents/claims/LW-P4-CTRL-001.md",
  "docs/agents/claims/LW-P4-PREFLIGHT-001.md",
  "docs/agents/claims/LW-P4-CHAR-001.md",
  "docs/agents/claims/LW-P4-AMEND-001.md",
  "docs/agents/claims/LW-P4-RETEST-001.md",
  "docs/agents/handoffs/LW-P4-CTRL-001.md",
  "docs/agents/handoffs/LW-P4-PREFLIGHT-001.md",
  "docs/agents/handoffs/LW-P4-CHAR-001.md",
  "docs/agents/handoffs/LW-P4-AMEND-001.md",
  "docs/COMPATIBILITY.md",
  "reengineering/MIGRATION_LEDGER.md",
  "reengineering/PARITY_MATRIX.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/PHASE4_PREFLIGHT.md",
  "reengineering/PHASE4_CHARACTERIZATION_AMENDMENT.md",
  "reengineering/PHASE4_IMPLEMENTATION_PACKET.md",
  "reengineering/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "runtime/checkpoints/LATEST.md",
  "tests/characterization/fixtures/phase4-chat-contract.json",
  "tests/characterization/specs/phase4-chat.spec.mjs",
  "tests/characterization/support/phase4-chat.mjs",
  "tests/characterization/support/phase4-loopback-stream.mjs",
  "tests/reengineering/phase3-decision-packet.test.mjs",
  "tests/reengineering/phase3-preflight.test.mjs",
  "tests/reengineering/phase4-active-scope.test.mjs",
  "tests/reengineering/phase4-characterization-validation.test.mjs",
  "tests/reengineering/phase4-amendment.test.mjs",
  "tests/reengineering/phase4-amended-characterization-validation.test.mjs",
  "tests/reengineering/phase4-loopback-stream.test.mjs",
  "tools/reengineering/git-scope-common.mjs",
  "tools/reengineering/run-phase4-characterization.ps1",
  "tools/reengineering/run-phase4-amendment-retests.ps1",
  "tools/reengineering/promote-phase4-amendment-retests.mjs",
  "tools/reengineering/validate-phase3-decision-packet.mjs",
  "tools/reengineering/validate-phase3-preflight.mjs",
  "tools/reengineering/validate-phase4-active-scope.mjs",
  "tools/reengineering/validate-phase4-characterization.mjs",
  "tools/reengineering/validate-phase4-amendment.mjs",
  "tools/reengineering/validate-phase4-amended-characterization.mjs",
]);

const ALLOWED_PREFIXES = [
  "reengineering/evidence/phase-4/LW-P4-CTRL-001/",
  "reengineering/evidence/phase-4/LW-P4-PREFLIGHT-001/",
  "reengineering/evidence/phase-4/LW-P4-CHAR-001/",
  "reengineering/evidence/phase-4/LW-P4-AMEND-001/",
  "reengineering/evidence/phase-4/LW-P4-RETEST-001/",
];

export function findUnauthorizedPhase4Paths(paths) {
  return [...new Set(paths)]
    .filter((relativePath) => {
      if (ALLOWED_PATHS.has(relativePath)) return false;
      return !ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
    })
    .sort();
}

export function validatePhase4ActiveScope({
  workspaceRoot,
  baseCommit = EXPECTED_PHASE4_BASE_COMMIT,
  checkGitScope = true,
}) {
  const root = path.resolve(workspaceRoot);
  const failures = [];
  let inspectedPaths = [];

  if (checkGitScope) {
    const ancestry = spawnSync(
      "git",
      ["merge-base", "--is-ancestor", baseCommit, "HEAD"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    );
    if (ancestry.status !== 0) {
      failures.push(`Phase 4 base commit ${baseCommit} is not an ancestor of HEAD`);
    } else {
      try {
        inspectedPaths = collectActiveRangePaths(root, baseCommit);
      } catch (error) {
        failures.push(error.message);
      }
      for (const relativePath of findUnauthorizedPhase4Paths(inspectedPaths)) {
        failures.push(
          `unauthorized Phase 4 active-scope path: ${relativePath}`,
        );
      }
    }
  }

  return {
    schema: "latticework.phase4-active-scope-validation.v1",
    valid: failures.length === 0,
    scopeChecked: checkGitScope,
    baseCommit: checkGitScope ? baseCommit : null,
    inspectedPathCount: new Set(inspectedPaths).size,
    allowedExactPaths: ALLOWED_PATHS.size,
    allowedPrefixes: ALLOWED_PREFIXES.length,
    failures,
  };
}

function isMain() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  );
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) throw new Error("Unexpected command arguments");
    if (
      Object.prototype.hasOwnProperty.call(options, "check-git-scope") ||
      Object.prototype.hasOwnProperty.call(options, "base-sha")
    ) {
      throw new Error(
        "canonical CLI validation always checks Git scope from the pinned Phase 4 base commit",
      );
    }
    const workspaceRoot = options["workspace-root"]
      ? path.resolve(options["workspace-root"])
      : process.cwd();
    const output = options.output
      ? path.resolve(workspaceRoot, options.output)
      : null;
    if (output && !isStrictDescendant(output, workspaceRoot)) {
      throw new Error("output path must be a strict workspace descendant");
    }
    const result = validatePhase4ActiveScope({ workspaceRoot });
    if (output) writeJson(output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
