<!-- Status: LIVING | Owner: Audit and verification leads -->

# Reproducible Comparison

## Purpose

This document compares a pinned FreeLattice baseline with a pinned LATTICEWORK release.

It is not a general judgment about people, intent, or every version of either project.

## Compared versions

| Project | Commit or tag | Date | Environment |
|---|---|---|---|
| FreeLattice | `e7585999fc1af2707f410ae87356cf2b52e08d9c` / local `v0.0.0-upstream-baseline` | 2026-07-30 | [Phase 0 environment receipt](../reengineering/evidence/phase-0/LW-P0-001-environment/manifest.json) |
| LATTICEWORK | no rewritten runtime or release yet; Phase 0 control checkout remains based on `e7585999fc1af2707f410ae87356cf2b52e08d9c` | 2026-07-30 | same control machine; candidate comparison unavailable |

## Fair-comparison rules

- Same metric definition.
- Same exclusions.
- Same tool version.
- Same environment where relevant.
- Raw output retained.
- No tuning only one side after seeing results.
- Feature and compatibility scope stated beside each metric.
- Missing behavior cannot be counted as optimization.
- Screenshots may illustrate evidence but cannot be the only evidence.

## Structural comparison

| Metric | FreeLattice | LATTICEWORK | Interpretation | Receipt |
|---|---:|---:|---|---|
| First-party source lines | 302,560 | not measured; rewritten runtime absent | Baseline is physical LOC under the documented source classifier; no reduction claim exists | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| First-party source files | 220 | not measured; rewritten runtime absent | Candidate comparison is blocked until the canonical build/source ADR is accepted | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Largest source file | 65,387 lines (`docs/app.html`; exact duplicate `index.html`) | not measured; rewritten runtime absent | File concentration is observed, not a quality verdict | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Exact duplicate source | 9 groups; 75,123 redundant lines | not measured; rewritten runtime absent | Exact byte duplicates only; structural similarity is not counted | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Dependency cycles | unknown | unknown | No module-graph cycle methodology is frozen yet | none |
| Assigned browser globals | 244 statically extracted `window` symbols; 24 major globals mapped | not measured; rewritten runtime absent | Static assignment presence does not establish mutation/reachability | [inventory](../reengineering/evidence/phase-0/LW-M0-INV-001/window-symbol-assignments.json) |
| Smoke checks discovered | 3,213 | not applicable; rewritten runtime absent | Baseline harness is a cumulative source/release ledger | [smoke receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |
| Passing smoke checks | 3,106 | not applicable; rewritten runtime absent | Exit remains nonzero | [smoke receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |
| Failing smoke checks | 107 | not applicable; rewritten runtime absent | Failures remain preserved and dispositioned, not deleted | [smoke receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |

## Behavior comparison

Link to `COMPATIBILITY.md` and summarize only verified results.

## Operational comparison

Measure:

- Clean setup time.
- Time to first successful run.
- Time to locate a feature owner.
- Number of files required for a bounded change.
- Regression detection.
- Data migration safety.
- Recovery from interrupted agent work.
- Build and test reproducibility.

## Context-navigability experiments

Define a blinded task set.

For each task, record:

- Starting repository state.
- Documents provided.
- Agent or human operator.
- Context budget.
- Time to locate relevant boundaries.
- Files read.
- Incorrect edits attempted.
- Tests run.
- Completion result.
- Handoff quality.

Do not generalize from one run.

## Conclusion

No structural or behavioral superiority claim is authorized. Phase 0 has a
reproducible FreeLattice baseline; LATTICEWORK does not yet have a rewritten
runtime or release that can be compared fairly.
