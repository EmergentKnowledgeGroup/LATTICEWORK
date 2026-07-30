import assert from "node:assert/strict";
import test from "node:test";

import {
  clonePreservedRecord,
  ConversationMigrationService,
  conversationDatasetDescriptor,
  createConversationTransferEnvelope,
  isJournalTransitionAllowed,
  IndexedDbConversationRepository,
  nativeStructuredCloneEquivalent,
  parseConversationTransferEnvelope,
  stageConversationTransfer,
  stagingConversationDatabaseName,
  validateMigrationJournalUpdate,
} from "./index.ts";
import { syntheticSourceVerificationIdentity } from "./source-verification.ts";

function emptySnapshot() {
  return { descriptorId: "conversation", schemaVersion: 1, conversations: [], messages: [] };
}

function snapshotWithUnknown(unknown) {
  return {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [{ key: "c-1", projection: { id: "c-1" }, sourceValue: { id: "c-1", unknown } }],
    messages: [],
  };
}

test("the descriptor keeps the candidate inactive and confines the synthetic source", () => {
  assert.deepEqual(conversationDatasetDescriptor.source.ownedStores, ["conversations", "messages"]);
  assert.deepEqual(conversationDatasetDescriptor.source.characterizationOnlyStores, ["meta", "memoryIndex"]);
  assert.equal(conversationDatasetDescriptor.target.activation, "forbidden");
  assert.throws(() => stagingConversationDatabaseName("upper-Case"), /operation id/i);
});

test("the journal graph is fail-closed", () => {
  assert.equal(isJournalTransitionAllowed("planned", "copying"), true);
  assert.equal(isJournalTransitionAllowed("copying", "failed"), true);
  assert.equal(isJournalTransitionAllowed("failed", "rolled-back"), false);
  assert.equal(isJournalTransitionAllowed("ready", "copying"), false);
  assert.equal(isJournalTransitionAllowed("planned", "ready"), false);
});

test("preserved records retain a native structured clone independently of projections", () => {
  const sourceValue = {
    id: "c-1",
    title: "Synthetic",
    unknown: {
      ordered: [false, 0, null], when: new Date("2026-01-02T03:04:05.000Z"),
      bytes: new Uint8Array([4, 8, 15, 16, 23, 42]).buffer,
    },
  };
  const record = clonePreservedRecord("c-1", { id: "c-1", title: "Synthetic" }, sourceValue);
  sourceValue.unknown.ordered[0] = true;
  assert.deepEqual(record.sourceValue.unknown.ordered, [false, 0, null]);
  assert.equal(record.sourceValue.unknown.when instanceof Date, true);
  assert.deepEqual([...new Uint8Array(record.sourceValue.unknown.bytes)], [4, 8, 15, 16, 23, 42]);
});

test("candidate repository names are an allowlist, not an inferred namespace", () => {
  const fakeFactory = {};
  assert.throws(
    () => new IndexedDbConversationRepository(fakeFactory, "FreeLatticeDB"),
    /allowlist/i,
  );
  assert.throws(
    () => new IndexedDbConversationRepository(fakeFactory, "latticework::staging::UPPER::conversation"),
    /allowlist/i,
  );
  assert.doesNotThrow(
    () => new IndexedDbConversationRepository(fakeFactory, "latticework::staging::phase3-op-001::conversation"),
  );
});

test("portable transfer parsing rejects hostile or unsupported envelopes", () => {
  const snapshot = {
    descriptorId: "conversation",
    schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: false })],
    messages: [],
  };
  const envelope = createConversationTransferEnvelope("phase3-op-001", "2026-07-30T00:00:00.000Z", snapshot);
  assert.deepEqual(parseConversationTransferEnvelope(envelope), envelope);
  assert.throws(
    () => parseConversationTransferEnvelope({ ...envelope, formatVersion: 2 }),
    /format version/i,
  );
  assert.throws(
    () => parseConversationTransferEnvelope({ ...envelope, records: { ...snapshot, descriptorId: "other" } }),
    /descriptor/i,
  );
});

