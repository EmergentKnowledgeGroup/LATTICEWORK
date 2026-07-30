import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __latticeworkBlockedRealtime: string[];
  }
}

async function installEgressBoundary(
  page: Page,
  allowedOrigin: string,
): Promise<string[]> {
  const blockedRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== allowedOrigin) {
      blockedRequests.push(requestUrl.href);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await page.addInitScript(() => {
    const attempts: string[] = [];
    Object.defineProperty(window, "__latticeworkBlockedRealtime", {
      configurable: false,
      value: attempts,
      writable: false,
    });
    const blockedConstructor = (name: string) =>
      class {
        constructor() {
          attempts.push(name);
          throw new Error(`${name} is forbidden in Phase 3 browser verification.`);
        }
      };
    for (const name of [
      "WebSocket",
      "WebTransport",
      "EventSource",
      "RTCPeerConnection",
      "Worker",
      "SharedWorker",
    ]) {
      Object.defineProperty(window, name, {
        configurable: true,
        value: blockedConstructor(name),
        writable: true,
      });
    }
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: () => {
        attempts.push("sendBeacon");
        return false;
      },
    });
  });
  return blockedRequests;
}

async function openHarness(page: Page): Promise<string[]> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Phase 3 Playwright requires a string baseURL.");
  }
  const blockedRequests = await installEgressBoundary(
    page,
    new URL(baseURL).origin,
  );
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(
    "Bounded synthetic test API ready.",
  );
  return blockedRequests;
}

async function sourceReceipt(page: Page) {
  return page.evaluate(async () => {
    const api = window.latticeworkPhase3Storage;
    return api.describe({
      schema: await api.databaseSchema("FreeLatticeDB"),
      conversations: await api.readStore("FreeLatticeDB", "conversations"),
      messages: await api.readStore("FreeLatticeDB", "messages"),
      meta: await api.readStore("FreeLatticeDB", "meta"),
      memoryIndex: await api.readStore("FreeLatticeDB", "memoryIndex"),
    });
  });
}

async function assertNoEgress(
  page: Page,
  blockedRequests: readonly string[],
): Promise<void> {
  expect(blockedRequests).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__latticeworkBlockedRealtime))
    .toEqual([]);
}

test("fresh v3 migration preserves native values, source schema, and excluded stores without activation", async ({
  page,
}) => {
  const blockedRequests = await openHarness(page);
  await page.evaluate(async () => {
    await window.latticeworkPhase3Storage.reset(["browser-fresh"]);
    await window.latticeworkPhase3Storage.seedSource(3);
  });
  const before = await sourceReceipt(page);

  const receipt = await page.evaluate(async () => {
    const api = window.latticeworkPhase3Storage;
    const result = await api.migrate("browser-fresh", { batchSize: 1 });
    const candidate = await api.candidateSnapshot();
    return {
      result,
      candidate: await api.describe(candidate),
      inventory: await api.inventory(),
      journal: await api.journal("browser-fresh"),
    };
  });
  const after = await sourceReceipt(page);

  expect(receipt.result).toMatchObject({
    candidateActive: false,
    copied: { conversations: 2, messages: 2 },
    sourceUnchanged: true,
    state: "ready",
  });
  expect(receipt.journal).toMatchObject({
    expected: { conversations: 2, messages: 2 },
    copied: { conversations: 2, messages: 2 },
    state: "ready",
  });
  expect(after).toEqual(before);
  expect(JSON.stringify(receipt.candidate)).toContain("Unicode: こんにちは 🌱");
  expect(JSON.stringify(receipt.candidate)).toContain(
    '"type":"Date","value":"2026-07-30T00:00:00.000Z"',
  );
  expect(JSON.stringify(receipt.candidate)).toContain(
    '"type":"Blob","mediaType":"text/plain"',
  );
  expect(JSON.stringify(receipt.candidate)).toContain(
    '"type":"ArrayBuffer","bytes":[0,1,2,255]',
  );
  expect(JSON.stringify(receipt.candidate)).toContain(
    '"type":"Uint8Array","bytes":[9,8,7]',
  );
  expect(JSON.stringify(receipt.candidate)).toContain(
    '"unknownArray":[false,0,null,"✓"]',
  );
  expect(JSON.stringify(receipt.candidate)).not.toContain("meta-untouched");
  expect(JSON.stringify(receipt.candidate)).not.toContain("memory-untouched");
  expect(receipt.inventory).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "FreeLatticeDB", version: 3 }),
      expect.objectContaining({
        name: "latticework::conversation",
        version: 1,
      }),
      expect.objectContaining({ name: "latticework::migration", version: 1 }),
    ]),
  );
  await assertNoEgress(page, blockedRequests);
});

