import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";

import {
  PHASE4_FIXTURE_ID,
  PHASE4_STREAM_PATH,
  PHASE4_SYNTHETIC_MODEL,
  PHASE4_SYNTHETIC_PROMPT,
  startPhase4LoopbackStreamFixture,
} from "../characterization/support/phase4-loopback-stream.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(ROOT, "runtime", "tmp", "phase4-loopback-stream-tests");
const ORIGIN = "http://127.0.0.1:4199";

function syntheticBody(overrides = {}) {
  return JSON.stringify({
    model: PHASE4_SYNTHETIC_MODEL,
    messages: [{ role: "user", content: PHASE4_SYNTHETIC_PROMPT }],
    stream: true,
    max_tokens: 128,
    ...overrides,
  });
}

function request({ port, method = "POST", requestPath = PHASE4_STREAM_PATH, origin = ORIGIN, fixtureId = PHASE4_FIXTURE_ID, body = syntheticBody() } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        origin,
        "x-latticework-phase4-fixture-id": fixtureId,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      },
    });
    req.once("error", reject);
    req.once("response", (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.once("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      response.once("error", reject);
    });
    req.end(body);
  });
}

async function withFixture(callback) {
  const runRoot = path.join(TMP, `run-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(runRoot, { recursive: true });
  const fixture = await startPhase4LoopbackStreamFixture({ runRoot, allowedOrigin: ORIGIN });
  try {
    await callback(fixture);
  } finally {
    await fixture.stop();
    fs.rmSync(runRoot, { recursive: true, force: true });
  }
}

test("binds exact loopback on an OS-selected port, streams controlled synthetic fragments, and proves teardown", async () => {
  await withFixture(async (fixture) => {
    assert.equal(fixture.bind, "127.0.0.1");
    assert.ok(Number.isInteger(fixture.port) && fixture.port > 0);
    const session = fixture.arm("P4-CHAT-001A");
    const resultPromise = request({ port: fixture.port });
    await session.waitForRequest();
    session.emitDelta("P4 synthetic first");
    session.emitDelta("P4 synthetic success");
    session.finish();
    const result = await resultPromise;
    assert.equal(result.status, 200);
    assert.match(result.body, /P4 synthetic first/);
    assert.match(result.body, /P4 synthetic success/);
    assert.match(result.body, /data: \[DONE\]/);
    await session.waitForClose();
    const receipt = session.receipt();
    assert.equal(receipt.fragment_count, 2);
    assert.equal(receipt.terminal_emitted, true);
    assert.equal(receipt.closed_before_first_delta, false);
    assert.equal(receipt.closed_before_terminal, false);
    assert.deepEqual(receipt.events.map((event) => event.monotonic_ms).sort((a, b) => a - b), receipt.events.map((event) => event.monotonic_ms));
    session.release();
  });
});

for (const [name, input, expectedStatus] of [
  ["method", { method: "GET" }, 405],
  ["path", { requestPath: "/unexpected" }, 404],
  ["fixture ID", { fixtureId: "wrong" }, 403],
  ["origin", { origin: "http://127.0.0.1:4200" }, 403],
  ["body", { body: JSON.stringify({ stream: true }) }, 422],
]) {
  test(`rejects wrong ${name}`, async () => {
    await withFixture(async (fixture) => {
      const result = await request({ port: fixture.port, ...input });
      assert.equal(result.status, expectedStatus);
      assert.equal(fixture.receipt().rejected.length, 1);
    });
  });
}

test("records client closure before the first fragment without emitting a terminal", async () => {
  await withFixture(async (fixture) => {
    const session = fixture.arm("P4-CHAT-010A");
    const req = http.request({
      host: "127.0.0.1",
      port: fixture.port,
      path: PHASE4_STREAM_PATH,
      method: "POST",
      headers: {
        origin: ORIGIN,
        "x-latticework-phase4-fixture-id": PHASE4_FIXTURE_ID,
        "content-type": "application/json",
      },
    });
    req.on("error", () => {});
    req.end(syntheticBody());
    await session.waitForRequest();
    req.destroy();
    await session.waitForClose();
    const receipt = session.receipt();
    assert.equal(receipt.closed_before_first_delta, true);
    assert.equal(receipt.closed_before_terminal, true);
    assert.equal(receipt.terminal_emitted, false);
  });
});

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));
