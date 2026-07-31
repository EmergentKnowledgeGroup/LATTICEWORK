import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isStrictDescendant,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";
import { collectActiveRangePaths } from "./git-scope-common.mjs";

const EXPECTED_PHASE5_BASE_COMMIT =
  "1b7e1d10456e0a1e9aaa91df25db17e236bbea3e";

const ALLOWED_PATHS = new Set([
  "PROJECT_STATE.md",
  "docs/agents/claims/LW-P4-001.md",
  "docs/agents/claims/LW-P5-CTRL-001.md",
  "docs/agents/claims/LW-P5-MEM-PREFLIGHT-001.md",
  "docs/agents/handoffs/LW-P4-001.md",
  "docs/agents/handoffs/LW-P5-CTRL-001.md",
  "docs/agents/handoffs/LW-P5-MEM-PREFLIGHT-001.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md",
  "reengineering/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "runtime/checkpoints/LATEST.md",
  "tests/reengineering/phase4-active-scope.test.mjs",
  "tests/reengineering/phase4-implementation-scope.test.mjs",
  "tests/reengineering/phase5-active-scope.test.mjs",
  "tests/reengineering/phase5-lattice-memory-preflight.test.mjs",
  "tools/reengineering/validate-phase4-active-scope.mjs",
  "tools/reengineering/validate-phase4-implementation-scope.mjs",
  "tools/reengineering/validate-phase5-active-scope.mjs",
  "tools/reengineering/validate-phase5-lattice-memory-preflight.mjs",
]);

const ALLOWED_PREFIXES = [
  "reengineering/evidence/phase-5/LW-P5-CTRL-001/",
  "reengineering/evidence/phase-5/LW-P5-MEM-PREFLIGHT-001/",
];

export function findUnauthorizedPhase5Paths(paths) {
  return [...new Set(paths)]
    .filter((relativePath) => {
      if (ALLOWED_PATHS.has(relativePath)) return false;
      return !ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
    })
    .sort();
}

export function validatePhase5ActiveScope({
  workspaceRoot,
  baseCommit = EXPECTED_PHASE5_BASE_COMMIT,
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
      failures.push(`Phase 5 base commit ${baseCommit} is not an ancestor of HEAD`);
    } else {
      try {
        inspectedPaths = collectActiveRangePaths(root, baseCommit);
      } catch (error) {
        failures.push(error.message);
      }
      for (const relativePath of findUnauthorizedPhase5Paths(inspectedPaths)) {
        failures.push(
          `unauthorized Phase 5 active-scope path: ${relativePath}`,
        );
      }
    }
  }

  return {
    schema: "latticework.phase5-active-scope-validation.v1",
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
        "canonical CLI validation always checks Git scope from the pinned Phase 5 base commit",
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
    const result = validatePhase5ActiveScope({ workspaceRoot });
    if (output) writeJson(output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
