import assert from "node:assert/strict";
import test from "node:test";

import {
  DeterministicMockAdapter,
  MockCredentialSource,
  MockEgressPolicy,
  ProviderRouter,
} from "./index.ts";

const binding = {
  providerId: "mock-local",
  adapterId: "deterministic-local-mock",
  adapterVersion: "1",
  exactOrigin: "mock://local",
  trustClass: "mock",
  authenticationScheme: "synthetic-ref",
};

function request(overrides = {}) {
  return {
    operationId: "operation-1",
    providerId: binding.providerId,
    requestedModel: "mock-model",
    messages: [{ role: "user", parts: [{ type: "text", text: "synthetic prompt" }] }],
    requiredCapabilities: ["text"],
    credentialRef: { id: "synthetic-ref", ...binding },
    ...overrides,
  };
}

async function collect(stream) {
  const events = [];
  for await (const event of stream) events.push(event);
  return events;
}

function assertCompleteStream(events) {
  assert.equal(events[0]?.type, "started");
  const terminals = events.filter((event) => ["completed", "failed", "cancelled"].includes(event.type));
  assert.equal(terminals.length, 1);
  assert.strictEqual(events.at(-1), terminals[0]);
  assert.ok(terminals[0].provenance);
  assert.equal(Object.isFrozen(terminals[0].provenance), true);
  assert.equal(Object.isFrozen(terminals[0].provenance.fallbackChain), true);
  assert.deepEqual(terminals[0].provenance.fallbackChain, []);
  assert.ok([
    "none",
    "provider-idempotency-proven",
    "caller-authorized-after-failure",
  ].includes(terminals[0].provenance.retryAuthorization));
  assert.doesNotMatch(JSON.stringify(terminals[0].provenance), /synthetic prompt|synthetic-credential/);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function within(promise, milliseconds = 200) {
  const guard = Symbol("guard");
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(guard), milliseconds);
  });
  const result = await Promise.race([promise, timeout]);
  assert.notEqual(result, guard, `operation did not terminate within ${milliseconds}ms`);
  return result;
}

async function nextTurn() {
  await new Promise((resolve) => setImmediate(resolve));
}

test("authorizes an exact immutable binding before synthetic credential resolution", async () => {
  const trace = [];
  const router = new ProviderRouter({
    adapters: [new DeterministicMockAdapter({
      ...binding,
      capabilities: ["text"],
      script: [{ type: "completed", finishReason: "stop" }],
      onInvoke: () => trace.push("adapter"),
    })],
    egressPolicy: new MockEgressPolicy({ onAuthorize: (grant) => trace.push(grant) }),
    credentialSource: new MockCredentialSource({ onResolve: (grant) => trace.push(grant) }),
  });

  const events = await collect(router.run(request()));

  assert.deepEqual(events.map((event) => event.type), ["started", "completed"]);
  assert.equal(trace.length, 3);
  assert.equal(Object.isFrozen(trace[0]), true);
  assert.equal(Object.isFrozen(trace[0].requiredCapabilities), true);
  assert.deepEqual(trace[0].requiredCapabilities, ["text"]);
  assert.strictEqual(trace[0], trace[1]);
  assert.equal(events[1].provenance.operationId, "operation-1");
  assert.doesNotMatch(JSON.stringify(events[1].provenance), /synthetic prompt|synthetic-credential/);
});

test("refuses a mismatched grant before resolving a credential or invoking an adapter", async () => {
  const trace = [];
  const router = new ProviderRouter({
    adapters: [new DeterministicMockAdapter({ ...binding, capabilities: ["text"], script: [], onInvoke: () => trace.push("adapter") })],
    egressPolicy: new MockEgressPolicy({ grantBinding: { ...binding, exactOrigin: "mock://other" } }),
    credentialSource: new MockCredentialSource({ onResolve: () => trace.push("credential") }),
  });

  const events = await collect(router.run(request()));

  assert.deepEqual(trace, []);
  assert.deepEqual(events.map((event) => event.type), ["started", "failed"]);
  assert.equal(events[1].error.code, "policy-refusal");
});

