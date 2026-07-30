/** The kernel exposes only safe, intentionally generic lifecycle receipts. */
export type DiagnosticSeverity = "error";

export type DiagnosticPhase = "start" | "stop";

export interface SafeDiagnostic {
  readonly code: "kernel.lifecycle.start.failed" | "kernel.lifecycle.stop.failed";
  readonly severity: DiagnosticSeverity;
  readonly phase: DiagnosticPhase;
  readonly message: string;
}
