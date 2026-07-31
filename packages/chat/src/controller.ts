import type {
  ChatConversationRepository,
  ChatConversationState,
  ChatEvent,
  ChatOperation,
  ChatProviderRouter,
  ChatSafeError,
  ChatSendInput,
  ChatTerminalMetadata,
  ChatTerminalProvenance,
  ProviderErrorCode,
  ProviderEvent,
  ProviderProvenance,
} from "@latticework/contracts";

type TerminalEvent = Extract<
  ProviderEvent,
  { readonly type: "completed" | "failed" | "cancelled" }
>;

const SAFE_ERROR_MESSAGES: Readonly<Record<ProviderErrorCode, string>> = {
  unconfigured: "The requested provider is not configured.",
  "capability-mismatch": "The selected provider does not support text.",
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

export interface ChatControllerOptions {
  readonly repository: ChatConversationRepository;
  readonly router: ChatProviderRouter;
  readonly now?: () => string;
  readonly onEvent?: (event: ChatEvent) => void;
}

interface ActiveOperation {
  readonly input: ChatSendInput;
  readonly controller: AbortController;
  userPersisted: Promise<void>;
  readonly resolveFinished: (value: ChatTerminalMetadata) => void;
  state: ChatConversationState;
  draft: string;
  attemptId: string;
  iterator: AsyncIterator<ProviderEvent> | undefined;
  terminal: Promise<ChatTerminalMetadata> | undefined;
}

function safeError(code: ProviderErrorCode): ChatSafeError {
  return { code, message: SAFE_ERROR_MESSAGES[code] };
}

/**
 * Candidate-only Chat controller. It owns operation cancellation and state
 * ordering, while provider routing and persistence stay injected at the edge.
 */
export class ChatController {
  readonly #repository: ChatConversationRepository;
  readonly #router: ChatProviderRouter;
  readonly #now: () => string;
  readonly #onEvent: ((event: ChatEvent) => void) | undefined;
  readonly #conversations = new Map<string, ChatConversationState>();
  readonly #mutationTails = new Map<string, Promise<void>>();

  constructor(options: ChatControllerOptions) {
    this.#repository = options.repository;
    this.#router = options.router;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#onEvent = options.onEvent;
  }

  async hydrate(conversationId: string): Promise<ChatConversationState> {
    return this.#queueConversation(conversationId, async () => {
      const cached = this.#conversations.get(conversationId);
      if (cached !== undefined) return cached;
      const state = (await this.#repository.read(conversationId)) ?? {
        conversationId,
        messages: [],
      };
      this.#conversations.set(conversationId, state);
      return state;
    });
  }

  send(input: ChatSendInput): ChatOperation {
    const controller = new AbortController();
    let resolveFinished: (value: ChatTerminalMetadata) => void = () => undefined;
    const finished = new Promise<ChatTerminalMetadata>((resolve) => {
      resolveFinished = resolve;
    });
    const active: ActiveOperation = {
      input,
      controller,
      state: { conversationId: input.conversationId, messages: [] },
      draft: "",
      attemptId: `${input.operationId}:attempt:1`,
      iterator: undefined,
      terminal: undefined,
      resolveFinished,
      userPersisted: Promise.resolve(),
    };
    active.userPersisted = this.#persistUser(active);

    void this.#run(active);
    return Object.freeze({
      operationId: input.operationId,
      cancel: () => this.#cancel(active),
      finished,
    });
  }

  async #persistUser(active: ActiveOperation): Promise<void> {
    active.state = await this.#mutateConversation(
      active.input.conversationId,
      (prior) => ({
        ...prior,
        messages: [...prior.messages, {
          id: active.input.userMessageId,
          operationId: active.input.operationId,
          role: "user",
          content: active.input.content,
          createdAt: this.#now(),
        }],
      }),
    );
  }

  async #mutateConversation(
    conversationId: string,
    update: (current: ChatConversationState) => ChatConversationState,
  ): Promise<ChatConversationState> {
    return this.#queueConversation(conversationId, async () => {
      const current = this.#conversations.get(conversationId)
        ?? await this.#repository.read(conversationId)
        ?? { conversationId, messages: [] };
      const next = update(current);
      await this.#repository.write(next);
      this.#conversations.set(conversationId, next);
      return next;
    });
  }

  #queueConversation<T>(
    conversationId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const priorMutation = this.#mutationTails.get(conversationId) ?? Promise.resolve();
    const queued = priorMutation.then(operation);
    const settled = queued.then(
      () => undefined,
      () => undefined,
    );
    this.#mutationTails.set(conversationId, settled);
    void settled.then(() => {
      if (this.#mutationTails.get(conversationId) === settled) {
        this.#mutationTails.delete(conversationId);
      }
    });
    return queued;
  }

  async #run(active: ActiveOperation): Promise<void> {
    try {
      await active.userPersisted;
      if (active.controller.signal.aborted || active.terminal !== undefined) return;

      const request = {
        operationId: active.input.operationId,
        providerId: active.input.provider.binding.providerId,
        requestedModel: active.input.provider.requestedModel,
        messages: [{
          role: "user" as const,
          parts: [{ type: "text" as const, text: active.input.content }],
        }],
        requiredCapabilities: ["text" as const],
        signal: active.controller.signal,
        // maxAttempts 1 is one initial invocation and therefore zero retries.
        retry: { maxAttempts: 1 },
      };
      active.iterator = this.#router.run(request)[Symbol.asyncIterator]();

      while (active.terminal === undefined) {
        const result = await active.iterator.next();
        if (active.terminal !== undefined || active.controller.signal.aborted) return;
        if (result.done) {
          await this.#finalize(active, "failed", undefined, safeError("internal"));
          return;
        }
        await this.#acceptProviderEvent(active, result.value);
      }
    } catch {
      if (active.terminal === undefined) {
        await this.#finalize(active, "failed", undefined, safeError("internal"));
      }
    } finally {
      if (active.terminal !== undefined) this.#closeIterator(active);
    }
  }

  async #acceptProviderEvent(active: ActiveOperation, event: ProviderEvent): Promise<void> {
    if (event.type === "started") {
      active.attemptId = event.attemptId;
      return;
    }
    if (event.type === "delta") {
      active.draft += event.text;
      this.#onEvent?.({ type: "delta", operationId: active.input.operationId, text: event.text });
      return;
    }
    if (event.type === "usage") return;
    if (event.type === "completed") {
      await this.#finalize(active, "completed", event);
      return;
    }
    if (event.type === "failed") {
      await this.#finalize(active, "failed", event, safeError(event.error.code));
      return;
    }
    await this.#finalize(active, "cancelled", event);
  }

  #cancel(active: ActiveOperation): void {
    if (active.terminal !== undefined) return;
    active.controller.abort();
    this.#closeIterator(active);
    void this.#finalize(active, "cancelled", undefined);
  }

  #closeIterator(active: ActiveOperation): void {
    try {
      const closing = active.iterator?.return?.();
      if (closing) void Promise.resolve(closing).catch(() => undefined);
    } catch {
      // A best-effort iterator close cannot change the already selected terminal.
    }
  }

  #finalize(
    active: ActiveOperation,
    terminal: "completed" | "failed" | "cancelled",
    providerEvent: TerminalEvent | undefined,
    error?: ChatSafeError,
  ): Promise<ChatTerminalMetadata> {
    if (active.terminal !== undefined) return active.terminal;
    const completedAt = this.#now();
    const provenance = this.#provenance(active, terminal, providerEvent?.provenance, completedAt);
    const metadata: ChatTerminalMetadata = error === undefined
      ? {
        operationId: active.input.operationId,
        terminal,
        persistence: "saved",
        provenance,
      }
      : {
        operationId: active.input.operationId,
        terminal,
        persistence: "saved",
        error,
        provenance,
      };
    active.terminal = (async () => {
      try {
        await active.userPersisted;
        const terminalMessage = terminal === "completed"
          ? {
            id: `${active.input.operationId}:assistant`,
            operationId: active.input.operationId,
            role: "assistant" as const,
            content: active.draft,
            createdAt: completedAt,
            completedAt,
            finishReason: providerEvent?.type === "completed" ? providerEvent.finishReason : "stop",
          }
          : {
            id: `${active.input.operationId}:terminal`,
            operationId: active.input.operationId,
            role: "terminal" as const,
            createdAt: completedAt,
            metadata,
          };
        active.state = await this.#mutateConversation(
          active.input.conversationId,
          (current) => ({
            ...current,
            messages: [...current.messages, terminalMessage],
          }),
        );
        this.#onEvent?.({ type: "terminal", operationId: active.input.operationId, metadata });
        active.resolveFinished(metadata);
        return metadata;
      } catch {
        const failedAt = this.#now();
        const persistenceFailure: ChatTerminalMetadata = {
          operationId: active.input.operationId,
          terminal: "failed",
          persistence: "not-saved",
          error: safeError("internal"),
          provenance: this.#provenance(active, "failed", undefined, failedAt),
        };
        this.#onEvent?.({
          type: "terminal",
          operationId: active.input.operationId,
          metadata: persistenceFailure,
        });
        active.resolveFinished(persistenceFailure);
        return persistenceFailure;
      }
    })();
    return active.terminal;
  }

  #provenance(
    active: ActiveOperation,
    terminal: ChatTerminalMetadata["terminal"],
    provider: ProviderProvenance | undefined,
    endedAt: string,
  ): ChatTerminalProvenance {
    const dispatched = provider?.kind === "attempt" ? provider : undefined;
    const cancellationScope = terminal === "cancelled"
      ? provider?.kind === "attempt" && provider.terminalReason === "cancelled"
        ? provider.cancellationScope
        : "transport-aborted"
      : undefined;
    const base: ChatTerminalProvenance = {
      operationId: active.input.operationId,
      attemptId: provider?.attemptId ?? active.attemptId,
      adapterId: dispatched?.adapterId ?? active.input.provider.binding.adapterId,
      adapterVersion: dispatched?.adapterVersion ?? active.input.provider.binding.adapterVersion,
      requestedModel: active.input.provider.requestedModel,
      resolvedModel: dispatched?.resolvedModel ?? active.input.provider.resolvedModel,
      trustClass: dispatched?.trustClass ?? active.input.provider.binding.trustClass,
      resultSource: provider?.resultSource ?? "mock",
      startedAt: dispatched?.startedAt ?? endedAt,
      endedAt: dispatched?.endedAt ?? endedAt,
      terminalReason: terminal,
    };
    return cancellationScope === undefined ? base : { ...base, cancellationScope };
  }
}
