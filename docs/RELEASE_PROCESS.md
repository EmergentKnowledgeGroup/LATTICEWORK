<!-- Status: CANONICAL | Owner: Maintainers -->

# Release Process

## Release stages

### `v0.0.0-upstream-baseline`

Immutable preserved upstream state.

### `v0.1.0-audit`

Reproducible baseline, audit method, characterization, and initial compatibility contract.

### `v0.5.0-structural`

New architecture is operational but compatibility remains incomplete.

### `v0.9.0-beta`

Supported scope is mostly verified. Migration, privacy, security, and recovery are under final review.

### `v1.0.0-latticework`

Stable supported scope, verified migration, documented divergences, reproducible release, and public comparison.

## Release gates

Every release must have:

- Pinned commit.
- Clean working tree.
- Passing required tests.
- Security and privacy review appropriate to the change.
- Updated compatibility and divergence records.
- Updated known limitations.
- Updated changelog.
- Reproducible artifact instructions.
- Upgrade and rollback instructions.
- Provenance and license checks.
- Release notes that distinguish verified facts from plans.

## Release notes structure

1. What changed.
2. Supported scope.
3. Compatibility status.
4. Intentional divergences.
5. Migration instructions.
6. Security and privacy notes.
7. Known limitations.
8. Verification receipts.
9. Contributors and attribution.

## No surprise rule

A release must not introduce an undocumented data migration, provider call, telemetry path, or feature removal.
