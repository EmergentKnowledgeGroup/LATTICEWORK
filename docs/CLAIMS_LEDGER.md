<!-- Status: LIVING | Owner: Verification lead -->

# Claims Ledger

Every public technical claim must appear here before publication.

## Claim states

- `DRAFT`
- `SUPPORTED`
- `VERIFIED`
- `DISPUTED`
- `SUPERSEDED`
- `WITHDRAWN`

## Ledger

| ID | Public claim | State | Target versions | Evidence | Method | Independent review | Last checked |
|---|---|---|---|---|---|---|---|
| `CLM-001` | At commit `7e928bba...`, the feature-free LATTICEWORK candidate foundation passes its bounded Phase 2 type, unit, control, deterministic-build, browser-safety, supply-chain, protected-boundary, and evidence gates. | `VERIFIED` | baseline `e7585999...`; candidate `7e928bba...` | `reengineering/evidence/phase-2/LW-P2-001/` | canonical port-4174 run plus separate-worktree port-4183 reproduction | independent QA accepted the bounded work unit | 2026-07-30 |
| `CLM-002` | LATTICEWORK is not yet a drop-in replacement, feature-parity implementation, or release-ready product. | `SUPPORTED` | current repository state | `docs/COMPATIBILITY.md`; `reengineering/RELEASE_READINESS.md` | open compatibility, data, security, and cutover gates | consistent with Phase 2 independent-review boundary | 2026-07-30 |

No broader product, compatibility, superiority, performance, or release claim
is authorized by the Phase 2 foundation evidence.

## Claim requirements

A supported claim must identify:

- Exact wording.
- Scope.
- Pinned commits or releases.
- Metric definition.
- Raw evidence.
- Method.
- Limitations.
- Reviewer.
- Date.

## Forbidden shortcuts

Do not publish:

- `LATTICEWORK is faster` without workload and environment.
- `LATTICEWORK is smaller` without feature scope and exclusions.
- `LATTICEWORK is more maintainable` without defined indicators.
- `LATTICEWORK preserves everything` without compatibility evidence.
- `FreeLattice tests are broken` without exact command and baseline.
- `The architecture requires full context` without a reproducible task or dependency analysis.
- `No backend` or `fully local` without network verification.

## Correction policy

When a claim is wrong:

1. Mark it disputed or withdrawn.
2. Preserve the original wording and receipt.
3. Publish the correction.
4. Explain what changed.
5. Update dependent documents and media.

Being willing to correct a claim is part of the evidence system.