test("hostile transfer rejects invalid, duplicate, inconsistent, and dangling records before staging", async () => {
  const snapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1", title: "Synthetic" }, { id: "c-1", title: "Synthetic" })],
    messages: [clonePreservedRecord(1, { id: 1, conversationId: "c-1" }, { id: 1, conversationId: "c-1" })],
  };
  const envelope = createConversationTransferEnvelope("phase3-op-001", "2026-07-30T00:00:00.000Z", snapshot);
  const hostileRecords = [
    { ...snapshot, conversations: [...snapshot.conversations, structuredClone(snapshot.conversations[0])] },
    { ...snapshot, conversations: [{ ...snapshot.conversations[0], key: null }] },
    { ...snapshot, conversations: [{ ...snapshot.conversations[0], projection: { id: "other", title: "Synthetic" } }] },
    { ...snapshot, conversations: [{ ...snapshot.conversations[0], sourceValue: { id: "other", title: "Synthetic" } }] },
    { ...snapshot, messages: [{ ...snapshot.messages[0], projection: { id: 1, conversationId: "missing" }, sourceValue: { id: 1, conversationId: "missing" } }] },
  ];
  for (const records of hostileRecords) {
    const hostile = { ...envelope, records, counts: { conversations: records.conversations.length, messages: records.messages.length } };
    assert.throws(() => parseConversationTransferEnvelope(hostile));
    let repositoriesOpened = 0;
    await assert.rejects(stageConversationTransfer(hostile, {}, () => {
      repositoriesOpened += 1;
      throw new Error("must not open");
    }));
    assert.equal(repositoriesOpened, 0);
  }
});

test("staging rereads native values and discards its exact namespace on same-count corruption", async () => {
  const bytes = new Uint8Array([4, 8, 15, 16, 23, 42]);
  const snapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, {
      id: "c-1", date: new Date("2026-07-30T00:00:00.000Z"), blob: new Blob([bytes], { type: "application/octet-stream" }),
      buffer: bytes.buffer, view: new Uint16Array([7, 11, 13]),
    })],
    messages: [],
  };
  const envelope = createConversationTransferEnvelope("phase3-op-001", "2026-07-30T00:00:00.000Z", snapshot);
  let stored = emptySnapshot();
  let discarded = 0;
  const repository = {
    async putSnapshot(value) { stored = structuredClone(value); },
    async readSnapshot() {
      const corrupt = structuredClone(stored);
      corrupt.conversations[0].sourceValue.buffer = new Uint8Array([99]).buffer;
      return corrupt;
    },
    async clearCandidate() {},
    async discardCandidate() { discarded += 1; },
  };
  await assert.rejects(
    stageConversationTransfer(envelope, {}, (_factory, databaseName) => {
      assert.equal(databaseName, "latticework::staging::phase3-op-001::conversation");
      return repository;
    }),
    /equivalent/i,
  );
  assert.equal(discarded, 1);
  assert.equal(await nativeStructuredCloneEquivalent(snapshot.conversations[0].sourceValue.blob, structuredClone(snapshot.conversations[0].sourceValue.blob)), true);
});

test("staging rejects Blob projection/source inconsistency before opening IndexedDB", async () => {
  const projectionBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" });
  const sourceBlob = new Blob([new Uint8Array([1, 2, 4])], { type: "application/octet-stream" });
  const snapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord(
      "c-1",
      { id: "c-1", createdAt: projectionBlob },
      { id: "c-1", createdAt: sourceBlob },
    )],
    messages: [],
  };
  const envelope = createConversationTransferEnvelope("phase3-op-001", "2026-07-30T00:00:00.000Z", snapshot);
  let repositoriesOpened = 0;
  await assert.rejects(stageConversationTransfer(envelope, {}, () => {
    repositoriesOpened += 1;
    throw new Error("must not open");
  }), /consistent/i);
  assert.equal(repositoriesOpened, 0);
});

