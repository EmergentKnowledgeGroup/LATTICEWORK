import assert from "node:assert/strict";
import test from "node:test";

import { createPulseMedium } from "./pulse-medium.ts";

class MemoryRepository {
  opened = false;
  values = [];
  writes = 0;
  async open() { this.opened = true; }
  async write(pulse) { this.writes += 1; this.values.push(copy(pulse)); }
  async read() { return this.values.map(copy); }
  async clear() { this.values = []; }
  async close() { this.opened = false; }
}

function copy(pulse) {
  const refs = pulse.refs?.map((reference) => ({ ...reference }));
  return refs === undefined ? { ...pulse } : { ...pulse, refs };
}

const inactiveRoom = Object.freeze({ isActive: () => false });
const pulse = Object.freeze({ source: "synthetic", kind: "observed", summary: "synthetic classification", refs: Object.freeze([{ store: "fixture", id: "row-1" }]) });

test("commits deep immutable snapshots and keeps subscribers isolated", async () => {
  const repository = new MemoryRepository();
  const medium = createPulseMedium({ repository, quietRoom: inactiveRoom });
  const received = [];
  medium.subscribe(null, (value) => { received.push(value); });
  await medium.start();
  const result = medium.commit(pulse);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(Object.isFrozen(result.pulse), true);
    assert.equal(Object.isFrozen(result.pulse.refs), true);
    assert.notEqual(result.pulse, received[1]);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(received.length, 2);
  assert.equal((await medium.recent({ source: "synthetic" }, 10)).length, 1);
  assert.equal(await medium.close(), true);
  assert.equal(medium.isReady(), false);
});

test("rejects invalid timestamps, shapes, refs, and filters before publication", async () => {
  const repository = new MemoryRepository();
  const medium = createPulseMedium({ repository, quietRoom: inactiveRoom });
  await medium.start();
  assert.deepEqual(medium.commit({ ...pulse, ts: Number.NaN }), { ok: false, code: "invalid-pulse" });
  assert.deepEqual(medium.commit({ ...pulse, source: "x".repeat(81) }), { ok: false, code: "invalid-pulse" });
  assert.deepEqual(medium.commit({ ...pulse, refs: [{ store: "ok", id: "ok", content: "no" }] }), { ok: false, code: "invalid-pulse" });
  assert.throws(() => medium.subscribe({ sources: ["ok", 4] }, () => undefined), TypeError);
  await assert.rejects(medium.recent({ kind: "" }), TypeError);
});

test("permits an absent quiet room and fails closed for malformed or active state", async () => {
  const repository = new MemoryRepository();
  const unavailable = createPulseMedium({ repository });
  assert.equal(unavailable.commit(pulse).ok, true);
  assert.equal(unavailable.subscribe(null, () => undefined) instanceof Function, true);
  const malformed = createPulseMedium({ repository, quietRoom: {} });
  assert.deepEqual(malformed.commit(pulse), { ok: false, code: "quiet-room" });
  const active = createPulseMedium({ repository, quietRoom: { isActive: () => true } });
  assert.deepEqual(active.commit(pulse), { ok: false, code: "quiet-room" });
});

test("bounds the pre-ready queue and emits the heartbeat only after open", async () => {
  const repository = new MemoryRepository();
  const medium = createPulseMedium({ repository, quietRoom: inactiveRoom });
  for (let index = 0; index < 102; index += 1) medium.commit({ source: "burst", kind: "observed", summary: "synthetic classification", ts: index });
  assert.equal(medium.pendingCount(), 100);
  await medium.start();
  assert.equal(repository.opened, true);
  assert.equal(medium.isReady(), true);
  assert.equal(repository.values.length, 101);
  assert.equal(repository.values.some((value) => value.kind === "medium-online"), true);
});

test("reports only code and operation diagnostics for rejection and subscriber failures", async () => {
  const repository = {
    open: async () => { throw new Error("private sentinel must not escape"); },
    write: async () => undefined,
    read: async () => [],
    clear: async () => undefined,
    close: async () => undefined,
  };
  const diagnostics = [];
  const medium = createPulseMedium({ repository, quietRoom: inactiveRoom, onDiagnostic: (diagnostic) => diagnostics.push(diagnostic) });
  await medium.start();
  assert.deepEqual(diagnostics, [{ code: "open-failed", operation: "open" }]);

  const healthyRepository = new MemoryRepository();
  const healthyDiagnostics = [];
  const healthy = createPulseMedium({ repository: healthyRepository, quietRoom: inactiveRoom, onDiagnostic: (diagnostic) => healthyDiagnostics.push(diagnostic) });
  await healthy.start();
  healthy.subscribe(null, () => { throw new Error("private pulse must not escape"); });
  assert.deepEqual(healthy.commit({ source: "synthetic", kind: "observed", summary: "synthetic classification", ts: Number.NaN }), { ok: false, code: "invalid-pulse" });
  healthy.commit(pulse);
  assert.deepEqual(healthyDiagnostics, [
    { code: "invalid-pulse", operation: "commit" },
    { code: "subscriber-failed", operation: "subscribe" },
  ]);
});

test("serializes clear after already accepted writes so cleared pulses cannot resurrect", async () => {
  const gate = Promise.withResolvers();
  class DeferredRepository extends MemoryRepository {
    async write(value) {
      if (value.kind === "delayed") await gate.promise;
      await super.write(value);
    }
  }
  const repository = new DeferredRepository();
  const medium = createPulseMedium({ repository, quietRoom: inactiveRoom });
  await medium.start();
  assert.equal(medium.commit({ source: "synthetic", kind: "delayed", summary: "synthetic" }).ok, true);

  const clearing = medium.clear();
  gate.resolve();

  assert.equal(await clearing, true);
  assert.deepEqual(await medium.recent(null, 10), []);
});

test("close stops ready acceptance, preserves concurrent commits for restart, and reopens cleanly", async () => {
  const gate = Promise.withResolvers();
  class StrictDeferredRepository extends MemoryRepository {
    async write(value) {
      if (!this.opened) throw new Error("write-after-close");
      if (value.kind === "delayed") await gate.promise;
      if (!this.opened) throw new Error("write-after-close");
      await super.write(value);
    }
  }
  const repository = new StrictDeferredRepository();
  const diagnostics = [];
  const medium = createPulseMedium({
    repository,
    quietRoom: inactiveRoom,
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  });
  await medium.start();
  assert.equal(medium.commit({ source: "synthetic", kind: "delayed", summary: "synthetic" }).ok, true);

  const closing = medium.close();
  const duringClose = medium.commit({ source: "synthetic", kind: "after-close-started", summary: "synthetic" });
  gate.resolve();

  assert.equal(await closing, true);
  assert.equal(medium.isReady(), false);
  assert.equal(duringClose.ok, true);
  assert.equal(medium.pendingCount(), 1);
  assert.deepEqual(diagnostics, []);

  await medium.start();
  assert.equal(medium.isReady(), true);
  assert.equal(medium.pendingCount(), 0);
  assert.equal((await medium.recent({ kind: "after-close-started" }, 10)).length, 1);
});
