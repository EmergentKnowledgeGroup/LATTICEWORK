/**
 * Browser-test-only ESM bridge. It intentionally exposes no window/global API:
 * specs import this module through Vite and use package exports directly.
 */
import * as latticeMemory from "@latticework/lattice-memory";

export { latticeMemory };

export type HarnessOptions = Readonly<{
  readonly quietRoom?: Readonly<{ isActive(): boolean }>;
  readonly diagnostics?: (diagnostic: Readonly<{ code: string; operation: string }>) => void;
}>;

/**
 * The harness supplies the platform primitive explicitly. Candidate package
 * source never reaches for a browser global, and the returned medium is kept
 * module-local to the caller rather than published on window.
 */
export function createNativePulseMedium(
  indexedDb: IDBFactory,
  options: HarnessOptions = {},
) {
  const repository = latticeMemory.createIndexedDbPulseRepository(indexedDb);
  const medium = latticeMemory.createPulseMedium({
    repository,
    ...(options.quietRoom === undefined ? {} : { quietRoom: options.quietRoom }),
    ...(options.diagnostics === undefined ? {} : { onDiagnostic: options.diagnostics }),
  });
  return { medium, repository };
}

let active: ReturnType<typeof createNativePulseMedium>["medium"] | undefined;
let capturedDiagnostics: ReadonlyArray<Readonly<{ code: string; operation: string }>> = Object.freeze([]);

export async function startNativePulseMedium(
  indexedDb: IDBFactory,
  options: HarnessOptions = {},
) {
  const created = createNativePulseMedium(indexedDb, options);
  await created.medium.start();
  active = created.medium;
  return created.medium;
}

export async function startNativePulseMediumWithDiagnostics(
  indexedDb: IDBFactory,
  quietRoom?: Readonly<{ isActive(): boolean }>,
) {
  const received: Array<Readonly<{ code: string; operation: string }>> = [];
  const medium = await startNativePulseMedium(indexedDb, {
    ...(quietRoom === undefined ? {} : { quietRoom }),
    diagnostics: (diagnostic) => received.push(Object.freeze({ code: diagnostic.code, operation: diagnostic.operation })),
  });
  capturedDiagnostics = received;
  return medium;
}

export function diagnosticReceipt(): readonly Readonly<{ code: string; operation: string }>[] {
  return capturedDiagnostics.map((diagnostic) => Object.freeze({ code: diagnostic.code, operation: diagnostic.operation }));
}

export function activePulseMedium(): NonNullable<typeof active> {
  if (!active) throw new Error("Phase 5 test medium has not been started.");
  return active;
}

export async function closeActivePulseMedium(): Promise<void> {
  await active?.close();
  active = undefined;
}
