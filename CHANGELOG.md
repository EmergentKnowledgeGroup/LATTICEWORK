# Changelog

All notable changes to LATTICEWORK will be documented in this file.

The project follows semantic versioning after the first stable release.

## [Unreleased]

### Added

- Canonical documentation and evidence framework.
- Upstream provenance structure.
- Agent swarm coordination protocol.
- Compatibility, audit, benchmark, and verification templates.
- Strict TypeScript lifecycle, diagnostics, and status contracts.
- Dependency-injected lifecycle kernel with safe failure diagnostics.
- Feature-free Lit candidate status shell and relative Vite build.
- Deterministic lock/build, browser-safety, supply-chain/SBOM, protected-file,
  evidence-validation, and independent-review gates.

### Changed

- Accepted ADR-001 through ADR-003 and established `apps/web/src` as the
  candidate-only authored browser source without changing legacy routes.

### Fixed

- Hardened candidate output against symlink/junction traversal.
- Blocked browser egress before transmission and covered realtime/worker/
  `sendBeacon` surfaces.
- Made Windows PowerShell evidence output ASCII-safe and UTF-8 stable.

### Security

- Verified that the feature-free candidate performs no out-of-origin request,
  creates no durable browser storage or service worker, and keeps protected
  legacy files byte-identical to the immutable baseline.

## [0.0.0-upstream-baseline] - 2026-07-30

### Added

- Immutable tag preserving the selected FreeLattice upstream baseline.
- Baseline environment and provenance record.

[Unreleased]: https://github.com/EmergentKnowledgeGroup/LATTICEWORK/compare/v0.0.0-upstream-baseline...HEAD
[0.0.0-upstream-baseline]: https://github.com/EmergentKnowledgeGroup/LATTICEWORK/releases/tag/v0.0.0-upstream-baseline
