#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildFileReceipt,
  countLines,
  ensureDirectory,
  isTextBuffer,
  parseNamedArgs,
  sha256Buffer,
  writeJson,
} from "./evidence-common.mjs";

const SOURCE_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".py",
  ".rs",
  ".sh",
  ".bat",
  ".command",
  ".css",
  ".ts",
  ".tsx",
  ".sql",
]);

const LANGUAGE_BY_EXTENSION = {
  ".html": "HTML",
  ".js": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".sh": "Shell",
  ".bat": "Batch",
  ".command": "Command script",
  ".css": "CSS",
  ".ts": "TypeScript",
  ".tsx": "TypeScript JSX",
  ".sql": "SQL",
};

const EXCLUDED_SOURCE_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  "tests",
  "test",
  "lib",
  "vendor",
  "dist",
  "build",
  "generated",
  "target",
]);

function git(repo, args, { encoding = "utf8" } = {}) {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding,
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const stderr = encoding === "buffer" ? result.stderr?.toString("utf8") : result.stderr;
    throw new Error(`git ${args.join(" ")} failed (${result.status}): ${stderr ?? ""}`);
  }
  return result.stdout;
}

export function isFirstPartySource(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  const extension = path.extname(normalized).toLowerCase();
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  if (segments.some((segment) => EXCLUDED_SOURCE_SEGMENTS.has(segment.toLowerCase()))) return false;
  if (normalized.endsWith(".min.js") || normalized.endsWith(".lock")) return false;
  return true;
}

function incrementMetric(target, key, lines) {
  const current = target[key] ?? { files: 0, lines: 0 };
  current.files += 1;
  current.lines += lines;
  target[key] = current;
}

