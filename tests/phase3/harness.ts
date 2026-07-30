import {
  ConversationMigrationService,
  FreeLatticeConversationSourceReader,
  IndexedDbConversationRepository,
  IndexedDbMigrationJournal,
  createConversationTransferEnvelope,
  discardStagedConversationTransfer,
  parseConversationTransferEnvelope,
  stageConversationTransfer,
} from "@latticework/storage";
import type {
  ConversationDatasetSnapshot,
  MigrationJournalEntry,
} from "@latticework/contracts";

import { openDatabase } from "../../packages/storage/src/indexeddb.ts";

const sourceDatabaseName = "FreeLatticeDB";
const candidateDatabaseName = "latticework::conversation";
const migrationDatabaseName = "latticework::migration";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to delete ${name}.`));
    request.onblocked = () =>
      reject(new Error(`Delete blocked for ${name}.`));
  });
}

function openSource(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(sourceDatabaseName, version);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("conversations")) {
        const conversations = database.createObjectStore("conversations", {
          keyPath: "id",
        });
        conversations.createIndex("updatedAt", "updatedAt");
      }
      if (!database.objectStoreNames.contains("messages")) {
        const messages = database.createObjectStore("messages", {
          keyPath: "id",
          autoIncrement: true,
        });
        messages.createIndex("conversationId", "conversationId");
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta");
      }
      if (!database.objectStoreNames.contains("memoryIndex")) {
        database.createObjectStore("memoryIndex");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open synthetic source."));
  });
}

async function reset(operationIds: readonly string[] = []): Promise<void> {
  const names = [
    sourceDatabaseName,
    candidateDatabaseName,
    migrationDatabaseName,
    ...operationIds.map(
      (operationId) =>
        `latticework::staging::${operationId}::conversation`,
    ),
  ];
  const inventory = await indexedDB.databases();
  const present = new Set(inventory.map((entry) => entry.name));
  for (const name of names) {
    if (present.has(name)) await deleteDatabase(name);
  }
}

async function seedSource(version = 3): Promise<void> {
  const database = await openSource(version);
  try {
    const transaction = database.transaction(
      ["conversations", "messages", "meta", "memoryIndex"],
      "readwrite",
    );
    transaction.objectStore("conversations").put({
      id: "conversation-alpha",
      title: "Unicode: こんにちは 🌱",
      createdAt: new Date("2026-07-30T00:00:00.000Z"),
      updatedAt: new Date("2026-07-30T00:01:00.000Z"),
      falseValue: false,
      zeroValue: 0,
      nullValue: null,
      ordered: ["first", "second", "third"],
      nested: {
        unknown: {
          bytes: new Uint8Array([0, 1, 2, 255]).buffer,
          blob: new Blob(["synthetic-blob"], { type: "text/plain" }),
        },
      },
    });
    transaction.objectStore("conversations").put({
      id: "conversation-beta",
      title: "",
      updatedAt: 0,
      unknownArray: [false, 0, null, "✓"],
    });
    transaction.objectStore("messages").put({
      conversationId: "conversation-alpha",
      role: "user",
      content: "Synthetic message one",
      createdAt: new Date("2026-07-30T00:00:10.000Z"),
      unknown: { falseValue: false, zeroValue: 0 },
    });
    transaction.objectStore("messages").put({
      conversationId: "conversation-alpha",
      role: "assistant",
      content: "Synthetic message two",
      unknown: new Uint8Array([9, 8, 7]),
    });
    transaction.objectStore("meta").put(
      { excluded: true, marker: "meta-untouched" },
      "meta-key",
    );
    transaction.objectStore("memoryIndex").put(
      { excluded: true, marker: "memory-untouched" },
      "memory-key",
    );
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

async function readStore(databaseName: string, storeName: string): Promise<unknown[]> {
  const inventory = await indexedDB.databases();
  if (!inventory.some((entry) => entry.name === databaseName)) {
    throw new Error(`Refusing to create missing database ${databaseName} during a read.`);
  }
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to open ${databaseName}.`));
  });
  try {
    if (!database.objectStoreNames.contains(storeName)) return [];
    const transaction = database.transaction(storeName, "readonly");
    const values = await requestResult(
      transaction.objectStore(storeName).getAll(),
    );
    await transactionDone(transaction);
    return values;
  } finally {
    database.close();
  }
}