test("does not retry after a delta, keeps operation identity stable, and terminates once", async () => {
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text", "streaming"],
    script: [
      { type: "delta", text: "synthetic" },
      { type: "failed", error: { code: "network", message: "ignored", retryable: true } },
    ],
  });
  const router = new ProviderRouter({
    adapters: [adapter],
    egressPolicy: new MockEgressPolicy(),
    credentialSource: new MockCredentialSource(),
  });

  const events = await collect(router.run(request({
    requiredCapabilities: ["text", "streaming"],
    retry: { maxAttempts: 2, providerIdempotencyProven: true },
  })));

  assert.deepEqual(events.map((event) => event.type), ["started", "delta", "failed"]);
  assert.equal(adapter.invocationCount, 1);
  assert.equal(events[0].operationId, "operation-1");
  assert.equal(events[2].provenance.attemptId, events[0].attemptId);
  assert.equal(events[2].provenance.retryAuthorization, "provider-idempotency-proven");
});

test("retries a pre-delta retryable failure only with explicit authorization and assigns a new attempt id", async () => {
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    scripts: [
      [{ type: "failed", error: { code: "network", message: "first", retryable: true } }],
      [{ type: "completed", finishReason: "stop" }],
    ],
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const events = await collect(router.run(request({
    retry: { maxAttempts: 2, callerAuthorizedAfterFailure: true },
  })));

  assert.deepEqual(events.map((event) => event.type), ["started", "completed"]);
  assert.equal(adapter.invocationCount, 2);
  assert.equal(router.provenanceFor("operation-1").length, 2);
  assert.notEqual(router.provenanceFor("operation-1")[0].attemptId, router.provenanceFor("operation-1")[1].attemptId);
  for (const provenance of router.provenanceFor("operation-1")) {
    assert.equal(provenance.retryAuthorization, "caller-authorized-after-failure");
    assert.equal(Object.isFrozen(provenance.fallbackChain), true);
    assert.deepEqual(provenance.fallbackChain, []);
  }
});

test("callback compatibility invokes the callback once for a terminal stream", async () => {
  const router = new ProviderRouter({
    adapters: [new DeterministicMockAdapter({ ...binding, capabilities: ["text"], script: [{ type: "delta", text: "synthetic" }, { type: "completed", finishReason: "stop" }] })],
    egressPolicy: new MockEgressPolicy(),
    credentialSource: new MockCredentialSource(),
  });
  const calls = [];

  const events = await router.runWithCallback(request(), (error, result) => calls.push({ error, result }));

  assert.equal(events.at(-1).type, "completed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].error, null);
  assert.equal(calls[0].result.text, "synthetic");
});

test("defaults to one invocation and rejects invalid retry limits", async () => {
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "failed", error: { code: "network", message: "retryable", retryable: true } }],
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const defaultEvents = await collect(router.run(request()));
  const fractionalEvents = await collect(router.run(request({ operationId: "operation-fraction", retry: { maxAttempts: 1.5 } })));
  const zeroEvents = await collect(router.run(request({ operationId: "operation-zero", retry: { maxAttempts: 0 } })));

  assert.equal(adapter.invocationCount, 1);
  assert.equal(defaultEvents.at(-1).type, "failed");
  assert.deepEqual(fractionalEvents.map((event) => event.type), ["started", "failed"]);
  assert.equal(fractionalEvents[1].error.code, "internal");
  assert.deepEqual(zeroEvents.map((event) => event.type), ["started", "failed"]);
  assert.equal(zeroEvents[1].error.code, "internal");
});

