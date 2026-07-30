<!-- Status: LIVING | Owner: Audit and verification leads -->

# Reproducible Comparison

## Purpose

This document compares a pinned FreeLattice baseline with a pinned LATTICEWORK release.

It is not a general judgment about people, intent, or every version of either project.

## Compared versions

| Project | Commit or tag | Date | Environment |
|---|---|---|---|
| FreeLattice | `e7585999fc1af2707f410ae87356cf2b52e08d9c` / local `v0.0.0-upstream-baseline` | 2026-07-30 | [Phase 0 environment receipt](../reengineering/evidence/phase-0/LW-P0-001-environment/manifest.json) |
| LATTICEWORK | `7e928bba605e0309273989bf8fd1303d2a822923` (feature-free Phase 2 foundation, not a release) | 2026-07-30 | same control machine; [bounded candidate evidence](../reengineering/evidence/phase-2/LW-P2-001/README.md) |

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
| First-party source lines | 302,560 | not compared; candidate has no equivalent feature scope | Baseline is physical LOC under the documented source classifier; missing features cannot be counted as reduction | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| First-party source files | 220 | not compared; candidate is a bounded foundation | The canonical candidate source boundary is verified, but a like-for-like runtime does not exist | [candidate evidence](../reengineering/evidence/phase-2/LW-P2-001/README.md) |
| Largest source file | 65,387 lines (`docs/app.html`; exact duplicate `index.html`) | not compared | File concentration is observed, not a quality verdict; the candidate lacks equivalent features | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Exact duplicate source | 9 groups; 75,123 redundant lines | not compared | Exact byte duplicates only; Phase 2 does not authorize a reduction claim | [baseline summary](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Dependency cycles | unknown | unknown | No module-graph cycle methodology is frozen yet | none |
| Assigned browser globals | 244 statically extracted `window` symbols; 24 major globals mapped | candidate shell exposes no legacy feature globals | Different feature scope; this is a boundary observation, not a superiority claim | [inventory](../reengineering/evidence/phase-0/LW-M0-INV-001/window-symbol-assignments.json) |
| Smoke checks discovered | 3,213 | 37 repository controls, 5 kernel tests, and 6 browser scenarios | Test counts have different scopes and cannot be compared as product quality | [testing contract](TESTING_AND_VERIFICATION.md) |
| Passing smoke checks | 3,106 | all bounded Phase 2 gates pass | The legacy exit remains nonzero; candidate success does not erase baseline obligations | [candidate validation](../reengineering/evidence/phase-2/LW-P2-001/validation.json) |
| Failing smoke checks | 107 | zero in the bounded candidate suites | Different scope; failures remain preserved and dispositioned, not deleted | [smoke receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |

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

No structural or behavioral superiority claim is authorized. LATTICEWORK now
has a reproducible feature-free foundation, but it does not have equivalent
feature scope or a release that can be compared fairly with the preserved
FreeLattice runtime.
