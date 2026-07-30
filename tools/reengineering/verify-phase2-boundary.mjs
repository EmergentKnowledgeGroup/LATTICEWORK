#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { findReparsePoint, isStrictDescendant, parseNamedArgs, sha256File, writeJson } from "./evidence-common.mjs";

const PROTECTED_PATHS = [
  "app.html",
  "index.html",
  "docs/app.html",
  "docs/sw.js",
  "sw.js",
  "server.js",
  "server.py",
  "tests/smoke.js",
];

const FORBIDDEN_RUNTIME_PATTERNS = [
  ["localStorage", /\blocalStorage\b/],
  ["sessionStorage", /\bsessionStorage\b/],
  ["indexedDB", /\bindexedDB\b/],
  ["Cache Storage", /\bcaches\b/],
  ["service worker", /\bserviceWorker\b/],
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\b/],
  ["WebRTC", /\bRTCPeerConnection\b/],
  ["WebTransport", /\bWebTransport\b/],
  ["BroadcastChannel", /\bBroadcastChannel\b/],
  ["WebGPU", /\bnavigator\.gpu\b/],
  ["AudioContext", /\bAudioContext\b/],
  ["File System Access", /\bshowOpenFilePicker\b/],
  ["clipboard", /\bclipboard\b/],
  ["notifications", /\bNotification\b/],
];

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    exit_code: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function walkSource(directory, failures, workspaceRoot) {
  if (!fs.existsSync(directory)) return [];
  if (findReparsePoint(directory, workspaceRoot)) {
    failures.push(`candidate source directory traverses symbolic link or junction: ${directory}`);
    return [];
  }
  const files = [];
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (fs.lstatSync(entryPath).isSymbolicLink()) {
      failures.push(`candidate source traversal encountered symbolic link or junction: ${entryPath}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...walkSource(entryPath, failures, workspaceRoot));
    } else if (entry.isFile() && /\.(?:ts|js|mjs|html|css)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

export function verifyPhase2Boundary({
  workspaceRoot,
  baselineRoot,
  baselineSha,
  outputPath,
}) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedBaseline = path.resolve(baselineRoot);
  const resolvedOutput = path.resolve(outputPath);
  if (!isStrictDescendant(resolvedOutput, resolvedWorkspace)) {
    throw new Error(`Boundary summary must be a strict repository descendant: ${resolvedOutput}`);
  }

  const failures = [];
  const head = runGit(["rev-parse", "HEAD"], resolvedBaseline);
  const status = runGit(["status", "--porcelain"], resolvedBaseline);
  if (head.exit_code !== 0 || head.stdout !== baselineSha) {
    failures.push(
      `immutable baseline HEAD mismatch: expected ${baselineSha}; observed ${head.stdout || "unavailable"}`,
    );
  }
  if (status.exit_code !== 0 || status.stdout) {
    failures.push("immutable baseline worktree is dirty or unreadable");
  }

  const protectedFiles = [];
  for (const relativePath of PROTECTED_PATHS) {
    const workspacePath = path.join(resolvedWorkspace, relativePath);
    const baselinePath = path.join(resolvedBaseline, relativePath);
    if (!fs.existsSync(workspacePath) || !fs.existsSync(baselinePath)) {
      failures.push(`protected file is missing: ${relativePath}`);
      continue;
    }
    if (findReparsePoint(workspacePath, resolvedWorkspace) || findReparsePoint(baselinePath, resolvedBaseline)) {
      failures.push(`protected file traverses symbolic link or junction: ${relativePath}`);
      continue;
    }
    const workspaceHash = sha256File(workspacePath);
    const baselineHash = sha256File(baselinePath);
    const matches = workspaceHash === baselineHash;
    if (!matches) {
      failures.push(`protected file differs from immutable baseline: ${relativePath}`);
    }
    protectedFiles.push({
      path: relativePath,
      workspace_sha256: workspaceHash,
      baseline_sha256: baselineHash,
      matches,
    });
  }

  const sourceViolations = [];
  const candidateRoots = [
    path.join(resolvedWorkspace, "apps", "web", "src"),
    path.join(resolvedWorkspace, "packages", "contracts", "src"),
    path.join(resolvedWorkspace, "packages", "kernel", "src"),
  ];
  for (const filePath of candidateRoots.flatMap((directory) => walkSource(directory, failures, resolvedWorkspace))) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const [label, pattern] of FORBIDDEN_RUNTIME_PATTERNS) {
      if (pattern.test(text)) {
        sourceViolations.push({
          path: path.relative(resolvedWorkspace, filePath).replaceAll("\\", "/"),
          boundary: label,
        });
      }
    }
    if (/from\s+["'][^"']*(?:docs\/|modules\/|app\.html|sw\.js)/.test(text)) {
      sourceViolations.push({
        path: path.relative(resolvedWorkspace, filePath).replaceAll("\\", "/"),
        boundary: "legacy runtime import",
      });
    }
  }
  if (sourceViolations.length > 0) {
    failures.push(`candidate source has ${sourceViolations.length} forbidden boundary reference(s)`);
  }

  const summary = {
    schema: "latticework.phase2-boundary.v1",
    evidence_label: "MEASURED",
    captured_at: new Date().toISOString(),
    valid: failures.length === 0,
    workspace_root: resolvedWorkspace,
    baseline: {
      root: resolvedBaseline,
      expected_sha: baselineSha,
      observed_sha: head.stdout || null,
      clean: status.exit_code === 0 && !status.stdout,
    },
    protected_files: protectedFiles,
    source_violations: sourceViolations,
    failures,
  };
  writeJson(resolvedOutput, summary);
  return summary;
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) {
      throw new Error("This verifier does not accept a command after --");
    }
    if (
      !options["workspace-root"] ||
      !options["baseline-root"] ||
      !options["baseline-sha"] ||
      !options.output
    ) {
      throw new Error(
        "Usage: verify-phase2-boundary.mjs --workspace-root PATH --baseline-root PATH --baseline-sha SHA --output PATH",
      );
    }
    const summary = verifyPhase2Boundary({
      workspaceRoot: options["workspace-root"],
      baselineRoot: options["baseline-root"],
      baselineSha: options["baseline-sha"],
      outputPath: options.output,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = summary.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
