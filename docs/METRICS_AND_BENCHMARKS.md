<!-- Status: LIVING | Owner: Performance and audit leads -->

# Metrics and Benchmarks

## Rule

A metric is not a verdict.

Metrics become useful only when the definition, environment, workload, feature scope, and limitations are explicit.

## Environment record

| Field | Value |
|---|---|
| Date | 2026-07-30 |
| OS | Microsoft Windows 10.0.19045, x64 |
| CPU | 12th Gen Intel Core i9-12900K, 24 logical processors |
| Memory | 68,423,118,848 bytes |
| GPU | Intel UHD Graphics 770; NVIDIA GeForce RTX 3090 Ti |
| Browser | Google Chrome 150.0.7871.187; Microsoft Edge 150.0.4078.105 installed |
| Runtime | Node 24.13.0; Python 3.13.12 |
| Tool versions | npm 11.6.2; Git 2.50.1.windows.1; PowerShell 7.6.3; ripgrep 15.1.0 |
| Network condition | Unthrottled loopback for current browser receipt; external/local discovery requests were still attempted |
| Upstream commit | `e7585999fc1af2707f410ae87356cf2b52e08d9c` |
| LATTICEWORK commit | `e7585999fc1af2707f410ae87356cf2b52e08d9c` plus uncommitted Phase 0 control artifacts |

Environment values are **MEASURED** in the
[Phase 0 environment receipt](../reengineering/evidence/phase-0/LW-P0-001-environment/manifest.json).

## Structural metrics

Define and automate:

- Source lines by language and path.
- Largest source surfaces.
- File concentration.
- Exact duplication.
- Token or AST duplication.
- Dependency cycles.
- Global symbols.
- Change coupling.
- Test-to-source ratio.
- Documentation-to-source linkage.
- Dead or unreachable code.

## Runtime metrics

Define representative workloads for:

- Startup.
- First interaction.
- Chat latency.
- Storage read and write.
- Import and export.
- Service-worker update.
- Local model connection.
- Cloud provider connection.
- Peer-to-peer setup.
- Memory growth.
- Error recovery.

The exact fixed profiles, provisional ceilings, evidence requirements, and
promotion rule are in
[the Phase 0 performance measurement plan](../reengineering/PERFORMANCE_PLAN.md).

## Agent navigability metrics

Possible indicators:

- Time to locate the relevant boundary.
- Files read before first correct edit.
- Context tokens consumed.
- Incorrect files modified.
- Tests discovered and run.
- Number of handoff questions.
- Completion rate after context reset.
- Regression rate.
- Ability to explain the change from repository evidence.

These experiments require multiple runs and controlled prompts.

## Raw artifacts

Store machine-readable output under:

`reengineering/evidence/[PHASE]/[WORK-ID]/`

Every table in this document must link to the raw artifact.

## Results

**MEASURED:** one Chrome desktop cold-load observation reported approximately
1,593 ms DOMContentLoaded, 1,693 ms load, and 2,780,108 navigation transfer
bytes. It is a single run, not an accepted budget or regression verdict. See the
[browser receipt](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md).

**UNKNOWN:** controlled warm runs, repeatability, aggregate resource transfer,
emitted bundle sizes, long tasks, heap/GPU recovery, physical-mobile
performance, cross-browser/OS behavior, desktop-shell performance, and
accessibility-profile performance.

**PROPOSED:** the ceilings in `reengineering/PERFORMANCE_PLAN.md` govern the
first additive candidate slice until five-run baseline and candidate receipts
justify a revision.
