# Architecture Decision Records

Architecture Decision Records capture decisions that affect boundaries, compatibility, data, dependencies, security, privacy, or long-term maintenance.

## File naming

`NNNN-short-decision-title.md`

Examples:

- `0001-runtime-module-boundaries.md`
- `0002-versioned-storage-schema.md`
- `0003-provider-adapter-contract.md`

## Status values

- Proposed
- Accepted
- Superseded
- Rejected
- Deprecated

## Rule

An ADR records why a decision was made. Source code records how it was implemented.

Use `0000-template.md`.

## Current index

| ADR | Status | Scope |
|---|---|---|
| [`0001`](0001-canonical-source-and-build-strategy.md) | Accepted | Canonical source and deterministic generated artifacts |
| [`0002`](0002-typescript-module-architecture.md) | Accepted | Strict TypeScript module architecture |
| [`0003`](0003-ui-rendering-strategy.md) | Accepted | Bounded Lit rendering strategy |
| [`0004`](0004-versioned-storage-and-migration.md) | Accepted | Versioned storage and copy-on-write migration |
| [`0005`](0005-provider-abstraction-and-provenance.md) | Accepted | Provider adapters, routing, and provenance |
| [`0006`](0006-optional-local-proxy-security.md) | Accepted | Optional local proxy security contract |

An Accepted ADR grants only the authority stated in its exact decision receipt
and active work claim. Acceptance never implies real-data migration, listener,
activation, or cutover authority.
