import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  conversationDatasetDescriptor,
  isJournalTransitionAllowed,
  migrationDatabaseName,
  stagingConversationDatabaseName,
} from "../../packages/storage/src/index.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

test("conversation descriptor freezes the synthetic FreeLatticeDB v3 boundary", () => {
  assert.deepEqual(conversationDatasetDescriptor, {
    id: "conversation",
    schemaVersion: 1,
    owner: "@latticework/storage",
    source: {
      database: "FreeLatticeDB",
      databaseVersion: 3,
      ownedStores: ["conversations", "messages"],
      characterizationOnlyStores: ["meta", "memoryIndex"],
    },
    target: {
      database: "latticework::conversation",
      activation: "forbidden",
    },
    unknownValuePolicy: "typed-projection-plus-native-structured-clone",
  });
  assert.equal(migrationDatabaseName, "latticework::migration");
  assert.equal(
    stagingConversationDatabaseName("phase3-op-001"),
    "latticework::staging::phase3-op-001::conversation",
  );
});

test("staging namespace rejects untrusted operation identifiers", () => {
  for (const value of ["", "../escape", "has space", "UPPER", "a/b", "x::y"]) {
    assert.throws(
      () => stagingConversationDatabaseName(value),
      /operation id/i,
    );
  }
});

test("migration journal transition graph is fail-closed", () => {
  assert.equal(isJournalTransitionAllowed("planned", "copying"), true);
  assert.equal(isJournalTransitionAllowed("copying", "validating"), true);
  assert.equal(isJournalTransitionAllowed("validating", "ready"), true);
  assert.equal(isJournalTransitionAllowed("copying", "failed"), true);
  assert.equal(isJournalTransitionAllowed("failed", "rolled-back"), false);
  assert.equal(isJournalTransitionAllowed("ready", "copying"), false);
  assert.equal(isJournalTransitionAllowed("rolled-back", "planned"), false);
  assert.equal(isJournalTransitionAllowed("planned", "ready"), false);
});

test("storage source contains no legacy mutation or activation hooks", () => {
  const sourceRoot = path.join(REPO_ROOT, "packages", "storage", "src");
  const text = fs
    .readdirSync(sourceRoot, { recursive: true })
    .filter((entry) => String(entry).endsWith(".ts"))
    .map((entry) => fs.readFileSync(path.join(sourceRoot, String(entry)), "utf8"))
    .join("\n");

  for (const forbidden of [
    /deleteDatabase\(\s*["'`]FreeLatticeDB/i,
    /localStorage\b/,
    /sessionStorage\b/,
    /\bfetch\s*\(/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
  ]) {
    assert.doesNotMatch(text, forbidden);
  }
});
