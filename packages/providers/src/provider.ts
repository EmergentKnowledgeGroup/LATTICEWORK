import type {
  CredentialRef,
  CredentialSource,
  EgressGrant,
  EgressPolicy,
  ProviderAdapter,
  ProviderAttemptProvenance,
  ProviderBinding,
  ProviderCapability,
  ProviderError,
  ProviderErrorCode,
  ProviderEvent,
  ProviderRequest,
  ProviderRetryAuthorization,
} from "@latticework/contracts";

type TerminalReason = "completed" | "failed" | "cancelled";
type MockTerminalScope = "transport-aborted" | "provider-cancel-acknowledged";
type ProviderTerminal = Extract<
  ProviderEvent,
  { readonly type: "completed" | "failed" | "cancelled" }
>;
type ProviderProvenance = ProviderTerminal["provenance"];
type ProviderAdapterEvent =
  ReturnType<ProviderAdapter["invoke"]> extends AsyncIterable<infer Event>
    ? Event
    : never;

export type MockProviderScriptEvent =
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "usage"; readonly inputTokens: number; readonly outputTokens: number }
  | { readonly type: "completed"; readonly finishReason: string }
  | { readonly type: "failed"; readonly error: ProviderError }
  | { readonly type: "cancelled"; readonly scope?: MockTerminalScope };

export interface DeterministicMockAdapterOptions extends ProviderBinding {
  readonly capabilities: readonly ProviderCapability[];
  readonly resolvedModel?: string;
  readonly script?: readonly MockProviderScriptEvent[];
  readonly scripts?: readonly (readonly MockProviderScriptEvent[])[];
  readonly stall?: boolean;
  /** Retained as a negative-test input; a static declaration is never an acknowledgement. */
  readonly cancellationAcknowledged?: boolean;
  readonly onInvoke?: () => void;
  readonly onClose?: () => void;
}

export interface MockEgressPolicyOptions {
  readonly grantBinding?: Partial<ProviderBinding>;
  readonly grantCapabilities?: readonly ProviderCapability[];
  readonly deny?: boolean;
  readonly onAuthorize?: (grant: EgressGrant) => void;
}

export interface MockCredentialSourceOptions {
  readonly credential?: string;
  readonly onResolve?: (grant: EgressGrant) => void;
}

export interface CallbackResult {
  readonly operationId: string;
  readonly text: string;
  readonly terminal: ProviderTerminal;
}

export type ProviderCallback = (error: ProviderError | null, result: CallbackResult) => void;

type IteratorOutcome =
  | { readonly kind: "next"; readonly result: IteratorResult<ProviderAdapterEvent> }
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "aborted" }
  | { readonly kind: "timeout" };

type PreDispatchOutcome<T> =
  | { readonly kind: "value"; readonly value: T }
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "aborted" }
  | { readonly kind: "timeout" };

const ERROR_CODES = new Set<ProviderErrorCode>([
  "unconfigured",
  "capability-mismatch",
  "authentication",
  "authorization",
  "policy-refusal",
  "rate-limit",
  "context-limit",
  "model-not-found",
  "timeout",
  "cancelled",
  "network",
  "cors",
  "malformed-response",
  "provider",
  "internal",
]);

const SAFE_ERROR_MESSAGES: Readonly<Record<ProviderErrorCode, string>> = {
  unconfigured: "The requested provider is not configured.",
  "capability-mismatch": "The selected provider does not support the required capability.",
  authentication: "Provider authentication failed.",
  authorization: "Provider authorization failed.",
  "policy-refusal": "The provider policy refused this operation.",
  "rate-limit": "The provider rate limit was reached.",
  "context-limit": "The request exceeded a provider context limit.",
  "model-not-found": "The requested model was not found.",
  timeout: "The provider operation timed out.",
  cancelled: "The provider operation was cancelled.",
  network: "The provider transport failed.",
  cors: "The provider transport was blocked by origin policy.",
  "malformed-response": "The provider returned a malformed response.",
  provider: "The provider reported a failure.",
  internal: "The provider operation failed internally.",
};

function safeError(code: ProviderErrorCode, retryable = false): ProviderError {
  return { code, message: SAFE_ERROR_MESSAGES[code], retryable };
}

