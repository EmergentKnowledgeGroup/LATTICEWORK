<!-- Status: CANONICAL | Owner: Architecture and verification leads -->

# Reengineering Method

LATTICEWORK uses behavior-preserving, evidence-driven reengineering.

## Phase 0 — Preserve

- Pin the upstream commit.
- Preserve Git history and license.
- Create an immutable baseline tag.
- Archive the baseline and hash it.
- Record environment and setup.
- Do not fix anything yet.

## Phase 1 — Characterize

- Inventory features, state, integrations, and failure modes.
- Add characterization tests around observable behavior.
- Capture network, storage, and runtime traces.
- Separate intended behavior from accidental behavior.
- Record unknowns instead of guessing.

## Phase 2 — Contract

- Define supported compatibility surfaces.
- Decide which bugs remain compatible and which become documented fixes.
- Accept target architecture through ADRs.
- Establish migration and rollback rules.
- Freeze benchmark methodology before major optimization.

## Phase 3 — Extract

- Introduce seams around existing behavior.
- Extract one coherent boundary at a time.
- Keep old and new implementations comparable when practical.
- Avoid broad rewrites without intermediate verification.
- Preserve data formats until migration is ready.

## Phase 4 — Migrate

- Move behavior behind explicit interfaces.
- Run old and new paths against the same fixtures.
- Record divergences.
- Retain rollback until the new boundary is verified.
- Remove obsolete paths only after evidence and approval.

## Phase 5 — Verify

- Run compatibility, regression, privacy, security, storage, and performance checks.
- Reproduce findings from a clean environment.
- Review documentation against implementation.
- Require independent verification for major public claims.

## Phase 6 — Release

- Publish supported scope and limitations.
- Publish pinned comparison results.
- Provide install, upgrade, migration, and rollback instructions.
- Keep upstream attribution visible.
- Do not declare victory over unmeasured surfaces.

## Rules against fake progress

The following do not count as successful reengineering by themselves:

- Lower line count.
- More files.
- New framework adoption.
- Cleaner screenshots.
- Passing only newly written tests.
- Deleted features.
- A model saying the design is better.
- A benchmark run after tuning only one side.

The only durable progress is better structure with preserved or intentionally improved behavior and reproducible evidence.
