import type {
  Pulse,
  PulseCommitResult,
  PulseDiagnostic,
  PulseFilter,
  PulseMedium as PulseMediumContract,
  PulseMediumOptions,
} from "@latticework/contracts";

import { pulseMediumPendingLimit } from "./descriptor.ts";
import { immutablePulse, publicPulse } from "./snapshot.ts";
import { assertFilter, matchesFilter, validatePulse } from "./validation.ts";

interface Subscription {
  readonly filter: PulseFilter | null | undefined;
  readonly handler: (pulse: Pulse) => void;
}

const noSubscription = () => undefined;

export class PulseMedium implements PulseMediumContract {
  readonly #options: PulseMediumOptions;
  #ready = false;
  #startPromise: Promise<void> | undefined;
  #pending: Pulse[] = [];
  #subscriptions = new Map<number, Subscription>();
  #nextSubscriptionId = 1;
  #writeQueue: Promise<void> = Promise.resolve();

  constructor(options: PulseMediumOptions) { this.#options = options; }

  start(): Promise<void> {
    if (this.#startPromise === undefined) this.#startPromise = this.#open();
    return this.#startPromise;
  }

  commit(input: unknown): PulseCommitResult {
    if (this.#quiet()) return { ok: false, code: "quiet-room" };
    const validated = validatePulse(input, Date.now());
    if (validated === undefined) {
      this.#diagnose({ code: "invalid-pulse", operation: "commit" });
      return { ok: false, code: "invalid-pulse" };
    }
    const pulse = immutablePulse(validated);
    if (this.#ready) this.#persist(pulse);
    else {
      if (this.#pending.length >= pulseMediumPendingLimit) this.#pending.shift();
      this.#pending.push(pulse);
    }
    this.#fanOut(pulse);
    return { ok: true, pulse: immutablePulse(pulse) };
  }

  subscribe(filter: PulseFilter | null | undefined, handler: (pulse: Pulse) => void): () => void {
    assertFilter(filter);
    if (typeof handler !== "function") throw new TypeError("Invalid pulse handler.");
    if (this.#quiet()) return noSubscription;
    const id = this.#nextSubscriptionId++;
    this.#subscriptions.set(id, { filter, handler });
    return () => { this.#subscriptions.delete(id); };
  }

  async recent(filter: PulseFilter | null = null, limit = 100): Promise<readonly Pulse[]> {
    assertFilter(filter);
    if (this.#quiet() || !this.#ready) return Object.freeze([]);
    try {
      const count = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
      return Object.freeze((await this.#options.repository.read())
        .map(publicPulse)
        .filter((pulse) => matchesFilter(pulse, filter))
        .sort((left, right) => right.ts - left.ts)
        .slice(0, count)
        .map(immutablePulse));
    } catch {
      this.#diagnose({ code: "read-failed", operation: "read" });
      return Object.freeze([]);
    }
  }

  async clear(): Promise<boolean> {
    if (!this.#ready) return false;
    try {
      await this.#options.repository.clear();
      return true;
    } catch {
      this.#diagnose({ code: "clear-failed", operation: "clear" });
      return false;
    }
  }

  async close(): Promise<boolean> {
    if (!this.#ready) return false;
    try {
      await this.#writeQueue;
      await this.#options.repository.close();
      this.#ready = false;
      return true;
    } catch {
      this.#diagnose({ code: "close-failed", operation: "close" });
      return false;
    }
  }

  isReady(): boolean { return this.#ready; }
  pendingCount(): number { return this.#pending.length; }
  subscriberCount(): number { return this.#subscriptions.size; }

  async #open(): Promise<void> {
    try {
      await this.#options.repository.open();
      this.#ready = true;
      const pending = this.#pending;
      this.#pending = [];
      for (const pulse of pending) this.#persist(pulse);
      this.commit({ source: "lattice-memory", kind: "medium-online", summary: "the medium opened a session" });
      await this.#writeQueue;
    } catch {
      this.#ready = false;
      this.#diagnose({ code: "open-failed", operation: "open" });
    }
  }

  #persist(pulse: Pulse): void {
    this.#writeQueue = this.#writeQueue
      .then(() => this.#options.repository.write(immutablePulse(pulse)))
      .catch(() => { this.#diagnose({ code: "write-failed", operation: "write" }); });
  }

  #fanOut(pulse: Pulse): void {
    for (const subscription of [...this.#subscriptions.values()]) {
      if (!matchesFilter(pulse, subscription.filter)) continue;
      try { subscription.handler(immutablePulse(pulse)); }
      catch { this.#diagnose({ code: "subscriber-failed", operation: "subscribe" }); }
    }
  }

  #quiet(): boolean {
    if (this.#options.quietRoom === undefined) return false;
    try { return this.#options.quietRoom.isActive() !== false; }
    catch { return true; }
  }

  #diagnose(diagnostic: PulseDiagnostic): void {
    try { this.#options.onDiagnostic?.(Object.freeze({ code: diagnostic.code, operation: diagnostic.operation })); }
    catch { /* diagnostic receivers cannot change medium behavior */ }
  }
}

export function createPulseMedium(options: PulseMediumOptions): PulseMediumContract {
  return new PulseMedium(options);
}