function normalizedError(value: unknown): ProviderError {
  if (typeof value === "object" && value !== null && "code" in value) {
    const candidate = value as { readonly code?: unknown; readonly retryable?: unknown };
    if (typeof candidate.code === "string" && ERROR_CODES.has(candidate.code as ProviderErrorCode)) {
      return safeError(candidate.code as ProviderErrorCode, candidate.retryable === true);
    }
  }
  return safeError("internal");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isProviderAdapterEvent(value: unknown): value is ProviderAdapterEvent {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "delta") return typeof value.text === "string";
  if (value.type === "usage") {
    return isNonNegativeSafeInteger(value.inputTokens)
      && isNonNegativeSafeInteger(value.outputTokens);
  }
  if (value.type === "completed") return typeof value.finishReason === "string";
  if (value.type === "cancelled") {
    return value.scope === "transport-aborted"
      || value.scope === "provider-cancel-acknowledged";
  }
  if (value.type === "failed") {
    return isRecord(value.error)
      && typeof value.error.code === "string"
      && ERROR_CODES.has(value.error.code as ProviderErrorCode)
      && typeof value.error.retryable === "boolean";
  }
  return false;
}

function sameBinding(left: ProviderBinding, right: ProviderBinding): boolean {
  return left.providerId === right.providerId
    && left.adapterId === right.adapterId
    && left.adapterVersion === right.adapterVersion
    && left.exactOrigin === right.exactOrigin
    && left.trustClass === right.trustClass
    && left.authenticationScheme === right.authenticationScheme;
}

function sameCapabilities(
  left: readonly ProviderCapability[],
  right: readonly ProviderCapability[],
): boolean {
  return left.length === right.length
    && left.every((capability, index) => capability === right[index]);
}

function asBinding(ref: CredentialRef): ProviderBinding {
  const { id: _id, ...binding } = ref;
  return binding;
}

function immutableCapabilities(
  capabilities: readonly ProviderCapability[],
): readonly ProviderCapability[] {
  return Object.freeze([...capabilities]);
}

function emptyFallbackChain(): readonly ProviderBinding[] {
  return Object.freeze([]);
}

function retryAuthorization(request: ProviderRequest): ProviderRetryAuthorization {
  if (request.retry?.providerIdempotencyProven === true) {
    return "provider-idempotency-proven";
  }
  if (request.retry?.callerAuthorizedAfterFailure === true) {
    return "caller-authorized-after-failure";
  }
  return "none";
}

function immutableGrant(grant: EgressGrant): EgressGrant {
  return Object.freeze({
    ...grant,
    requiredCapabilities: immutableCapabilities(grant.requiredCapabilities),
  });
}

function parseAbsoluteDeadline(
  deadline: string | undefined,
): { readonly valid: true; readonly value: number | undefined }
  | { readonly valid: false } {
  if (deadline === undefined) return { valid: true, value: undefined };
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(deadline)) return { valid: false };
  const value = Date.parse(deadline);
  return Number.isFinite(value) ? { valid: true, value } : { valid: false };
}

function closeIterator(iterator: AsyncIterator<ProviderAdapterEvent>): void {
  try {
    const closeResult = iterator.return?.();
    if (closeResult) void Promise.resolve(closeResult).catch(() => undefined);
  } catch {
    // Closing is best effort and cannot replace the operation's normalized terminal.
  }
}

function preDispatchWithControls<T>(
  start: () => PromiseLike<T> | T,
  signal: AbortSignal | undefined,
  deadline: number | undefined,
): Promise<PreDispatchOutcome<T>> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (timeout !== undefined) clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = (outcome: PreDispatchOutcome<T>): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };
    const onAbort = (): void => finish({ kind: "aborted" });

    if (signal?.aborted) {
      finish({ kind: "aborted" });
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    if (deadline !== undefined) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        finish({ kind: "timeout" });
        return;
      }
      timeout = setTimeout(() => finish({ kind: "timeout" }), remaining);
    }

    try {
      Promise.resolve(start()).then(
        (value) => finish({ kind: "value", value }),
        (error: unknown) => finish({ kind: "error", error }),
      );
    } catch (error) {
      finish({ kind: "error", error });
    }
  });
}

