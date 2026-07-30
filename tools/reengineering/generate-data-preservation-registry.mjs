#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJson } from "./evidence-common.mjs";

const KIND_CODES = {
  indexedDB_database: "IDB-DB",
  indexedDB_store: "IDB-STORE-STATIC",
  indexedDB_store_runtime: "IDB-STORE",
  localStorage: "LOCAL",
  sessionStorage: "SESSION",
};

function rowId(kind, name) {
  const digest = crypto
    .createHash("sha256")
    .update(`${kind}\0${name}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `DATA-${KIND_CODES[kind] ?? "OTHER"}-${digest}`;
}

function parseJsonText(value) {
  return JSON.parse(value.replace(/^\uFEFF/, ""));
}

function parseRuntimeProbe(runtimeProbeText) {
  const outer = parseJsonText(runtimeProbeText);
  if (typeof outer.result !== "string") {
    throw new Error("Runtime probe must contain a JSON string in result.");
  }
  return parseJsonText(outer.result);
}

function ensureEntry(entries, kind, name) {
  const key = `${kind}\0${name}`;
  if (!entries.has(key)) {
    entries.set(key, {
      kind,
      name,
      static_paths: new Set(),
      runtime_observed: false,
      runtime_details: null,
      evidence: new Set(),
    });
  }
  return entries.get(key);
}

export function generateDataRegistry(staticIdentifiers, runtimeProbe) {
  if (!Array.isArray(staticIdentifiers)) {
    throw new Error("Static storage identifiers must be an array.");
  }

  const entries = new Map();
  for (const identifier of staticIdentifiers) {
    if (!identifier || typeof identifier.kind !== "string" || typeof identifier.name !== "string") {
      throw new Error("Every static storage identifier must declare string kind and name fields.");
    }
    const entry = ensureEntry(entries, identifier.kind, identifier.name);
    if (typeof identifier.path === "string" && identifier.path.length > 0) {
      entry.static_paths.add(identifier.path.replaceAll("\\", "/"));
    }
    entry.evidence.add(
      "reengineering/evidence/phase-0/LW-M0-INV-001/storage-identifiers.json",
    );
  }

  for (const name of runtimeProbe.localStorageKeys ?? []) {
    const entry = ensureEntry(entries, "localStorage", name);
    entry.runtime_observed = true;
    entry.evidence.add(
      "reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log",
    );
  }
  for (const name of runtimeProbe.sessionStorageKeys ?? []) {
    const entry = ensureEntry(entries, "sessionStorage", name);
    entry.runtime_observed = true;
    entry.evidence.add(
      "reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log",
    );
  }
  for (const database of runtimeProbe.indexedDB ?? []) {
    const databaseEntry = ensureEntry(entries, "indexedDB_database", database.name);
    databaseEntry.runtime_observed = true;
    databaseEntry.runtime_details = {
      version: database.version ?? null,
      stores: [...(database.stores ?? [])].sort(),
    };
    databaseEntry.evidence.add(
      "reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log",
    );

    for (const storeName of database.stores ?? []) {
      const qualifiedName = `${database.name}/${storeName}`;
      const storeEntry = ensureEntry(entries, "indexedDB_store_runtime", qualifiedName);
      storeEntry.runtime_observed = true;
      storeEntry.runtime_details = {
        database: database.name,
        database_version: database.version ?? null,
        store: storeName,
      };
      storeEntry.evidence.add(
        "reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log",
      );
    }
  }

  const rows = [...entries.values()]
    .sort((left, right) =>
      left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name),
    )
    .map((entry) => ({
      id: rowId(entry.kind, entry.name),
      kind: entry.kind,
      name: entry.name,
      static_paths: [...entry.static_paths].sort(),
      runtime_observed: entry.runtime_observed,
      runtime_details: entry.runtime_details,
      owner: "UNKNOWN",
      sensitivity: "UNKNOWN_TREAT_AS_HIGH",
      retention: "UNKNOWN",
      record_schema: "UNKNOWN",
      migration_rule: "PRESERVE_UNKNOWN_STORE_RECORD_AND_FIELD",
      owner_approval_required_for_removal: true,
      evidence: [...entry.evidence].sort(),
    }));

  const byKind = {};
  for (const row of rows) {
    byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
  }

  return {
    schema: "latticework.data-preservation-registry.v1",
    baseline_sha: "e7585999fc1af2707f410ae87356cf2b52e08d9c",
    evidence_scope:
      "Static identifier extraction plus one fresh Chrome runtime-name probe. Values, record contents, indexes, ownership, retention, and full reachability remain UNKNOWN.",
    counts: {
      total: rows.length,
      runtime_observed: rows.filter((row) => row.runtime_observed).length,
      by_kind: byKind,
    },
    rows,
  };
}

function isMain() {
  return process.argv[1]
    && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const [staticPath, runtimePath, outputPath] = process.argv.slice(2);
    if (!staticPath || !runtimePath || !outputPath) {
      throw new Error(
        "Usage: generate-data-preservation-registry.mjs STATIC_IDENTIFIERS_JSON RUNTIME_PROBE_LOG OUTPUT_JSON",
      );
    }
    const staticIdentifiers = parseJsonText(
      fs.readFileSync(path.resolve(staticPath), "utf8"),
    );
    const runtimeProbe = parseRuntimeProbe(fs.readFileSync(path.resolve(runtimePath), "utf8"));
    writeJson(path.resolve(outputPath), generateDataRegistry(staticIdentifiers, runtimeProbe));
    process.stdout.write(`${path.resolve(outputPath)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
