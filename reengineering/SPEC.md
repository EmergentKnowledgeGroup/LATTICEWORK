# LATTICEWORK Reengineering Specification

**Status:** ACTIVE
**Source goal:** `FREELATTICE_REENGINEERING_GOAL_PROMPT.md`
**Pinned upstream:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Objective

Reengineer the pinned FreeLattice baseline into a maintainable, secure, testable, local-first LATTICEWORK platform while preserving user value, stored-data obligations, launch modes, provenance, and rollback until each surface has executable parity evidence or an owner-approved divergence.

## Invariants

1. The detached upstream baseline remains immutable.
2. No baseline capability disappears through reclassification, omission, or test weakening.
3. One canonical authored source generates shipped mirrors and compatibility artifacts.
4. Provider, persistence, security, network, feature, and rendering boundaries are explicit and testable.
5. Local-only operation remains supported and is verified with denied external network access.
6. Unknown legacy data is preserved until a versioned migration proves otherwise.
7. Security, privacy, identity, cryptography, and data semantics fail closed and require maintainer approval to change.
8. Every public claim has a pinned, reproducible receipt.
9. A bounded contributor can resume from repository context and local contracts.

## Delivery strategy

- Preserve and characterize first.
- Freeze capability and test obligations.
- Accept architecture through ADRs.
- Introduce a new runnable shell beside the untouched legacy runtime.
- Migrate one vertical slice at a time behind contracts.
- Keep old/new comparison and rollback available until verification.
- Cut over only after complete parity disposition and explicit owner approval.

## Required proof

- Immutable baseline tag, worktree, archive, hashes, and environment.
- Layered unit, contract, integration, browser, accessibility, offline, security, migration, and release tests.
- Machine-generated evidence manifests.
- Clean-room independent final QA.
- No active P0/P1 blocker at cutover.

## Explicit non-goals

- Cosmetic reskinning.
- Deleting hard features to reduce size.
- Framework adoption without measured benefit.
- Source-string assertions as the only parity evidence.
- Personal or social-media commentary in engineering artifacts.

## Current gate

Phase 0, Phase 1, and the feature-free `LW-P2-001` foundation are green;
ADR-001 through ADR-003 were accepted on 2026-07-30. The next implementation
gate is Phase 3, which remains blocked on accepted data/storage and provider
contracts. Persistence, provider, security, feature migration, deployment
cutover, and capability retirement remain blocked by their later evidence and
decision gates.
