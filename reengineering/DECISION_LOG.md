# Decision Log

| ID | Date | Decision | Status | Evidence | Owner |
|---|---|---|---|---|---|
| `DEC-0001` | 2026-07-30 | Pin FreeLattice baseline `e7585999fc1af2707f410ae87356cf2b52e08d9c`; preserve exact upstream history and `LICENSE` | RECORDED | `PROVENANCE.md`, checkpoint | Maintainer goal + controller verification |
| `DEC-0002` | 2026-07-30 | Characterize only the detached baseline worktree; keep `Z:\FreeLattice` untouched | RECORDED | `docs/agents/claims/LW-M0-001.md` | Controller |
| `DEC-0003` | 2026-07-30 | Use `docs/decisions/` as the canonical ADR home; provide `docs/adr/` only as a routing alias if needed | PROPOSED | `DOCS_MANIFEST.md`, goal prompt | Maintainer |
| `DEC-0004` | 2026-07-30 | Accept ADR-001 canonical source and deterministic generated-artifact strategy | RECORDED | `docs/decisions/0001-canonical-source-and-build-strategy.md` | Maintainer |
| `DEC-0005` | 2026-07-30 | Accept ADR-002 strict TypeScript, contracts, and feature-free kernel architecture | RECORDED | `docs/decisions/0002-typescript-module-architecture.md` | Maintainer |
| `DEC-0006` | 2026-07-30 | Accept ADR-003 bounded Lit Web Component rendering strategy | RECORDED | `docs/decisions/0003-ui-rendering-strategy.md` | Maintainer |
| `DEC-0007` | 2026-07-30 | Propose ADR-004 versioned storage, per-dataset descriptors, and copy-on-write migration; no implementation authority | PROPOSED | `docs/decisions/0004-versioned-storage-and-migration.md`, `PHASE3_DECISION_PACKET.md` | Controller; maintainer disposition pending |
| `DEC-0008` | 2026-07-30 | Propose ADR-005 provider adapter/router/credential/egress separation with deterministic mock-only Phase 3 | PROPOSED | `docs/decisions/0005-provider-abstraction-and-provenance.md`, `PHASE3_DECISION_PACKET.md` | Controller; maintainer disposition pending |
| `DEC-0009` | 2026-07-30 | Propose ADR-006 optional disabled loopback proxy contract for later work; no listener authority | PROPOSED | `docs/decisions/0006-optional-local-proxy-security.md`, `PHASE3_DECISION_PACKET.md` | Controller; maintainer disposition pending |

Architecture, cutover, capability retirement, data semantics, and security exceptions require explicit ADR disposition and cannot be decided by this log alone.
