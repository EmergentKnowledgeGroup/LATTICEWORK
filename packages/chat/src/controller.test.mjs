import assert from "node:assert/strict";
import test from "node:test";

import { ChatController } from "./index.ts";

const binding = Object.freeze({
  providerId: "mock-local",
  adapterId: "deterministic-local-mock",
  adapterVersion: "1",
  exactOrigin: "mock://local",
  trustClass: "mock",
  authenticationScheme: "synthetic-ref",
});

const provider = Object.freeze({
  binding,
  requestedModel: "mock-model",
  resolvedModel: "mock-model-v1",
});

function input(overrides = {}) {
  return {
    conversationId: "conversation-1",
    operationId: "operation-1",
    userMessageId: "user-1",
    content: "synthetic user content",
    provider,
    ...overrides,
  };
}

function completed() {
  return {
    type: "completed",
    finishReason: "stop",
    provenance: {
      ...binding,
      kind: "attempt",
      dispatchState: "dispatched",
      operationId: "operation-1",
      attemptId: "operation-1:attempt:1",
      requestedModel: "mock-model",
      resolvedModel: "mock-model-v1",
      startedAt: "2026-07-31T00:00:00.000Z",
      endedAt: "2026-07-31T00:00:01.000Z",
      capabilitiesUsed: ["text"],
      fallbackChain: [],
      retryIndex: 0,
      retryAuthorization: "none",
      attemptReason: "initial",
      resultSource: "mock",
      terminalReason: "completed",
    },
  };
}

function failed(message = "untrusted error including synthetic user content") {
  return {
    type: "failed",
    error: { code: "network", message, retryable: true },
    provenance: { ...completed().provenance, terminalReason: "failed" },
  };
}

function scriptedRouter(events, calls = []) {
  return {
    run(request) {
      calls.push(request);
      return (async function* stream() {
        yield { type: "started", operationId: request.operationId, attemptId: "operation-1:attempt:1" };
        for (const event of events) yield event;
      })();
    },
  };
}

function repository(seed) {
  const writes = [];
  let state = seed;
  return {
    writes,
    async read() { return state; },
    async write(next) {
      writes.push(structuredClone(next));
      state = structuredClone(next);
    },
  };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail("Timed out waiting for expected controller state.");
}

test("persists the synthetic user before dispatch and commits assistant content only after completed", async () => {
  const calls = [];
  const store = repository();
  const controller = new ChatController({ repository: store, router: scriptedRouter([
    { type: "delta", text: "partial" },
    { type: "delta", text: " answer" },
    completed(),
  ], calls), now: () => "2026-07-31T00:00:00.000Z" });

  const operation = controller.send(input());
  const terminal = await operation.finished;

  assert.equal(calls.length, 1);
  assert.equal(store.writes[0].messages[0].role, "user");
  assert.deepEqual(store.writes[0].messages.map((message) => message.role), ["user"]);
  assert.deepEqual(store.writes.at(-1).messages.map((message) => message.role), ["user", "assistant"]);
  assert.equal(store.writes.at(-1).messages[1].content, "partial answer");
  assert.equal(terminal.terminal, "completed");
  assert.equal(terminal.persistence, "saved");
  assert.equal(calls[0].retry.maxAttempts, 1);
  assert.equal(calls[0].providerId, "mock-local");
});

test("failed turns retain user and content-free terminal metadata with a sanitized error", async () => {
  const store = repository();
  const controller = new ChatController({ repository: store, router: scriptedRouter([
    { type: "delta", text: "must not persist" },
    failed(),
  ]), now: () => "2026-07-31T00:00:00.000Z" });

  const terminal = await controller.send(input()).finished;
  const saved = store.writes.at(-1);

  assert.deepEqual(saved.messages.map((message) => message.role), ["user", "terminal"]);
  assert.equal(saved.messages[1].metadata.error.code, "network");
  assert.doesNotMatch(JSON.stringify(saved.messages[1]), /synthetic user content|untrusted error|must not persist|mock:\/\/local/);
  assert.equal(terminal.persistence, "saved");
  assert.equal(terminal.provenance.adapterId, "deterministic-local-mock");
  assert.equal(terminal.provenance.trustClass, "mock");
});

test("cancel before dispatch persists the user and one cancellation terminal without calling the adapter seam", async () => {
  let releaseWrite;
  const writes = [];
  const store = {
    async read() { return undefined; },
    write(state) {
      writes.push(structuredClone(state));
      if (writes.length > 1) return Promise.resolve();
      return new Promise((resolve) => { releaseWrite = resolve; });
    },
  };
  let calls = 0;
  const controller = new ChatController({
    repository: store,
    router: { run() { calls += 1; return (async function* () {})(); } },
    now: () => "2026-07-31T00:00:00.000Z",
  });

  const operation = controller.send(input());
  await waitFor(() => typeof releaseWrite === "function");
  operation.cancel();
  releaseWrite();
  const terminal = await operation.finished;

  assert.equal(calls, 0);
  assert.equal(terminal.terminal, "cancelled");
  assert.equal(terminal.persistence, "saved");
  assert.equal(terminal.provenance.cancellationScope, "transport-aborted");
  assert.deepEqual(writes.at(-1).messages.map((message) => message.role), ["user", "terminal"]);
});

