import assert from "node:assert/strict";
import test from "node:test";

import { Kernel, KernelLifecycleError } from "./kernel.ts";

function participant(id, events, options = {}) {
  return {
    id,
    async start() {
      events.push(`start:${id}`);
      if (options.startError) {
        throw options.startError;
      }
    },
    async stop() {
      events.push(`stop:${id}`);
      if (options.stopError) {
        throw options.stopError;
      }
    }
  };
}

test("starts participants in deterministic registration order and aggregates status", async () => {
  const events = [];
  const kernel = new Kernel();
  kernel.register(participant("first", events));
  kernel.register(participant("second", events));

  const snapshot = await kernel.start();

  assert.deepEqual(events, ["start:first", "start:second"]);
  assert.deepEqual(snapshot.registeredIds, ["first", "second"]);
  assert.deepEqual(snapshot.startedIds, ["first", "second"]);
  assert.equal(snapshot.state, "ready");
  assert.deepEqual(snapshot.status, {
    kernel: { state: "ready", registeredCount: 2 },
    lifecycle: { state: "ready", startedIds: ["first", "second"] },
    diagnostics: { count: 0 }
  });
});

test("rejects duplicate lifecycle participant ids", () => {
  const kernel = new Kernel();
  kernel.register(participant("same", []));

  assert.throws(
    () => kernel.register(participant("same", [])),
    /already registered/
  );
});

test("stops started participants in reverse registration order", async () => {
  const events = [];
  const kernel = new Kernel();
  kernel.register(participant("first", events));
  kernel.register(participant("second", events));
  await kernel.start();

  const snapshot = await kernel.stop();

  assert.deepEqual(events, ["start:first", "start:second", "stop:second", "stop:first"]);
  assert.equal(snapshot.state, "stopped");
  assert.deepEqual(snapshot.startedIds, []);
});

test("records a generic safe diagnostic and enters failed state after start failure", async () => {
  const events = [];
  const secret = "do-not-disclose-this-secret";
  const kernel = new Kernel();
  kernel.register(participant("first", events));
  kernel.register(participant("second", events, { startError: new Error(secret) }));

  await assert.rejects(kernel.start(), (error) => {
    assert.ok(error instanceof KernelLifecycleError);
    assert.equal(error.code, "kernel.lifecycle.start.failed");
    assert.doesNotMatch(error.message, new RegExp(secret));
    return true;
  });

  const snapshot = kernel.snapshot();
  assert.deepEqual(events, ["start:first", "start:second", "stop:first"]);
  assert.equal(snapshot.state, "failed");
  assert.deepEqual(snapshot.startedIds, []);
  assert.deepEqual(snapshot.diagnostics, [{
    code: "kernel.lifecycle.start.failed",
    severity: "error",
    phase: "start",
    message: "A lifecycle start operation failed."
  }]);
  assert.doesNotMatch(JSON.stringify(snapshot.diagnostics), new RegExp(secret));
});

test("attempts every reverse stop and preserves failed state when a stop fails", async () => {
  const events = [];
  const kernel = new Kernel();
  kernel.register(participant("first", events, { stopError: new Error("stop secret") }));
  kernel.register(participant("second", events));
  await kernel.start();

  await assert.rejects(kernel.stop(), (error) => {
    assert.ok(error instanceof KernelLifecycleError);
    assert.equal(error.code, "kernel.lifecycle.stop.failed");
    return true;
  });

  const snapshot = kernel.snapshot();
  assert.deepEqual(events, ["start:first", "start:second", "stop:second", "stop:first"]);
  assert.equal(snapshot.state, "failed");
  assert.equal(snapshot.diagnostics.length, 1);
  assert.equal(snapshot.diagnostics[0].code, "kernel.lifecycle.stop.failed");
});