export function captureBaseline({ repo, outputDirectory, expectedSha, archiveOutput = null }) {
  const resolvedRepo = path.resolve(repo);
  const resolvedOutput = ensureDirectory(path.resolve(outputDirectory));
  const startedAt = new Date();
  const head = git(resolvedRepo, ["rev-parse", "HEAD"]).trim();
  if (expectedSha && head !== expectedSha) {
    throw new Error(`Expected baseline ${expectedSha}, found ${head}`);
  }

  const status = git(resolvedRepo, ["status", "--porcelain"]).trim();
  if (status) {
    throw new Error(`Baseline worktree is not clean:\n${status}`);
  }

  const trackedRaw = git(resolvedRepo, ["ls-files", "-z"], { encoding: "buffer" });
  const trackedPaths = trackedRaw
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  const files = [];
  const directories = new Set();
  const textByTopLevel = {};
  const sourceByLanguage = {};
  const sourceDuplicateCandidates = new Map();

  for (const relativePath of trackedPaths) {
    const absolutePath = path.join(resolvedRepo, ...relativePath.split("/"));
    const buffer = fs.readFileSync(absolutePath);
    const isText = isTextBuffer(buffer);
    const lines = isText ? countLines(buffer) : 0;
    const digest = sha256Buffer(buffer);
    const source = isFirstPartySource(relativePath);
    const directory = path.posix.dirname(relativePath);
    if (directory !== ".") directories.add(directory);

    const topLevel = relativePath.includes("/") ? relativePath.split("/")[0] : "(root)";
    if (isText) incrementMetric(textByTopLevel, topLevel, lines);
    if (source) {
      const language = LANGUAGE_BY_EXTENSION[path.extname(relativePath).toLowerCase()] ?? "Other";
      incrementMetric(sourceByLanguage, language, lines);
      const group = sourceDuplicateCandidates.get(digest) ?? [];
      group.push({ path: relativePath, lines, bytes: buffer.length });
      sourceDuplicateCandidates.set(digest, group);
    }

    files.push({
      path: relativePath,
      bytes: buffer.length,
      sha256: digest,
      text: isText,
      lines,
      first_party_source: source,
    });
  }

  const duplicateGroups = [...sourceDuplicateCandidates.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({
      sha256,
      files: group.sort((left, right) => left.path.localeCompare(right.path)),
      redundant_files: group.length - 1,
      redundant_lines: group
        .slice()
        .sort((left, right) => right.lines - left.lines)
        .slice(1)
        .reduce((sum, item) => sum + item.lines, 0),
    }))
    .sort((left, right) => right.redundant_lines - left.redundant_lines);

  const sourceFiles = files.filter((file) => file.first_party_source);
  const textFiles = files.filter((file) => file.text);
  const archiveName = `freelattice-baseline-${head}.zip`;
  const archivePath = path.resolve(archiveOutput ?? path.join(resolvedOutput, archiveName));
  ensureDirectory(path.dirname(archivePath));
  const archiveReused = fs.existsSync(archivePath);
  if (!archiveReused) {
    git(resolvedRepo, ["archive", "--format=zip", `--output=${archivePath}`, head]);
  }

  const treePath = path.join(resolvedOutput, "tracked-tree.json");
  const summaryPath = path.join(resolvedOutput, "baseline-summary.json");
  writeJson(treePath, {
    schema: "latticework.baseline.tree.v1",
    baseline_sha: head,
    files,
  });
  writeJson(summaryPath, {
    schema: "latticework.baseline.summary.v1",
    baseline_sha: head,
    captured_at: new Date().toISOString(),
    counts: {
      tracked_files: files.length,
      tracked_directories: directories.size,
      tracked_text_files: textFiles.length,
      tracked_text_lines: textFiles.reduce((sum, file) => sum + file.lines, 0),
      first_party_source_files: sourceFiles.length,
      first_party_source_lines: sourceFiles.reduce((sum, file) => sum + file.lines, 0),
      exact_duplicate_source_groups: duplicateGroups.length,
      redundant_exact_source_files: duplicateGroups.reduce((sum, group) => sum + group.redundant_files, 0),
      redundant_exact_source_lines: duplicateGroups.reduce((sum, group) => sum + group.redundant_lines, 0),
    },
    source_by_language: sourceByLanguage,
    text_by_top_level: textByTopLevel,
    largest_source_files: sourceFiles
      .slice()
      .sort((left, right) => right.lines - left.lines)
      .slice(0, 25),
    exact_duplicate_source_groups: duplicateGroups,
  });

  const artifacts = [treePath, summaryPath, archivePath].map((filePath) => ({
    ...buildFileReceipt(filePath, resolvedOutput),
    absolute_path: filePath,
    repository_artifact: filePath.startsWith(`${resolvedOutput}${path.sep}`),
  }));
  const manifestPath = path.join(resolvedOutput, "manifest.json");
  writeJson(manifestPath, {
    schema: "latticework.evidence.baseline.v1",
    baseline_sha: head,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    repository: {
      path: resolvedRepo,
      status,
      commit: git(resolvedRepo, ["show", "--no-patch", "--format=%H%n%aI%n%cI%n%an%n%s", head]).trim(),
      tags: git(resolvedRepo, ["tag", "--points-at", head]).trim().split(/\r?\n/).filter(Boolean),
    },
    archive_reused: archiveReused,
    environment: {
      platform: process.platform,
      os_release: os.release(),
      architecture: process.arch,
      node: process.version,
      git: git(resolvedRepo, ["--version"]).trim(),
    },
    artifacts,
  });

  return { manifestPath, summaryPath, treePath, archivePath };
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) throw new Error("capture-baseline.mjs does not accept a command after --");
    if (!options.repo || !options.output || !options["expected-sha"]) {
      throw new Error("Usage: capture-baseline.mjs --repo PATH --output PATH --expected-sha SHA [--archive-output PATH]");
    }
    const result = captureBaseline({
      repo: options.repo,
      outputDirectory: options.output,
      expectedSha: options["expected-sha"],
      archiveOutput: options["archive-output"] ?? null,
    });
    process.stdout.write(`${result.manifestPath}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