test("normalizes malformed scripted events with one terminal event", async () => {
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "started", operationId: "untrusted", attemptId: "untrusted" }],
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const events = await collect(router.run(request()));

  assert.deepEqual(events.map((event) => event.type), ["started", "failed"]);
  assert.equal(events.at(-1).error.code, "malformed-response");
});

test("rejects malformed iterator results and event payloads with one terminal event", async () => {
  const malformedValues = [
    null,
    "invalid-done-flag",
    { type: "delta", text: 7 },
    { type: "usage", inputTokens: -1, outputTokens: 2 },
    { type: "completed", finishReason: 7 },
    { type: "cancelled", scope: "claimed-without-proof" },
  ];

  for (const [index, value] of malformedValues.entries()) {
    const adapter = {
      binding,
      capabilities: ["text"],
      resolvedModel: "malformed-mock",
      invoke() {
        let delivered = false;
        return {
          [Symbol.asyncIterator]() {
            return {
              next() {
                if (delivered) return Promise.resolve({ done: true, value: undefined });
                delivered = true;
                return Promise.resolve(
                  index === 0
                    ? null
                    : index === 1
                      ? {
                          done: "yes",
                          value: { type: "completed", finishReason: "stop" },
                        }
                      : { done: false, value },
                );
              },
              return() {
                return Promise.resolve({ done: true, value: undefined });
              },
            };
          },
        };
      },
    };
    const router = new ProviderRouter({
      adapters: [adapter],
      egressPolicy: new MockEgressPolicy(),
      credentialSource: new MockCredentialSource(),
    });

    const events = await collect(
      router.run(request({ operationId: `malformed-${index}` })),
    );

    assertCompleteStream(events);
    assert.deepEqual(events.map((event) => event.type), ["started", "failed"]);
    assert.equal(events.at(-1).error.code, "malformed-response");
  }
});

test("pre-abort and mid-stream abort have one honest cancellation terminal", async () => {
  const preAbort = new AbortController();
  preAbort.abort();
  const midStream = new AbortController();
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "delta", text: "first" }, { type: "completed", finishReason: "stop" }],
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });
  const preEvents = await collect(router.run(request({ operationId: "pre-abort", signal: preAbort.signal })));
  const midEvents = [];
  for await (const event of router.run(request({ operationId: "mid-abort", signal: midStream.signal }))) {
    midEvents.push(event);
    if (event.type === "delta") midStream.abort();
  }

  assert.deepEqual(preEvents.map((event) => event.type), ["started", "cancelled"]);
  assert.equal(preEvents[1].scope, "transport-aborted");
  assert.deepEqual(midEvents.map((event) => event.type), ["started", "delta", "cancelled"]);
  assert.equal(midEvents.at(-1).scope, "transport-aborted");
});

test("a stalled iterator terminates promptly on local abort, closes, and never claims provider acknowledgement", async () => {
  const controller = new AbortController();
  let closed = 0;
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    stall: true,
    cancellationAcknowledged: true,
    onClose: () => { closed += 1; },
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });
  const startedAt = Date.now();
  const operation = collect(router.run(request({ operationId: "stalled-abort", signal: controller.signal })));
  setTimeout(() => controller.abort(), 10);

  const events = await operation;

  assert.ok(Date.now() - startedAt < 500);
  assertCompleteStream(events);
  assert.deepEqual(events.map((event) => event.type), ["started", "cancelled"]);
  assert.equal(events[1].scope, "transport-aborted");
  assert.equal(closed, 1);
});

test("only an explicit per-attempt adapter event may acknowledge provider cancellation", async () => {
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "cancelled", scope: "provider-cancel-acknowledged" }],
  });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const events = await collect(router.run(request({ operationId: "explicit-ack" })));

  assertCompleteStream(events);
  assert.equal(events.at(-1).scope, "provider-cancel-acknowledged");
});

