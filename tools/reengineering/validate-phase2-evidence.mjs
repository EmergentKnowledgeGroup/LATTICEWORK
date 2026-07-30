#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isStrictDescendant,
  findReparsePoint,
  parseNamedArgs,
  sha256File,
  writeJson,
} from "./evidence-common.mjs";

const WORK_ID = "LW-P2-001";
const COMMAND_DIRECTORIES = [
  "environment", "lockfile-generate", "install", "typecheck", "unit", "controls",
  "build-1", "build-2", "build-comparison", "browser-install", "browser", "audit",
  "sbom", "supply-chain", "boundary", "control-validator",
];
const PROTECTED_PATHS = [
  "app.html", "index.html", "docs/app.html", "docs/sw.js", "sw.js", "server.js", "server.py", "tests/smoke.js",
];
const REQUIRED_BROWSER_ARTIFACTS = [
  "candidate-browser-boundary.json", "candidate-performance.json",
  "candidate-desktop.png", "candidate-desktop-aria.yml",
  "candidate-mobile-390x844.png", "candidate-mobile-390x844-aria.yml",
  "candidate-forced-colors.png", "candidate-forced-colors-aria.yml",
];
const SECRET_PATTERNS = [
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /\bgh[pous]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:PRIVATE|SECRET)_(?:SENTINEL|TOKEN|KEY)(?:_[A-Z0-9_]+)?\b/,
];

function assertDescendant(target, root, label) {
  if (!isStrictDescendant(target, root)) {
    throw new Error(`${label} must be a strict repository descendant: ${path.resolve(target)}`);
  }
}

function readJson(filePath, failures, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function findNamedFilePaths(directory, names, failures) {
  const wanted = new Set(names);
  const found = new Map();
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      const stats = fs.lstatSync(target);
      if (stats.isSymbolicLink()) {
        failures.push(`browser evidence traverses symbolic link or junction: ${target}`);
        continue;
      }
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile() && wanted.has(entry.name) && !found.has(entry.name)) {
        found.set(entry.name, target);
      }
    }
  }
  if (fs.existsSync(directory)) {
    if (fs.lstatSync(directory).isSymbolicLink()) {
      failures.push(`browser evidence traverses symbolic link or junction: ${directory}`);
    } else {
      walk(directory);
    }
  }
  return found;
}

function validateBrowserEvidence(foundBrowser, failures) {
  const boundaryPath = foundBrowser.get("candidate-browser-boundary.json");
  if (boundaryPath) {
    const receipt = readJson(boundaryPath, failures, "candidate browser boundary receipt");
    const browserBoundary = receipt?.browserBoundary;
    const runtimeState = receipt?.runtimeState;
    for (const key of [
      "blockedCapabilities",
      "blockedOutOfOriginRequests",
      "consoleErrors",
      "openedWebSockets",
      "outOfOriginRequests",
      "pageErrors",
    ]) {
      if (!Array.isArray(browserBoundary?.[key]) || browserBoundary[key].length !== 0) {
        failures.push(`candidate browser boundary ${key} must be an empty array`);
      }
    }
    if (
      !Array.isArray(browserBoundary?.sameOriginRequests) ||
      browserBoundary.sameOriginRequests.length !== 3
    ) {
      failures.push("candidate browser boundary must record exactly three same-origin requests");
    }
    if (
      !runtimeState ||
      !Array.isArray(runtimeState.cacheNames) ||
      runtimeState.cacheNames.length !== 0 ||
      !Array.isArray(runtimeState.indexedDatabases) ||
      runtimeState.indexedDatabases.length !== 0 ||
      runtimeState.localStorageEntries !== 0 ||
      runtimeState.sessionStorageEntries !== 0 ||
      !Array.isArray(runtimeState.serviceWorkers) ||
      runtimeState.serviceWorkers.length !== 0
    ) {
      failures.push("candidate browser runtime state must contain no durable storage or service worker");
    }
  }

  const performancePath = foundBrowser.get("candidate-performance.json");
  if (performancePath) {
    const receipt = readJson(performancePath, failures, "candidate performance receipt");
    if (
      !receipt ||
      typeof receipt.domContentLoaded !== "number" ||
      receipt.domContentLoaded > 2_000 ||
      typeof receipt.load !== "number" ||
      receipt.load > 2_250 ||
      typeof receipt.transferSize !== "number" ||
      receipt.transferSize > 3_000_000 ||
      receipt.longTaskCount !== 0
    ) {
      failures.push("candidate performance receipt exceeds the provisional Phase 2 ceilings");
    }
  }
}

