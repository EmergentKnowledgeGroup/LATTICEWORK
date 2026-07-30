# ADR 0003 — UI rendering strategy

**Status:** Accepted
**Date:** 2026-07-30
**Accepted:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P0-004`, `LW-BLK-004`, `docs/ARCHITECTURE.md`, `docs/COMPATIBILITY.md`

**Decision receipt:** **OBSERVED** — the maintainer explicitly approved the
proposed choices in the active Codex task on 2026-07-30 and directed execution
to continue. Acceptance authorizes the bounded `LW-P2-001` status-shell spike;
it does not authorize a full-page rewrite or legacy UI cutover.

## Context

**OBSERVED:** the baseline mixes a very large inline DOM/CSS/JavaScript runtime
with module-loaded feature panels, canvas/WebGL experiences, audio, standard form
controls, and multiple static pages. Fifty-four `tab-panel` IDs and 82 static
`docs/*.html` routes were found, but reachability, responsive behavior,
accessibility, and visual parity are not yet characterized.

A wholesale UI framework rewrite would combine visual, state, data, and behavior
migration in one high-risk step. The project instead needs a rendering boundary
that can replace one characterized slice at a time while preserving imperative
canvas/GPU code where that is the correct tool.

Lit is documented as a small standards-based layer over Web Components with
reactive rendering, scoped styles, and interoperability with other frameworks.
Those properties fit an incremental static-browser migration, but adoption still
requires a bounded spike and browser evidence.

## Decision

Adopt:

1. Lit-based Web Components as the default component boundary for new application
   chrome and bounded feature views;
2. plain TypeScript functions/classes for domain and state logic;
3. explicit view-model contracts between feature logic and rendering;
4. imperative adapters for canvas, WebGL/WebGPU, audio, editors, and other
   specialized surfaces;
5. shared design tokens and primitive components in `packages/ui-system/`;
6. semantic HTML, keyboard operation, focus management, reduced-motion behavior,
   high-contrast support, and touch targets as acceptance criteria;
7. no full-page rewrite until a bounded spike demonstrates visual, accessibility,
   performance, file/static-host, and testability fit;
8. legacy DOM remains authoritative for unmigrated features.

The first spike should implement only a non-destructive shell/status surface with
no durable data or provider calls. A feature migration follows only after that
spike passes the accepted browser matrix.

## Invariants

- UI migration cannot delete or rename a reachable capability without owner
  approval and compatibility evidence.
- Domain state is not owned by component instances.
- Canvas/GPU experiences are not forced into declarative templates.
- Accessibility and responsive behavior are release gates, not cleanup work.
- Existing visual identity is preserved unless an intentional divergence is
  accepted.
- No remote runtime UI dependency is required for local-only operation.

## Alternatives considered

### Continue imperative DOM in extracted modules

**Benefits**

- Minimal conceptual migration.
- Easy to copy existing handlers.

**Costs and risks**

- Preserves ad hoc lifecycle and state coupling.
- Makes component-level accessibility and isolation harder to enforce.
- Encourages continued global selectors and mutation.

### React or Svelte application rewrite

**Benefits**

- Mature ecosystems and strong developer tooling.
- Broad component-library availability.

**Costs and risks**

- A full application ownership model increases migration blast radius.
- Static/file/desktop/single-file compatibility needs additional proof.
- Framework conversion can obscure behavior changes behind structural churn.

### Lit/Web Components plus imperative specialized adapters

**Benefits**

- Uses browser standards and interoperable custom elements.
- Supports incremental islands beside legacy DOM.
- Keeps domain packages framework-neutral.
- Scoped components improve ownership without forcing canvas/GPU rewrites.

**Costs and risks**

- Requires custom-element lifecycle and event-contract discipline.
- Shadow DOM can affect styling, focus, testing, and third-party integrations.
- The team must avoid turning components into hidden state stores.

## Consequences

### Positive

- UI can migrate one characterized surface at a time.
- Shared primitives and tokens become testable.
- Framework-neutral feature logic remains reusable across browser and desktop
  shells.

### Negative

- Legacy and candidate rendering coexist during migration.
- Some styles and events need explicit compatibility adapters.
- A new UI dependency and build step must be pinned and audited.

### Unknown

- Whether Shadow DOM is appropriate for every visual surface.
- Which legacy theme/customization rules cross component boundaries.
- Exact performance on low-end/mobile and WebGPU/no-WebGPU profiles.

## Compatibility impact

No compatibility level changes at acceptance. Each migrated surface needs
baseline and candidate screenshots, interaction traces, keyboard/focus checks,
mobile/desktop viewports, reduced motion, high contrast, and failure-state
comparison.

## Data and migration impact

None. Components receive data through typed view models and cannot independently
rewrite legacy storage.

## Security and privacy impact

Components must render untrusted/imported/provider text safely, avoid raw HTML
injection, and route privileged actions through consent/security contracts.

## Verification plan

- Build the bounded shell/status spike with Lit and an equivalent plain
  TypeScript prototype if needed for comparison.
- Measure bundle size, first render, interaction latency, long tasks, heap
  recovery, and accessibility under the fixed profiles in
  [`reengineering/PERFORMANCE_PLAN.md`](../../reengineering/PERFORMANCE_PLAN.md).
- Run Playwright on Chromium, Firefox, WebKit, desktop/mobile viewports, reduced
  motion, high contrast, keyboard-only operation, and no-WebGPU degradation.
- Use axe-core as one automated signal plus manual keyboard/screen-reader review;
  automated checks alone do not establish full accessibility.
- Capture screenshot/trace/network evidence for legacy and candidate.

Primary technical references:

- <https://lit.dev/docs/v3/>
- <https://lit.dev/docs/components/styles/>
- <https://playwright.dev/docs/test-projects>
- <https://playwright.dev/docs/accessibility-testing>

## Rollback

Disable or remove the additive candidate component and continue rendering the
legacy surface. No legacy route or store is removed by this ADR.

## Review date

Accepted before `LW-P2-001` starts. Re-review after the bounded shell spike and
before any feature-view migration.