test("native equivalence distinguishes Date, Blob, ArrayBuffer, and typed-array corruption", async () => {
  const value = {
    date: new Date("2026-07-30T00:00:00.000Z"),
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" }),
    buffer: new Uint8Array([4, 5, 6]).buffer,
    view: new Uint16Array([7, 11, 13]),
  };
  assert.equal(await nativeStructuredCloneEquivalent(value, structuredClone(value)), true);
  assert.equal(await nativeStructuredCloneEquivalent(value, { ...structuredClone(value), date: new Date(0) }), false);
  assert.equal(await nativeStructuredCloneEquivalent(value, {
    ...structuredClone(value), blob: new Blob([new Uint8Array([1, 2, 4])], { type: "application/octet-stream" }),
  }), false);
  assert.equal(await nativeStructuredCloneEquivalent(value, {
    ...structuredClone(value), buffer: new Uint8Array([4, 5, 7]).buffer,
  }), false);
  assert.equal(await nativeStructuredCloneEquivalent(value, {
    ...structuredClone(value), view: new Uint16Array([7, 11, 14]),
  }), false);
});

test("native value equivalence and source identity distinguish RegExp source and flags but ignore lastIndex", async () => {
  const original = /synthetic-source/gi;
  original.lastIndex = 4;
  const cloned = structuredClone(original);
  assert.equal(cloned.lastIndex, 0);
  assert.equal(await nativeStructuredCloneEquivalent(original, cloned), true);
  assert.equal(await nativeStructuredCloneEquivalent(original, /synthetic-target/gi), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, /synthetic-source/g), false);

  const originalIdentity = await syntheticSourceVerificationIdentity(snapshotWithUnknown(original));
  const changedIdentity = await syntheticSourceVerificationIdentity(snapshotWithUnknown(/synthetic-target/gi));
  assert.notEqual(originalIdentity, changedIdentity);
});

test("native value equivalence and source identity distinguish Error name, message, and cause", async () => {
  const original = new TypeError("synthetic failure", { cause: { code: "first" } });
  assert.equal(await nativeStructuredCloneEquivalent(original, structuredClone(original)), true);
  assert.equal(await nativeStructuredCloneEquivalent(original, new RangeError("synthetic failure", { cause: { code: "first" } })), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, new TypeError("changed failure", { cause: { code: "first" } })), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, new TypeError("synthetic failure", { cause: { code: "second" } })), false);

  const originalIdentity = await syntheticSourceVerificationIdentity(snapshotWithUnknown(original));
  const changedIdentity = await syntheticSourceVerificationIdentity(snapshotWithUnknown(
    new TypeError("synthetic failure", { cause: { code: "second" } }),
  ));
  assert.notEqual(originalIdentity, changedIdentity);

  const aggregate = new AggregateError([new Error("first")], "aggregate");
  const aggregateClone = structuredClone(aggregate);
  assert.equal(await nativeStructuredCloneEquivalent(aggregate, aggregateClone), true);
  if (aggregateClone instanceof AggregateError && Array.isArray(aggregateClone.errors)) {
    assert.equal(
      await nativeStructuredCloneEquivalent(aggregate, new AggregateError([new Error("second")], "aggregate")),
      false,
    );
  }
});

test("native value contract preserves File metadata when supported", async () => {
  if (typeof File !== "function") return;
  const original = new File([new Uint8Array([1, 2, 3])], "synthetic.txt", {
    type: "text/plain", lastModified: 123,
  });
  assert.equal(await nativeStructuredCloneEquivalent(original, structuredClone(original)), true);
  assert.equal(await nativeStructuredCloneEquivalent(original, new File([new Uint8Array([1, 2, 3])], "changed.txt", {
    type: "text/plain", lastModified: 123,
  })), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, new File([new Uint8Array([1, 2, 3])], "synthetic.txt", {
    type: "text/plain", lastModified: 456,
  })), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, new File([new Uint8Array([1, 2, 3])], "synthetic.txt", {
    type: "application/octet-stream", lastModified: 123,
  })), false);
  assert.equal(await nativeStructuredCloneEquivalent(original, new File([new Uint8Array([1, 2, 4])], "synthetic.txt", {
    type: "text/plain", lastModified: 123,
  })), false);
});

