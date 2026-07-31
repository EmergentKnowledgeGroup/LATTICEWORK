import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNTHETIC_STREAM_FRAGMENT,
  startSyntheticStreamFixture,
} from "./synthetic-stream-fixture.mjs";

test("synthetic stream fixture is exact-loopback, synthetic-only, and explicitly releases its port", async () => {
  const fixture = await startSyntheticStreamFixture();
  try {
    assert.equal(fixture.bind, "127.0.0.1");
    assert.ok(Number.isInteger(fixture.port) && fixture.port > 0);
    assert.match(fixture.url, /^http:\/\/127\.0\.0\.1:\d+\/_phase4-synthetic-stream$/u);
    assert.equal(SYNTHETIC_STREAM_FRAGMENT, "phase4 synthetic fragment");
    assert.equal(fixture.requests, 0);
  } finally {
    await fixture.close();
  }
  assert.equal(fixture.closed, true);
});
