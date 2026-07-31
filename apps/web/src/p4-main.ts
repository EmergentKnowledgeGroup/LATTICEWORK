import { ChatController } from "@latticework/chat";
import type {
  ChatConversationRepository,
  ChatConversationState,
  ChatEvent,
  ChatMessage,
  ChatProviderRouter,
  ChatProviderSelection,
  ConversationDatasetSnapshot,
  ProviderEvent,
  ProviderRequest,
} from "@latticework/contracts";
import {
  DeterministicMockAdapter,
  MockCredentialSource,
  MockEgressPolicy,
  ProviderRouter,
} from "@latticework/providers";
import { IndexedDbConversationRepository } from "@latticework/storage";

import { P4ChatApp } from "./p4-chat-app.ts";
import "./p4-chat-app.css";

const localBinding = Object.freeze({
  providerId: "mock-local",
  adapterId: "deterministic-local-mock",
  adapterVersion: "1",
  exactOrigin: "mock://local",
  trustClass: "mock" as const,
  authenticationScheme: "synthetic-ref",
});

const cloudBinding = Object.freeze({
  providerId: "mock-cloud",
  adapterId: "deterministic-cloud-mock",
  adapterVersion: "1",
  exactOrigin: "mock://cloud",
  trustClass: "mock" as const,
  authenticationScheme: "synthetic-ref",
});

const localSelection: ChatProviderSelection = Object.freeze({
  binding: localBinding,
  requestedModel: "latticework-local-synthetic",
  resolvedModel: "latticework-local-synthetic-v1",
});

const cloudSelection: ChatProviderSelection = Object.freeze({
  binding: cloudBinding,
  requestedModel: "latticework-cloud-synthetic",
  resolvedModel: "latticework-cloud-synthetic-v1",
});

function textFrom(request: ProviderRequest): string {
  return request.messages
    .flatMap((message) => message.parts)
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function cancellationProvenance(
  request: ProviderRequest,
  startedAt: string,
): Extract<ProviderEvent, { readonly type: "cancelled" }>["provenance"] {
  const binding = request.providerId === "mock-cloud" ? cloudBinding : localBinding;
  return {
    ...binding,
    kind: "attempt",
    dispatchState: "dispatched",
    operationId: request.operationId,
    attemptId: `${request.operationId}:attempt:1`,
    requestedModel: request.requestedModel,
    resolvedModel: request.providerId === "mock-cloud"
      ? cloudSelection.resolvedModel
      : localSelection.resolvedModel,
    startedAt,
    endedAt: new Date().toISOString(),
    capabilitiesUsed: Object.freeze(["text"]),
    fallbackChain: Object.freeze([]),
    retryIndex: 0,
    retryAuthorization: "none",
    attemptReason: "initial",
    resultSource: "mock",
    terminalReason: "cancelled",
    cancellationScope: "transport-aborted",
  };
}

/**
 * A deterministic browser-test branch that pauses after one delta. It is
 * in-process, synthetic, and makes no network request. Every other request uses
 * the accepted Phase 3 ProviderRouter package boundary.
 */
class Phase4SyntheticRouter implements ChatProviderRouter {
  readonly #router: ProviderRouter;

  constructor(router: ProviderRouter) {
    this.#router = router;
  }

  run(request: ProviderRequest): AsyncIterable<ProviderEvent> {
    if (textFrom(request) !== "P4_BROWSER_CANCEL_AFTER_DELTA") {
      return this.#router.run(request);
    }
    return this.#cancelAfterDelta(request);
  }

  async *#cancelAfterDelta(request: ProviderRequest): AsyncIterable<ProviderEvent> {
    const startedAt = new Date().toISOString();
    yield {
      type: "started",
      operationId: request.operationId,
      attemptId: `${request.operationId}:attempt:1`,
    };
    yield { type: "delta", text: "P4_BROWSER_SYNTHETIC_RESPONSE_PARTIAL" };

    const signal = request.signal;
    if (signal !== undefined && !signal.aborted) {
      await new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => resolve(), { once: true });
      });
    }
    yield {
      type: "cancelled",
      scope: "transport-aborted",
      provenance: cancellationProvenance(request, startedAt),
    };
  }
}

