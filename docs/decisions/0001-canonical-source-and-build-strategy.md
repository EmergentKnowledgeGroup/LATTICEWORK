# ADR 0001 — Canonical source and build strategy

**Status:** Accepted
**Date:** 2026-07-30
**Accepted:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P0-004`, `LW-BLK-002`, `docs/BASELINE.md`, `reengineering/LEGACY_SOURCE_MAP.md`

**Decision receipt:** **OBSERVED** — the maintainer explicitly approved the
proposed choices in the active Codex task on 2026-07-30 and directed execution
to continue. Acceptance authorizes the bounded `LW-P2-001` candidate slice; it
does not authorize a legacy cutover or compatibility claim.

## Context

**OBSERVED:** the pinned upstream baseline has at least three application-sized HTML
surfaces with unclear precedence:

- `docs/app.html` and `index.html` are byte-identical, 65,387-line files.
- root `app.html` is a different 51,684-line implementation.
- root and `docs/` module and service-worker trees contain both exact copies and
  divergent variants.
- version indicators disagree across browser, Electron, Tauri, and service-worker
  surfaces.

The baseline therefore has no proven authored-source/deployment-artifact boundary.
Editing any existing mirror as though it were canonical risks changing only one
launch mode. Evidence is stored in
`reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json` and
`reengineering/evidence/phase-0/LW-M0-INV-001/`.

Vite's documented static deployment model emits a build directory from an authored
source tree and supports a relative base for embedded or file-relative deployments.
That is compatible with the project's need for reproducible static output, but
`file://`, PWA, Electron, Tauri, and single-file behavior still require separate
characterization before support can be claimed.

## Decision

Adopt this source and artifact policy:

1. `apps/web/src/` is the sole authored browser implementation.
2. `apps/web/public/` contains reviewed static inputs that are copied by the build.
3. Vite produces a deterministic static application artifact from that source.
4. `docs/` is a generated deployment target, never an independently edited source
   tree.
5. Any retained root or single-file compatibility artifact is generated, labeled
   as generated, hash-recorded, and parity-tested.
6. The pinned upstream tree remains runnable and immutable during migration.
7. Existing runtime files are not moved, replaced, or excluded until their routes,
   assets, launch modes, storage effects, and rollback behavior have executable
   characterization evidence.
8. Preview and release promote the same hashed artifact; production is not rebuilt
   from a different source state.

This ADR does not decide which legacy launch modes remain supported. Those
dispositions require ADR-009 and ADR-011 plus explicit owner approval where
support would narrow.

## Invariants

- One authored implementation produces every shipped browser artifact.
- Generated output is never hand-edited.
- The immutable baseline remains available for comparison and rollback.
- A deployment mirror cannot silently become a second source tree.
- Static hosting remains a required compatibility surface.
- `file://`, PWA, desktop, LAN, and single-file behavior remain preservation
  obligations until explicitly dispositioned.
- No user data, persisted schema, cryptographic material, or provider payload is
  changed by introducing the build.

## Alternatives considered

### Continue editing `docs/app.html`

**Benefits**

- Lowest immediate tooling cost.
- Matches the apparent deployed GitHub Pages payload.

**Costs and risks**

- Preserves the 65,387-line change bottleneck.
- Does not reconcile the divergent root application.
- Keeps authored source and deployed output indistinguishable.
- Makes reproducible generation and module-level ownership impractical.

### Treat root `app.html` as canonical

**Benefits**

- Smaller than the deployed `docs/app.html`/`index.html` pair.
- Avoids introducing a build tool immediately.

**Costs and risks**

- The root file is materially divergent and not proven to be the live product.
- Choosing it would silently discard behavior visible only in the deployed pair.
- It still leaves a monolithic authored source and manual mirrors.

### Generate from a new canonical source tree

**Benefits**

- Establishes a reviewable authored/deployed boundary.
- Supports deterministic builds, typed modules, feature ownership, and parity
  checks.
- Allows bounded strangler migration without modifying the baseline.

**Costs and risks**

- Requires build tooling and artifact verification.
- Relative paths, service-worker scope, and single-file/file-origin support need
  explicit tests.
- Legacy and candidate must coexist until cutover evidence is accepted.

## Consequences

### Positive

- Source ownership becomes explicit.
- Deployment drift becomes a build failure rather than an undocumented condition.
- Feature extraction can proceed in bounded modules.
- Preview-to-production provenance can be proven by hash.

### Negative

- The repository temporarily contains both preserved legacy runtime and candidate
  source.
- Build and lockfile maintenance become required.
- Existing direct-edit release habits must stop.

### Unknown

- Whether `file://` can be retained without a dedicated compatibility export.
- Whether all current service-worker and desktop paths can consume one artifact.
- Which static routes are live or inbound-linked.

## Compatibility impact

No compatibility level changes merely because this ADR is accepted. C3/C4 claims
require the same fixtures and browser workflows against the generated artifact.
Legacy routes stay available until ADR-009 cutover criteria pass.

## Data and migration impact

None at acceptance. The candidate shell must not open, mutate, or delete legacy
stores until ADR-004 is accepted and migration fixtures pass.

## Security and privacy impact

The build must not introduce runtime CDN code, embed credentials, or copy private
evidence. Dependency licenses and an SBOM must be generated before release.

## Verification plan

- Pin Node, package manager, and lockfile.
- Build twice from the same clean commit; compare the declared artifact manifest
  and all deterministic asset hashes.
- Prove generated deployment targets have no uncommitted hand edits.
- Run browser characterization against legacy and candidate for accepted launch
  modes, viewports, storage, network, offline, and failure behavior.
- Verify stale-client and service-worker rollback behavior before cutover.
- Record commands, environment, commit, raw output, and screenshots under
  `reengineering/evidence/`.

Primary technical references:

- <https://vite.dev/guide/build>
- <https://vite.dev/config/shared-options.html#base>

## Rollback

Delete the unshipped candidate artifact/source commit or disable its feature flag.
Continue serving the immutable baseline. No legacy path is removed by this ADR.

## Review date

Accepted before `LW-P2-001` starts. Re-review before any default-route cutover.
