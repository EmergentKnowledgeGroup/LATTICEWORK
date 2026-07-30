export type MigrationJournalState =
  | "planned"
  | "copying"
  | "validating"
  | "ready"
  | "failed"
  | "rolled-back";

export interface DatasetSourceDescriptor {
  readonly database: string;
  readonly databaseVersion: number;
  readonly ownedStores: readonly string[];
  readonly characterizationOnlyStores: readonly string[];
}

export interface DatasetTargetDescriptor {
  readonly database: string;
  readonly activation: "forbidden";
}

export interface DatasetDescriptor {
  readonly id: string;
  readonly schemaVersion: number;
  readonly owner: string;
  readonly source: DatasetSourceDescriptor;
  readonly target: DatasetTargetDescriptor;
  readonly unknownValuePolicy:
    "typed-projection-plus-native-structured-clone";
}

export interface ConversationProjection {
  readonly id: string;
  readonly title?: string;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

export interface MessageProjection {
  readonly id: IDBValidKey;
  readonly conversationId: string;
  readonly role?: string;
  readonly createdAt?: unknown;
}

export interface PreservedRecord<TProjection> {
  readonly key: IDBValidKey;
  readonly projection: TProjection;
  readonly sourceValue: unknown;
}

export interface ConversationDatasetSnapshot {
  readonly descriptorId: "conversation";
  readonly schemaVersion: 1;
  readonly conversations: readonly PreservedRecord<ConversationProjection>[];
  readonly messages: readonly PreservedRecord<MessageProjection>[];
}

export interface MigrationCounts {
  readonly conversations: number;
  readonly messages: number;
}

export interface MigrationJournalEntry {
  readonly operationId: string;
  readonly migrationId: string;
  /** Opaque, local-only verification identity. It is never included in transfer envelopes or results. */
  readonly sourceVerificationIdentity: string;
  readonly datasetId: "conversation";
  readonly sourceDatabase: "FreeLatticeDB";
  readonly sourceVersion: number;
  readonly targetDatabase: "latticework::conversation";
  readonly state: MigrationJournalState;
  readonly copied: MigrationCounts;
  readonly expected: MigrationCounts;
  readonly checkpoint: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly failureCode?: string;
  /** Records how a failed candidate namespace was made unavailable before its terminal receipt was written. */
  readonly candidateDisposition?: "discarded";
}

export interface MigrationResult {
  readonly operationId: string;
  readonly state: MigrationJournalState;
  readonly copied: MigrationCounts;
  readonly sourceUnchanged: true;
  readonly candidateActive: false;
  readonly abstentionReason?: "unsupported-source-version";
}

export interface ConversationTransferEnvelope {
  readonly formatId: "latticework.conversation";
  readonly formatVersion: 1;
  readonly operationId: string;
  readonly createdAt: string;
  readonly descriptor: DatasetDescriptor;
  readonly counts: MigrationCounts;
  readonly records: ConversationDatasetSnapshot;
}

export interface ConversationRepository {
  putSnapshot(snapshot: ConversationDatasetSnapshot): Promise<void>;
  readSnapshot(): Promise<ConversationDatasetSnapshot>;
  clearCandidate(): Promise<void>;
  /** Deletes only the exact allowlisted candidate namespace owned by this repository. */
  discardCandidate(): Promise<void>;
}

export interface MigrationJournal {
  read(operationId: string): Promise<MigrationJournalEntry | undefined>;
  write(entry: MigrationJournalEntry): Promise<void>;
}
