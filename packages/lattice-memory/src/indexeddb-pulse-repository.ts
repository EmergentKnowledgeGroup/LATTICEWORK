import type { Pulse, PulseRepository, StoredPulse } from "@latticework/contracts";

import { pulseMediumDatasetDescriptor, pulseMediumRetention } from "./descriptor.ts";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("request-failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("transaction-failed"));
    transaction.onerror = () => reject(transaction.error ?? new Error("transaction-failed"));
  });
}

function copyPulse(pulse: Pulse): Pulse {
  const refs = pulse.refs === undefined ? undefined : pulse.refs.map((reference) => ({ store: reference.store, id: reference.id }));
  return refs === undefined
    ? { ts: pulse.ts, source: pulse.source, kind: pulse.kind, summary: pulse.summary }
    : { ts: pulse.ts, source: pulse.source, kind: pulse.kind, summary: pulse.summary, refs };
}

/** The only candidate module allowed to use the injected browser database factory. */
export class IndexedDbPulseRepository implements PulseRepository {
  #database: IDBDatabase | undefined;
  readonly #factory: IDBFactory;

  constructor(factory: IDBFactory) { this.#factory = factory; }

  async open(): Promise<void> {
    if (this.#database !== undefined) return;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.#factory.open(pulseMediumDatasetDescriptor.candidateDatabase, pulseMediumDatasetDescriptor.schemaVersion);
      let settled = false;
      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      request.onupgradeneeded = () => {
        const upgrade = request.result;
        if (!upgrade.objectStoreNames.contains(pulseMediumDatasetDescriptor.store)) {
          upgrade.createObjectStore(pulseMediumDatasetDescriptor.store, {
            keyPath: pulseMediumDatasetDescriptor.target.keyPath,
            autoIncrement: pulseMediumDatasetDescriptor.target.autoIncrement,
          });
        }
      };
      request.onblocked = () => rejectOnce(new Error("open-blocked"));
      request.onerror = () => rejectOnce(request.error ?? new Error("open-failed"));
      request.onsuccess = () => {
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        resolve(request.result);
      };
    });
    let transferred = false;
    try {
      database.onversionchange = () => {
        database.close();
        if (this.#database === database) this.#database = undefined;
      };
      const stores = [...database.objectStoreNames];
      const schemaTransaction = database.transaction(pulseMediumDatasetDescriptor.store, "readonly");
      const store = schemaTransaction.objectStore(pulseMediumDatasetDescriptor.store);
      const exactSchema = database.version === pulseMediumDatasetDescriptor.schemaVersion
        && stores.length === 1
        && stores[0] === pulseMediumDatasetDescriptor.store
        && store.keyPath === pulseMediumDatasetDescriptor.target.keyPath
        && store.autoIncrement === pulseMediumDatasetDescriptor.target.autoIncrement
        && store.indexNames.length === 0;
      if (!exactSchema) throw new Error("schema-mismatch");
      this.#database = database;
      transferred = true;
    } finally {
      if (!transferred) database.close();
    }
  }

  async write(pulse: Pulse): Promise<void> {
    const database = this.#requireDatabase();
    const transaction = database.transaction(pulseMediumDatasetDescriptor.store, "readwrite");
    const store = transaction.objectStore(pulseMediumDatasetDescriptor.store);
    await requestResult(store.add(copyPulse(pulse)));
    const count = await requestResult(store.count());
    if (count > pulseMediumRetention) {
      const keys = await requestResult(store.getAllKeys());
      for (const key of keys.slice(0, count - pulseMediumRetention)) store.delete(key);
    }
    await transactionDone(transaction);
  }

  async read(): Promise<readonly StoredPulse[]> {
    const database = this.#requireDatabase();
    const transaction = database.transaction(pulseMediumDatasetDescriptor.store, "readonly");
    const values = await requestResult(transaction.objectStore(pulseMediumDatasetDescriptor.store).getAll());
    await transactionDone(transaction);
    return values.map((value) => {
      const stored = value as StoredPulse;
      if (stored.refs === undefined) {
        const { refs: _refs, ...withoutRefs } = stored;
        return { ...withoutRefs };
      }
      return { ...stored, refs: stored.refs.map((reference) => ({ store: reference.store, id: reference.id })) };
    });
  }

  async clear(): Promise<void> {
    const database = this.#requireDatabase();
    const transaction = database.transaction(pulseMediumDatasetDescriptor.store, "readwrite");
    transaction.objectStore(pulseMediumDatasetDescriptor.store).clear();
    await transactionDone(transaction);
  }

  async close(): Promise<void> {
    if (this.#database !== undefined) {
      this.#database.onversionchange = null;
      this.#database.close();
    }
    this.#database = undefined;
  }

  #requireDatabase(): IDBDatabase {
    if (this.#database === undefined) throw new Error("not-ready");
    return this.#database;
  }
}

export function createIndexedDbPulseRepository(factory: IDBFactory): PulseRepository {
  return new IndexedDbPulseRepository(factory);
}