class CandidateChatRepository implements ChatConversationRepository {
  readonly #repository: IndexedDbConversationRepository;

  constructor(repository: IndexedDbConversationRepository) {
    this.#repository = repository;
  }

  async read(conversationId: string): Promise<ChatConversationState | undefined> {
    const snapshot = await this.#repository.readSnapshot();
    if (!snapshot.conversations.some((record) => record.projection.id === conversationId)) {
      return undefined;
    }
    const messages = snapshot.messages
      .filter((record) => record.projection.conversationId === conversationId)
      .map((record) => structuredClone(record.sourceValue) as ChatMessage)
      .sort((left, right) => {
        const timeOrder = left.createdAt.localeCompare(right.createdAt);
        if (timeOrder !== 0) return timeOrder;
        const operationOrder = left.operationId.localeCompare(right.operationId);
        if (operationOrder !== 0) return operationOrder;
        const roleOrder = { user: 0, assistant: 1, terminal: 1 } as const;
        return roleOrder[left.role] - roleOrder[right.role];
      });
    return {
      conversationId,
      messages,
    };
  }

  async write(state: ChatConversationState): Promise<void> {
    const existing = await this.#repository.readSnapshot();
    await this.#repository.putSnapshot(mergeConversationSnapshot(existing, state));
  }
}

export function mergeConversationSnapshot(
  existing: ConversationDatasetSnapshot,
  state: ChatConversationState,
): ConversationDatasetSnapshot {
  const conversation = {
    key: state.conversationId,
    projection: { id: state.conversationId },
    sourceValue: { id: state.conversationId },
  };
  const currentMessages = state.messages.map((message) => ({
    key: message.id,
    projection: {
      id: message.id,
      conversationId: state.conversationId,
      role: message.role,
      createdAt: message.createdAt,
    },
    sourceValue: {
      ...structuredClone(message),
      conversationId: state.conversationId,
    },
  }));
  return {
    descriptorId: "conversation",
    schemaVersion: 1,
    conversations: [
      ...existing.conversations.filter(
        (record) => record.key !== state.conversationId,
      ),
      conversation,
    ],
    messages: [
      ...existing.messages.filter(
        (record) => record.projection.conversationId !== state.conversationId,
      ),
      ...currentMessages,
    ],
  };
}

function createRouter(): Phase4SyntheticRouter {
  const script = Object.freeze([
    { type: "delta" as const, text: "Synthetic " },
    { type: "delta" as const, text: "mock response." },
    { type: "usage" as const, inputTokens: 4, outputTokens: 3 },
    { type: "completed" as const, finishReason: "stop" },
  ]);
  const adapters = [
    new DeterministicMockAdapter({
      ...localBinding,
      capabilities: ["text"],
      resolvedModel: localSelection.resolvedModel,
      script,
    }),
    new DeterministicMockAdapter({
      ...cloudBinding,
      capabilities: ["text"],
      resolvedModel: cloudSelection.resolvedModel,
      script,
    }),
  ];
  return new Phase4SyntheticRouter(new ProviderRouter({
    adapters,
    egressPolicy: new MockEgressPolicy(),
    credentialSource: new MockCredentialSource(),
  }));
}

async function boot(): Promise<void> {
  const app = document.querySelector<P4ChatApp>("lw-p4-chat");
  if (app === null) throw new Error("Phase 4 chat host was not found.");

  const repository = new CandidateChatRepository(
    new IndexedDbConversationRepository(),
  );
  const controller = new ChatController({
    repository,
    router: createRouter(),
    onEvent: (event: ChatEvent) => app.handleChatEvent(event),
  });
  await app.connect(controller, [
    { id: "mock-local", label: "Local mock · in process", selection: localSelection },
    { id: "mock-cloud", label: "Cloud-shaped mock · in process", selection: cloudSelection },
  ]);
}

void boot().catch((error: unknown) => {
  const app = document.querySelector<P4ChatApp>("lw-p4-chat");
  if (app !== null) app.statusText = "Candidate workbench failed safely";
  console.error("Phase 4 synthetic workbench failed to boot.", error);
});
