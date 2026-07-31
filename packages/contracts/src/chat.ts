import type {
  ProviderBinding,
  ProviderEvent,
  ProviderRequest,
  ProviderTrustClass,
} from "./provider.ts";

/** Candidate-only, synthetic conversation state owned by the Phase 4 Chat slice. */
export interface ChatConversationState {
  readonly conversationId: string;
  readonly messages: readonly ChatMessage[];
}

export interface ChatUserMessage {
  readonly id: string;
  readonly operationId: string;
  readonly role: "user";
  readonly content: string;
  readonly createdAt: string;
}

/** Assistant content is present only after a completed provider terminal. */
export interface ChatAssistantMessage {
  readonly id: string;
  readonly operationId: string;
  readonly role: "assistant";
  readonly content: string;
  readonly createdAt: string;
  readonly completedAt: string;
  readonly finishReason: string;
}

export interface ChatTerminalMetadata {
  readonly operationId: string;
  readonly terminal: "completed" | "failed" | "cancelled";
  readonly error?: ChatSafeError;
  readonly provenance: ChatTerminalProvenance;
}

/** Content-free record retained for cancelled and failed turns. */
export interface ChatTerminalMessage {
  readonly id: string;
  readonly operationId: string;
  readonly role: "terminal";
  readonly createdAt: string;
  readonly metadata: ChatTerminalMetadata;
}

export type ChatMessage = ChatUserMessage | ChatAssistantMessage | ChatTerminalMessage;

export interface ChatSafeError {
  readonly code: "cancelled" | "unconfigured" | "capability-mismatch" | "authentication" | "authorization" | "policy-refusal" | "rate-limit" | "context-limit" | "model-not-found" | "timeout" | "network" | "cors" | "malformed-response" | "provider" | "internal";
  readonly message: string;
}

/** A redacted terminal receipt; it intentionally excludes prompts, responses, credentials, and origins. */
export interface ChatTerminalProvenance {
  readonly operationId: string;
  readonly attemptId: string;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly requestedModel: string;
  readonly resolvedModel: string;
  readonly trustClass: ProviderTrustClass;
  readonly resultSource: "mock" | "unavailable";
  readonly startedAt: string;
  readonly endedAt: string;
  readonly terminalReason: "completed" | "failed" | "cancelled";
  readonly cancellationScope?: "transport-aborted" | "provider-cancel-acknowledged";
}

/** Chat does not know how candidate state is stored. */
export interface ChatConversationRepository {
  read(conversationId: string): Promise<ChatConversationState | undefined>;
  write(state: ChatConversationState): Promise<void>;
}

/** Chat depends on the normalized seam, not a Phase 3 implementation. */
export interface ChatProviderRouter {
  run(request: ProviderRequest): AsyncIterable<ProviderEvent>;
}

export interface ChatProviderSelection {
  readonly binding: ProviderBinding;
  readonly requestedModel: string;
  readonly resolvedModel: string;
}

export interface ChatSendInput {
  readonly conversationId: string;
  readonly operationId: string;
  readonly userMessageId: string;
  readonly content: string;
  readonly provider: ChatProviderSelection;
}

export interface ChatOperation {
  readonly operationId: string;
  cancel(): void;
  readonly finished: Promise<ChatTerminalMetadata>;
}

export type ChatEvent =
  | { readonly type: "delta"; readonly operationId: string; readonly text: string }
  | { readonly type: "terminal"; readonly operationId: string; readonly metadata: ChatTerminalMetadata };
