#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

import {
  buildFileReceipt,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";

const REQUIRED_ARTIFACTS = ["index.html", ".vite/manifest.json"];

function isStrictDescendant(targetPath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(targetPath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertRepositoryDescendant(targetPath, workspaceRoot, label) {
  if (!isStrictDescendant(targetPath, workspaceRoot)) {
    throw new Error(`${label} must be a strict repository descendant: ${targetPath}`);
  }
}

function walkFiles(directory, root = directory) {
  const files = [];
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    const stats = fs.lstatSync(entryPath);
    if (stats.isSymbolicLink()) {
      throw new Error(
        `Generated build must not contain symbolic links: ${path
          .relative(root, entryPath)
          .replaceAll("\\", "/")}`,
      );
    }
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath, root));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function buildArtifactReceipt(filePath, directory) {
  const receipt = buildFileReceipt(filePath, directory);
  if (!/\.(?:css|js)$/.test(receipt.path)) {
    return receipt;
  }
  const bytes = fs.readFileSync(filePath);
  return {
    ...receipt,
    gzip_bytes: gzipSync(bytes, { level: 9 }).length,
    brotli_bytes: brotliCompressSync(bytes).length,
  };
}

function inspectBuild(directory, failures, label) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    failures.push(`${label} build directory is missing: ${directory}`);
    return { directory, files: [] };
  }

  const files = walkFiles(directory)
    .map((filePath) => buildArtifactReceipt(filePath, directory))
    .sort((left, right) => left.path.localeCompare(right.path));
  const paths = new Set(files.map((entry) => entry.path));

  for (const required of REQUIRED_ARTIFACTS) {
    if (!paths.has(required)) {
      failures.push(`${label} build is missing required artifact: ${required}`);
    }
  }

  const manifestPath = path.join(directory, ".vite", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        failures.push(`${label} Vite manifest must be a JSON object`);
      } else if (Object.keys(manifest).length === 0) {
        failures.push(`${label} Vite manifest must declare at least one entry`);
      } else {
        for (const [source, entry] of Object.entries(manifest)) {
          if (!entry || typeof entry !== "object" || typeof entry.file !== "string") {
            failures.push(`${label} Vite manifest entry ${source} has no file`);
            continue;
          }
          if (!paths.has(entry.file)) {
            failures.push(
              `${label} Vite manifest entry ${source} references missing artifact: ${entry.file}`,
            );
          }
        }
      }
    } catch (error) {
      failures.push(`${label} Vite manifest is invalid JSON: ${error.message}`);
    }
  }

  const indexPath = path.join(directory, "index.html");
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf8");
    if (/(?:src|href)\s*=\s*["'](?:https?:|\/\/)/i.test(html)) {
      failures.push(`${label} index.html contains an absolute remote asset`);
    }
    if (/(?:docs\/app\.html|(?:^|[/"'])app\.html|modules\/|sw\.js)/i.test(html)) {
      failures.push(`${label} index.html references a protected legacy runtime path`);
    }
  }

  return { directory, files };
}

function compareBuilds(first, second, failures) {
  const firstByPath = new Map(first.files.map((entry) => [entry.path, entry]));
  const secondByPath = new Map(second.files.map((entry) => [entry.path, entry]));
  const paths = new Set([...firstByPath.keys(), ...secondByPath.keys()]);

  for (const artifactPath of [...paths].sort((left, right) => left.localeCompare(right))) {
    const left = firstByPath.get(artifactPath);
    const right = secondByPath.get(artifactPath);
    if (!left || !right) {
      failures.push(
        `artifact path mismatch: ${artifactPath} exists in ${left ? "first" : "second"} build only`,
      );
      continue;
    }
    if (left.bytes !== right.bytes || left.sha256 !== right.sha256) {
      failures.push(`artifact mismatch at ${artifactPath}`);
    }
  }
}

export function verifyPhase2Build({
  workspaceRoot,
  firstDirectory,
  secondDirectory,
  outputPath,
}) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedFirst = path.resolve(firstDirectory);
  const resolvedSecond = path.resolve(secondDirectory);
  const resolvedOutput = path.resolve(outputPath);

  assertRepositoryDescendant(resolvedFirst, resolvedWorkspace, "first build");
  assertRepositoryDescendant(resolvedSecond, resolvedWorkspace, "second build");
  assertRepositoryDescendant(resolvedOutput, resolvedWorkspace, "summary path");
  if (resolvedFirst === resolvedSecond) {
    throw new Error("first and second build directories must differ");
  }

  const failures = [];
  const first = inspectBuild(resolvedFirst, failures, "first");
  const second = inspectBuild(resolvedSecond, failures, "second");
  compareBuilds(first, second, failures);

  const summary = {
    schema: "latticework.phase2-build-comparison.v1",
    evidence_label: "MEASURED",
    captured_at: new Date().toISOString(),
    valid: failures.length === 0,
    workspace_root: resolvedWorkspace,
    first,
    second,
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
    if (!options["workspace-root"] || !options.first || !options.second || !options.output) {
      throw new Error(
        "Usage: verify-phase2-build.mjs --workspace-root PATH --first PATH --second PATH --output PATH",
      );
    }
    const summary = verifyPhase2Build({
      workspaceRoot: options["workspace-root"],
      firstDirectory: options.first,
      secondDirectory: options.second,
      outputPath: options.output,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = summary.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