test("native value contract supports cycles and plain/null-prototype objects but rejects class instances", async () => {
  const cyclic = { value: false };
  cyclic.self = cyclic;
  assert.equal(await nativeStructuredCloneEquivalent(cyclic, structuredClone(cyclic)), true);
  const nullPrototype = Object.assign(Object.create(null), { zero: 0, nested: { value: null } });
  assert.equal(await nativeStructuredCloneEquivalent(nullPrototype, structuredClone(nullPrototype)), true);

  class UnsupportedSyntheticValue {
    constructor() { this.value = "must-not-be-flattened"; }
  }
  const unsupported = new UnsupportedSyntheticValue();
  await assert.rejects(nativeStructuredCloneEquivalent(unsupported, structuredClone(unsupported)), /unsupported.*class|class.*unsupported/i);
  await assert.rejects(syntheticSourceVerificationIdentity(snapshotWithUnknown(unsupported)), /unsupported.*class|class.*unsupported/i);
});

test("native value contract covers primitives, sparse arrays, Map, Set, and DataView", async () => {
  const buffer = new ArrayBuffer(8);
  new Uint8Array(buffer).set([1, 2, 3, 4, 5, 6, 7, 8]);
  const sparse = [undefined, , false, 0, null, 1n, Number.NaN, Number.NEGATIVE_INFINITY, -0];
  const value = {
    sparse,
    map: new Map([["key", { ordered: [1, 2, 3] }]]),
    set: new Set(["first", "second"]),
    view: new DataView(buffer, 2, 4),
  };
  assert.equal(await nativeStructuredCloneEquivalent(value, structuredClone(value)), true);
  assert.equal(await nativeStructuredCloneEquivalent(value, { ...structuredClone(value), sparse: [undefined, undefined, ...sparse.slice(2)] }), false);
  assert.equal(await nativeStructuredCloneEquivalent(value, {
    ...structuredClone(value), map: new Map([["key", { ordered: [1, 2, 4] }]]),
  }), false);
  const changedBuffer = buffer.slice(0);
  new Uint8Array(changedBuffer)[0] = 99;
  assert.equal(await nativeStructuredCloneEquivalent(value, {
    ...structuredClone(value), view: new DataView(changedBuffer, 2, 4),
  }), false);
});

test("journal validation freezes identity, failed receipts, and monotonic progress", () => {
  const planned = {
    operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", datasetId: "conversation",
    sourceVerificationIdentity: `synthetic-v3:${"0".repeat(64)}`,
    sourceDatabase: "FreeLatticeDB", sourceVersion: 3, targetDatabase: "latticework::conversation",
    state: "planned", copied: { conversations: 0, messages: 0 }, expected: { conversations: 2, messages: 3 }, checkpoint: 0,
    createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-30T00:00:00.000Z",
  };
  const copying = { ...planned, state: "copying", copied: { conversations: 1, messages: 0 }, checkpoint: 1, updatedAt: "2026-07-30T00:00:01.000Z" };
  assert.doesNotThrow(() => validateMigrationJournalUpdate(planned, copying));
  for (const invalid of [
    { ...copying, sourceVersion: 4 },
    { ...copying, targetDatabase: "latticework::other" },
    { ...copying, sourceVerificationIdentity: `synthetic-v3:${"1".repeat(64)}` },
    { ...copying, expected: { conversations: 9, messages: 3 } },
    { ...copying, createdAt: "2026-07-30T00:00:02.000Z" },
    { ...copying, copied: { conversations: 0, messages: 0 }, checkpoint: 2 },
    { ...copying, checkpoint: 0 },
  ]) assert.throws(() => validateMigrationJournalUpdate(copying, invalid));
  const failed = { ...copying, state: "failed", failureCode: "synthetic", candidateDisposition: "discarded", updatedAt: "2026-07-30T00:00:02.000Z" };
  assert.throws(
    () => validateMigrationJournalUpdate(failed, { ...failed, state: "rolled-back" }),
    /terminal|only failed/i,
  );
  assert.throws(
    () => validateMigrationJournalUpdate(undefined, { ...planned, sourceVerificationIdentity: undefined }),
    /verification identity/i,
  );
  assert.throws(
    () => validateMigrationJournalUpdate(copying, { ...copying, state: "failed", failureCode: "synthetic" }),
    /disposition/i,
  );
});

