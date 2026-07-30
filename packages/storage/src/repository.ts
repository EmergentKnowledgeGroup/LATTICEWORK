import type {
  ConversationDatasetSnapshot,
  ConversationProjection,
  ConversationRepository,
  MessageProjection,
  MigrationJournal,
  MigrationJournalEntry,
  PreservedRecord,
} from "@latticework/contracts";

import { cloneSnapshot } from "./clone.ts";
import {
  assertConversationCandidateDatabaseName,
  conversationDatasetDescriptor,
  migrationDatabaseName,
} from "./descriptor.ts";
import { nativeIndexedDbFactory, openDatabase, requestResult, transactionDone } from "./indexeddb.ts";
import { validateMigrationJournalUpdate } from "./journal-validation.ts";
import { assertConversationSnapshot } from "./validation.ts";

const conversationStore = "conversations";
const messageStore = "messages";
const journalStore = "journal";

function assertSnapshot(snapshot: ConversationDatasetSnapshot): void {
  assertConversationSnapshot(snapshot);
}

/** Candidate-only repository. It never opens or writes the legacy source namespace. */
export class IndexedDbConversationRepository implements ConversationRepository {
  readonly databaseName: string;
  #factory: IDBFactory;

  constructor(factory: IDBFactory = nativeIndexedDbFactory(), databaseName = conversationDatasetDescriptor.target.database) {
    this.#factory = factory;
    assertConversationCandidateDatabaseName(databaseName);
    this.databaseName = databaseName;
  }

  async putSnapshot(snapshot: ConversationDatasetSnapshot): Promise<void> {
    assertSnapshot(snapshot);
    const database = await this.#open();
    try {
      const transaction = database.transaction([conversationStore, messageStore], "readwrite");
      const conversations = transaction.objectStore(conversationStore);
      const messages = transaction.objectStore(messageStore);
      conversations.clear();
      messages.clear();
      for (const record of snapshot.conversations) conversations.put(cloneSnapshot(record), record.key);
      for (const record of snapshot.messages) messages.put(cloneSnapshot(record), record.key);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async readSnapshot(): Promise<ConversationDatasetSnapshot> {
    const database = await this.#open();
    try {
      const transaction = database.transaction([conversationStore, messageStore], "readonly");
      const conversations = transaction.objectStore(conversationStore);
      const messages = transaction.objectStore(messageStore);
      const [conversationValues, conversationKeys, messageValues, messageKeys] = await Promise.all([
        requestResult(conversations.getAll()),
        requestResult(conversations.getAllKeys()),
        requestResult(messages.getAll()),
        requestResult(messages.getAllKeys()),
      ]);
      await transactionDone(transaction);
      return {
        descriptorId: "conversation",
        schemaVersion: 1,
        conversations: conversationValues.map((value, index) => cloneSnapshot({
          ...(value as PreservedRecord<ConversationProjection>), key: conversationKeys[index] as IDBValidKey,
        })),
        messages: messageValues.map((value, index) => cloneSnapshot({
          ...(value as PreservedRecord<MessageProjection>), key: messageKeys[index] as IDBValidKey,
        })),
      };
    } finally {
      database.close();
    }
  }

  async clearCandidate(): Promise<void> {
    const database = await this.#open();
    try {
      const transaction = database.transaction([conversationStore, messageStore], "readwrite");
      transaction.objectStore(conversationStore).clear();
      transaction.objectStore(messageStore).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  /** Deletes only this exact allowlisted candidate or staging database. */
  async discardCandidate(): Promise<void> {
    assertConversationCandidateDatabaseName(this.databaseName);
    await new Promise<void>((resolve, reject) => {
      const request = this.#factory.deleteDatabase(this.databaseName);
      // Like a blocked open, a blocked deletion remains live. Wait for its
      // actual success or error instead of reporting a failure before a later
      // deletion can still occur.
      request.onblocked = () => undefined;
      request.onerror = () => reject(request.error ?? new Error(`IndexedDB discard failed for ${this.databaseName}.`));
      request.onsuccess = () => resolve();
    });
  }

  async #open(): Promise<IDBDatabase> {
    const database = await openDatabase(this.#factory, this.databaseName, 1, (database) => {
      if (!database.objectStoreNames.contains(conversationStore)) database.createObjectStore(conversationStore);
      if (!database.objectStoreNames.contains(messageStore)) database.createObjectStore(messageStore);
    });
    const stores = [...database.objectStoreNames].sort();
    if (database.version !== 1 || stores.length !== 2 || stores[0] !== conversationStore || stores[1] !== messageStore) {
      database.close();
      throw new Error("Conversation candidate database does not match the exact structural schema.");
    }
    return database;
  }
}

/** Shared journal repository; it owns no candidate or legacy data stores. */
export class IndexedDbMigrationJournal implements MigrationJournal {
  #factory: IDBFactory;

  constructor(factory: IDBFactory = nativeIndexedDbFactory()) {
    this.#factory = factory;
  }

  async read(operationId: string): Promise<MigrationJournalEntry | undefined> {
    const database = await this.#open();
    try {
      const transaction = database.transaction(journalStore, "readonly");
      const entry = await requestResult(transaction.objectStore(journalStore).get(operationId));
      await transactionDone(transaction);
      return entry === undefined ? undefined : cloneSnapshot(entry as MigrationJournalEntry);
    } finally {
      database.close();
    }
  }

  async write(entry: MigrationJournalEntry): Promise<void> {
    const database = await this.#open();
    try {
      const transaction = database.transaction(journalStore, "readwrite");
      const store = transaction.objectStore(journalStore);
      const current = await requestResult(store.get(entry.operationId)) as MigrationJournalEntry | undefined;
      validateMigrationJournalUpdate(current, entry);
      store.put(cloneSnapshot(entry));
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async #open(): Promise<IDBDatabase> {
    return openDatabase(this.#factory, migrationDatabaseName, 1, (database) => {
      if (!database.objectStoreNames.contains(journalStore)) database.createObjectStore(journalStore, { keyPath: "operationId" });
    });
  }
}
