import type {
  KernelSnapshot,
  LifecycleParticipant,
  LifecycleState,
  SafeDiagnostic,
  StatusViewModel
} from "@latticework/contracts";

const SAFE_START_FAILURE_MESSAGE = "A lifecycle start operation failed.";
const SAFE_STOP_FAILURE_MESSAGE = "A lifecycle stop operation failed.";
type KernelFailureCode = SafeDiagnostic["code"];

/**
 * A deliberately generic error: thrown participant values are never retained
 * or surfaced in diagnostics because they may contain secrets or personal data.
 */
export class KernelLifecycleError extends Error {
  readonly code: KernelFailureCode;

  constructor(code: KernelFailureCode) {
    super(code === "kernel.lifecycle.start.failed" ? SAFE_START_FAILURE_MESSAGE : SAFE_STOP_FAILURE_MESSAGE);
    this.name = "KernelLifecycleError";
    this.code = code;
  }
}

/**
 * Dependency-injected lifecycle sequencing with no feature, network, storage,
 * provider, or platform behavior. Registration order is the start order.
 */
export class Kernel {
  #state: LifecycleState = "idle";
  #participants: LifecycleParticipant[] = [];
  #participantIds = new Set<string>();
  #started: LifecycleParticipant[] = [];
  #diagnostics: SafeDiagnostic[] = [];

  register(participant: LifecycleParticipant): void {
    if (this.#state !== "idle") {
      throw new Error("Lifecycle participants may only be registered while the kernel is idle.");
    }

    if (this.#participantIds.has(participant.id)) {
      throw new Error(`A lifecycle participant with id "${participant.id}" is already registered.`);
    }

    this.#participants.push(participant);
    this.#participantIds.add(participant.id);
  }

  async start(): Promise<KernelSnapshot> {
    if (this.#state !== "idle") {
      throw new Error(`The kernel cannot start while ${this.#state}.`);
    }

    this.#state = "starting";
    for (const participant of this.#participants) {
      try {
        await participant.start();
        this.#started.push(participant);
      } catch {
        this.#recordFailure("start");
        await this.#stopStartedAfterStartFailure();
        this.#state = "failed";
        throw new KernelLifecycleError("kernel.lifecycle.start.failed");
      }
    }

    this.#state = "ready";
    return this.snapshot();
  }

  async stop(): Promise<KernelSnapshot> {
    if (this.#state === "stopped") {
      return this.snapshot();
    }

    if (this.#state === "idle") {
      this.#state = "stopped";
      return this.snapshot();
    }

    if (this.#state === "starting" || this.#state === "stopping") {
      throw new Error(`The kernel cannot stop while ${this.#state}.`);
    }

    this.#state = "stopping";
    const failed = await this.#stopStarted();
    this.#started = [];

    if (failed) {
      this.#state = "failed";
      throw new KernelLifecycleError("kernel.lifecycle.stop.failed");
    }

    this.#state = "stopped";
    return this.snapshot();
  }

  snapshot(): KernelSnapshot {
    const registeredIds = this.#participants.map((participant) => participant.id);
    const startedIds = this.#started.map((participant) => participant.id);
    const diagnostics = this.#diagnostics.map((diagnostic) => ({ ...diagnostic }));
    const status: StatusViewModel = {
      kernel: {
        state: this.#state,
        registeredCount: registeredIds.length
      },
      lifecycle: {
        state: this.#state,
        startedIds: [...startedIds]
      },
      diagnostics: {
        count: diagnostics.length
      }
    };

    return {
      state: this.#state,
      registeredIds,
      startedIds,
      diagnostics,
      status
    };
  }

  async #stopStartedAfterStartFailure(): Promise<void> {
    await this.#stopStarted();
    this.#started = [];
  }

  async #stopStarted(): Promise<boolean> {
    let failed = false;
    for (const participant of [...this.#started].reverse()) {
      try {
        await participant.stop();
      } catch {
        failed = true;
        this.#recordFailure("stop");
      }
    }
    return failed;
  }

  #recordFailure(phase: "start" | "stop"): void {
    this.#diagnostics.push({
      code: phase === "start" ? "kernel.lifecycle.start.failed" : "kernel.lifecycle.stop.failed",
      severity: "error",
      phase,
      message: phase === "start" ? SAFE_START_FAILURE_MESSAGE : SAFE_STOP_FAILURE_MESSAGE
    });
  }
}