function nextWithControls(
  iterator: AsyncIterator<ProviderAdapterEvent>,
  signal: AbortSignal | undefined,
  deadline: number | undefined,
): Promise<IteratorOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (timeout !== undefined) clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = (outcome: IteratorOutcome): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };
    const onAbort = (): void => finish({ kind: "aborted" });

    if (signal?.aborted) {
      finish({ kind: "aborted" });
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    if (deadline !== undefined) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        finish({ kind: "timeout" });
        return;
      }
      timeout = setTimeout(() => finish({ kind: "timeout" }), remaining);
    }

    Promise.resolve()
      .then(() => iterator.next())
      .then(
        (result) => finish({ kind: "next", result }),
        (error: unknown) => finish({ kind: "error", error }),
      );
  });
}

/** A scripted adapter. It has no transport capability outside this process. */
export class DeterministicMockAdapter implements ProviderAdapter {
  readonly binding: ProviderBinding;
  readonly capabilities: readonly ProviderCapability[];
  readonly resolvedModel: string;
  readonly #script: readonly MockProviderScriptEvent[];
  readonly #scripts: readonly (readonly MockProviderScriptEvent[])[];
  readonly #stall: boolean;
  readonly #onInvoke: (() => void) | undefined;
  readonly #onClose: (() => void) | undefined;
  invocationCount = 0;

  constructor(options: DeterministicMockAdapterOptions) {
    this.binding = Object.freeze({
      providerId: options.providerId,
      adapterId: options.adapterId,
      adapterVersion: options.adapterVersion,
      exactOrigin: options.exactOrigin,
      trustClass: options.trustClass,
      authenticationScheme: options.authenticationScheme,
    });
    this.capabilities = immutableCapabilities(options.capabilities);
    this.resolvedModel = options.resolvedModel ?? "deterministic-mock-model";
    this.#script = Object.freeze([...(options.script ?? [])]);
    this.#scripts = Object.freeze(
      (options.scripts ?? []).map((script) => Object.freeze([...script])),
    );
    this.#stall = options.stall === true;
    this.#onInvoke = options.onInvoke;
    this.#onClose = options.onClose;
  }

  invoke(
    _request: ProviderRequest,
    _context: { readonly attemptId: string; readonly credential: string | undefined },
  ): AsyncIterable<ProviderAdapterEvent> {
    this.invocationCount += 1;
    this.#onInvoke?.();
    const script = this.#scripts[this.invocationCount - 1] ?? this.#script;
    const stall = this.#stall;
    const onClose = this.#onClose;

    return {
      [Symbol.asyncIterator](): AsyncIterator<ProviderAdapterEvent> {
        let index = 0;
        let closed = false;
        return {
          next(): Promise<IteratorResult<ProviderAdapterEvent>> {
            if (closed) return Promise.resolve({ done: true, value: undefined });
            if (stall) return new Promise(() => undefined);
            const event = script[index];
            index += 1;
            if (!event) return Promise.resolve({ done: true, value: undefined });
            if (event.type === "cancelled") {
              return Promise.resolve({
                done: false,
                value: {
                  type: "cancelled",
                  scope: event.scope ?? "transport-aborted",
                },
              });
            }
            return Promise.resolve({
              done: false,
              value: event as ProviderAdapterEvent,
            });
          },
          return(): Promise<IteratorResult<ProviderAdapterEvent>> {
            if (!closed) {
              closed = true;
              onClose?.();
            }
            return Promise.resolve({ done: true, value: undefined });
          },
        };
      },
    };
  }
}

/** Deterministic policy helper that grants only the supplied synthetic binding. */
export class MockEgressPolicy implements EgressPolicy {
  readonly #grantBinding: Partial<ProviderBinding>;
  readonly #grantCapabilities: readonly ProviderCapability[] | undefined;
  readonly #deny: boolean;
  readonly #onAuthorize: ((grant: EgressGrant) => void) | undefined;

  constructor(options: MockEgressPolicyOptions = {}) {
    this.#grantBinding = options.grantBinding ?? {};
    this.#grantCapabilities = options.grantCapabilities;
    this.#deny = options.deny === true;
    this.#onAuthorize = options.onAuthorize;
  }