test("all pre-dispatch exits start and terminate once with unavailable provenance", async () => {
  const adapter = new DeterministicMockAdapter({ ...binding, capabilities: ["text"], script: [{ type: "completed", finishReason: "stop" }] });
  const preAbort = new AbortController();
  preAbort.abort();
  const cases = [
    new ProviderRouter({ adapters: [], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }).run(request({ operationId: "unconfigured" })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }).run(request({ operationId: "capability", requiredCapabilities: ["vision"] })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }).run(request({ operationId: "binding", credentialRef: { id: "synthetic-ref", ...binding, exactOrigin: "mock://wrong" } })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }).run(request({ operationId: "retry", retry: { maxAttempts: 0 } })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }).run(request({ operationId: "pre-abort-2", signal: preAbort.signal })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy({ deny: true }), credentialSource: new MockCredentialSource() }).run(request({ operationId: "policy" })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy({ grantBinding: { exactOrigin: "mock://wrong" } }), credentialSource: new MockCredentialSource() }).run(request({ operationId: "grant" })),
    new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: { async resolve() { throw { code: "authentication" }; } } }).run(request({ operationId: "credential" })),
  ];

  for (const stream of cases) {
    const events = await collect(stream);
    assertCompleteStream(events);
    assert.equal(events.at(-1).provenance.kind, "pre-dispatch");
    assert.equal(events.at(-1).provenance.dispatchState, "not-dispatched");
  }
});

test("exact required capabilities are grant-bound before credential resolution", async () => {
  const trace = [];
  const adapter = new DeterministicMockAdapter({ ...binding, capabilities: ["text", "vision"], script: [{ type: "completed", finishReason: "stop" }], onInvoke: () => trace.push("adapter") });
  const router = new ProviderRouter({
    adapters: [adapter],
    egressPolicy: new MockEgressPolicy({ grantCapabilities: ["text"] }),
    credentialSource: new MockCredentialSource({ onResolve: () => trace.push("credential") }),
  });

  const events = await collect(router.run(request({ operationId: "grant-capabilities", requiredCapabilities: ["text", "vision"] })));

  assertCompleteStream(events);
  assert.deepEqual(trace, []);
  assert.equal(events.at(-1).error.code, "policy-refusal");
});

