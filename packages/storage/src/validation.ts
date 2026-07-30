import type {
  ConversationDatasetSnapshot,
  ConversationProjection,
  MessageProjection,
  PreservedRecord,
} from "@latticework/contracts";

import { canonicalNativeStructuredCloneValue } from "./native-value.ts";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

function assertExactKeys(value: UnknownRecord, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${label} contains unsupported projection fields.`);
}

function keyIdentity(key: string | number): string {
  return typeof key === "string" ? `string:${key}` : `number:${key}`;
}

function assertMessageKey(key: unknown, label: string): asserts key is string | number {
  if (typeof key === "string") return;
  if (typeof key === "number" && Number.isFinite(key)) return;
  throw new Error(`${label} has an invalid message key.`);
}

function shapeEquivalent(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false;
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
  }
  if (left instanceof Blob || right instanceof Blob) {
    return left instanceof Blob && right instanceof Blob && left.size === right.size && left.type === right.type;
  }
  if (left instanceof ArrayBuffer || right instanceof ArrayBuffer) {
    return left instanceof ArrayBuffer
      && right instanceof ArrayBuffer
      && bytesEqual(new Uint8Array(left), new Uint8Array(right));
  }
  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    return ArrayBuffer.isView(left)
      && ArrayBuffer.isView(right)
      && left.constructor.name === right.constructor.name
      && bytesEqual(
        new Uint8Array(left.buffer, left.byteOffset, left.byteLength),
        new Uint8Array(right.buffer, right.byteOffset, right.byteLength),
      );
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => shapeEquivalent(value, right[index]));
  }
  const leftRecord = left as UnknownRecord;
  const rightRecord = right as UnknownRecord;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && shapeEquivalent(leftRecord[key], rightRecord[key]));
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function projectConversation(sourceValue: unknown): ConversationProjection {
  const source = asRecord(sourceValue, "Conversation sourceValue");
  if (typeof source.id !== "string") throw new Error("Conversation sourceValue requires a string id.");
  return {
    id: source.id,
    ...(typeof source.title === "string" ? { title: source.title } : {}),
    ...(Object.hasOwn(source, "createdAt") ? { createdAt: source.createdAt } : {}),
    ...(Object.hasOwn(source, "updatedAt") ? { updatedAt: source.updatedAt } : {}),
  };
}

function projectMessage(sourceValue: unknown): MessageProjection {
  const source = asRecord(sourceValue, "Message sourceValue");
  assertMessageKey(source.id, "Message sourceValue");
  if (typeof source.conversationId !== "string") {
    throw new Error("Message sourceValue requires a string conversationId.");
  }
  return {
    id: source.id,
    conversationId: source.conversationId,
    ...(typeof source.role === "string" ? { role: source.role } : {}),
    ...(Object.hasOwn(source, "createdAt") ? { createdAt: source.createdAt } : {}),
  };
}

function assertConversationRecord(
  record: PreservedRecord<ConversationProjection>,
  seen: Set<string>,
): void {
  if (record === null || typeof record !== "object") throw new Error("Conversation preserved record is malformed.");
  if (typeof record.key !== "string") throw new Error("Conversation record has an invalid key.");
  const identity = keyIdentity(record.key);
  if (seen.has(identity)) throw new Error("Conversation records contain a duplicate key.");
  seen.add(identity);
  const projection = asRecord(record.projection, "Conversation projection");
  assertExactKeys(projection, ["id", "title", "createdAt", "updatedAt"], "Conversation projection");
  if (projection.id !== record.key) throw new Error("Conversation key and projection id are inconsistent.");
  if (!shapeEquivalent(record.projection, projectConversation(record.sourceValue))) {
    throw new Error("Conversation projection and sourceValue are inconsistent.");
  }
}

function assertMessageRecord(
  record: PreservedRecord<MessageProjection>,
  seen: Set<string>,
  conversationIds: Set<string>,
): void {
  if (record === null || typeof record !== "object") throw new Error("Message preserved record is malformed.");
  assertMessageKey(record.key, "Message record");
  const identity = keyIdentity(record.key);
  if (seen.has(identity)) throw new Error("Message records contain a duplicate key.");
  seen.add(identity);
  const projection = asRecord(record.projection, "Message projection");
  assertExactKeys(projection, ["id", "conversationId", "role", "createdAt"], "Message projection");
  if (!shapeEquivalent(projection.id, record.key)) throw new Error("Message key and projection id are inconsistent.");
  if (!shapeEquivalent(record.projection, projectMessage(record.sourceValue))) {
    throw new Error("Message projection and sourceValue are inconsistent.");
  }
  if (typeof projection.conversationId !== "string" || !conversationIds.has(projection.conversationId)) {
    throw new Error("Message references a missing conversation.");
  }
}

/** Exact synchronous schema/key/referential validation, safe before any staging open. */
export function assertConversationSnapshot(snapshot: unknown): asserts snapshot is ConversationDatasetSnapshot {
  const value = asRecord(snapshot, "Conversation snapshot");
  if (value.descriptorId !== "conversation" || value.schemaVersion !== 1) {
    throw new Error("Conversation snapshot descriptor or schema version is unsupported.");
  }
  if (!Array.isArray(value.conversations) || !Array.isArray(value.messages)) {
    throw new Error("Conversation snapshot record arrays are required.");
  }
  const conversationKeys = new Set<string>();
  for (const record of value.conversations as PreservedRecord<ConversationProjection>[]) {
    assertConversationRecord(record, conversationKeys);
  }
  const messageKeys = new Set<string>();
  for (const record of value.messages as PreservedRecord<MessageProjection>[]) {
    assertMessageRecord(record, messageKeys, new Set(
      (value.conversations as PreservedRecord<ConversationProjection>[]).map((record) => record.projection.id),
    ));
  }
}

/**
 * Compares values using the behavior needed after native structured cloning,
 * including binary views and Blob bytes rather than JSON projections.
 */
export async function nativeStructuredCloneEquivalent(left: unknown, right: unknown): Promise<boolean> {
  return await canonicalNativeStructuredCloneValue(left) === await canonicalNativeStructuredCloneValue(right);
}

/** Completes the sync contract check for known projection fields that can contain Blob values. */
export async function assertConversationSnapshotNativeConsistency(
  snapshot: ConversationDatasetSnapshot,
): Promise<void> {
  assertConversationSnapshot(snapshot);
  for (const record of snapshot.conversations) {
    if (!await nativeStructuredCloneEquivalent(record.projection, projectConversation(record.sourceValue))) {
      throw new Error("Conversation projection and sourceValue are not consistent.");
    }
  }
  for (const record of snapshot.messages) {
    if (!await nativeStructuredCloneEquivalent(record.projection, projectMessage(record.sourceValue))) {
      throw new Error("Message projection and sourceValue are not consistent.");
    }
  }
}

/** Validates target schema and proves keyed projection plus opaque native-value equivalence. */
export async function assertConversationSnapshotsEquivalent(
  expected: ConversationDatasetSnapshot,
  actual: ConversationDatasetSnapshot,
): Promise<void> {
  assertConversationSnapshot(expected);
  assertConversationSnapshot(actual);
  await assertConversationSnapshotNativeConsistency(expected);
  await assertConversationSnapshotNativeConsistency(actual);
  if (expected.conversations.length !== actual.conversations.length || expected.messages.length !== actual.messages.length) {
    throw new Error("Conversation snapshots are not equivalent: record counts differ.");
  }
  const compareStore = async <TProjection>(
    expectedRecords: readonly PreservedRecord<TProjection>[],
    actualRecords: readonly PreservedRecord<TProjection>[],
  ): Promise<void> => {
    const actualByKey = new Map(actualRecords.map((record) => [keyIdentity(record.key as string | number), record]));
    for (const expectedRecord of expectedRecords) {
      const actualRecord = actualByKey.get(keyIdentity(expectedRecord.key as string | number));
      if (!actualRecord
        || !await nativeStructuredCloneEquivalent(expectedRecord.projection, actualRecord.projection)
        || !await nativeStructuredCloneEquivalent(expectedRecord.sourceValue, actualRecord.sourceValue)) {
        throw new Error("Conversation snapshots are not equivalent: keyed native record differs.");
      }
    }
  };
  await compareStore(expected.conversations, actual.conversations);
  await compareStore(expected.messages, actual.messages);
}
