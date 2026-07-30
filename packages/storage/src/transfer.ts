import type { ConversationDatasetSnapshot, ConversationTransferEnvelope } from "@latticework/contracts";

import { cloneSnapshot } from "./clone.ts";
import { assertOperationId, conversationDatasetDescriptor, stagingConversationDatabaseName } from "./descriptor.ts";
import { IndexedDbConversationRepository } from "./repository.ts";
import {
  assertConversationSnapshot,
  assertConversationSnapshotNativeConsistency,
  assertConversationSnapshotsEquivalent,
} from "./validation.ts";

interface StagingConversationRepository {
  putSnapshot(snapshot: ConversationDatasetSnapshot): Promise<void>;
  readSnapshot(): Promise<ConversationDatasetSnapshot>;
  discardCandidate(): Promise<void>;
}

export type StagingConversationRepositoryFactory = (
  factory: IDBFactory,
  databaseName: string,
) => StagingConversationRepository;

const counts = (records: ConversationDatasetSnapshot) => ({ conversations: records.conversations.length, messages: records.messages.length });

export function createConversationTransferEnvelope(
  operationId: string,
  createdAt: string,
  records: ConversationDatasetSnapshot,
): ConversationTransferEnvelope {
  assertOperationId(operationId);
  validateSnapshot(records);
  return {
    formatId: "latticework.conversation", formatVersion: 1, operationId, createdAt,
    descriptor: cloneSnapshot(conversationDatasetDescriptor), counts: counts(records), records: cloneSnapshot(records),
  };
}

/** Hostile-input parser: it accepts only the one fixed format and descriptor. */
export function parseConversationTransferEnvelope(input: unknown): ConversationTransferEnvelope {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error("Conversation transfer envelope must be an object.");
  const envelope = input as Partial<ConversationTransferEnvelope>;
  if (envelope.formatId !== "latticework.conversation") throw new Error("Unsupported conversation transfer format id.");
  if (envelope.formatVersion !== 1) throw new Error("Unsupported conversation transfer format version.");
  if (typeof envelope.operationId !== "string") throw new Error("Conversation transfer operation id is required.");
  assertOperationId(envelope.operationId);
  if (typeof envelope.createdAt !== "string" || Number.isNaN(Date.parse(envelope.createdAt))) throw new Error("Conversation transfer createdAt is invalid.");
  if (!descriptorMatches(envelope.descriptor)) throw new Error("Conversation transfer descriptor is not the fixed conversation descriptor.");
  validateSnapshot(envelope.records);
  const expectedCounts = counts(envelope.records);
  if (envelope.counts?.conversations !== expectedCounts.conversations || envelope.counts?.messages !== expectedCounts.messages) {
    throw new Error("Conversation transfer record counts do not match its records.");
  }
  return cloneSnapshot(envelope as ConversationTransferEnvelope);
}

/** The only namespace an import operation may use; input cannot supply a database or store name. */
export function conversationImportStagingName(input: unknown): string {
  return stagingConversationDatabaseName(parseConversationTransferEnvelope(input).operationId);
}

/**
 * Validation completes before candidate or staging storage is opened. The file
 * supplies no database or store names, and this routine never promotes a copy.
 */
export async function stageConversationTransfer(
  input: unknown,
  factory: IDBFactory,
  createRepository: StagingConversationRepositoryFactory = (indexedDb, databaseName) =>
    new IndexedDbConversationRepository(indexedDb, databaseName),
): Promise<{ readonly databaseName: string; readonly envelope: ConversationTransferEnvelope }> {
  const envelope = parseConversationTransferEnvelope(input);
  const databaseName = stagingConversationDatabaseName(envelope.operationId);
  await assertConversationSnapshotNativeConsistency(envelope.records);
  const repository = createRepository(factory, databaseName);
  try {
    await repository.putSnapshot(envelope.records);
    const staged = await repository.readSnapshot();
    await assertConversationSnapshotsEquivalent(envelope.records, staged);
    return { databaseName, envelope };
  } catch (error) {
    try {
      await repository.discardCandidate();
    } catch (discardError) {
      throw new AggregateError([error, discardError], "Conversation staging failed and its exact namespace could not be discarded.");
    }
    throw error;
  }
}

/** Exact staging discard; it cannot address the target, source, journal, or an arbitrary input namespace. */
export async function discardStagedConversationTransfer(input: unknown, factory: IDBFactory): Promise<string> {
  const databaseName = conversationImportStagingName(input);
  await new IndexedDbConversationRepository(factory, databaseName).discardCandidate();
  return databaseName;
}

function descriptorMatches(value: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(conversationDatasetDescriptor);
}

function validateSnapshot(records: unknown): asserts records is ConversationDatasetSnapshot {
  assertConversationSnapshot(records);
}