test("cancel after a delta aborts one controller, emits one terminal, and ignores late or duplicate provider events", async () => {
  let signal;
  let advance;
  const gate = new Promise((resolve) => { advance = resolve; });
  const events = [];
  const store = repository();
  const controller = new ChatController({
    repository: store,
    router: {
      run(request) {
        signal = request.signal;
        return (async function* () {
          yield { type: "started", operationId: request.operationId, attemptId: "operation-1:attempt:1" };
          yield { type: "delta", text: "visible draft" };
          await gate;
          yield { type: "delta", text: "late content" };
          yield completed();
          yield completed();
        })();
      },
    },
    now: () => "2026-07-31T00:00:00.000Z",
    onEvent: (event) => events.push(event),
  });

  const operation = controller.send(input());
  await waitFor(() => events.some((event) => event.type === "delta"));
  operation.cancel();
  const terminal = await operation.finished;
  advance();
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(signal.aborted, true);
  assert.equal(terminal.terminal, "cancelled");
  assert.equal(terminal.persistence, "saved");
  assert.equal(events.filter((event) => event.type === "terminal").length, 1);
  assert.equal(events.filter((event) => event.type === "delta").length, 1);
  assert.deepEqual(store.writes.at(-1).messages.map((message) => message.role), ["user", "terminal"]);
});

test("hydrates persisted candidate state without dispatching another provider operation", async () => {
  const saved = { conversationId: "conversation-1", messages: [{ id: "user-old", operationId: "operation-old", role: "user", content: "synthetic old", createdAt: "2026-07-30T00:00:00.000Z" }] };
  const store = repository(saved);
  let calls = 0;
  const controller = new ChatController({
    repository: store,
    router: { run() { calls += 1; return (async function* () {})(); } },
  });

  const hydrated = await controller.hydrate("conversation-1");

  assert.deepEqual(hydrated, saved);
  assert.equal(calls, 0);
});

test("a hydrated conversation retains prior candidate messages when the next turn is persisted", async () => {
  const saved = { conversationId: "conversation-1", messages: [{ id: "user-old", operationId: "operation-old", role: "user", content: "synthetic old", createdAt: "2026-07-30T00:00:00.000Z" }] };
  const store = repository(saved);
  const controller = new ChatController({
    repository: store,
    router: scriptedRouter([completed()]),
    now: () => "2026-07-31T00:00:00.000Z",
  });

  await controller.hydrate("conversation-1");
  await controller.send(input()).finished;

  assert.deepEqual(store.writes.at(-1).messages.map((message) => message.id), ["user-old", "user-1", "operation-1:assistant"]);
});

test("hydrate cannot publish a stale read over an overlapping send", async () => {
  let readCalls = 0;
  let releaseInitialRead;
  let saved;
  const store = {
    read() {
      readCalls += 1;
      if (readCalls === 1) {
        return new Promise((resolve) => {
          releaseInitialRead = () => resolve(undefined);
        });
      }
      return new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 5);
      });
    },
    async write(next) {
      saved = structuredClone(next);
    },
  };
  const controller = new ChatController({
    repository: store,
    router: scriptedRouter([completed()]),
    now: () => "2026-07-31T00:00:00.000Z",
  });

  const operation = controller.send(input());
  const hydration = controller.hydrate("conversation-1");
  await waitFor(() => typeof releaseInitialRead === "function");
  releaseInitialRead();
  await operation.finished;
  await hydration;

  assert.equal(readCalls, 1);
  assert.deepEqual(saved.messages.map((message) => message.id), [
    "user-1",
    "operation-1:assistant",
  ]);
});

test("sequential sends append both completed turns instead of overwriting the conversation", async () => {
  const store = repository();
  const controller = new ChatController({
    repository: store,
    router: scriptedRouter([completed()]),
    now: () => "2026-07-31T00:00:00.000Z",
  });

  await controller.send(input()).finished;
  await controller.send(input({ operationId: "operation-2", userMessageId: "user-2", content: "second synthetic user content" })).finished;

  assert.deepEqual(store.writes.at(-1).messages.map((message) => message.role), ["user", "assistant", "user", "assistant"]);
  assert.deepEqual(store.writes.at(-1).messages.map((message) => message.id), ["user-1", "operation-1:assistant", "user-2", "operation-2:assistant"]);
});

