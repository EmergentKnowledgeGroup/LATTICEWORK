import type {
  ConversationDatasetSnapshot,
  ConversationRepository,
  MigrationCounts,
  MigrationJournal,
  MigrationJournalEntry,
  MigrationResult,
} from "@latticework/contracts";

import { cloneSnapshot } from "./clone.ts";
import { assertOperationId, conversationDatasetDescriptor, isJournalTransitionAllowed } from "./descriptor.ts";
import type { ConversationSourceReadResult } from "./source.ts";
import { syntheticSourceVerificationIdentity } from "./source-verification.ts";
import {
  assertConversationSnapshot,
  assertConversationSnapshotNativeConsistency,
  assertConversationSnapshotsEquivalent,
} from "./validation.ts";

export interface ConversationSourceReader {
  read(): Promise<ConversationSourceReadResult>;
}

export interface ConversationMigrationOptions {
  readonly operationId: string;
  readonly migrationId: string;
  readonly batchSize?: number;
  readonly now?: () => string;
  /** Test-only interruption point: leaves the journal copying and candidate inactive. */
  readonly interruptAfterBatches?: number;
}

const emptyCounts = (): MigrationCounts => ({ conversations: 0, messages: 0 });
const countSnapshot = (snapshot: ConversationDatasetSnapshot): MigrationCounts => ({
  conversations: snapshot.conversations.length,
  messages: snapshot.messages.length,
});

function recordsEqual(left: MigrationCounts, right: MigrationCounts): boolean {
  return left.conversations === right.conversations && left.messages === right.messages;
}

function mergeByKey<T extends { readonly key: IDBValidKey }>(existing: readonly T[], additions: readonly T[]): T[] {
  const merged = new Map<string, T>();
  for (const record of [...existing, ...additions]) merged.set(keyIdentity(record.key), record);
  return [...merged.values()];
}

function keyIdentity(key: IDBValidKey): string {
  return typeof key === "string" ? `s:${key}` : typeof key === "number" ? `n:${key}` : JSON.stringify(key);
}

function combinedSnapshot(current: ConversationDatasetSnapshot, batch: ConversationDatasetSnapshot): ConversationDatasetSnapshot {
  return {
    descriptorId: "conversation",
    schemaVersion: 1,
    conversations: mergeByKey(current.conversations, batch.conversations),
    messages: mergeByKey(current.messages, batch.messages),
  };
}

/** Copy-on-write, checkpointed migration. It has no activation API. */
export class ConversationMigrationService {
  #source: ConversationSourceReader;
  #candidate: ConversationRepository;
  #journal: MigrationJournal;

  constructor(source: ConversationSourceReader, candidate: ConversationRepository, journal: MigrationJournal) {
    this.#source = source;
    this.#candidate = candidate;
    this.#journal = journal;
  }

  async migrate(options: ConversationMigrationOptions): Promise<MigrationResult> {
    assertOperationId(options.operationId);
    let source: ConversationSourceReadResult;
    let sourceVerificationIdentity = "source-unavailable";
    try {
      source = await this.#source.read();
      if (source.kind === "ready") {
        assertConversationSnapshot(source.snapshot);
        await assertConversationSnapshotNativeConsistency(source.snapshot);
        sourceVerificationIdentity = await syntheticSourceVerificationIdentity(source.snapshot);
      }
    } catch {
      return this.#recordSourceFailure(options);
    }
    if (source.kind === "abstained") {
      return { operationId: options.operationId, state: "planned", copied: emptyCounts(), sourceUnchanged: true, candidateActive: false, abstentionReason: source.reason };
    }
    const expected = countSnapshot(source.snapshot);
    const now = options.now ?? (() => new Date().toISOString());
    const existing = await this.#journal.read(options.operationId);
    let entry: MigrationJournalEntry;
    if (existing) {
      if (existing.migrationId !== options.migrationId) throw new Error("Operation id is already bound to another migration id.");
      entry = existing;
    } else {
      entry = this.#entry(options, expected, now(), "planned", emptyCounts(), 0, sourceVerificationIdentity);
      await this.#journal.write(entry);
    }
    if (entry.sourceVerificationIdentity !== sourceVerificationIdentity) {
      if (entry.state === "planned" || entry.state === "copying" || entry.state === "validating") {
        return this.#result(await this.#fail(entry, now, "source-verification-identity-mismatch"));
      }
      throw new Error("Operation id is already bound to another source verification identity.");
    }
    if (entry.state === "ready") {
      try {
        const readyCandidate = await this.#candidate.readSnapshot();
        await assertConversationSnapshotsEquivalent(source.snapshot, readyCandidate);
      } catch {
        throw new Error("Ready candidate no longer matches the verified source.");
      }
      return this.#result(entry);
    }
    if (entry.state === "failed" || entry.state === "rolled-back") throw new Error(`Migration cannot resume from ${entry.state}.`);
    if (entry.state === "planned") entry = await this.#transition(entry, "copying", now);

    const batchSize = options.batchSize ?? 100;
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error("Batch size must be a positive integer.");
    try {
      let candidate = await this.#candidate.readSnapshot();
      let copied = countSnapshot(candidate);
      let batches = 0;
      const checkpoint = async (batch: ConversationDatasetSnapshot): Promise<boolean> => {
        candidate = combinedSnapshot(candidate, batch);
        await this.#candidate.putSnapshot(candidate);
        copied = countSnapshot(candidate);
        entry = { ...entry, copied, checkpoint: entry.checkpoint + 1, updatedAt: now() };
        await this.#journal.write(entry);
        batches += 1;
        return options.interruptAfterBatches === batches;
      };
      for (let offset = 0; offset < source.snapshot.conversations.length; offset += batchSize) {
        if (await checkpoint({ descriptorId: "conversation", schemaVersion: 1, conversations: source.snapshot.conversations.slice(offset, offset + batchSize), messages: [] })) {
          return this.#result(entry);
        }
      }
      for (let offset = 0; offset < source.snapshot.messages.length; offset += batchSize) {
        if (await checkpoint({ descriptorId: "conversation", schemaVersion: 1, conversations: [], messages: source.snapshot.messages.slice(offset, offset + batchSize) })) {
          return this.#result(entry);
        }
      }
      if (!recordsEqual(copied, expected)) {
        entry = await this.#fail({ ...entry, copied }, now, "candidate-count-mismatch");
        return this.#result(entry);
      }
      entry = await this.#transition(entry, "validating", now);
      const validated = await this.#candidate.readSnapshot();
      try {
        await assertConversationSnapshotsEquivalent(source.snapshot, validated);
      } catch {
        entry = await this.#fail(entry, now, "candidate-validation-failed");
        return this.#result(entry);
      }
      return this.#result(await this.#transition(entry, "ready", now));
    } catch {
      if (entry.state === "planned" || entry.state === "copying" || entry.state === "validating") {
        return this.#result(await this.#fail(entry, now, "candidate-write-failed"));
      }
      throw new Error("Candidate migration failed after a terminal journal state.");
    }
  }

