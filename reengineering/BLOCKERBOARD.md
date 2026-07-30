# LATTICEWORK Blockerboard

| ID | Severity | Tasks | Missing decision or evidence | Safe work | Owner | Unblock condition | Status |
|---|---|---|---|---|---|---|---|
| `LW-BLK-001` | P0 | P1-P10 | Baseline capability, launch-mode, canonical-source, data, and security obligations were not frozen | Continue additive Phase 1 characterization without mutating legacy runtime | Codex root controller | Evidence-linked Phase 0 contracts, registries, matrices, budgets, and validator complete | CLOSED |
| `LW-BLK-002` | P1 | P2-P10 | ADR-001 canonical source/build strategy required disposition | Baseline source-map and build reproduction | Maintainer | ADR-001 accepted 2026-07-30 | CLOSED |
| `LW-BLK-003` | P1 | P2-P10 | ADR-002 module architecture required disposition | Dependency/global inventory | Maintainer | ADR-002 accepted 2026-07-30 | CLOSED |
| `LW-BLK-004` | P1 | P2-P10 | ADR-003 UI rendering strategy required disposition | UI behavior characterization and bounded spike design | Maintainer | ADR-003 accepted 2026-07-30 | CLOSED |
| `LW-BLK-005` | P1 | P3-P10 | ADR-004 is Proposed, but data owners, schemas, retention, expanded descriptor coverage, and migration fixtures remain unverified | Read-only inventory, synthetic fixtures, and decision review | Maintainer/data lead | ADR-004 accepted plus expanded inventory and independently verified synthetic migration/rollback/round-trip fixtures | OPEN |
| `LW-BLK-006` | P1 | P7-P10 | ADR-006 is Proposed; ADR-012 and gateway/LAN/worker/peer/Telegram security tests do not exist | Threat-model, boundary inventory, and mock-only contract tests | Maintainer/security lead | ADR-006 and ADR-012 accepted plus required security tests | OPEN |
| `LW-BLK-007` | P1 | P9 | Cutover and capability retirement require explicit owner approval; ADR-009 has not started | All reversible migration and verification work | Maintainer | ADR-009 accepted after parity/migration/rollback/release evidence plus verbatim approval naming affected IDs | OPEN |

No blocker may be closed by weakening a test, hiding a capability, or relabeling required behavior.

The verified `LW-P2-001` feature-free foundation does not close
`LW-BLK-005` through `LW-BLK-007`; those gates concern data semantics,
provider/security behavior, and eventual cutover that Phase 2 intentionally did
not implement.

`LW-P3-DEC-001` proposes ADR-004 through ADR-006 and keeps all three blockers
open. A green decision-packet validator is not an unblock receipt.
