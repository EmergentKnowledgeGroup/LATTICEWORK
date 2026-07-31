import assert from "node:assert/strict";
import test from "node:test";

import { IndexedDbPulseRepository } from "./indexeddb-pulse-repository.ts";

function controlledRequest(database) {
  return {
    result: database,
    error: null,
    onupgradeneeded: null,
    onblocked: null,
    onerror: null,
    onsuccess: null,
  };
}

function validDatabase() {
  let closes = 0;
  const store = {
    keyPath: "_id",
    autoIncrement: true,
    indexNames: [],
  };
  const database = {
    version: 1,
    objectStoreNames: Object.assign(["pulses"], { contains: (name) => name === "pulses" }),
    onversionchange: null,
    transaction: () => ({ objectStore: () => store }),
    close: () => { closes += 1; },
  };
  return { database, closes: () => closes };
}

test("closes a late successful IndexedDB connection after an open-blocked rejection", async () => {
  const candidate = validDatabase();
  const request = controlledRequest(candidate.database);
  const repository = new IndexedDbPulseRepository({ open: () => request });

  const opening = repository.open();
  request.onblocked();
  await assert.rejects(opening, /open-blocked/);
  request.onsuccess();

  assert.equal(candidate.closes(), 1);
});

test("closes the IndexedDB connection when post-open schema inspection throws", async () => {
  const candidate = validDatabase();
  candidate.database.transaction = () => { throw new Error("synthetic-schema-inspection-failure"); };
  const request = controlledRequest(candidate.database);
  const repository = new IndexedDbPulseRepository({ open: () => request });

  const opening = repository.open();
  request.onsuccess();

  await assert.rejects(opening, /synthetic-schema-inspection-failure/);
  assert.equal(candidate.closes(), 1);
});

test("closes and releases an established connection on versionchange", async () => {
  const candidate = validDatabase();
  const request = controlledRequest(candidate.database);
  const repository = new IndexedDbPulseRepository({ open: () => request });

  const opening = repository.open();
  request.onsuccess();
  await opening;
  assert.equal(typeof candidate.database.onversionchange, "function");

  candidate.database.onversionchange();

  assert.equal(candidate.closes(), 1);
  await assert.rejects(repository.read(), /not-ready/);
});
