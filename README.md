# LATTICEWORK

**A lattice that works.**

LATTICEWORK is a compatibility-conscious reengineering of [FreeLattice](https://github.com/Chaos2Cured/FreeLattice), derived under the MIT License.

The project preserves worthwhile user-visible behavior while replacing unnecessary duplication, implicit coupling, global-context dependency, and monolithic change surfaces with explicit boundaries, reproducible verification, and resumable human-agent workflows.

> **Complexity is not just size. It is how many boundaries stay navigable.**

> **Context is not architecture.**

> **Compaction should remove redundancy, not meaning.**

## Current status

**Pre-alpha reengineering.**

The immutable baseline and bounded browser characterization are frozen. The
first feature-free typed candidate foundation is implemented and independently
verified, while all legacy features, stored data, providers, deployment routes,
and release/cutover work remain unmigrated. LATTICEWORK must not be described
as a drop-in replacement until the compatibility evidence supports that claim.

## Why this exists

A public engineering disagreement raised a testable question:

> Is persistent global context inherently necessary for complex agent-maintained software, or can architecture externalize enough state, invariants, and boundaries that work remains navigable after context loss?

This repository is the answer.

The answer will not be delivered through posture, personality, or social-media argument. It will be delivered through source history, reproducible measurements, compatibility evidence, passing verification, and software that remains understandable after the original context window is gone.

## What this project is

- A preserved and attributable fork lineage.
- A behavior-first reengineering effort.
- A public architecture and verification demonstration.
- A distinct project with an independent roadmap.
- A practical test of disciplined human-agent software development.

## What this project is not

- A cosmetic reskin.
- A stripped-down rewrite that deletes difficult behavior and declares success.
- A claim of superiority without receipts.
- An impersonation of, endorsement by, or official continuation of the upstream project.
- A personal attack on upstream authors or contributors.

## Proof surfaces

Start here:

- [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) — mission, success conditions, and non-goals
- [`PROVENANCE.md`](PROVENANCE.md) — exact upstream lineage and baseline
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) — behavior preservation contract
- [`docs/AUDIT_METHODOLOGY.md`](docs/AUDIT_METHODOLOGY.md) — how findings are produced
- [`docs/CLAIMS_LEDGER.md`](docs/CLAIMS_LEDGER.md) — every public claim and its evidence
- [`docs/METRICS_AND_BENCHMARKS.md`](docs/METRICS_AND_BENCHMARKS.md) — reproducible measurements
- [`docs/TESTING_AND_VERIFICATION.md`](docs/TESTING_AND_VERIFICATION.md) — verification gates
- [`docs/COMPARISON.md`](docs/COMPARISON.md) — pinned, like-for-like upstream comparison
- [`PROJECT_STATE.md`](PROJECT_STATE.md) — current work, blockers, and next handoff
- [`AGENTS.md`](AGENTS.md) — mandatory entry point for AI contributors

## License and attribution

Original FreeLattice portions remain under the upstream MIT License and retain the required copyright and permission notice. LATTICEWORK modifications are documented separately in [`NOTICE.md`](NOTICE.md) and [`PROVENANCE.md`](PROVENANCE.md).

LATTICEWORK is not affiliated with or endorsed by the upstream project or its maintainers.

---

**Same problem. Better boundaries.**

**Built in public. Explained at the root. No scavenger hunt required.**
