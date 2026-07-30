#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildFileReceipt,
  ensureDirectory,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";

function runText(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? null,
  };
}

export function captureCommand({
  cwd,
  outputDirectory,
  receiptId,
  command,
  baselineSha = null,
  candidateSha = null,
}) {
  if (!Array.isArray(command) || command.length === 0) {
    throw new Error("A command is required after --");
  }

  const resolvedCwd = path.resolve(cwd);
  const resolvedOutput = ensureDirectory(path.resolve(outputDirectory));
  const startedAt = new Date();
  const startedNs = process.hrtime.bigint();
  const result = spawnSync(command[0], command.slice(1), {
    cwd: resolvedCwd,
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
  const endedNs = process.hrtime.bigint();
  const endedAt = new Date();

  const stdoutPath = path.join(resolvedOutput, "stdout.log");
  const stderrPath = path.join(resolvedOutput, "stderr.log");
  fs.writeFileSync(stdoutPath, result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stderrPath, result.stderr ?? Buffer.alloc(0));

  const gitHead = runText("git", ["rev-parse", "HEAD"], resolvedCwd);
  const gitStatus = runText("git", ["status", "--short", "--branch"], resolvedCwd);
  const gitVersion = runText("git", ["--version"], resolvedCwd);

  const manifest = {
    schema: "latticework.evidence.command.v1",
    receipt_id: receiptId,
    command,
    command_display: command.map((part) => JSON.stringify(part)).join(" "),
    cwd: resolvedCwd,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: Number(endedNs - startedNs) / 1_000_000,
    exit_code: result.status,
    signal: result.signal ?? null,
    spawn_error: result.error?.message ?? null,
    baseline_sha: baselineSha,
    candidate_sha: candidateSha,
    repository: {
      head: gitHead.stdout.trim() || null,
      status: gitStatus.stdout.trimEnd(),
    },
    environment: {
      platform: process.platform,
      os_release: os.release(),
      architecture: process.arch,
      node: process.version,
      git: gitVersion.stdout.trim() || null,
    },
    artifacts: [
      buildFileReceipt(stdoutPath, resolvedOutput),
      buildFileReceipt(stderrPath, resolvedOutput),
    ],
  };

  const manifestPath = path.join(resolvedOutput, "manifest.json");
  writeJson(manifestPath, manifest);
  return { manifest, manifestPath };
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    const cwd = options.cwd;
    const outputDirectory = options.output;
    const receiptId = options.id;
    if (!cwd || !outputDirectory || !receiptId) {
      throw new Error("Usage: run-evidence-command.mjs --cwd PATH --output PATH --id ID [--baseline-sha SHA] [--candidate-sha SHA] -- COMMAND [ARGS...]");
    }
    const { manifestPath, manifest } = captureCommand({
      cwd,
      outputDirectory,
      receiptId,
      command,
      baselineSha: options["baseline-sha"] ?? null,
      candidateSha: options["candidate-sha"] ?? null,
    });
    process.stdout.write(`${manifestPath}\n`);
    process.exitCode = Number.isInteger(manifest.exit_code) ? manifest.exit_code : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