test("migration checkpoints, resumes idempotently, and never activates the candidate", async () => {
  const sourceSnapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [clonePreservedRecord(1, { id: 1, conversationId: "c-1" }, { id: 1, conversationId: "c-1", unknown: false })],
  };
  let candidate = emptySnapshot();
  const entries = new Map();
  const service = new ConversationMigrationService(
    { async read() { return { kind: "ready", sourceVersion: 3, snapshot: structuredClone(sourceSnapshot) }; } },
    {
      async putSnapshot(snapshot) { candidate = structuredClone(snapshot); },
      async readSnapshot() { return structuredClone(candidate); },
      async clearCandidate() { candidate = emptySnapshot(); },
    },
    {
      async read(operationId) { return entries.get(operationId); },
      async write(entry) { entries.set(entry.operationId, structuredClone(entry)); },
    },
  );
  const interrupted = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", batchSize: 1, interruptAfterBatches: 1 });
  assert.equal(interrupted.state, "copying");
  assert.equal(interrupted.candidateActive, false);
  const result = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", batchSize: 1 });
  assert.equal(result.state, "ready");
  assert.deepEqual(result.copied, { conversations: 1, messages: 1 });
  assert.equal(candidate.conversations[0].sourceValue.unknown.zero, 0);
  assert.equal(candidate.messages[0].sourceValue.unknown, false);
  assert.deepEqual(sourceSnapshot, {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [clonePreservedRecord(1, { id: 1, conversationId: "c-1" }, { id: 1, conversationId: "c-1", unknown: false })],
  });
});

test("future source versions abstain before candidate or journal writes", async () => {
  let candidateWrites = 0;
  let journalWrites = 0;
  const service = new ConversationMigrationService(
    { async read() { return { kind: "abstained", reason: "unsupported-source-version", sourceVersion: 4 }; } },
    { async putSnapshot() { candidateWrites += 1; }, async readSnapshot() { return emptySnapshot(); }, async clearCandidate() {} },
    { async read() { return undefined; }, async write() { journalWrites += 1; } },
  );
  const result = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" });
  assert.equal(result.abstentionReason, "unsupported-source-version");
  assert.equal(candidateWrites, 0);
  assert.equal(journalWrites, 0);
});

test("same-count candidate corruption fails validation instead of becoming ready", async () => {
  const sourceSnapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [],
  };
  let candidate = emptySnapshot();
  let reads = 0;
  const entries = new Map();
  const service = new ConversationMigrationService(
    { async read() { return { kind: "ready", sourceVersion: 3, snapshot: structuredClone(sourceSnapshot) }; } },
    {
      async putSnapshot(value) { candidate = structuredClone(value); },
      async readSnapshot() {
        reads += 1;
        if (reads < 2) return structuredClone(candidate);
        const corrupt = structuredClone(candidate);
        corrupt.conversations[0].sourceValue.unknown.zero = 99;
        return corrupt;
      },
      async clearCandidate() {},
      async discardCandidate() {},
    },
    { async read(id) { return entries.get(id); }, async write(entry) { entries.set(entry.operationId, structuredClone(entry)); } },
  );
  const result = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" });
  assert.equal(result.state, "failed");
});