  async authorize(input: {
    readonly request: ProviderRequest;
    readonly binding: ProviderBinding;
    readonly attemptId: string;
  }): Promise<EgressGrant> {
    if (this.#deny) throw safeError("policy-refusal");
    const binding = { ...input.binding, ...this.#grantBinding };
    const grant = immutableGrant({
      ...binding,
      grantId: `${input.attemptId}:grant`,
      operationId: input.request.operationId,
      attemptId: input.attemptId,
      payloadClass: "synthetic",
      redirectTarget: null,
      requiredCapabilities:
        this.#grantCapabilities ?? input.request.requiredCapabilities,
    });
    this.#onAuthorize?.(grant);
    return grant;
  }
}

/** Synthetic-only credential helper. Its returned value is never exposed in events or provenance. */
export class MockCredentialSource implements CredentialSource {
  readonly #credential: string;
  readonly #onResolve: ((grant: EgressGrant) => void) | undefined;

  constructor(options: MockCredentialSourceOptions = {}) {
    this.#credential = options.credential ?? "synthetic-credential";
    this.#onResolve = options.onResolve;
  }

  async resolve(ref: CredentialRef, grant: EgressGrant): Promise<string> {
    if (
      !Object.isFrozen(grant)
      || !Object.isFrozen(grant.requiredCapabilities)
      || !sameBinding(asBinding(ref), grant)
    ) {
      throw safeError("policy-refusal");
    }
    this.#onResolve?.(grant);
    return this.#credential;
  }
}

export class ProviderRouter {
  readonly #adapters: readonly ProviderAdapter[];
  readonly #egressPolicy: EgressPolicy;
  readonly #credentialSource: CredentialSource;
  readonly #attemptCounts = new Map<string, number>();
  readonly #provenance = new Map<string, ProviderProvenance[]>();

  constructor(options: {
    readonly adapters: readonly ProviderAdapter[];
    readonly egressPolicy: EgressPolicy;
    readonly credentialSource: CredentialSource;
  }) {
    this.#adapters = Object.freeze([...options.adapters]);
    const providerIds = new Set(
      this.#adapters.map((adapter) => adapter.binding.providerId),
    );
    if (providerIds.size !== this.#adapters.length) {
      throw new Error("Duplicate provider id is not permitted.");
    }
    this.#egressPolicy = options.egressPolicy;
    this.#credentialSource = options.credentialSource;
  }

  provenanceFor(operationId: string): readonly ProviderProvenance[] {
    return Object.freeze([...(this.#provenance.get(operationId) ?? [])]);
  }

  async *run(request: ProviderRequest): AsyncIterable<ProviderEvent> {
    const initialAttemptId = this.#nextAttemptId(request.operationId);
    const operationStartedAt = this.#timestamp();
    yield {
      type: "started",
      operationId: request.operationId,
      attemptId: initialAttemptId,
    };

    const parsedDeadline = parseAbsoluteDeadline(request.deadline);
    if (!parsedDeadline.valid) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("internal"),
      );
      return;
    }
    const deadline = parsedDeadline.value;
    if (request.signal?.aborted) {
      yield this.#preDispatchCancellation(
        request,
        initialAttemptId,
        operationStartedAt,
      );
      return;
    }
    if (deadline !== undefined && deadline <= Date.now()) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("timeout"),
      );
      return;
    }
    if (
      request.retry
      && (
        !Number.isInteger(request.retry.maxAttempts)
        || request.retry.maxAttempts < 1
      )
    ) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("internal"),
      );
      return;
    }

    const adapter = this.#adapters.find(
      (candidate) => candidate.binding.providerId === request.providerId,
    );
    if (!adapter) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("unconfigured"),
      );
      return;
    }
    if (
      !request.requiredCapabilities.every(
        (capability) => adapter.capabilities.includes(capability),
      )
    ) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("capability-mismatch"),
      );
      return;
    }
    if (
      request.credentialRef
      && !sameBinding(asBinding(request.credentialRef), adapter.binding)
    ) {
      yield this.#preDispatchFailure(
        request,
        initialAttemptId,
        operationStartedAt,
        safeError("policy-refusal"),
      );
      return;
    }

    const maxAttempts = request.retry?.maxAttempts ?? 1;
    let retryIndex = 0;
    let attemptId = initialAttemptId;

    attemptLoop:
    while (retryIndex < maxAttempts) {
      const attemptStartedAt = retryIndex === 0
        ? operationStartedAt
        : this.#timestamp();
      if (retryIndex > 0) attemptId = this.#nextAttemptId(request.operationId);

      if (request.signal?.aborted) {
        yield this.#preDispatchCancellation(
          request,
          attemptId,
          attemptStartedAt,
          retryIndex,
        );
        return;
      }
      if (deadline !== undefined && deadline <= Date.now()) {
        yield this.#preDispatchFailure(
          request,
          attemptId,
          attemptStartedAt,
          safeError("timeout"),
          retryIndex,
        );
        return;
      }

      let grant: EgressGrant;
      let credential: string | undefined;
      const authorization = await preDispatchWithControls(
        () => this.#egressPolicy.authorize({
          request,
          binding: adapter.binding,
          attemptId,
        }),
        request.signal,
        deadline,
      );
      if (authorization.kind === "aborted") {
        yield this.#preDispatchCancellation(
          request,
          attemptId,
          attemptStartedAt,
          retryIndex,
        );
        return;
      }
      if (authorization.kind === "timeout") {
        yield this.#preDispatchFailure(
          request,
          attemptId,
          attemptStartedAt,
          safeError("timeout"),
          retryIndex,
        );
        return;
      }
      if (authorization.kind === "error") {
        yield this.#preDispatchFailure(
          request,
          attemptId,
          attemptStartedAt,
          normalizedError(authorization.error),
          retryIndex,
        );
        return;
      }
      grant = authorization.value;
      if (
        !Object.isFrozen(grant)
        || !Object.isFrozen(grant.requiredCapabilities)
        || !sameBinding(grant, adapter.binding)
        || grant.operationId !== request.operationId
        || grant.attemptId !== attemptId
        || !sameCapabilities(
          grant.requiredCapabilities,
          request.requiredCapabilities,
        )
      ) {
        yield this.#preDispatchFailure(
          request,
          attemptId,
          attemptStartedAt,
          safeError("policy-refusal"),
          retryIndex,
        );
        return;
      }

      if (request.credentialRef) {
        const resolution = await preDispatchWithControls(
          () => this.#credentialSource.resolve(request.credentialRef!, grant),
          request.signal,
          deadline,
        );
        if (resolution.kind === "aborted") {
          yield this.#preDispatchCancellation(
            request,
            attemptId,
            attemptStartedAt,
            retryIndex,
          );
          return;
        }
        if (resolution.kind === "timeout") {
          yield this.#preDispatchFailure(
            request,
            attemptId,
            attemptStartedAt,
            safeError("timeout"),
            retryIndex,
          );
          return;
        }
        if (resolution.kind === "error") {
          yield this.#preDispatchFailure(
            request,
            attemptId,
            attemptStartedAt,
            normalizedError(resolution.error),
            retryIndex,
          );
          return;
        }
        credential = resolution.value;
      }

      if (request.signal?.aborted) {
        yield this.#preDispatchCancellation(
          request,
          attemptId,
          attemptStartedAt,
          retryIndex,
        );
        return;
      }
      if (deadline !== undefined && deadline <= Date.now()) {
        yield this.#preDispatchFailure(
          request,
          attemptId,
          attemptStartedAt,
          safeError("timeout"),
          retryIndex,
        );
        return;
      }

      let iterator: AsyncIterator<ProviderAdapterEvent>;
      try {
        const iterable = adapter.invoke(request, { attemptId, credential });
        iterator = iterable[Symbol.asyncIterator]();
      } catch (error) {
        const normalized = normalizedError(error);
        const provenance = this.#recordAttempt(
          request,
          adapter,
          attemptId,
          attemptStartedAt,
          retryIndex,
          "failed",
        );
        if (this.#mayRetry(request, normalized, retryIndex, maxAttempts)) {
          retryIndex += 1;
          continue;
        }
        yield { type: "failed", error: normalized, provenance };
        return;
      }

      let emittedDelta = false;
      while (true) {
        const outcome = await nextWithControls(
          iterator,
          request.signal,
          deadline,
        );
        if (outcome.kind === "aborted") {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "cancelled",
            "transport-aborted",
          );
          yield {
            type: "cancelled",
            scope: "transport-aborted",
            provenance,
          };
          return;
        }
        if (outcome.kind === "timeout") {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          yield {
            type: "failed",
            error: safeError("timeout"),
            provenance,
          };
          return;
        }
        if (outcome.kind === "error") {
          closeIterator(iterator);
          const normalized = normalizedError(outcome.error);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          if (
            !emittedDelta
            && this.#mayRetry(request, normalized, retryIndex, maxAttempts)
          ) {
            retryIndex += 1;
            continue attemptLoop;
          }
          yield { type: "failed", error: normalized, provenance };
          return;
        }
        const iteratorResult = outcome.result as unknown;
        if (
          !isRecord(iteratorResult)
          || (
            Object.hasOwn(iteratorResult, "done")
            && typeof iteratorResult.done !== "boolean"
          )
        ) {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          yield {
            type: "failed",
            error: safeError("malformed-response"),
            provenance,
          };
          return;
        }
        if (iteratorResult.done === true) {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          yield {
            type: "failed",
            error: safeError("malformed-response"),
            provenance,
          };
          return;
        }

        const event = iteratorResult.value;
        if (!isProviderAdapterEvent(event)) {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          yield {
            type: "failed",
            error: safeError("malformed-response"),
            provenance,
          };
          return;
        }
        if (event.type === "delta") {
          emittedDelta = true;
          yield event;
          continue;
        }
        if (event.type === "usage") {
          yield event;
          continue;
        }
        if (event.type === "completed") {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "completed",
          );
          yield {
            type: "completed",
            finishReason: event.finishReason,
            provenance,
          };
          return;
        }
        if (event.type === "cancelled") {
          closeIterator(iterator);
          const scope: MockTerminalScope =
            event.scope === "provider-cancel-acknowledged"
              ? "provider-cancel-acknowledged"
              : "transport-aborted";
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "cancelled",
            scope,
          );
          yield { type: "cancelled", scope, provenance };
          return;
        }
        if (event.type !== "failed") {
          closeIterator(iterator);
          const provenance = this.#recordAttempt(
            request,
            adapter,
            attemptId,
            attemptStartedAt,
            retryIndex,
            "failed",
          );
          yield {
            type: "failed",
            error: safeError("malformed-response"),
            provenance,
          };
          return;
        }

        closeIterator(iterator);
        const error = normalizedError(event.error);
        const provenance = this.#recordAttempt(
          request,
          adapter,
          attemptId,
          attemptStartedAt,
          retryIndex,
          "failed",
        );
        if (
          !emittedDelta
          && this.#mayRetry(request, error, retryIndex, maxAttempts)
        ) {
          retryIndex += 1;
          continue attemptLoop;
        }
        yield { type: "failed", error, provenance };
        return;
      }
    }
  }

  async runWithCallback(
    request: ProviderRequest,
    callback: ProviderCallback,
  ): Promise<readonly ProviderEvent[]> {
    return runWithCallback(this, request, callback);
  }

  #nextAttemptId(operationId: string): string {
    const next = (this.#attemptCounts.get(operationId) ?? 0) + 1;
    this.#attemptCounts.set(operationId, next);
    return `${operationId}:attempt:${next}`;
  }

  #timestamp(): string {
    return new Date().toISOString();
  }

  #storeProvenance(provenance: ProviderProvenance): ProviderProvenance {
    const stored = Object.freeze(provenance);
    const existing = this.#provenance.get(provenance.operationId) ?? [];
    this.#provenance.set(provenance.operationId, [...existing, stored]);
    return stored;
  }

  #recordPreDispatch(
    request: ProviderRequest,
    attemptId: string,
    startedAt: string,
    terminalReason: "failed" | "cancelled",
    errorCode: ProviderErrorCode,
    retryIndex = 0,
    cancellationScope?: "transport-aborted",
  ): ProviderProvenance {
    return this.#storeProvenance({
      kind: "pre-dispatch",
      dispatchState: "not-dispatched",
      operationId: request.operationId,
      attemptId,
      requestedProviderId: request.providerId,
      requestedModel: request.requestedModel,
      startedAt,
      endedAt: this.#timestamp(),
      capabilitiesUsed: immutableCapabilities(request.requiredCapabilities),
      fallbackChain: emptyFallbackChain(),
      retryIndex,
      retryAuthorization: retryAuthorization(request),
      attemptReason: "pre-dispatch",
      resultSource: "unavailable",
      terminalReason,
      errorCode,
      ...(cancellationScope ? { cancellationScope } : {}),
    });
  }

  #preDispatchFailure(
    request: ProviderRequest,
    attemptId: string,
    startedAt: string,
    error: ProviderError,
    retryIndex = 0,
  ): Extract<ProviderEvent, { readonly type: "failed" }> {
    return {
      type: "failed",
      error,
      provenance: this.#recordPreDispatch(
        request,
        attemptId,
        startedAt,
        "failed",
        error.code,
        retryIndex,
      ),
    };
  }

  #preDispatchCancellation(
    request: ProviderRequest,
    attemptId: string,
    startedAt: string,
    retryIndex = 0,
  ): Extract<ProviderEvent, { readonly type: "cancelled" }> {
    return {
      type: "cancelled",
      scope: "transport-aborted",
      provenance: this.#recordPreDispatch(
        request,
        attemptId,
        startedAt,
        "cancelled",
        "cancelled",
        retryIndex,
        "transport-aborted",
      ),
    };
  }

  #recordAttempt(
    request: ProviderRequest,
    adapter: ProviderAdapter,
    attemptId: string,
    startedAt: string,
    retryIndex: number,
    terminalReason: TerminalReason,
    cancellationScope?: MockTerminalScope,
  ): ProviderAttemptProvenance {
    const provenance: ProviderAttemptProvenance = {
      kind: "attempt",
      dispatchState: "dispatched",
      ...adapter.binding,
      operationId: request.operationId,
      attemptId,
      requestedModel: request.requestedModel,
      resolvedModel: adapter.resolvedModel,
      startedAt,
      endedAt: this.#timestamp(),
      capabilitiesUsed: immutableCapabilities(request.requiredCapabilities),
      fallbackChain: emptyFallbackChain(),
      retryIndex,
      retryAuthorization: retryAuthorization(request),
      attemptReason: retryIndex === 0 ? "initial" : "authorized-retry",
      resultSource: "mock",
      terminalReason,
      ...(cancellationScope ? { cancellationScope } : {}),
    };
    return this.#storeProvenance(provenance) as ProviderAttemptProvenance;
  }

  #mayRetry(
    request: ProviderRequest,
    error: ProviderError,
    retryIndex: number,
    maxAttempts: number,
  ): boolean {
    return error.retryable
      && retryIndex + 1 < maxAttempts
      && (
        request.retry?.providerIdempotencyProven === true
        || request.retry?.callerAuthorizedAfterFailure === true
      );
  }
}

