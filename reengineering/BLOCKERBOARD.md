# LATTICEWORK Blockerboard

| ID | Severity | Tasks | Missing decision or evidence | Safe work | Owner | Unblock condition | Status |
|---|---|---|---|---|---|---|---|
| `LW-BLK-001` | P0 | P1-P10 | Baseline capability, launch-mode, canonical-source, data, and security obligations were not frozen | Continue additive Phase 1 characterization without mutating legacy runtime | Codex root controller | Evidence-linked Phase 0 contracts, registries, matrices, budgets, and validator complete | CLOSED |
| `LW-BLK-002` | P1 | P2-P10 | ADR-001 canonical source/build strategy required disposition | Baseline source-map and build reproduction | Maintainer | ADR-001 accepted 2026-07-30 | CLOSED |
| `LW-BLK-003` | P1 | P2-P10 | ADR-002 module architecture required disposition | Dependency/global inventory | Maintainer | ADR-002 accepted 2026-07-30 | CLOSED |
| `LW-BLK-004` | P1 | P2-P10 | ADR-003 UI rendering strategy required disposition | UI behavior characterization and bounded spike design | Maintainer | ADR-003 accepted 2026-07-30 | CLOSED |
| `LW-BLK-005` | P1 | P3-P10 | Data stores, keys, unknown-field preservation, and migration versions are incomplete | Read-only data inventory and fixtures | Maintainer/data lead | Accepted data-storage ADR (number unassigned) and verified inventory | OPEN |
| `LW-BLK-006` | P1 | P7-P10 | Optional gateway/LAN/worker/Telegram trust protocols are unaccepted | Threat-model and boundary inventory | Maintainer/security lead | Accepted security ADR set (numbers unassigned) and tests | OPEN |
| `LW-BLK-007` | P1 | P9 | Cutover and capability retirement require explicit owner approval | All reversible migration and verification work | Maintainer | Verbatim approval with affected IDs | OPEN |

No blocker may be closed by weakening a test, hiding a capability, or relabeling required behavior.

The verified `LW-P2-001` feature-free foundation does not close
`LW-BLK-005` through `LW-BLK-007`; those gates concern data semantics,
provider/security behavior, and eventual cutover that Phase 2 intentionally did
not implement.
