import { expect, test } from "@playwright/test";

import {
  persistenceContract,
  syntheticProvider,
} from "../support/contracts.mjs";

test("safe characterization contracts are pinned and synthetic", () => {
  expect(persistenceContract.baseline_sha).toBe(
    "e7585999fc1af2707f410ae87356cf2b52e08d9c",
  );
  expect(
    new Set(
      persistenceContract.required_indexed_db.map(
        (database) => database.name,
      ),
    ).size,
  ).toBe(persistenceContract.required_indexed_db.length);
  expect(syntheticProvider.credential).toBe(
    "LW_FAKE_KEY_NOT_A_SECRET",
  );
  expect(new URL(syntheticProvider.invalid_endpoint).hostname).toBe(
    "provider.invalid",
  );
  expect(syntheticProvider.rules).toContain(
    "Never submit the synthetic credential to any endpoint.",
  );
});
