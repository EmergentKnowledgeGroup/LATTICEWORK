import type { MigrationCounts, MigrationJournalEntry } from "@latticework/contracts";

import { assertOperationId, isJournalTransitionAllowed } from "./descriptor.ts";

function assertCounts(counts: MigrationCounts, label: string): void {
  for (const [name, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} ${name} count is invalid.`);
  }
}

function countsEqual(left: MigrationCounts, right: MigrationCounts): boolean {
  return left.conversations === right.conversations && left.messages === right.messages;
}

function assertEntryShape(entry: MigrationJournalEntry): void {
  assertOperationId(entry.operationId);
  if (entry.migrationId.length === 0) throw new Error("Migration journal migration id is required.");
  if (!/^(?:source-unavailable|synthetic-v3:[a-f0-9]{64})$/u.test(entry.sourceVerificationIdentity)) {
    throw new Error("Migration journal source verification identity is invalid.");
  }
  if (entry.datasetId !== "conversation"
    || entry.sourceDatabase !== "FreeLatticeDB"
    || entry.targetDatabase !== "latticework::conversation"
    || entry.sourceVersion !== 3) {
    throw new Error("Migration journal source, target, or dataset identity is invalid.");
  }
  assertCounts(entry.expected, "Expected");
  assertCounts(entry.copied, "Copied");
  if (entry.copied.conversations > entry.expected.conversations || entry.copied.messages > entry.expected.messages) {
    throw new Error("Migration journal copied counts exceed expected counts.");
  }
  if (!Number.isSafeInteger(entry.checkpoint) || entry.checkpoint < 0) {
    throw new Error("Migration journal checkpoint is invalid.");
  }
  if (Number.isNaN(Date.parse(entry.createdAt)) || Number.isNaN(Date.parse(entry.updatedAt))) {
    throw new Error("Migration journal timestamps are invalid.");
  }
  if (entry.state === "failed") {
    if (typeof entry.failureCode !== "string" || entry.failureCode.length === 0) {
      throw new Error("Failed migration journal entries require a failure code.");
    }
    if (entry.candidateDisposition !== "discarded") {
      throw new Error("Failed migration journal entries require a discarded candidate disposition.");
    }
  } else if (entry.failureCode !== undefined || entry.candidateDisposition !== undefined) {
    throw new Error("Only failed migration journal entries may record failure or candidate disposition.");
  }
}

/** Fail-closed validation used inside the journal's single read/write transaction. */
export function validateMigrationJournalUpdate(
  current: MigrationJournalEntry | undefined,
  next: MigrationJournalEntry,
): void {
  assertEntryShape(next);
  if (!current) {
    if (next.state !== "planned") throw new Error("The first migration journal write must be planned.");
    if (next.checkpoint !== 0 || next.copied.conversations !== 0 || next.copied.messages !== 0) {
      throw new Error("A planned migration journal entry must start at checkpoint zero with no copied records.");
    }
    return;
  }
  assertEntryShape(current);
  if (current.state === "failed") throw new Error("Failed migration journal entries are terminal and immutable.");
  if (current.state === "rolled-back") throw new Error("Rolled-back migration journal entries are terminal and immutable.");
  for (const field of [
    "operationId", "migrationId", "sourceVerificationIdentity", "datasetId", "sourceDatabase", "sourceVersion",
    "targetDatabase", "createdAt",
  ] as const) {
    if (current[field] !== next[field]) throw new Error(`Migration journal ${field} is immutable.`);
  }
  if (!countsEqual(current.expected, next.expected)) throw new Error("Migration journal expected counts are immutable.");
  if (current.state !== next.state && !isJournalTransitionAllowed(current.state, next.state)) {
    throw new Error(`Journal transition ${current.state} -> ${next.state} is not allowed.`);
  }
  if (current.state === next.state && current.state !== "copying") {
    throw new Error(`Journal state ${current.state} cannot be rewritten.`);
  }
  if (next.checkpoint < current.checkpoint
    || next.copied.conversations < current.copied.conversations
    || next.copied.messages < current.copied.messages) {
    throw new Error("Migration journal copied counts and checkpoint must be monotonic.");
  }
}