test("absolute deadlines fail closed before dispatch and terminate a stalled attempt", async () => {
  let closed = 0;
  const adapter = new DeterministicMockAdapter({ ...binding, capabilities: ["text"], stall: true, onClose: () => { closed += 1; } });
  const router = new ProviderRouter({ adapters: [adapter], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const invalid = await collect(router.run(request({ operationId: "invalid-deadline", deadline: "tomorrow" })));
  const expired = await collect(router.run(request({ operationId: "expired-deadline", deadline: "2000-01-01T00:00:00.000Z" })));
  const during = await collect(router.run(request({ operationId: "during-deadline", deadline: new Date(Date.now() + 20).toISOString() })));

  assertCompleteStream(invalid);
  assert.equal(invalid.at(-1).error.code, "internal");
  assert.equal(invalid.at(-1).provenance.kind, "pre-dispatch");
  assertCompleteStream(expired);
  assert.equal(expired.at(-1).error.code, "timeout");
  assert.equal(expired.at(-1).provenance.kind, "pre-dispatch");
  assertCompleteStream(during);
  assert.equal(during.at(-1).error.code, "timeout");
  assert.equal(during.at(-1).provenance.kind, "attempt");
  assert.equal(closed, 1);
});

test("local abort promptly terminates stalled policy and credential work without invoking the adapter", async () => {
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  try {
    for (const lane of ["policy", "credential"]) {
      const stall = deferred();
      const controller = new AbortController();
      const adapter = new DeterministicMockAdapter({
        ...binding,
        capabilities: ["text"],
        script: [{ type: "completed", finishReason: "stop" }],
      });
      const router = new ProviderRouter({
        adapters: [adapter],
        egressPolicy: lane === "policy"
          ? { authorize: () => stall.promise }
          : new MockEgressPolicy(),
        credentialSource: lane === "credential"
          ? { resolve: () => stall.promise }
          : new MockCredentialSource(),
      });
      const operation = collect(router.run(request({
        operationId: `abort-stalled-${lane}`,
        signal: controller.signal,
      })));
      setTimeout(() => controller.abort(), 10);

      const events = await within(operation);

      assertCompleteStream(events);
      assert.deepEqual(events.map((event) => event.type), ["started", "cancelled"]);
      assert.equal(events.at(-1).scope, "transport-aborted");
      assert.equal(events.at(-1).provenance.kind, "pre-dispatch");
      assert.equal(adapter.invocationCount, 0);
      stall.reject(new Error(`late ${lane} rejection`));
      await nextTurn();
    }
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener("unhandledRejection", onUnhandled);
  }
});

test("absolute deadline promptly terminates stalled policy and credential work without invoking the adapter", async () => {
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);
  try {
    for (const lane of ["policy", "credential"]) {
      const stall = deferred();
      const adapter = new DeterministicMockAdapter({
        ...binding,
        capabilities: ["text"],
        script: [{ type: "completed", finishReason: "stop" }],
      });
      const router = new ProviderRouter({
        adapters: [adapter],
        egressPolicy: lane === "policy"
          ? { authorize: () => stall.promise }
          : new MockEgressPolicy(),
        credentialSource: lane === "credential"
          ? { resolve: () => stall.promise }
          : new MockCredentialSource(),
      });

      const events = await within(collect(router.run(request({
        operationId: `deadline-stalled-${lane}`,
        deadline: new Date(Date.now() + 20).toISOString(),
      }))));

      assertCompleteStream(events);
      assert.deepEqual(events.map((event) => event.type), ["started", "failed"]);
      assert.equal(events.at(-1).error.code, "timeout");
      assert.equal(events.at(-1).provenance.kind, "pre-dispatch");
      assert.equal(adapter.invocationCount, 0);
      stall.reject(new Error(`late ${lane} rejection`));
      await nextTurn();
    }
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener("unhandledRejection", onUnhandled);
  }
});

test("never falls back implicitly or crosses trust classes", async () => {
  const trace = [];
  const local = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "failed", error: { code: "network", message: "retryable", retryable: true } }],
    onInvoke: () => trace.push("local"),
  });
  const cloud = new DeterministicMockAdapter({
    ...binding,
    providerId: "mock-cloud",
    adapterId: "deterministic-cloud-mock",
    exactOrigin: "mock://cloud",
    trustClass: "cloud",
    capabilities: ["text"],
    script: [{ type: "completed", finishReason: "stop" }],
    onInvoke: () => trace.push("cloud"),
  });
  const router = new ProviderRouter({ adapters: [local, cloud], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() });

  const events = await collect(router.run(request()));

  assert.deepEqual(trace, ["local"]);
  assert.equal(events.at(-1).type, "failed");
});

test("credential source independently refuses a binding mismatch", async () => {
  const credentials = new MockCredentialSource();
  await assert.rejects(
    credentials.resolve(
      { id: "synthetic-ref", ...binding },
      Object.freeze({
        ...binding,
        exactOrigin: "mock://other",
        grantId: "grant",
        operationId: "operation",
        attemptId: "attempt",
        payloadClass: "synthetic",
        redirectTarget: null,
      }),
    ),
    (error) => error.code === "policy-refusal",
  );
});

test("duplicate provider identifiers fail closed at router construction", () => {
  const first = new DeterministicMockAdapter({ ...binding, capabilities: ["text"], script: [] });
  const second = new DeterministicMockAdapter({ ...binding, adapterId: "another-mock", capabilities: ["text"], script: [] });

  assert.throws(
    () => new ProviderRouter({ adapters: [first, second], egressPolicy: new MockEgressPolicy(), credentialSource: new MockCredentialSource() }),
    /duplicate provider id/i,
  );
});