test("every batch interruption resumes idempotently and rollback removes only the candidate", async ({
  page,
}) => {
  const blockedRequests = await openHarness(page);

  for (let checkpoint = 1; checkpoint <= 4; checkpoint += 1) {
    const operationId = `browser-interrupt-${checkpoint}`;
    const receipt = await page.evaluate(
      async ({ operationId, checkpoint }) => {
        const api = window.latticeworkPhase3Storage;
        await api.reset([operationId]);
        await api.seedSource(3);
        const before = await api.describe({
          schema: await api.databaseSchema("FreeLatticeDB"),
          conversations: await api.readStore(
            "FreeLatticeDB",
            "conversations",
          ),
          messages: await api.readStore("FreeLatticeDB", "messages"),
          meta: await api.readStore("FreeLatticeDB", "meta"),
          memoryIndex: await api.readStore("FreeLatticeDB", "memoryIndex"),
        });
        const interrupted = await api.migrate(operationId, {
          batchSize: 1,
          interruptAfterBatches: checkpoint,
        });
        const interruptedJournal = await api.journal(operationId);
        const resumed = await api.migrate(operationId, { batchSize: 1 });
        const readyJournal = await api.journal(operationId);
        const rerun = await api.migrate(operationId, { batchSize: 1 });
        const candidate = await api.candidateSnapshot();
        const rolledBack = await api.rollback(operationId);
        const rolledBackAgain = await api.rollback(operationId);
        const inventory = await api.inventory();
        const after = await api.describe({
          schema: await api.databaseSchema("FreeLatticeDB"),
          conversations: await api.readStore(
            "FreeLatticeDB",
            "conversations",
          ),
          messages: await api.readStore("FreeLatticeDB", "messages"),
          meta: await api.readStore("FreeLatticeDB", "meta"),
          memoryIndex: await api.readStore("FreeLatticeDB", "memoryIndex"),
        });
        return {
          after,
          before,
          candidate,
          interrupted,
          interruptedJournal,
          inventory,
          readyJournal,
          rerun,
          resumed,
          rolledBack,
          rolledBackAgain,
        };
      },
      { checkpoint, operationId },
    );

    expect(receipt.interrupted).toMatchObject({
      candidateActive: false,
      state: "copying",
    });
    expect(receipt.interruptedJournal).toMatchObject({
      checkpoint,
      state: "copying",
    });
    expect(receipt.resumed).toMatchObject({
      candidateActive: false,
      copied: { conversations: 2, messages: 2 },
      state: "ready",
    });
    expect(receipt.readyJournal).toMatchObject({
      expected: { conversations: 2, messages: 2 },
      copied: { conversations: 2, messages: 2 },
      state: "ready",
    });
    expect(receipt.rerun).toEqual(receipt.resumed);
    expect(receipt.candidate.conversations).toHaveLength(2);
    expect(receipt.candidate.messages).toHaveLength(2);
    expect(receipt.rolledBack).toMatchObject({
      candidateActive: false,
      state: "rolled-back",
    });
    expect(receipt.rolledBackAgain).toEqual(receipt.rolledBack);
    expect(receipt.inventory).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "latticework::conversation" }),
      ]),
    );
    expect(receipt.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "latticework::migration" }),
      ]),
    );
    expect(receipt.after).toEqual(receipt.before);
  }

  await assertNoEgress(page, blockedRequests);
});