  async rollback(operationId: string, now: () => string = () => new Date().toISOString()): Promise<MigrationResult> {
    const entry = await this.#journal.read(operationId);
    if (!entry) throw new Error("No migration journal entry exists for this operation.");
    if (entry.state === "failed") {
      return this.#result(entry);
    }
    if (entry.state !== "rolled-back") {
      await this.#candidate.discardCandidate();
      return this.#result(await this.#transition(entry, "rolled-back", now));
    }
    return this.#result(entry);
  }

  #entry(options: ConversationMigrationOptions, expected: MigrationCounts, timestamp: string, state: MigrationJournalEntry["state"], copied: MigrationCounts, checkpoint: number, sourceVerificationIdentity: string): MigrationJournalEntry {
    return {
      operationId: options.operationId, migrationId: options.migrationId, datasetId: "conversation",
      sourceVerificationIdentity,
      sourceDatabase: "FreeLatticeDB", sourceVersion: 3,
      targetDatabase: "latticework::conversation", state, copied, expected, checkpoint,
      createdAt: timestamp, updatedAt: timestamp,
    };
  }

  async #recordSourceFailure(options: ConversationMigrationOptions): Promise<MigrationResult> {
    const existing = await this.#journal.read(options.operationId);
    if (existing) {
      if (existing.migrationId !== options.migrationId) {
        throw new Error("Operation id is already bound to another migration id.");
      }
      if (existing.state === "planned" || existing.state === "copying" || existing.state === "validating") {
        return this.#result(await this.#fail(existing, options.now ?? (() => new Date().toISOString()), "source-read-failed"));
      }
      if (existing.state === "ready") {
        throw new Error("Cannot verify the source for an existing ready migration.");
      }
      return this.#result(existing);
    }
    const timestamp = (options.now ?? (() => new Date().toISOString()))();
    const planned = this.#entry(options, emptyCounts(), timestamp, "planned", emptyCounts(), 0, "source-unavailable");
    await this.#journal.write(planned);
    return this.#result(await this.#fail(planned, options.now ?? (() => new Date().toISOString()), "source-read-failed"));
  }

  async #disposeCandidate(): Promise<"discarded"> {
    await this.#candidate.discardCandidate();
    return "discarded";
  }

  async #fail(entry: MigrationJournalEntry, now: () => string, failureCode: string): Promise<MigrationJournalEntry> {
    const candidateDisposition = await this.#disposeCandidate();
    return this.#transition(entry, "failed", now, failureCode, candidateDisposition);
  }

  async #transition(entry: MigrationJournalEntry, state: MigrationJournalEntry["state"], now: () => string, failureCode?: string, candidateDisposition?: "discarded"): Promise<MigrationJournalEntry> {
    if (!isJournalTransitionAllowed(entry.state, state)) throw new Error(`Journal transition ${entry.state} -> ${state} is not allowed.`);
    const next: MigrationJournalEntry = { ...entry, state, updatedAt: now(), ...(failureCode ? { failureCode } : {}), ...(candidateDisposition ? { candidateDisposition } : {}) };
    await this.#journal.write(next);
    return next;
  }

  #result(entry: MigrationJournalEntry): MigrationResult {
    return { operationId: entry.operationId, state: entry.state, copied: cloneSnapshot(entry.copied), sourceUnchanged: true, candidateActive: false };
  }
}