test("a failed synthetic migration discards its exact candidate and retains immutable terminal evidence", async () => {
  const sourceSnapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [],
  };
  const entries = new Map();
  let discarded = 0;
  const service = new ConversationMigrationService(
    { async read() { return { kind: "ready", sourceVersion: 3, snapshot: structuredClone(sourceSnapshot) }; } },
    {
      async putSnapshot() { throw new Error("synthetic candidate write fault"); },
      async readSnapshot() { return emptySnapshot(); },
      async clearCandidate() { throw new Error("fallback must not run"); },
      async discardCandidate() { discarded += 1; },
    },
    { async read(id) { return entries.get(id); }, async write(entry) { entries.set(entry.operationId, structuredClone(entry)); } },
  );
  const result = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" });
  const failed = entries.get("phase3-op-001");
  assert.equal(result.state, "failed");
  assert.equal(discarded, 1);
  assert.equal(failed.failureCode, "candidate-write-failed");
  assert.equal(failed.candidateDisposition, "discarded");
  assert.throws(() => validateMigrationJournalUpdate(failed, { ...failed, failureCode: "rewritten" }), /terminal/i);
});

test("a same-count source mutation cannot reuse a ready operation", async () => {
  let sourceSnapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [],
  };
  let candidate = emptySnapshot();
  const entries = new Map();
  const service = new ConversationMigrationService(
    { async read() { return { kind: "ready", sourceVersion: 3, snapshot: structuredClone(sourceSnapshot) }; } },
    {
      async putSnapshot(value) { candidate = structuredClone(value); },
      async readSnapshot() { return structuredClone(candidate); },
      async clearCandidate() { candidate = emptySnapshot(); },
    },
    { async read(id) { return entries.get(id); }, async write(entry) { entries.set(entry.operationId, structuredClone(entry)); } },
  );
  assert.equal((await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" })).state, "ready");
  sourceSnapshot = {
    ...sourceSnapshot,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 99 } })],
  };
  await assert.rejects(
    service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" }),
    /source verification identity/i,
  );
  assert.equal(entries.get("phase3-op-001").state, "ready");
  assert.equal(candidate.conversations[0].sourceValue.unknown.zero, 0);
});

