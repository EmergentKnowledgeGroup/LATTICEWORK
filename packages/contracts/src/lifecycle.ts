/** States owned by the feature-free lifecycle kernel. */
export const lifecycleStates = [
  "idle",
  "starting",
  "ready",
  "stopping",
  "stopped",
  "failed"
] as const;

export type LifecycleState = (typeof lifecycleStates)[number];

/**
 * A dependency-injected lifecycle participant. Implementations belong to a
 * future feature or adapter package; the kernel only sequences these methods.
 */
export interface LifecycleParticipant {
  readonly id: string;
  start(): void | Promise<void>;
  stop(): void | Promise<void>;
}
