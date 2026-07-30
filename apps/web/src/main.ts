import { lifecycleStates, type StatusViewModel } from "@latticework/contracts";
import { Kernel } from "@latticework/kernel";

import { EmptyStatusShell } from "./empty-status-shell.ts";
import "./styles.css";

function displayState(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function toShellStatus(status: StatusViewModel): {
  readonly diagnosticsCount: number;
  readonly kernelState: string;
  readonly lifecycleState: string;
} {
  if (!lifecycleStates.includes(status.kernel.state)) {
    throw new Error("Candidate kernel returned an unknown lifecycle state.");
  }

  return {
    diagnosticsCount: status.diagnostics.count,
    kernelState: displayState(status.kernel.state),
    lifecycleState: displayState(status.lifecycle.state)
  };
}

async function bootCandidateShell(): Promise<void> {
  const shell = document.querySelector<EmptyStatusShell>("lw-empty-status-shell");
  if (shell === null) {
    throw new Error("Candidate status-shell host was not found.");
  }

  // Integration is intentionally isolated here. The feature-free kernel has no
  // participants in Phase 2; later adapters must be characterized separately.
  const kernel = new Kernel();
  const snapshot = await kernel.start();
  shell.setCandidateStatus(toShellStatus(snapshot.status));
}

void bootCandidateShell().catch((error: unknown) => {
  const shell = document.querySelector<EmptyStatusShell>("lw-empty-status-shell");
  shell?.setBootFailure();
  console.error("Candidate shell boot failed.", error);
});
