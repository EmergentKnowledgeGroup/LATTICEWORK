<!-- Status: LIVING | Owner: Maintainers -->

# Roadmap

## Current position

- `M0`: complete.
- `M1`: bounded baseline characterization complete; the locked
  `LW-P4-CHAR-001` packet now authorizes the next feature-by-feature primary
  Chat characterization slice.
- `M2`: accepted architecture and feature-free typed foundation independently
  verified, reviewed once, and merged.
- `M3`: ADR-004 through ADR-006 are accepted and the bounded synthetic/mock
  foundation is merged but inactive. Primary Chat characterization is next;
  candidate integration remains blocked.
- `M4` and later: not started; blocked by their recorded decision/evidence
  gates.

## M0 — Upstream baseline

Exit criteria:

- Exact upstream commit pinned.
- Baseline tag created.
- License and provenance verified.
- Build and runtime instructions reproduced.
- Existing tests executed and results archived.
- Source, dependency, data, and feature inventories started.
- No upstream behavior changed.

## M1 — Characterization

Current gate:

- `LW-P4-CHAR-001` may add only the exact harness, fixture, validator,
  evidence, and control-state paths frozen in
  `reengineering/PHASE4_PREFLIGHT.md`.
- Every atomic subcase uses a fresh synthetic profile with external egress
  denied. Mocked provider observations are baseline behavior evidence, not
  real-provider compatibility.
- `LW-P4-001` remains blocked until characterization is fully GREEN and a
  later implementation packet is explicitly accepted.

Exit criteria:

- Core user workflows enumerated.
- Characterization tests capture observable behavior.
- Storage and migration surfaces mapped.
- Network and provider flows mapped.
- Preliminary audit findings independently reproduced.
- Compatibility matrix has evidence links.

## M2 — Architecture contract

Exit criteria:

- Current architecture documented.
- Target boundaries accepted through ADRs.
- Module ownership and interfaces defined.
- Context and handoff strategy operational.
- Migration sequence and rollback plan approved.

## M3 — Structural extraction

Current gate:

- `LW-P3-001` may implement only the exact accepted synthetic conversation
  storage and deterministic in-process provider-mock surface.
- ADR-006 defines a later optional-proxy boundary and does not authorize a
  listener in Phase 3.

Exit criteria:

- High-risk monolithic surfaces decomposed incrementally.
- Behavior remains covered by characterization tests.
- Dependency direction enforced.
- Duplicate or conflicting implementations resolved with evidence.
- No uncontrolled data-format changes.

## M4 — Reliability and compatibility

Exit criteria:

- Core compatibility targets pass.
- Known divergences are explicit.
- Security and privacy review complete.
- User data migration tested.
- Supported platform matrix verified.
- Benchmark methodology frozen.

## M5 — Public beta

Exit criteria:

- Install and upgrade path documented.
- Release artifacts reproducible.
- Known limitations published.
- Crash and recovery behavior tested.
- Public comparison uses pinned releases.
- Third-party clean-room verification requested.

## M6 — LATTICEWORK 1.0

Exit criteria:

- Charter success conditions met.
- Stable compatibility scope declared.
- Migration and rollback verified.
- Release support policy active.
- Architecture and implementation match.
- A new contributor can perform a bounded change without private briefing.
