import type {
  ChatConversationState,
  ChatEvent,
  ChatMessage,
  ChatOperation,
  ChatProviderSelection,
  ChatTerminalMetadata,
} from "@latticework/contracts";
import type { ChatController } from "@latticework/chat";
import { LitElement, html, nothing } from "lit";

const conversationId = "p4-synthetic-conversation";

type ProviderId = "mock-local" | "mock-cloud";

interface ProviderOption {
  readonly id: ProviderId;
  readonly label: string;
  readonly selection: ChatProviderSelection;
}

function displayStatus(metadata: ChatTerminalMetadata): string {
  if (metadata.persistence === "not-saved") {
    return "Failed · candidate storage unavailable";
  }
  if (metadata.terminal === "completed") return "Completed · saved locally";
  if (metadata.terminal === "cancelled") return "Cancelled · partial response discarded";
  return "Failed · safe metadata saved";
}

function messageLabel(role: "user" | "assistant"): string {
  return role === "user" ? "You · synthetic prompt" : "Mock assistant";
}

export class P4ChatApp extends LitElement {
  static override properties = {
    conversation: { state: true },
    diagnosticsOpen: { state: true },
    draft: { state: true },
    inFlightAssistantText: { state: true },
    providerId: { state: true },
    statusText: { state: true },
  };

  declare conversation: ChatConversationState;
  declare diagnosticsOpen: boolean;
  declare draft: string;
  declare inFlightAssistantText: string;
  declare providerId: ProviderId;
  declare statusText: string;

  #activeOperation: ChatOperation | undefined;
  #controller: ChatController | undefined;
  #lastTerminal: ChatTerminalMetadata | undefined;
  #providers: readonly ProviderOption[] = [];
  #sequence = 0;

  constructor() {
    super();
    this.conversation = { conversationId, messages: [] };
    this.diagnosticsOpen = false;
    this.draft = "";
    this.inFlightAssistantText = "";
    this.providerId = "mock-local";
    this.statusText = "Synthetic workbench ready";
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  async connect(
    controller: ChatController,
    providers: readonly ProviderOption[],
  ): Promise<void> {
    this.#controller = controller;
    this.#providers = Object.freeze([...providers]);
    const first = providers[0];
    if (first !== undefined) this.providerId = first.id;
    try {
      this.conversation = await controller.hydrate(conversationId);
      this.statusText = this.conversation.messages.length > 0
        ? "Restored completed synthetic conversation"
        : "Synthetic workbench ready";
    } catch {
      this.statusText = "Candidate storage unavailable";
    }
    this.requestUpdate();
  }

  handleChatEvent(event: ChatEvent): void {
    if (event.type === "delta") {
      this.inFlightAssistantText += event.text;
      this.statusText = "Receiving synthetic response";
      return;
    }
    this.inFlightAssistantText = "";
    this.#lastTerminal = event.metadata;
    this.statusText = displayStatus(event.metadata);
    void this.#refreshConversation();
  }

  override render() {
    const visibleMessages = this.conversation.messages.filter(
      (
        message,
      ): message is Extract<ChatMessage, { readonly role: "user" | "assistant" }> =>
        message.role === "user" || message.role === "assistant",
    );
    const active = this.#activeOperation !== undefined;

    return html`
      <main class="p4-shell" data-testid="p4-shell">
        <header class="masthead">
          <div>
            <p class="brand-kicker">LATTICEWORK / Phase 4</p>
            <h1>Conversation workbench</h1>
          </div>
          <div class="synthetic-badge" data-testid="synthetic-badge">
            Synthetic only · no real providers
          </div>
        </header>

        <section class="workbench" aria-label="Synthetic conversation workbench">
          <aside class="rail" aria-label="Conversation controls">
            <label class="field-label">
              Mock provider
              <select
                data-testid="provider-select"
                .value=${this.providerId}
                ?disabled=${active}
                @change=${this.#changeProvider}
              >
                ${this.#providers.map(
                  (provider) => html`
                    <option value=${provider.id}>${provider.label}</option>
                  `,
                )}
              </select>
            </label>

            <div>
              <p class="section-kicker">Local conversation</p>
              <ol class="conversation-list" data-testid="conversation-list">
                <li>
                  Synthetic workbench
                  <span class="visually-hidden">
                    ${visibleMessages.length} visible messages
                  </span>
                </li>
              </ol>
            </div>

            <p class="rail-note">
              This isolated candidate uses scripted in-process mocks and the
              candidate-only IndexedDB namespace. It cannot reach a real model.
            </p>
          </aside>

          <section class="conversation" aria-labelledby="conversation-heading">
            <header class="conversation-header">
              <h2 id="conversation-heading">Synthetic conversation</h2>
              <p
                class="status"
                data-testid="status"
                role="status"
                aria-live="polite"
              >
                ${this.statusText}
              </p>
            </header>

            <ol
              class=${visibleMessages.length === 0 &&
              this.inFlightAssistantText.length === 0
                ? "message-list is-empty"
                : "message-list"}
              data-testid="message-list"
              aria-live="polite"
            >
              ${visibleMessages.length === 0
                ? nothing
                : visibleMessages.map(
                    (message) => html`
                      <li class="message" data-role=${message.role}>
                        <span class="message-label">${messageLabel(message.role)}</span>
                        ${message.content}
                      </li>
                    `,
                  )}
              ${this.inFlightAssistantText.length === 0
                ? nothing
                : html`
                    <li class="message" data-role="assistant" data-transient="true">
                      <span class="message-label">Mock assistant · streaming</span>
                      ${this.inFlightAssistantText}
                    </li>
                  `}
            </ol>

            <form class="composer" @submit=${this.#submit}>
              <label class="visually-hidden" for="p4-chat-input">
                Synthetic message
              </label>
              <textarea
                id="p4-chat-input"
                data-testid="chat-input"
                rows="2"
                maxlength="4000"
                placeholder="Type a synthetic prompt…"
                .value=${this.draft}
                ?disabled=${active}
                @input=${this.#updateDraft}
                @keydown=${this.#handleComposerKey}
              ></textarea>
              <button
                class="primary-action"
                data-testid="send-button"
                type="submit"
                ?disabled=${active || this.draft.trim().length === 0}
              >
                Send
              </button>
              <button
                class="secondary-action"
                data-testid="cancel-button"
                type="button"
                @click=${this.#cancel}
              >
                Cancel
              </button>
            </form>

            <div class="diagnostics-wrap">
              <button
                class="diagnostics-toggle"
                data-testid="diagnostics-toggle"
                type="button"
                aria-expanded=${String(this.diagnosticsOpen)}
                @click=${this.#toggleDiagnostics}
              >
                ${this.diagnosticsOpen ? "Hide" : "Show"} safe diagnostics
              </button>
            </div>

            ${this.diagnosticsOpen
              ? html`
                  <pre
                    class="diagnostics-panel"
                    data-testid="diagnostics-panel"
                  >${this.#diagnosticsText()}</pre>
                `
              : nothing}
          </section>
        </section>
      </main>
    `;
  }

  #changeProvider = (event: Event): void => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "mock-local" || value === "mock-cloud") {
      this.providerId = value;
    }
  };