function unavailableCallbackProvenance(
  request: ProviderRequest,
): ProviderProvenance {
  const timestamp = new Date().toISOString();
  return Object.freeze({
    kind: "pre-dispatch",
    dispatchState: "not-dispatched",
    operationId: request.operationId,
    attemptId: `${request.operationId}:callback-fallback`,
    requestedProviderId: request.providerId,
    requestedModel: request.requestedModel,
    startedAt: timestamp,
    endedAt: timestamp,
    capabilitiesUsed: immutableCapabilities(request.requiredCapabilities),
    fallbackChain: emptyFallbackChain(),
    retryIndex: 0,
    retryAuthorization: retryAuthorization(request),
    attemptReason: "pre-dispatch",
    resultSource: "unavailable",
    terminalReason: "failed",
    errorCode: "internal",
  });
}

/** Collects a router operation for callback-style consumers and calls back exactly once. */
export async function runWithCallback(
  router: ProviderRouter,
  request: ProviderRequest,
  callback: ProviderCallback,
): Promise<readonly ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  let text = "";
  let terminal: ProviderTerminal | undefined;
  for await (const event of router.run(request)) {
    events.push(event);
    if (event.type === "delta") text += event.text;
    if (
      event.type === "completed"
      || event.type === "failed"
      || event.type === "cancelled"
    ) {
      terminal = event;
    }
  }
  const finalTerminal: ProviderTerminal = terminal ?? {
    type: "failed",
    error: safeError("internal"),
    provenance: unavailableCallbackProvenance(request),
  };
  const callbackError = finalTerminal.type === "failed"
    ? finalTerminal.error
    : null;
  callback(callbackError, {
    operationId: request.operationId,
    text,
    terminal: finalTerminal,
  });
  return Object.freeze(events);
}
