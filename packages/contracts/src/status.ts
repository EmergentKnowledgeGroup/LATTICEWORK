import type { SafeDiagnostic } from "./diagnostics.ts";
import type { LifecycleState } from "./lifecycle.ts";

export interface KernelStatusView {
  readonly state: LifecycleState;
  readonly registeredCount: number;
}

export interface LifecycleStatusView {
  readonly state: LifecycleState;
  readonly startedIds: readonly string[];
}

export interface DiagnosticsStatusView {
  readonly count: number;
}

/** The status-only model consumed by the bounded candidate shell. */
export interface StatusViewModel {
  readonly kernel: KernelStatusView;
  readonly lifecycle: LifecycleStatusView;
  readonly diagnostics: DiagnosticsStatusView;
}

/** A read-only receipt of kernel state with safe lifecycle diagnostics only. */
export interface KernelSnapshot {
  readonly state: LifecycleState;
  readonly registeredIds: readonly string[];
  readonly startedIds: readonly string[];
  readonly diagnostics: readonly SafeDiagnostic[];
  readonly status: StatusViewModel;
}
