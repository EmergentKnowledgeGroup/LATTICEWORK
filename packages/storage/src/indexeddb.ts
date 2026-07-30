export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

export function openDatabase(
  factory: IDBFactory,
  name: string,
  version?: number,
  upgrade?: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = version === undefined ? factory.open(name) : factory.open(name, version);
    request.onupgradeneeded = () => upgrade?.(request.result);
    // A blocked version change cannot be cancelled. Rejecting here would leave
    // the request alive and able to upgrade later after its caller observed a
    // failure. Wait for the blocker to close so the promise reflects the real
    // terminal outcome.
    request.onblocked = () => undefined;
    request.onerror = () => reject(request.error ?? new Error(`IndexedDB open failed for ${name}.`));
    request.onsuccess = () => resolve(request.result);
  });
}

export function nativeIndexedDbFactory(): IDBFactory {
  const factory = globalThis.indexedDB;
  if (!factory) {
    throw new Error("Native IndexedDB is unavailable; inject an IDBFactory for this repository.");
  }
  return factory;
}
