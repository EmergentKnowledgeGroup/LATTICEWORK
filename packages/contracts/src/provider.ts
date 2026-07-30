export type ProviderTrustClass =
  | "browser"
  | "loopback"
  | "lan"
  | "cloud"
  | "custom"
  | "mock";

export type ProviderCapability = "text" | "vision" | "tools" | "streaming";

export type ProviderErrorCode =
  | "unconfigured"
  | "capability-mismatch"
  | "authentication"
  | "authorization"
  | "policy-refusal"
  | "rate-limit"
  | "context-limit"
  | "model-not-found"
  | "timeout"
  | "cancelled"
  | "network"
  | "cors"
  | "malformed-response"
  | "provider"
  | "internal";

export interface ProviderBinding {
  readonly providerId: string;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly exactOrigin: string;
  readonly trustClass: ProviderTrustClass;
  readonly authenticationScheme: string;
}

export interface CredentialRef extends ProviderBinding {
  readonly id: string;
}

export interface EgressGrant extends ProviderBinding {
  readonly grantId: string;
  readonly operationId: string;
  readonly attemptId: string;
  readonly payloadClass: "synthetic";
  readonly redirectTarget: null;
  readonly requiredCapabilities: readonly ProviderCapability[];
}

export interface ProviderTextPart {
  readonly type: "text";
  readonly text: string;
}

export interface ProviderImagePart {
  readonly type: "image";
  readonly mediaType: string;
  readonly syntheticRef: string;
}

export type ProviderMessagePart = ProviderTextPart | ProviderImagePart;

export interface ProviderMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly parts: readonly ProviderMessagePart[];
}

export interface ProviderRequest {
  readonly operationId: string;
  readonly providerId: string;
  readonly requestedModel: string;
  readonly messages: readonly ProviderMessage[];
  readonly requiredCapabilities: readonly ProviderCapability[];
  readonly credentialRef?: CredentialRef;
  readonly signal?: AbortSignal;
  readonly deadline?: string;
  readonly retry?: {
    readonly maxAttempts: number;
    readonly providerIdempotencyProven?: boolean;
    readonly callerAuthorizedAfterFailure?: boolean;
  };
}

export interface ProviderError {
  readonly code: ProviderErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

/** Content-free authorization basis captured for every terminal provenance record. */
export type ProviderRetryAuthorization =
  | "none"
  | "provider-idempotency-proven"
  | "caller-authorized-after-failure";

export interface ProviderAttemptProvenance extends ProviderBinding {
  readonly kind: "attempt";
  readonly dispatchState: "dispatched";
  readonly operationId: string;
  readonly attemptId: string;
  readonly requestedModel: string;
  readonly resolvedModel: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly capabilitiesUsed: readonly ProviderCapability[];
  /** Explicitly empty unless a future caller-authorized fallback is attempted. */
  readonly fallbackChain: readonly ProviderBinding[];
  readonly retryIndex: number;
  readonly retryAuthorization: ProviderRetryAuthorization;
  readonly attemptReason: "initial" | "authorized-retry";
  readonly resultSource: "mock";
  readonly terminalReason: "completed" | "failed" | "cancelled";
  readonly cancellationScope?:
    | "transport-aborted"
    | "provider-cancel-acknowledged";
}

export interface ProviderPreDispatchProvenance {
  readonly kind: "pre-dispatch";
  readonly dispatchState: "not-dispatched";
  readonly operationId: string;
  readonly attemptId: string;
  readonly requestedProviderId: string;
  readonly requestedModel: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly capabilitiesUsed: readonly ProviderCapability[];
  /** Explicitly empty unless a future caller-authorized fallback is attempted. */
  readonly fallbackChain: readonly ProviderBinding[];
  readonly retryIndex: number;
  readonly retryAuthorization: ProviderRetryAuthorization;
  readonly attemptReason: "pre-dispatch";
  readonly resultSource: "unavailable";
  readonly terminalReason: "failed" | "cancelled";
  readonly errorCode: ProviderErrorCode;
  readonly cancellationScope?: "transport-aborted";
}

export type ProviderProvenance =
  | ProviderAttemptProvenance
  | ProviderPreDispatchProvenance;

export interface ProviderStartedEvent {
  readonly type: "started";
  readonly operationId: string;
  readonly attemptId: string;
}

export interface ProviderDeltaEvent {
  readonly type: "delta";
  readonly text: string;
}

export interface ProviderUsageEvent {
  readonly type: "usage";
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface ProviderCompletedEvent {
  readonly type: "completed";
  readonly finishReason: string;
  readonly provenance: ProviderProvenance;
}

export interface ProviderFailedEvent {
  readonly type: "failed";
  readonly error: ProviderError;
  readonly provenance: ProviderProvenance;
}

export interface ProviderCancelledEvent {
  readonly type: "cancelled";
  readonly scope:
    | "transport-aborted"
    | "provider-cancel-acknowledged";
  readonly provenance: ProviderProvenance;
}

export type ProviderEvent =
  | ProviderStartedEvent
  | ProviderDeltaEvent
  | ProviderUsageEvent
  | ProviderCompletedEvent
  | ProviderFailedEvent
  | ProviderCancelledEvent;

export interface ProviderAdapterCompletedEvent {
  readonly type: "completed";
  readonly finishReason: string;
}

export interface ProviderAdapterFailedEvent {
  readonly type: "failed";
  readonly error: ProviderError;
}

export interface ProviderAdapterCancelledEvent {
  readonly type: "cancelled";
  readonly scope:
    | "transport-aborted"
    | "provider-cancel-acknowledged";
}

export type ProviderAdapterEvent =
  | ProviderDeltaEvent
  | ProviderUsageEvent
  | ProviderAdapterCompletedEvent
  | ProviderAdapterFailedEvent
  | ProviderAdapterCancelledEvent;

export interface ProviderAdapter {
  readonly binding: ProviderBinding;
  readonly capabilities: readonly ProviderCapability[];
  readonly resolvedModel: string;
  invoke(
    request: ProviderRequest,
    context: {
      readonly attemptId: string;
      readonly credential: string | undefined;
    },
  ): AsyncIterable<ProviderAdapterEvent>;
}

export interface EgressPolicy {
  authorize(input: {
    readonly request: ProviderRequest;
    readonly binding: ProviderBinding;
    readonly attemptId: string;
  }): Promise<EgressGrant>;
}

export interface CredentialSource {
  resolve(ref: CredentialRef, grant: EgressGrant): Promise<string>;
}
