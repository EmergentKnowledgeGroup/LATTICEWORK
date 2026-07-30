import { spawnSync } from "node:child_process";

function normalizeGitPath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/");
}

export function queryGitPaths(root, args, label) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "buffer",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString("utf8").trim();
    throw new Error(`${label} failed: ${stderr || "unknown Git error"}`);
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .map(normalizeGitPath)
    .filter(Boolean);
}

export function collectClosedRangePaths(root, baseCommit, terminalCommit) {
  const touched = queryGitPaths(
    root,
    [
      "log",
      "--format=",
      "--name-only",
      "-z",
      `${baseCommit}..${terminalCommit}`,
      "--",
    ],
    "closed-range commit-path query",
  );
  const terminalDiff = queryGitPaths(
    root,
    ["diff", "--name-only", "-z", baseCommit, terminalCommit, "--"],
    "closed-range terminal-tree query",
  );
  return [...new Set([...touched, ...terminalDiff])].sort();
}

export function collectActiveRangePaths(root, baseCommit) {
  const committed = collectClosedRangePaths(root, baseCommit, "HEAD");
  const working = queryGitPaths(
    root,
    ["diff", "--name-only", "-z", "--"],
    "working-tree changed-path query",
  );
  const staged = queryGitPaths(
    root,
    ["diff", "--cached", "--name-only", "-z", "--"],
    "index changed-path query",
  );
  const untracked = queryGitPaths(
    root,
    ["ls-files", "--others", "--exclude-standard", "-z"],
    "untracked-path query",
  );
  return [...new Set([...committed, ...working, ...staged, ...untracked])].sort();
}