function validateManifest(directory, manifest, failures) {
  if (!manifest || manifest.schema !== "latticework.evidence.artifact-bundle.v1") {
    failures.push("manifest schema must be latticework.evidence.artifact-bundle.v1");
    return;
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    failures.push("manifest must list at least one artifact");
    return;
  }
  const seen = new Set();
  for (const artifact of manifest.artifacts) {
    if (!artifact || typeof artifact.path !== "string" || !Number.isInteger(artifact.bytes) || artifact.bytes < 0 || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? "")) {
      failures.push("manifest artifact has an invalid path, byte count, or SHA-256");
      continue;
    }
    if (seen.has(artifact.path)) failures.push(`manifest lists duplicate artifact: ${artifact.path}`);
    seen.add(artifact.path);
    const target = path.resolve(directory, artifact.path);
    if (!isStrictDescendant(target, directory) || path.isAbsolute(artifact.path) || artifact.path.includes("\\") || artifact.path.split("/").includes("..")) {
      failures.push(`manifest artifact escapes bundle: ${artifact.path}`);
      continue;
    }
    if (!fs.existsSync(target)) {
      failures.push(`manifest artifact is missing: ${artifact.path}`);
      continue;
    }
    const reparse = findReparsePoint(target, directory);
    if (reparse) {
      failures.push(`manifest artifact traverses symlink or reparse point: ${artifact.path}`);
      continue;
    }
    const stats = fs.statSync(target);
    if (!stats.isFile()) {
      failures.push(`manifest artifact is not a regular file: ${artifact.path}`);
      continue;
    }
    if (stats.size !== artifact.bytes) failures.push(`manifest byte count mismatch: ${artifact.path}`);
    if (sha256File(target) !== artifact.sha256) failures.push(`manifest SHA-256 mismatch: ${artifact.path}`);
  }
}

function validateReceipts(directory, baselineSha, candidateSha, failures) {
  for (const commandDirectory of COMMAND_DIRECTORIES) {
    const receipt = path.join(directory, "commands", commandDirectory, "manifest.json");
    if (!fs.existsSync(receipt)) {
      failures.push(`missing command receipt: commands/${commandDirectory}/manifest.json`);
      continue;
    }
    const value = readJson(receipt, failures, `command receipt ${commandDirectory}`);
    if (!value) continue;
    if (value.schema !== "latticework.evidence.command.v1") {
      failures.push(`command receipt ${commandDirectory} has an invalid schema`);
    }
    if (value.exit_code !== 0) failures.push(`command receipt ${commandDirectory} did not exit 0`);
    if (value.baseline_sha !== baselineSha || value.candidate_sha !== candidateSha) {
      failures.push(`command receipt ${commandDirectory} commit identity mismatch`);
    }
  }
}

function validateTextSafety(directory, manifest, failures) {
  const knownBinaryExtensions = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".wasm",
  ]);
  for (const artifact of manifest?.artifacts ?? []) {
    if (!artifact || typeof artifact.path !== "string") continue;
    const target = path.resolve(directory, artifact.path);
    if (!isStrictDescendant(target, directory) || !fs.existsSync(target)) continue;
    if (knownBinaryExtensions.has(path.extname(target).toLowerCase())) continue;
    const text = fs.readFileSync(target).toString("utf8").replaceAll("\0", "");
    if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
      failures.push(`obvious sentinel or secret text found in artifact: ${artifact.path}`);
    }
  }
}

