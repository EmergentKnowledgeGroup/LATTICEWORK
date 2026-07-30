# LATTICEWORK Blockerboard

| ID | Severity | Tasks | Missing decision or evidence | Safe work | Owner | Unblock condition | Status |
|---|---|---|---|---|---|---|---|
| `LW-BLK-001` | P0 | P1-P10 | Baseline capability, launch-mode, canonical-source, data, and security obligations were not frozen | Continue additive Phase 1 characterization without mutating legacy runtime | Codex root controller | Evidence-linked Phase 0 contracts, registries, matrices, budgets, and validator complete | CLOSED |
| `LW-BLK-002` | P1 | P2-P10 | ADR-001 canonical source/build strategy required disposition | Baseline source-map and build reproduction | Maintainer | ADR-001 accepted 2026-07-30 | CLOSED |
| `LW-BLK-003` | P1 | P2-P10 | ADR-002 module architecture required disposition | Dependency/global inventory | Maintainer | ADR-002 accepted 2026-07-30 | CLOSED |
| `LW-BLK-004` | P1 | P2-P10 | ADR-003 UI rendering strategy required disposition | UI behavior characterization and bounded spike design | Maintainer | ADR-003 accepted 2026-07-30 | CLOSED |
| `LW-BLK-005` | P1 | P3-P10 | ADR-004 is accepted and the bounded synthetic conversation slice is independently verified; broader data owners, schemas, retention, descriptor coverage, and every real-data migration remain incomplete | Extend inventory and design the next separately claimed synthetic descriptor; no real data | Maintainer/data lead | Expanded inventory plus independently verified per-dataset migration/rollback/round-trip evidence before any real-data authority | OPEN |
| `LW-BLK-006` | P1 | P7-P10 | ADR-006 is accepted; ADR-012 and gateway/LAN/worker/peer/Telegram security tests do not exist | Mock-only provider contracts may proceed; no listener | Maintainer/security lead | ADR-012 accepted plus required security tests | OPEN |
| `LW-BLK-007` | P1 | P9 | Cutover and capability retirement require explicit owner approval; ADR-009 has not started | All reversible migration and verification work | Maintainer | ADR-009 accepted after parity/migration/rollback/release evidence plus verbatim approval naming affected IDs | OPEN |

No blocker may be closed by weakening a test, hiding a capability, or relabeling required behavior.

The verified `LW-P2-001` feature-free foundation and bounded synthetic/mock
`LW-P3-001` storage/provider foundation do not close `LW-BLK-005` through
`LW-BLK-007`; those gates concern broader data semantics, real provider and
security behavior, and eventual cutover that these work units intentionally do
not implement.

ADR-004 through ADR-006 are accepted, but all three blockers remain open until
their remaining evidence and later-decision conditions are independently
verified. Acceptance alone is not a blocker-closure receipt.