test("future source versions abstain before candidate or journal writes", async ({
  page,
}) => {
  const blockedRequests = await openHarness(page);
  const receipt = await page.evaluate(async () => {
    const api = window.latticeworkPhase3Storage;
    await api.reset(["browser-future"]);
    await api.seedSource(4);
    const before = await api.describe({
      schema: await api.databaseSchema("FreeLatticeDB"),
      conversations: await api.readStore("FreeLatticeDB", "conversations"),
      messages: await api.readStore("FreeLatticeDB", "messages"),
    });
    const result = await api.migrate("browser-future", { batchSize: 1 });
    const after = await api.describe({
      schema: await api.databaseSchema("FreeLatticeDB"),
      conversations: await api.readStore("FreeLatticeDB", "conversations"),
      messages: await api.readStore("FreeLatticeDB", "messages"),
    });
    return {
      after,
      before,
      inventory: await api.inventory(),
      journal: await api.journal("browser-future"),
      result,
    };
  });

  expect(receipt.result).toMatchObject({
    abstentionReason: "unsupported-source-version",
    candidateActive: false,
    sourceUnchanged: true,
  });
  expect(receipt.journal).toBeUndefined();
  expect(receipt.inventory).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "latticework::conversation" }),
      expect.objectContaining({ name: "latticework::migration" }),
    ]),
  );
  expect(receipt.after).toEqual(receipt.before);
  await assertNoEgress(page, blockedRequests);
});