async function databaseSchema(databaseName: string): Promise<unknown> {
  const inventory = await indexedDB.databases();
  if (!inventory.some((entry) => entry.name === databaseName)) {
    throw new Error(`Refusing to create missing database ${databaseName} during schema inspection.`);
  }
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to inspect ${databaseName}.`));
  });
  try {
    const storeNames = [...database.objectStoreNames];
    const transaction = database.transaction(storeNames, "readonly");
    const stores = storeNames.map((name) => {
      const store = transaction.objectStore(name);
      return {
        autoIncrement: store.autoIncrement,
        indexes: [...store.indexNames].map((indexName) => {
          const index = store.index(indexName);
          return {
            keyPath: structuredClone(index.keyPath),
            multiEntry: index.multiEntry,
            name: index.name,
            unique: index.unique,
          };
        }),
        keyPath: structuredClone(store.keyPath),
        name,
      };
    });
    await transactionDone(transaction);
    return {
      name: database.name,
      stores,
      version: database.version,
    };
  } finally {
    database.close();
  }
}

async function describe(value: unknown): Promise<unknown> {
  if (value instanceof Date) return { type: "Date", value: value.toISOString() };
  if (value instanceof Blob) {
    return {
      type: "Blob",
      mediaType: value.type,
      bytes: [...new Uint8Array(await value.arrayBuffer())],
    };
  }
  if (value instanceof ArrayBuffer) {
    return { type: "ArrayBuffer", bytes: [...new Uint8Array(value)] };
  }
  if (ArrayBuffer.isView(value)) {
    return {
      type: value.constructor.name,
      bytes: [
        ...new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      ],
    };
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => describe(item)));
  }
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = await describe((value as Record<string, unknown>)[key]);
    }
    return output;
  }
  return value;
}

function services() {
  const source = new FreeLatticeConversationSourceReader(indexedDB);
  const candidate = new IndexedDbConversationRepository(indexedDB);
  const journal = new IndexedDbMigrationJournal(indexedDB);
  const migration = new ConversationMigrationService(
    source,
    candidate,
    journal,
  );
  return { candidate, journal, migration, source };
}

function emptySnapshot(): ConversationDatasetSnapshot {
  return {
    descriptorId: "conversation",
    schemaVersion: 1,
    conversations: [],
    messages: [],
  };
}

async function simulateQuotaFailure(operationId: string) {
  let entry: MigrationJournalEntry | undefined;
  let discarded = false;
  const transitions: string[] = [];
  const migration = new ConversationMigrationService(
    new FreeLatticeConversationSourceReader(indexedDB),
    {
      async clearCandidate() {},
      async discardCandidate() {
        discarded = true;
      },
      async putSnapshot() {
        throw new DOMException(
          "Synthetic candidate quota failure.",
          "QuotaExceededError",
        );
      },
      async readSnapshot() {
        return emptySnapshot();
      },
    },
    {
      async read(requestedOperationId) {
        return requestedOperationId === operationId
          ? structuredClone(entry)
          : undefined;
      },
      async write(next) {
        entry = structuredClone(next);
        transitions.push(next.state);
      },
    },
  );
  const result = await migration.migrate({
    batchSize: 1,
    migrationId: "freelattice-v3-to-conversation-v1",
    now: () => "2026-07-30T00:04:00.000Z",
    operationId,
  });
  return {
    discarded,
    journal: entry === undefined ? undefined : structuredClone(entry),
    result,
    transitions,
  };
}

async function proveBlockedUpgrade() {
  const databaseName = candidateDatabaseName;
  const inventory = await indexedDB.databases();
  if (inventory.some((entry) => entry.name === databaseName)) {
    await deleteDatabase(databaseName);
  }
  const held = await openDatabase(indexedDB, databaseName, 1, (database) => {
    database.createObjectStore("conversations");
    database.createObjectStore("messages");
  });
  let settled = false;
  const upgrade = openDatabase(indexedDB, databaseName, 2).then(
    (database) => {
      settled = true;
      return database;
    },
    (error: unknown) => {
      settled = true;
      throw error;
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  const pendingWhileBlocked = !settled;
  held.close();
  const upgraded = await upgrade;
  const openedVersion = upgraded.version;
  upgraded.close();
  await deleteDatabase(databaseName);
  const cleaned = !(await indexedDB.databases()).some(
    (entry) => entry.name === databaseName,
  );
  return { cleaned, openedVersion, pendingWhileBlocked };
}

const api = {
  reset,
  seedSource,
  describe,
  readStore,
  databaseSchema,
  inventory: () => indexedDB.databases(),
  migrate: (
    operationId: string,
    options: { batchSize?: number; interruptAfterBatches?: number } = {},
  ) =>
    services().migration.migrate({
      operationId,
      migrationId: "freelattice-v3-to-conversation-v1",
      now: () => "2026-07-30T00:00:00.000Z",
      ...options,
    }),
  rollback: (operationId: string) =>
    services().migration.rollback(
      operationId,
      () => "2026-07-30T00:02:00.000Z",
    ),
  candidateSnapshot: () => services().candidate.readSnapshot(),
  journal: (operationId: string) => services().journal.read(operationId),
  exportEnvelope: async (operationId: string) =>
    createConversationTransferEnvelope(
      operationId,
      "2026-07-30T00:03:00.000Z",
      await services().candidate.readSnapshot(),
    ),
  parseEnvelope: (input: unknown) => parseConversationTransferEnvelope(input),
  stageEnvelope: (input: unknown) =>
    stageConversationTransfer(input, indexedDB),
  discardStagedEnvelope: (input: unknown) =>
    discardStagedConversationTransfer(input, indexedDB),
  proveBlockedUpgrade,
  simulateQuotaFailure,
};

declare global {
  interface Window {
    latticeworkPhase3Storage: typeof api;
  }
}

Object.defineProperty(window, "latticeworkPhase3Storage", {
  configurable: false,
  writable: false,
  value: Object.freeze(api),
});
document.querySelector("#status")!.textContent = "Bounded synthetic test API ready.";