export function validatePhase2Evidence({ directory, workspaceRoot, baselineSha, candidateSha, outputPath = null }) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedDirectory = path.resolve(directory);
  assertDescendant(resolvedDirectory, resolvedWorkspace, "evidence directory");
  if (outputPath) assertDescendant(path.resolve(outputPath), resolvedWorkspace, "output path");
  if (!fs.existsSync(resolvedDirectory) || !fs.statSync(resolvedDirectory).isDirectory()) {
    throw new Error(`evidence directory does not exist: ${resolvedDirectory}`);
  }
  const rootReparse = findReparsePoint(resolvedDirectory, resolvedWorkspace);
  const failures = [];
  if (rootReparse) failures.push(`evidence directory traverses symlink or reparse point: ${rootReparse}`);

  const manifest = readJson(path.join(resolvedDirectory, "manifest.json"), failures, "manifest.json");
  validateManifest(resolvedDirectory, manifest, failures);
  if (manifest?.receipt_id !== WORK_ID || manifest?.baseline_sha !== baselineSha || manifest?.candidate_sha !== candidateSha) {
    failures.push("manifest work or commit identity mismatch");
  }

  const summary = readJson(path.join(resolvedDirectory, "summary.json"), failures, "summary.json");
  if (!summary || summary.schema !== "latticework.phase2-summary.v1" || summary.valid !== true || summary.work_id !== WORK_ID || summary.baseline_sha !== baselineSha || summary.candidate_sha !== candidateSha || summary.lockfile_reproducible !== true) {
    failures.push("summary schema, validity, work ID, or commit identity mismatch");
  }
  const browser = summary?.browser;
  if (!browser || browser.expected !== 6 || browser.unexpected !== 0 || browser.skipped !== 0 || browser.flaky !== 0) {
    failures.push("summary browser stats must be exactly 6 expected and 0 unexpected/skipped/flaky");
  }

  const build = readJson(path.join(resolvedDirectory, "build-comparison.json"), failures, "build-comparison.json");
  if (!build || build.valid !== true || build.schema !== "latticework.phase2-build-comparison.v1") failures.push("build comparison must be valid");
  for (const entry of [...(build?.first?.files ?? []), ...(build?.second?.files ?? [])]) {
    if (/\.(?:js|css)$/.test(entry?.path ?? "") && (!Number.isInteger(entry.bytes) || entry.bytes <= 0 || !Number.isInteger(entry.gzip_bytes) || entry.gzip_bytes <= 0 || !Number.isInteger(entry.brotli_bytes) || entry.brotli_bytes <= 0)) failures.push(`build JS/CSS size receipt is invalid: ${entry?.path ?? "unknown"}`);
  }

  const lockfileComparison = readJson(
    path.join(resolvedDirectory, "lockfile-comparison.json"),
    failures,
    "lockfile-comparison.json",
  );
  const lockfileSnapshot = path.join(resolvedDirectory, "package-lock.snapshot.json");
  const lockfileReplay = path.join(resolvedDirectory, "package-lock.replayed.json");
  if (
    !lockfileComparison ||
    lockfileComparison.schema !== "latticework.phase2-lockfile-comparison.v1" ||
    lockfileComparison.valid !== true ||
    !/^[a-f0-9]{64}$/.test(lockfileComparison.canonical_sha256 ?? "") ||
    lockfileComparison.canonical_sha256 !== lockfileComparison.replayed_sha256 ||
    !fs.existsSync(lockfileSnapshot) ||
    !fs.existsSync(lockfileReplay) ||
    sha256File(lockfileSnapshot) !== lockfileComparison.canonical_sha256 ||
    sha256File(lockfileReplay) !== lockfileComparison.replayed_sha256
  ) {
    failures.push("isolated package-lock replay must byte-match the canonical lockfile");
  }

  const boundary = readJson(path.join(resolvedDirectory, "boundary.json"), failures, "boundary.json");
  if (!boundary || boundary.valid !== true || boundary.schema !== "latticework.phase2-boundary.v1" || !Array.isArray(boundary.protected_files) || boundary.protected_files.length !== PROTECTED_PATHS.length || new Set(boundary.protected_files.map((item) => item?.path)).size !== PROTECTED_PATHS.length || !PROTECTED_PATHS.every((item) => boundary.protected_files.some((record) => record?.path === item))) failures.push("boundary must be valid and declare exactly the eight protected legacy paths");
  const supply = readJson(path.join(resolvedDirectory, "supply-chain.json"), failures, "supply-chain.json");
  if (!supply || supply.valid !== true || supply.schema !== "latticework.phase2-supply-chain.v1") failures.push("supply-chain receipt must be valid");
  const audit = readJson(path.join(resolvedDirectory, "npm-audit.json"), failures, "npm-audit.json");
  if (
    !audit ||
    typeof audit !== "object" ||
    Array.isArray(audit) ||
    !Number.isInteger(audit.metadata?.vulnerabilities?.total) ||
    audit.metadata.vulnerabilities.total !== 0
  ) failures.push("npm audit vulnerability total must be an integer 0");
  const sbom = readJson(path.join(resolvedDirectory, "sbom.cdx.json"), failures, "sbom.cdx.json");
  if (sbom?.bomFormat !== "CycloneDX") failures.push("SBOM must be CycloneDX");

  validateReceipts(resolvedDirectory, baselineSha, candidateSha, failures);
  const foundBrowser = findNamedFilePaths(
    path.join(resolvedDirectory, "browser"),
    ["results.json", ...REQUIRED_BROWSER_ARTIFACTS],
    failures,
  );
  for (const name of ["results.json", ...REQUIRED_BROWSER_ARTIFACTS]) {
    if (!foundBrowser.has(name)) failures.push(`missing browser artifact: ${name}`);
  }
  if (foundBrowser.has("results.json")) {
    const browserResults = readJson(foundBrowser.get("results.json"), failures, "browser results");
    if (!browserResults || typeof browserResults !== "object" || Array.isArray(browserResults)) {
      failures.push("browser results must be a JSON object");
    }
  }
  validateBrowserEvidence(foundBrowser, failures);
  validateTextSafety(resolvedDirectory, manifest, failures);

  const result = { schema: "latticework.phase2-evidence-validation.v1", valid: failures.length === 0, directory: resolvedDirectory, work_id: WORK_ID, baseline_sha: baselineSha, candidate_sha: candidateSha, checks: { command_receipts: COMMAND_DIRECTORIES.length, protected_paths: PROTECTED_PATHS.length, required_browser_artifacts: REQUIRED_BROWSER_ARTIFACTS.length }, failures };
  if (outputPath) writeJson(path.resolve(outputPath), result);
  return result;
}

function isMain() { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)); }
if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length || !options.directory || !options["workspace-root"] || !options["baseline-sha"] || !options["candidate-sha"]) throw new Error("Usage: validate-phase2-evidence.mjs --directory PATH --workspace-root PATH --baseline-sha SHA --candidate-sha SHA [--output PATH]");
    const result = validatePhase2Evidence({ directory: options.directory, workspaceRoot: options["workspace-root"], baselineSha: options["baseline-sha"], candidateSha: options["candidate-sha"], outputPath: options.output ?? null });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 2; }
}