test("repository read failure settles as an unsaved failure without provider dispatch", async () => {
  let calls = 0;
  const controller = new ChatController({
    repository: {
      async read() { throw new Error("private read failure"); },
      async write() { assert.fail("write must not run after read failure"); },
    },
    router: {
      run() {
        calls += 1;
        return (async function* () {})();
      },
    },
  });

  const terminal = await controller.send(input()).finished;

  assert.equal(calls, 0);
  assert.equal(terminal.terminal, "failed");
  assert.equal(terminal.persistence, "not-saved");
  assert.equal(terminal.error.code, "internal");
  assert.doesNotMatch(JSON.stringify(terminal), /private read failure/);
});

test("initial user write failure settles as an unsaved failure without provider dispatch", async () => {
  let calls = 0;
  const controller = new ChatController({
    repository: {
      async read() { return undefined; },
      async write() { throw new Error("private initial write failure"); },
    },
    router: {
      run() {
        calls += 1;
        return (async function* () {})();
      },
    },
  });

  const terminal = await controller.send(input()).finished;

  assert.equal(calls, 0);
  assert.equal(terminal.terminal, "failed");
  assert.equal(terminal.persistence, "not-saved");
  assert.doesNotMatch(JSON.stringify(terminal), /private initial write failure/);
});

test("terminal write failure settles as an unsaved failure after one provider dispatch", async () => {
  let writes = 0;
  let calls = 0;
  let saved;
  const controller = new ChatController({
    repository: {
      async read() { return saved; },
      async write(next) {
        writes += 1;
        if (writes === 2) throw new Error("private terminal write failure");
        saved = structuredClone(next);
      },
    },
    router: scriptedRouter([completed()], {
      push() { calls += 1; },
    }),
  });

  const terminal = await controller.send(input()).finished;

  assert.equal(calls, 1);
  assert.equal(terminal.terminal, "failed");
  assert.equal(terminal.persistence, "not-saved");
  assert.deepEqual(saved.messages.map((message) => message.role), ["user"]);
  assert.doesNotMatch(JSON.stringify(terminal), /private terminal write failure/);
});

test("overlapping sends to one conversation retain every user and assistant message", async () => {
  const releases = new Map();
  const store = repository();
  const controller = new ChatController({
    repository: store,
    router: {
      run(request) {
        return (async function* () {
          yield {
            type: "started",
            operationId: request.operationId,
            attemptId: `${request.operationId}:attempt:1`,
          };
          await new Promise((resolve) => releases.set(request.operationId, resolve));
          yield {
            ...completed(),
            provenance: {
              ...completed().provenance,
              operationId: request.operationId,
              attemptId: `${request.operationId}:attempt:1`,
            },
          };
        })();
      },
    },
  });

  const first = controller.send(input());
  const second = controller.send(input({
    operationId: "operation-2",
    userMessageId: "user-2",
    content: "second synthetic user content",
  }));
  await waitFor(() => releases.size === 2);
  releases.get("operation-2")();
  await second.finished;
  releases.get("operation-1")();
  await first.finished;

  const messageIds = store.writes.at(-1).messages.map((message) => message.id);
  assert.equal(messageIds.length, 4);
  assert.deepEqual(new Set(messageIds), new Set([
    "user-1",
    "operation-1:assistant",
    "user-2",
    "operation-2:assistant",
  ]));
});

test("creates one distinct AbortController signal per operation and never retries or falls back", async () => {
  const signals = [];
  const providers = [];
  const store = repository();
  const controller = new ChatController({
    repository: store,
    router: {
      run(request) {
        signals.push(request.signal);
        providers.push(request.providerId);
        return (async function* () {
          yield { type: "started", operationId: request.operationId, attemptId: `${request.operationId}:attempt:1` };
          yield completed();
        })();
      },
    },
  });

  const first = controller.send(input());
  const second = controller.send(input({
    conversationId: "conversation-2",
    operationId: "operation-2",
    userMessageId: "user-2",
  }));
  await Promise.all([first.finished, second.finished]);

  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.deepEqual(providers, ["mock-local", "mock-local"]);
});

test("a provider stream exhausted without a terminal settles as an internal failure", async () => {
  const store = repository();
  const controller = new ChatController({
    repository: store,
    router: {
      run(request) {
        return (async function* () {
          yield {
            type: "started",
            operationId: request.operationId,
            attemptId: `${request.operationId}:attempt:1`,
          };
        })();
      },
    },
    now: () => "2026-07-31T00:00:00.000Z",
  });

  const terminal = await controller.send(input()).finished;

  assert.equal(terminal.terminal, "failed");
  assert.equal(terminal.error.code, "internal");
  assert.deepEqual(
    store.writes.at(-1).messages.map((message) => message.role),
    ["user", "terminal"],
  );
});
