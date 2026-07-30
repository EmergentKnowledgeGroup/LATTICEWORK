#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFileReceipt,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";

function walkFiles(directory) {
  const directoryStats = fs.lstatSync(directory);
  if (directoryStats.isSymbolicLink()) {
    throw new Error(`Evidence directory must not traverse symbolic links: ${directory}`);
  }
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const entryStats = fs.lstatSync(entryPath);
    if (entryStats.isSymbolicLink()) {
      throw new Error(`Evidence directory must not traverse symbolic links: ${entryPath}`);
    }
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

export function manifestEvidenceDirectory({
  directory,
  outputPath,
  receiptId,
  baselineSha = null,
  candidateSha = null,
  externalPath = null,
}) {
  const resolvedDirectory = path.resolve(directory);
  const resolvedOutput = path.resolve(outputPath);
  const internalArtifacts = walkFiles(resolvedDirectory)
    .filter((filePath) => path.resolve(filePath) !== resolvedOutput)
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => ({
      ...buildFileReceipt(filePath, resolvedDirectory),
      repository_artifact: true,
    }));

  const externalArtifacts = [];
  if (externalPath) {
    const resolvedExternal = path.resolve(externalPath);
    const stats = fs.lstatSync(resolvedExternal);
    if (stats.isSymbolicLink()) {
      throw new Error(`External evidence path must not be a symbolic link: ${resolvedExternal}`);
    }
    if (!stats.isFile()) {
      throw new Error(`External evidence path is not a file: ${resolvedExternal}`);
    }
    externalArtifacts.push({
      ...buildFileReceipt(resolvedExternal, path.dirname(resolvedExternal)),
      path: path.basename(resolvedExternal),
      absolute_path: resolvedExternal,
      repository_artifact: false,
    });
  }

  const manifest = {
    schema: "latticework.evidence.artifact-bundle.v1",
    receipt_id: receiptId,
    captured_at: new Date().toISOString(),
    baseline_sha: baselineSha,
    candidate_sha: candidateSha,
    directory: resolvedDirectory,
    artifacts: [...internalArtifacts, ...externalArtifacts],
  };
  writeJson(resolvedOutput, manifest);
  return manifest;
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) {
      throw new Error("This tool does not accept a command after --");
    }
    if (!options.directory || !options.output || !options.id) {
      throw new Error(
        "Usage: manifest-evidence-directory.mjs --directory PATH --output PATH --id ID [--baseline-sha SHA] [--candidate-sha SHA] [--external PATH]",
      );
    }
    manifestEvidenceDirectory({
      directory: options.directory,
      outputPath: options.output,
      receiptId: options.id,
      baselineSha: options["baseline-sha"] ?? null,
      candidateSha: options["candidate-sha"] ?? null,
      externalPath: options.external ?? null,
    });
    process.stdout.write(`${path.resolve(options.output)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
