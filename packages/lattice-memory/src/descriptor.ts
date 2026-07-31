export const pulseMediumDatasetDescriptor = Object.freeze({
  id: "pulse-medium",
  schemaVersion: 1,
  candidateDatabase: "latticework::pulse-medium",
  store: "pulses",
  syntheticOnly: true,
  disposableStorage: true,
  sensitivity: "synthetic-fixture-only",
  retention: "bounded-newest-10000-disposable",
  source: Object.freeze({ origin: "generated-synthetic-only", legacyReadAuthorized: false }),
  target: Object.freeze({ keyPath: "_id", autoIncrement: true, indexes: Object.freeze([]), codec: "PulseMediumV1SyntheticCodec" }),
  lifecycle: "not-authorized",
  failurePolicy: "fail-quiet-no-write",
  futureSchemaPolicy: "abstain-no-write",
});

export const pulseMediumRetention = 10_000;
export const pulseMediumPendingLimit = 100;