  #updateDraft = (event: Event): void => {
    this.draft = (event.currentTarget as HTMLTextAreaElement).value;
  };

  #handleComposerKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (this.draft.trim().length > 0) {
        (event.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
      }
    }
  };

  #submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const controller = this.#controller;
    const content = this.draft.trim();
    const provider = this.#providers.find((option) => option.id === this.providerId);
    if (controller === undefined || provider === undefined || content.length === 0) {
      this.statusText = "Synthetic workbench is not ready";
      return;
    }

    this.#sequence += 1;
    const stamp = `${Date.now()}-${this.#sequence}`;
    this.statusText = "Sending synthetic request";
    this.inFlightAssistantText = "";
    this.draft = "";
    const operation = controller.send({
      conversationId,
      operationId: `p4-operation-${stamp}`,
      userMessageId: `p4-user-${stamp}`,
      content,
      provider: provider.selection,
    });
    this.#activeOperation = operation;
    void this.#refreshConversation();
    void operation.finished.finally(() => {
      if (this.#activeOperation === operation) this.#activeOperation = undefined;
      void this.#refreshConversation();
    });
  };

  #cancel = (): void => {
    if (this.#activeOperation === undefined) {
      this.draft = "";
      this.statusText = "Cancelled draft before dispatch";
      return;
    }
    this.statusText = "Cancelling synthetic request";
    this.#activeOperation.cancel();
  };

  #toggleDiagnostics = (): void => {
    this.diagnosticsOpen = !this.diagnosticsOpen;
  };

  async #refreshConversation(): Promise<void> {
    if (this.#controller === undefined) return;
    try {
      this.conversation = await this.#controller.hydrate(conversationId);
    } catch {
      this.statusText = "Candidate storage unavailable";
    }
  }

  #diagnosticsText(): string {
    const terminal = this.#lastTerminal;
    if (terminal === undefined) {
      return [
        "operation: none",
        "attempt: none",
        "adapter: none",
        "trust: mock-only",
        "terminal: none",
      ].join("\n");
    }
    return [
      `operation: ${terminal.operationId}`,
      `attempt: ${terminal.provenance.attemptId}`,
      `adapter: ${terminal.provenance.adapterId}@${terminal.provenance.adapterVersion}`,
      `trust: ${terminal.provenance.trustClass}`,
      `terminal: ${terminal.terminal}`,
      `source: ${terminal.provenance.resultSource}`,
    ].join("\n");
  }
}

customElements.define("lw-p4-chat", P4ChatApp);

declare global {
  interface HTMLElementTagNameMap {
    "lw-p4-chat": P4ChatApp;
  }
}