test("hostile and partial transfers are rejected before staging; valid staging is disposable", async ({
  page,
}) => {
  const blockedRequests = await openHarness(page);
  const receipt = await page.evaluate(async () => {
    const api = window.latticeworkPhase3Storage;
    const operationId = "browser-transfer";
    await api.reset([operationId]);
    await api.seedSource(3);
    await api.migrate(operationId, { batchSize: 2 });
    const envelope = await api.exportEnvelope(operationId);
    const invalidInputs: Array<{ label: string; input: unknown }> = [
      { label: "null envelope", input: null },
      { label: "empty envelope", input: {} },
      {
        label: "unsupported format version",
        input: { ...structuredClone(envelope), formatVersion: 2 },
      },
      {
        label: "unsafe operation id",
        input: { ...structuredClone(envelope), operationId: "../escape" },
      },
      {
        label: "mismatched counts",
        input: {
          ...structuredClone(envelope),
          counts: { conversations: 999, messages: 999 },
        },
      },
      {
        label: "untrusted descriptor target",
        input: {
          ...structuredClone(envelope),
          descriptor: {
            ...structuredClone(envelope.descriptor),
            target: { database: "FreeLatticeDB", activation: "forbidden" },
          },
        },
      },
      {
        label: "missing records",
        input: { ...structuredClone(envelope), records: undefined },
      },
      {
        label: "duplicate conversation key",
        input: {
          ...structuredClone(envelope),
          records: {
            ...structuredClone(envelope.records),
            conversations: [
              ...structuredClone(envelope.records.conversations),
              structuredClone(envelope.records.conversations[0]),
            ],
          },
        },
      },
      {
        label: "invalid non-IDB message key",
        input: {
          ...structuredClone(envelope),
          records: {
            ...structuredClone(envelope.records),
            messages: [
              {
                ...structuredClone(envelope.records.messages[0]),
                key: Number.NaN,
              },
              ...structuredClone(envelope.records.messages.slice(1)),
            ],
          },
        },
      },
      {
        label: "projection source mismatch",
        input: {
          ...structuredClone(envelope),
          records: {
            ...structuredClone(envelope.records),
            conversations: [
              {
                ...structuredClone(envelope.records.conversations[0]),
                projection: {
                  ...structuredClone(
                    envelope.records.conversations[0].projection,
                  ),
                  title: "tampered-projection",
                },
              },
              ...structuredClone(envelope.records.conversations.slice(1)),
            ],
          },
        },
      },
      {
        label: "dangling conversation reference",
        input: {
          ...structuredClone(envelope),
          records: {
            ...structuredClone(envelope.records),
            messages: [
              {
                ...structuredClone(envelope.records.messages[0]),
                projection: {
                  ...structuredClone(envelope.records.messages[0].projection),
                  conversationId: "missing-conversation",
                },
                sourceValue: {
                  ...(envelope.records.messages[0].sourceValue as Record<
                    string,
                    unknown
                  >),
                  conversationId: "missing-conversation",
                },
              },
              ...structuredClone(envelope.records.messages.slice(1)),
            ],
          },
        },
      },
    ];
    const rejections: Array<{
      label: string;
      error: string;
      stagingNamespaces: string[];
    }> = [];
    for (const { input, label } of invalidInputs) {
      try {
        await api.stageEnvelope(input);
        rejections.push({
          label,
          error: "accepted",
          stagingNamespaces: (await api.inventory())
            .map((entry) => entry.name)
            .filter(
              (name): name is string =>
                typeof name === "string" && name.startsWith("latticework::staging::"),
            ),
        });
      } catch (error) {
        rejections.push({
          label,
          error: error instanceof Error ? error.message : String(error),
          stagingNamespaces: (await api.inventory())
            .map((entry) => entry.name)
            .filter(
              (name): name is string =>
                typeof name === "string" && name.startsWith("latticework::staging::"),
            ),
        });
      }
    }
    const beforeStage = await api.inventory();
    const staged = await api.stageEnvelope(envelope);
    const stagedSchema = await api.databaseSchema(staged.databaseName);
    const stagedRecords = await api.describe({
      conversations: await api.readStore(
        staged.databaseName,
        "conversations",
      ),
      messages: await api.readStore(staged.databaseName, "messages"),
    });
    const duringStage = await api.inventory();
    const discardedName = await api.discardStagedEnvelope(envelope);
    const afterDiscard = await api.inventory();
    return {
      afterDiscard,
      beforeStage,
      discardedName,
      duringStage,
      envelopeText: JSON.stringify(await api.describe(envelope)),
      rejections,
      staged,
      stagedRecords,
      stagedSchema,
    };
  });

  expect(receipt.rejections).toHaveLength(11);
  expect(receipt.rejections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        error: expect.stringMatching(/duplicate key/i),
        label: "duplicate conversation key",
        stagingNamespaces: [],
      }),
      expect.objectContaining({
        error: expect.stringMatching(/invalid message key/i),
        label: "invalid non-IDB message key",
        stagingNamespaces: [],
      }),
      expect.objectContaining({
        error: expect.stringMatching(/projection and sourceValue are inconsistent/i),
        label: "projection source mismatch",
        stagingNamespaces: [],
      }),
      expect.objectContaining({
        error: expect.stringMatching(/missing conversation/i),
        label: "dangling conversation reference",
        stagingNamespaces: [],
      }),
    ]),
  );
  expect(receipt.rejections).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ error: "accepted" })]),
  );
  expect(receipt.beforeStage).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "latticework::staging::browser-transfer::conversation",
      }),
    ]),
  );
  expect(receipt.staged.databaseName).toBe(
    "latticework::staging::browser-transfer::conversation",
  );
  expect(receipt.stagedSchema).toMatchObject({
    name: "latticework::staging::browser-transfer::conversation",
    version: 1,
  });
  expect(receipt.stagedRecords).toMatchObject({
    conversations: expect.arrayContaining([expect.any(Object)]),
    messages: expect.arrayContaining([expect.any(Object)]),
  });
  expect(receipt.duringStage).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "latticework::staging::browser-transfer::conversation",
      }),
    ]),
  );
  expect(receipt.discardedName).toBe(receipt.staged.databaseName);
  expect(receipt.afterDiscard).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: receipt.staged.databaseName }),
    ]),
  );
  expect(receipt.envelopeText).not.toContain("meta-untouched");
  expect(receipt.envelopeText).not.toContain("memory-untouched");
  await assertNoEgress(page, blockedRequests);
});

test("blocked upgrades wait safely and quota failures produce inactive terminal evidence", async ({
  page,
}) => {
  const blockedRequests = await openHarness(page);
  const receipt = await page.evaluate(async () => {
    const api = window.latticeworkPhase3Storage;
    await api.reset(["browser-quota", "browser-blocked"]);
    await api.seedSource(3);
    return {
      blocked: await api.proveBlockedUpgrade(),
      quota: await api.simulateQuotaFailure("browser-quota"),
      inventory: await api.inventory(),
    };
  });

  expect(receipt.blocked).toEqual({
    cleaned: true,
    openedVersion: 2,
    pendingWhileBlocked: true,
  });
  expect(receipt.quota.result).toMatchObject({
    candidateActive: false,
    sourceUnchanged: true,
    state: "failed",
  });
  expect(receipt.quota.journal).toMatchObject({
    candidateDisposition: "discarded",
    failureCode: "candidate-write-failed",
    state: "failed",
  });
  expect(receipt.quota.discarded).toBe(true);
  expect(receipt.quota.transitions).toEqual([
    "planned",
    "copying",
    "failed",
  ]);
  expect(receipt.inventory).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "latticework::conversation" }),
    ]),
  );
  await assertNoEgress(page, blockedRequests);
});
