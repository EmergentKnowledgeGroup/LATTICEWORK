# LATTICEWORK Blockerboard

| ID | Severity | Tasks | Missing decision or evidence | Safe work | Owner | Unblock condition | Fallback/backout | Status |
|---|---|---|---|---|---|---|---|---|
| `LW-BLK-001` | P0 | P1-P10 | Baseline capability, launch-mode, canonical-source, data, and security obligations were not frozen | Continue additive Phase 1 characterization without mutating legacy runtime | Codex root controller | Evidence-linked Phase 0 contracts, registries, matrices, budgets, and validator complete | Preserve immutable baseline; revert candidate-only control files | CLOSED |
| `LW-BLK-002` | P1 | P2-P10 | ADR-001 canonical source/build strategy required disposition | Baseline source-map and build reproduction | Maintainer | ADR-001 accepted 2026-07-30 | Keep baseline authoritative; do not choose a build source implicitly | CLOSED |
| `LW-BLK-003` | P1 | P2-P10 | ADR-002 module architecture required disposition | Dependency/global inventory | Maintainer | ADR-002 accepted 2026-07-30 | Preserve legacy module graph | CLOSED |
| `LW-BLK-004` | P1 | P2-P10 | ADR-003 UI rendering strategy required disposition | UI behavior characterization and bounded spike design | Maintainer | ADR-003 accepted 2026-07-30 | Preserve legacy rendering route | CLOSED |
| `LW-BLK-005` | P1 | P3-P10 | ADR-004 is accepted and the bounded synthetic conversation slice is independently verified; broader data owners, schemas, retention, descriptor coverage, and every real-data migration remain incomplete | Extend inventory and design the next separately claimed synthetic descriptor; no real data | Maintainer/data lead | Expanded inventory plus independently verified per-dataset migration/rollback/round-trip evidence before any real-data authority | Leave legacy data authoritative; remove only inactive synthetic candidate state | OPEN |
| `LW-BLK-006` | P1 | P7-P10 | ADR-006 is accepted; ADR-012 and gateway/LAN/worker/peer/Telegram security tests do not exist | Mock-only provider contracts may proceed; no listener | Maintainer/security lead | ADR-012 accepted plus required security tests | Keep every optional network service absent/disabled | OPEN |
| `LW-BLK-007` | P1 | P9 | Cutover and capability retirement require explicit owner approval; ADR-009 has not started | All reversible migration and verification work | Maintainer | ADR-009 accepted after parity/migration/rollback/release evidence plus verbatim approval naming affected IDs | Keep legacy capability and route authoritative | OPEN |
| `LW-BLK-008` | P0 | P4 | Phase 3 historical scope validators incorrectly extended through current HEAD/untracked state, causing legitimate later-phase files to fail 2 canonical controls | Exact phase-closed validator/test repair and additive active Phase 4 scope validator only | Codex root controller | 48 focused controls, 116 full repository controls, force-added staging rejection, add-then-delete retention, and independent guardrail GREEN without Phase 3 allowlist expansion | Revert control repair; do not widen allowlists or suppress failures | CLOSED |
| `LW-BLK-009` | P1 | P4-P10 | The maintainer accepted eight confirmed baseline defects as divergences and authorized one run-owned loopback synthetic stream fixture | Retest only the eleven cases frozen in `PHASE4_CHARACTERIZATION_AMENDMENT.md`; no candidate implementation | Codex root controller; independent QA reviewer | Canonical and independent amended evidence reports 31 PASS, 8 ACCEPTED_DIVERGENCE, 0 BLOCKED; original hashes/statuses preserved; listener teardown and cleanup proven | Keep legacy default and Phase 3 packages inactive; preserve original evidence | CLOSED |
| `LW-BLK-010` | P1 | P4-P10 | Exact bounded implementation authority required a corrected packet, fail-closed validator, independent review, and maintainer acceptance | Validate/review `PHASE4_IMPLEMENTATION_PACKET.md` only before implementation | Maintainer; independent QA reviewer | Exact packet is accepted; both validators valid; 41/41 focused and 180/180 full controls pass; independent re-review GREEN | Keep legacy default; remove only the non-default candidate slice | CLOSED |
| `LW-BLK-011` | P0 | P5-P10 | Phase 4 active and implementation scope validators extended through later descendants, causing legitimate Phase 5 files to fail closed-phase controls | Close both Phase 4 ranges at the merged terminal and add one exact active Phase 5 validator | Codex root controller; independent QA reviewer | 46/46 focused controls, 193/193 full repository controls, add-then-delete retention, all active path classes, and independent guardrail GREEN without Phase 4 allowlist expansion | Revert only the boundary repair; do not suppress paths or widen Phase 4 ownership | CLOSED |

No blocker may be closed by weakening a test, hiding a capability, or relabeling required behavior.

The verified `LW-P2-001` feature-free foundation and bounded synthetic/mock
`LW-P3-001` storage/provider foundation do not close `LW-BLK-005` through
`LW-BLK-007`; those gates concern broader data semantics, real provider and
security behavior, and eventual cutover that these work units intentionally do
not implement.

`LW-BLK-008` is a control-plane defect, not permission to widen Phase 3 scope.
Its repair must pin Phase 3 to a closed historical commit range and add a
separate fail-closed Phase 4 active-scope control. `LW-BLK-009` and
`LW-BLK-010` keeps characterization and implementation authority separate.

ADR-004 through ADR-006 are accepted, but all three blockers remain open until
their remaining evidence and later-decision conditions are independently
verified. Acceptance alone is not a blocker-closure receipt.

The implemented non-default `LW-P4-001` synthetic Chat slice does not change
that conclusion. It uses only candidate storage and in-process mocks; no real
data, credential, provider protocol, listener, activation, deployment, or
cutover evidence is added. `LW-BLK-005` through `LW-BLK-007` therefore remain
open.

`LW-BLK-011` repeats the Phase 3-to-Phase 4 lesson at the next boundary:
historical Phase 4 validators are now closed at merge commit
`1b7e1d10456e0a1e9aaa91df25db17e236bbea3e`, while a separate Phase 5
validator owns current committed and dirty paths. No Phase 4 allowlist was
expanded.

`LW-P5-MEM-PREFLIGHT-001` authorizes only the exact synthetic browser
characterization of immutable `docs/modules/lattice-memory.js`. It does not
close `LW-BLK-005` and grants no real-data migration, candidate storage,
activation, deployment, or cutover authority.

`LW-P5-MEM-CHAR-001` is now canonical and independently GREEN: all 69 atoms
pass, with 53 `MATCH` and 16 `ACCEPTED_DIVERGENCE_CANDIDATE` dispositions.
This closes only the synthetic legacy-characterization gate. `LW-BLK-005`
remains open because no real stored record was read, migrated, round-tripped,
or rolled back, and characterization grants no candidate implementation or
candidate-storage authority.
