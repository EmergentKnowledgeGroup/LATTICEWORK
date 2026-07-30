# ADR 0002 — TypeScript and module architecture

**Status:** Accepted
**Date:** 2026-07-30
**Accepted:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P0-004`, `LW-BLK-003`, `docs/ARCHITECTURE.md`, `reengineering/DEPENDENCY_GRAPH.md`

**Decision receipt:** **OBSERVED** — the maintainer explicitly approved the
proposed choices in the active Codex task on 2026-07-30 and directed execution
to continue. Acceptance authorizes the bounded `LW-P2-001` candidate slice; it
does not authorize persistence, provider, security, or legacy-global migration.

## Context

**OBSERVED:** the pinned baseline contains 244 statically assigned
`window.<symbol>` names, many order-sensitive global assignments, direct provider
and storage access from feature code, and a 65,387-line browser runtime. Static
evidence cannot yet determine which assignments are reachable or intentionally
overridden, so these globals are compatibility surfaces rather than deletion
targets.

The rewrite needs seams for characterization, provider substitution, versioned
storage, security review, and feature ownership without turning every change into
an edit to the monolith.

## Decision

Adopt:

1. strict TypeScript and native ES modules for all new first-party runtime code;
2. a workspace organized around `apps/` and framework-neutral `packages/`;
3. a small kernel that owns boot, dependency registration, feature registration,
   lifecycle, and diagnostics—never feature logic;
4. typed contracts for providers, storage, events, clock, crypto, network,
   environment, and observability;
5. constructor/factory dependency injection at package boundaries;
6. versioned schemas at external and persistence boundaries;
7. feature packages that depend on contracts, not concrete app adapters;
8. explicit compatibility adapters for legacy globals during migration;
9. no new feature-owned mutable `window` globals or direct durable storage access;
10. contract, unit, integration, and browser tests colocated with stable seams.

The proposed initial dependency direction is:

```text
apps -> features -> contracts/kernel
apps -> adapters -> contracts
adapters -> providers/storage/security/platform
ui -> feature view-model contracts
contracts -> no feature or adapter implementation
```

## Invariants

- Migration preserves observable ordering and data semantics until characterized.
- Core contracts do not depend on feature implementations.
- Feature packages cannot call provider, persistence, or privileged platform APIs
  except through injected contracts.
- Unknown fields and records survive migration.
- Type assertions do not replace runtime validation at trust boundaries.
- A typed rewrite is not evidence of behavioral parity.

## Alternatives considered

### Keep global JavaScript and split files

**Benefits**

- Minimal toolchain change.
- Easier direct copy from the monolith.

**Costs and risks**

- Preserves implicit ownership and load-order coupling.
- Does not create enforceable provider/storage/security boundaries.
- Makes schema drift and cross-feature mutation hard to detect.

### Adopt a framework-owned full-stack architecture

**Benefits**

- Strong conventions and a large ecosystem.
- Faster scaffolding for standard CRUD applications.

**Costs and risks**

- Couples domain and migration work to a UI/runtime framework.
- Increases the blast radius for static, offline, desktop, and single-file targets.
- Does not directly solve legacy data, provider, or global compatibility.

### Strict TypeScript with framework-neutral contracts

**Benefits**

- Makes dependency direction testable.
- Allows provider, storage, UI, and desktop implementations to evolve separately.
- Supports bounded strangler slices alongside immutable legacy behavior.

**Costs and risks**

- Requires runtime schemas and disciplined boundary design.
- Can create abstraction theater if interfaces are added without consumers/tests.
- Needs temporary compatibility adapters during migration.

## Consequences

### Positive

- Smaller ownership surfaces and better test seams.
- Provider and persistence behavior can be tested without a browser monolith.
- Security-sensitive capabilities become visible dependencies.

### Negative

- New tooling and workspace conventions are required.
- Legacy/candidate adapters add temporary complexity.
- Some dynamic behavior will require careful characterization before typing.

### Unknown

- Exact package boundaries for Core, Garden, mesh, wallet, and coordination
  features.
- Which legacy globals are public compatibility APIs versus internal accidents.

## Compatibility impact

Legacy globals may be exposed only through an explicit compatibility adapter and
only when a characterization test requires them. No global may be removed merely
because a typed replacement exists.

## Data and migration impact

No schema change is authorized. ADR-004 must define versioning, backup,
unknown-field preservation, interruption recovery, and rollback before candidate
code mutates durable data.

## Security and privacy impact

Credential, crypto, network, file, clipboard, peer, worker, and gateway access
must cross named contracts and adapters. Secrets must be redacted from diagnostics
and never embedded in build artifacts.

## Verification plan

- Enforce strict TypeScript with no unchecked boundary inputs.
- Add dependency-direction checks and package cycle detection.
- Unit-test the kernel boot/lifecycle with fake adapters.
- Contract-test provider/storage/security interfaces.
- Characterize each replaced legacy global before adapting or retiring it.
- Run browser parity tests for every migrated vertical slice.
- Fail CI on unapproved direct storage, network, crypto, or global access from
  feature packages.

## Rollback

Candidate packages remain additive and feature-flagged. Disable the candidate
slice and continue using the immutable legacy runtime; do not mutate legacy data.

## Review date

Accepted before `LW-P2-001` starts. Re-review before introducing persistence,
provider, security, or legacy-global adapters.