test("a ready operation is revalidated before idempotent reuse", async () => {
  const sourceSnapshot = {
    descriptorId: "conversation", schemaVersion: 1,
    conversations: [clonePreservedRecord("c-1", { id: "c-1" }, { id: "c-1", unknown: { zero: 0 } })],
    messages: [],
  };
  let candidate = emptySnapshot();
  const entries = new Map();
  const service = new ConversationMigrationService(
    { async read() { return { kind: "ready", sourceVersion: 3, snapshot: structuredClone(sourceSnapshot) }; } },
    {
      async putSnapshot(value) { candidate = structuredClone(value); },
      async readSnapshot() { return structuredClone(candidate); },
      async clearCandidate() { candidate = emptySnapshot(); },
      async discardCandidate() { candidate = emptySnapshot(); },
    },
    { async read(id) { return entries.get(id); }, async write(entry) { entries.set(entry.operationId, structuredClone(entry)); } },
  );
  assert.equal((await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" })).state, "ready");
  candidate.conversations[0].sourceValue.unknown.zero = 99;
  await assert.rejects(
    service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" }),
    /ready candidate.*source/i,
  );
  assert.equal(entries.get("phase3-op-001").state, "ready");
});

test("a ready operation is not reported ready when its source cannot be verified", async () => {
  const ready = {
    operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", datasetId: "conversation",
    sourceVerificationIdentity: `synthetic-v3:${"0".repeat(64)}`,
    sourceDatabase: "FreeLatticeDB", sourceVersion: 3, targetDatabase: "latticework::conversation",
    state: "ready", copied: { conversations: 1, messages: 0 }, expected: { conversations: 1, messages: 0 }, checkpoint: 1,
    createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-30T00:00:00.000Z",
  };
  const service = new ConversationMigrationService(
    { async read() { throw new Error("synthetic source unavailable"); } },
    { async putSnapshot() {}, async readSnapshot() { return emptySnapshot(); }, async clearCandidate() {}, async discardCandidate() {} },
    { async read() { return ready; }, async write() { throw new Error("ready receipt must remain immutable"); } },
  );
  await assert.rejects(
    service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" }),
    /cannot verify.*ready/i,
  );
});

test("source failure cannot mutate an active operation bound to another migration id", async () => {
  const existing = {
    operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", datasetId: "conversation",
    sourceVerificationIdentity: `synthetic-v3:${"0".repeat(64)}`,
    sourceDatabase: "FreeLatticeDB", sourceVersion: 3, targetDatabase: "latticework::conversation",
    state: "copying", copied: { conversations: 1, messages: 0 }, expected: { conversations: 2, messages: 0 }, checkpoint: 1,
    createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-30T00:00:00.000Z",
  };
  let discarded = 0;
  let writes = 0;
  const service = new ConversationMigrationService(
    { async read() { throw new Error("synthetic source unavailable"); } },
    {
      async putSnapshot() {},
      async readSnapshot() { return emptySnapshot(); },
      async clearCandidate() {},
      async discardCandidate() { discarded += 1; },
    },
    {
      async read() { return existing; },
      async write() { writes += 1; },
    },
  );

  await assert.rejects(
    service.migrate({ operationId: "phase3-op-001", migrationId: "different-migration" }),
    /another migration id/i,
  );
  assert.equal(discarded, 0);
  assert.equal(writes, 0);
});

test("source failure cannot return a terminal operation bound to another migration id", async () => {
  const existing = {
    operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", datasetId: "conversation",
    sourceVerificationIdentity: `synthetic-v3:${"0".repeat(64)}`,
    sourceDatabase: "FreeLatticeDB", sourceVersion: 3, targetDatabase: "latticework::conversation",
    state: "failed", copied: { conversations: 0, messages: 0 }, expected: { conversations: 1, messages: 0 }, checkpoint: 0,
    failureCode: "source-read-failed", candidateDisposition: "discarded",
    createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-30T00:00:01.000Z",
  };
  let discarded = 0;
  let writes = 0;
  const service = new ConversationMigrationService(
    { async read() { throw new Error("synthetic source unavailable"); } },
    {
      async putSnapshot() {},
      async readSnapshot() { return emptySnapshot(); },
      async clearCandidate() {},
      async discardCandidate() { discarded += 1; },
    },
    {
      async read() { return existing; },
      async write() { writes += 1; },
    },
  );

  await assert.rejects(
    service.migrate({ operationId: "phase3-op-001", migrationId: "different-migration" }),
    /another migration id/i,
  );
  assert.equal(discarded, 0);
  assert.equal(writes, 0);
});

test("source failure creates planned then failed journal evidence without candidate writes", async () => {
  const states = [];
  const service = new ConversationMigrationService(
    { async read() { throw new Error("synthetic source fault"); } },
    { async putSnapshot() { throw new Error("must not write candidate"); }, async readSnapshot() { return emptySnapshot(); }, async clearCandidate() {}, async discardCandidate() {} },
    { async read() { return undefined; }, async write(entry) { states.push(entry.state); } },
  );
  const result = await service.migrate({ operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1" });
  assert.equal(result.state, "failed");
  assert.deepEqual(states, ["planned", "failed"]);
});

test("rollback discards an exact candidate when the repository exposes discard semantics", async () => {
  const entry = {
    operationId: "phase3-op-001", migrationId: "synthetic-v3-to-v1", datasetId: "conversation",
    sourceVerificationIdentity: `synthetic-v3:${"0".repeat(64)}`,
    sourceDatabase: "FreeLatticeDB", sourceVersion: 3, targetDatabase: "latticework::conversation",
    state: "ready", copied: { conversations: 1, messages: 0 }, expected: { conversations: 1, messages: 0 }, checkpoint: 1,
    createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-30T00:00:00.000Z",
  };
  let discarded = 0;
  const writes = [];
  const service = new ConversationMigrationService(
    { async read() { throw new Error("not used"); } },
    { async putSnapshot() {}, async readSnapshot() { return emptySnapshot(); }, async clearCandidate() { throw new Error("fallback must not run"); }, async discardCandidate() { discarded += 1; } },
    { async read() { return entry; }, async write(next) { writes.push(next.state); } },
  );
  const result = await service.rollback("phase3-op-001", () => "2026-07-30T00:00:01.000Z");
  assert.equal(result.state, "rolled-back");
  assert.equal(discarded, 1);
  assert.deepEqual(writes, ["rolled-back"]);
});
