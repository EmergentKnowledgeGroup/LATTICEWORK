import type {
  ConversationDatasetSnapshot,
  ConversationProjection,
  MessageProjection,
} from "@latticework/contracts";

import { clonePreservedRecord } from "./clone.ts";
import { conversationDatasetDescriptor } from "./descriptor.ts";
import { openDatabase, requestResult, transactionDone } from "./indexeddb.ts";

export type ConversationSourceReadResult =
  | { readonly kind: "ready"; readonly snapshot: ConversationDatasetSnapshot; readonly sourceVersion: 3 }
  | { readonly kind: "abstained"; readonly reason: "unsupported-source-version"; readonly sourceVersion: number };

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Synthetic ${label} record must be an object.`);
  }
  return value as Record<string, unknown>;
}

function conversationProjection(value: unknown): ConversationProjection {
  const source = asObject(value, "conversation");
  if (typeof source.id !== "string") throw new Error("Synthetic conversation records require a string id.");
  return {
    id: source.id,
    ...(typeof source.title === "string" ? { title: source.title } : {}),
    ...(Object.hasOwn(source, "createdAt") ? { createdAt: source.createdAt } : {}),
    ...(Object.hasOwn(source, "updatedAt") ? { updatedAt: source.updatedAt } : {}),
  };
}

function messageProjection(value: unknown): MessageProjection {
  const source = asObject(value, "message");
  if (typeof source.id !== "string" && typeof source.id !== "number") {
    throw new Error("Synthetic message records require a string or numeric id.");
  }
  if (typeof source.conversationId !== "string") {
    throw new Error("Synthetic message records require a string conversationId.");
  }
  return {
    id: source.id,
    conversationId: source.conversationId,
    ...(typeof source.role === "string" ? { role: source.role } : {}),
    ...(Object.hasOwn(source, "createdAt") ? { createdAt: source.createdAt } : {}),
  };
}

/** Reads only the two declared synthetic source stores, using read-only transactions. */
export class FreeLatticeConversationSourceReader {
  #factory: IDBFactory;

  /**
   * Source access is deliberately injected. Production code cannot accidentally
   * use a browser profile as a synthetic fixture by merely constructing this reader.
   */
  constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  async read(): Promise<ConversationSourceReadResult> {
    const inventory = (this.#factory as IDBFactory & { databases?: () => Promise<readonly IDBDatabaseInfo[]> }).databases;
    if (!inventory) throw new Error("Source database inventory is unavailable; refusing a source open that could create a database.");
    const databases = await inventory.call(this.#factory);
    const sourceInfo = databases.find((database) => database.name === conversationDatasetDescriptor.source.database);
    if (!sourceInfo) return { kind: "abstained", reason: "unsupported-source-version", sourceVersion: 0 };
    const database = await openDatabase(this.#factory, conversationDatasetDescriptor.source.database);
    try {
      if (database.version !== conversationDatasetDescriptor.source.databaseVersion) {
        return { kind: "abstained", reason: "unsupported-source-version", sourceVersion: database.version };
      }
      for (const store of conversationDatasetDescriptor.source.ownedStores) {
        if (!database.objectStoreNames.contains(store)) throw new Error(`Synthetic source is missing ${store}.`);
      }
      const transaction = database.transaction([...conversationDatasetDescriptor.source.ownedStores], "readonly");
      const conversations = transaction.objectStore("conversations");
      const messages = transaction.objectStore("messages");
      const [conversationValues, conversationKeys, messageValues, messageKeys] = await Promise.all([
        requestResult(conversations.getAll()), requestResult(conversations.getAllKeys()),
        requestResult(messages.getAll()), requestResult(messages.getAllKeys()),
      ]);
      await transactionDone(transaction);
      return {
        kind: "ready",
        sourceVersion: 3,
        snapshot: {
          descriptorId: "conversation",
          schemaVersion: 1,
          conversations: conversationValues.map((value, index) =>
            clonePreservedRecord(conversationKeys[index] as IDBValidKey, conversationProjection(value), value)),
          messages: messageValues.map((value, index) =>
            clonePreservedRecord(messageKeys[index] as IDBValidKey, messageProjection(value), value)),
        },
      };
    } finally {
      database.close();
    }
  }
}
