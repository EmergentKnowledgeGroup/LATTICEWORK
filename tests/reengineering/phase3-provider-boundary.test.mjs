import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DeterministicMockAdapter,
  MockCredentialSource,
  MockEgressPolicy,
  ProviderRouter,
} from "../../packages/providers/src/index.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

const binding = {
  providerId: "mock-local",
  adapterId: "deterministic-local-mock",
  adapterVersion: "1",
  exactOrigin: "mock://local",
  trustClass: "mock",
  authenticationScheme: "synthetic-ref",
};

test("capability mismatch is rejected before policy, credential, or adapter work", async () => {
  const trace = [];
  const adapter = new DeterministicMockAdapter({
    ...binding,
    capabilities: ["text"],
    script: [{ type: "completed", finishReason: "stop" }],
    onInvoke: () => trace.push("adapter"),
  });
  const policy = new MockEgressPolicy({
    onAuthorize: () => trace.push("policy"),
  });
  const credentials = new MockCredentialSource({
    onResolve: () => trace.push("credential"),
  });
  const router = new ProviderRouter({
    adapters: [adapter],
    egressPolicy: policy,
    credentialSource: credentials,
  });

  const events = [];
  for await (const event of router.run({
    operationId: "op-capability",
    providerId: binding.providerId,
    requestedModel: "mock-model",
    messages: [{ role: "user", parts: [{ type: "text", text: "synthetic" }] }],
    requiredCapabilities: ["vision"],
    credentialRef: { id: "synthetic-ref", ...binding },
  })) {
    events.push(event);
  }

  assert.deepEqual(trace, []);
  assert.deepEqual(events.map((event) => event.type), ["started", "failed"]);
  assert.equal(events[1].error.code, "capability-mismatch");
  assert.equal(events[1].provenance.kind, "pre-dispatch");
});

test("provider package contains no network, listener, or ambient credential API", () => {
  const sourceRoot = path.join(REPO_ROOT, "packages", "providers", "src");
  const text = fs
    .readdirSync(sourceRoot, { recursive: true })
    .filter((entry) => String(entry).endsWith(".ts"))
    .map((entry) => fs.readFileSync(path.join(sourceRoot, String(entry)), "utf8"))
    .join("\n");

  for (const forbidden of [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /node:http/,
    /node:https/,
    /node:net/,
    /\bprocess\.env\b/,
    /\bDeno\.env\b/,
  ]) {
    assert.doesNotMatch(text, forbidden);
  }
});
