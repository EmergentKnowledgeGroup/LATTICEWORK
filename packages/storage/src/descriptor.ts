import type { DatasetDescriptor, MigrationJournalState } from "@latticework/contracts";

export const conversationDatasetDescriptor: DatasetDescriptor = Object.freeze({
  id: "conversation",
  schemaVersion: 1,
  owner: "@latticework/storage",
  source: Object.freeze({
    database: "FreeLatticeDB",
    databaseVersion: 3,
    ownedStores: Object.freeze(["conversations", "messages"]),
    characterizationOnlyStores: Object.freeze(["meta", "memoryIndex"]),
  }),
  target: Object.freeze({
    database: "latticework::conversation",
    activation: "forbidden",
  }),
  unknownValuePolicy: "typed-projection-plus-native-structured-clone",
});

export const migrationDatabaseName = "latticework::migration";

const operationIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rejects untrusted names rather than incorporating them into an IndexedDB namespace. */
export function assertOperationId(operationId: string): void {
  if (!operationIdPattern.test(operationId)) {
    throw new Error("A staging operation id must be lowercase kebab-case.");
  }
}

export function stagingConversationDatabaseName(operationId: string): string {
  assertOperationId(operationId);
  return `latticework::staging::${operationId}::conversation`;
}

/** Candidate repositories may only own the fixed target or a validated staging copy. */
export function assertConversationCandidateDatabaseName(databaseName: string): void {
  if (databaseName === conversationDatasetDescriptor.target.database) return;
  const match = /^latticework::staging::([a-z0-9]+(?:-[a-z0-9]+)*)::conversation$/.exec(databaseName);
  if (match?.[1]) {
    assertOperationId(match[1]);
    return;
  }
  throw new Error("Conversation repository database name is outside the candidate namespace allowlist.");
}

const transitions: Readonly<Record<MigrationJournalState, readonly MigrationJournalState[]>> = Object.freeze({
  planned: ["copying", "failed", "rolled-back"],
  copying: ["validating", "failed", "rolled-back"],
  validating: ["ready", "failed", "rolled-back"],
  ready: ["rolled-back"],
  failed: [],
  "rolled-back": [],
});

/** State changes are explicit. Unknown states and self-transitions are refused. */
export function isJournalTransitionAllowed(
  from: MigrationJournalState | string,
  to: MigrationJournalState | string,
): boolean {
  const allowed = transitions[from as MigrationJournalState];
  return allowed?.includes(to as MigrationJournalState) ?? false;
}
