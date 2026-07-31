export interface PulseReference {
  readonly store: string;
  readonly id: string;
}

export interface PulseInput {
  readonly ts?: number;
  readonly source: string;
  readonly kind: string;
  readonly summary: string;
  readonly refs?: readonly PulseReference[];
}

export interface Pulse {
  readonly ts: number;
  readonly source: string;
  readonly kind: string;
  readonly summary: string;
  readonly refs?: readonly PulseReference[];
}

export interface StoredPulse extends Pulse {
  readonly _id?: IDBValidKey;
}

export interface PulseFilter {
  readonly source?: string;
  readonly kind?: string;
  readonly sources?: readonly string[];
  readonly kinds?: readonly string[];
}

export interface QuietRoomState {
  isActive(): boolean;
}

/** Candidate-only storage seam. Implementations own no legacy namespace. */
export interface PulseRepository {
  open(): Promise<void>;
  write(pulse: Pulse): Promise<void>;
  read(): Promise<readonly StoredPulse[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export interface PulseDiagnostic {
  readonly code: "invalid-pulse" | "open-failed" | "write-failed" | "read-failed" | "subscriber-failed" | "clear-failed" | "close-failed";
  readonly operation: "commit" | "open" | "write" | "read" | "subscribe" | "clear" | "close";
}

export interface PulseCommitAccepted {
  readonly ok: true;
  readonly pulse: Pulse;
}

export interface PulseCommitRejected {
  readonly ok: false;
  readonly code: "quiet-room" | "invalid-pulse";
}

export type PulseCommitResult = PulseCommitAccepted | PulseCommitRejected;

export interface PulseMediumOptions {
  readonly repository: PulseRepository;
  readonly quietRoom?: QuietRoomState;
  readonly onDiagnostic?: (diagnostic: PulseDiagnostic) => void;
}

export interface PulseMedium {
  start(): Promise<void>;
  commit(input: unknown): PulseCommitResult;
  subscribe(filter: PulseFilter | null | undefined, handler: (pulse: Pulse) => void): () => void;
  recent(filter?: PulseFilter | null, limit?: number): Promise<readonly Pulse[]>;
  clear(): Promise<boolean>;
  close(): Promise<boolean>;
  isReady(): boolean;
  pendingCount(): number;
  subscriberCount(): number;
}
