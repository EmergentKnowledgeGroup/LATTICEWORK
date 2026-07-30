# LATTICEWORK Reengineering Control Plane

**Status:** ACTIVE
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`
**Current milestone:** M1 — executable behavioral characterization

This directory is the execution control plane for the compatibility-preserving FreeLattice reengineering. It separates current truth, obligations, decisions, evidence, and release gates from chat history.

## Read order

1. `checkpoints/LATEST.md`
2. `SPEC.md`
3. `EXECUTION_CHECKLIST.md`
4. `BLOCKERBOARD.md`
5. `BASELINE_CAPABILITY_CONTRACT.md`
6. `BASELINE_TEST_REQUIREMENT_MANIFEST.md`
7. Relevant maps, ledgers, and ADRs

## Evidence

Raw and summarized receipts live under:

```text
reengineering/evidence/<phase>/<task-id>/
```

Every completed task must name its pinned baseline and candidate commits, exact validation command, exit code, environment, and artifact hashes.

## Authority

This directory does not authorize capability loss, breaking migration, security/privacy exceptions, or cutover. Those require an explicit maintainer decision recorded in an ADR and `DECISION_LOG.md`.
