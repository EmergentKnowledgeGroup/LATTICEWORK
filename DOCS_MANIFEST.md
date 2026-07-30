<!-- Status: CANONICAL | Owner: Maintainers | Agents: propose changes through review -->

# Documentation Manifest

This file defines the canonical documentation surface for LATTICEWORK.

## Document classes

| Class | Meaning | Update rule |
|---|---|---|
| **CANONICAL** | Identity, policy, scope, governance, or project doctrine | Maintainer approval required |
| **LIVING** | Current technical truth, status, measurements, or migration state | Update in the same change that alters reality |
| **GENERATED** | Produced by scripts or CI from pinned inputs | Never hand-edit unless the generator is also fixed |
| **TEMPLATE** | Starting structure for repeatable work | Copy, complete, and store in the correct location |

## Root documents

| File | Class | Purpose | Required update trigger |
|---|---|---|---|
| `README.md` | CANONICAL | Public front door and project positioning | Material scope or release-state change |
| `AGENTS.md` | CANONICAL | Mandatory orientation and operating rules for AI contributors | Agent workflow or authority model changes |
| `PROJECT_CHARTER.md` | CANONICAL | Mission, objectives, non-goals, and success criteria | Maintainer-approved scope change |
| `ORIGIN.md` | CANONICAL | Factual explanation of why the project exists | Provenance or public narrative correction |
| `VOICE_AND_POSITIONING.md` | CANONICAL | Public language, slogans, boundaries, and prohibited framing | Brand or communications policy change |
| `BRAND.md` | CANONICAL | Name, tagline, identity, and non-confusion rules | Brand decision |
| `PRINCIPLES.md` | CANONICAL | Engineering and evidence principles | Maintainer-approved doctrine change |
| `PROVENANCE.md` | LIVING | Exact upstream origin, commit, date, and lineage | Upstream baseline or sync |
| `UPSTREAM.md` | CANONICAL | Relationship with FreeLattice and sync policy | Relationship or sync policy change |
| `NOTICE.md` | LIVING | Attribution and modification notice | Copyright or material attribution change |
| `LICENSE` | CANONICAL | Preserved MIT license text | Never alter without legal review |
| `GOVERNANCE.md` | CANONICAL | Roles, decision rights, and review authority | Governance change |
| `CONTRIBUTING.md` | CANONICAL | Contribution requirements and workflow | Contribution process change |
| `CODE_OF_CONDUCT.md` | CANONICAL | Conduct rules focused on work, evidence, and safety | Conduct policy change |
| `SECURITY.md` | LIVING | Vulnerability reporting and supported versions | Contact, scope, or release support change |
| `PRIVACY.md` | LIVING | Local-first, telemetry, storage, and data promises | Any data-flow change |
| `PROJECT_STATE.md` | LIVING | Current operational state and next handoff | Every merged workstream or handoff |
| `ROADMAP.md` | LIVING | Milestones and exit criteria | Priority or milestone change |
| `CHANGELOG.md` | LIVING | Human-readable release history | Every release |

## Technical documents

| File | Class | Purpose |
|---|---|---|
| `docs/BASELINE.md` | LIVING | Immutable characterization of the pinned upstream state |
| `docs/ARCHITECTURE.md` | LIVING | Current architecture, target architecture, boundaries, and maps |
| `docs/REENGINEERING_METHOD.md` | CANONICAL | Required sequence for safe behavior-preserving reengineering |
| `docs/CONTEXT_ENGINEERING.md` | CANONICAL | LATTICEWORK position on context, compaction, memory, and resumability |
| `docs/DOCUMENTATION_STANDARD.md` | CANONICAL | How technical truth is externalized and discovered |
| `docs/COMPATIBILITY.md` | LIVING | Compatibility contract and feature matrix |
| `docs/COMPARISON.md` | LIVING | Pinned, reproducible upstream versus LATTICEWORK comparison |
| `docs/DIVERGENCES.md` | LIVING | Intentional behavior and design differences |
| `docs/MIGRATION.md` | LIVING | Migration map, sequencing, and rollback rules |
| `docs/AUDIT_METHODOLOGY.md` | CANONICAL | Audit procedure, limitations, and evidence requirements |
| `docs/AUDIT_FINDINGS.md` | LIVING | Verified findings only |
| `docs/CLAIMS_LEDGER.md` | LIVING | Public claims tied to receipts |
| `docs/METRICS_AND_BENCHMARKS.md` | LIVING | Measurement definitions, commands, environments, and results |
| `docs/TESTING_AND_VERIFICATION.md` | LIVING | Test inventory, gates, and acceptance rules |
| `docs/RELEASE_PROCESS.md` | CANONICAL | Release stages and evidence gates |
| `docs/KNOWN_LIMITATIONS.md` | LIVING | Known gaps, risks, and incomplete areas |
| `docs/DEPENDENCY_INVENTORY.md` | LIVING | Runtime, build, external-service, and license inventory |
| `docs/DATA_AND_STORAGE.md` | LIVING | Storage schemas, migrations, retention, export, and recovery |
| `docs/PUBLIC_FAQ.md` | LIVING | Public answers to predictable questions |
| `docs/UPSTREAM_SYNC_LOG.md` | LIVING | Every accepted or rejected upstream sync |
| `docs/decisions/` | LIVING | Architecture Decision Records |
| `docs/agents/` | CANONICAL/TEMPLATE | Swarm protocol, work claims, sessions, and handoffs |

## GitHub workflow files

The `.github` directory contains pull request and issue templates. These files are part of the evidence system. A change that bypasses their required fields must explain why.
