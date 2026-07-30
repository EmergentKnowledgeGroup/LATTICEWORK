<!-- Status: CANONICAL | Owner: Maintainers -->

# Documentation Standard

## Goal

Any human or agent should be able to locate the current technical truth without guessing which giant log, hidden repository, private thread, or historical conversation contains it.

## One concern, one canonical home

Each major concern must have one canonical document:

- Current state → `PROJECT_STATE.md`
- Architecture → `docs/ARCHITECTURE.md`
- Compatibility → `docs/COMPATIBILITY.md`
- Divergences → `docs/DIVERGENCES.md`
- Audit findings → `docs/AUDIT_FINDINGS.md`
- Public claims → `docs/CLAIMS_LEDGER.md`
- Release history → `CHANGELOG.md`
- Decisions → `docs/decisions/`

Other documents may link to canonical truth but should not create competing versions.

## Root discoverability

The root README must link to all mandatory orientation documents.

A new contributor should not need to discover a separate repository or undocumented file name before understanding how to work.

## Required metadata

Living technical documents should state:

- Status.
- Owner.
- Last verified commit.
- Last verified date.
- Evidence links.
- Known unknowns.
- Update trigger.

## Source linkage

Technical statements should link to:

- Source path and symbol.
- Test or fixture.
- ADR.
- Command output.
- Commit or release.
- Raw artifact.

## Generated evidence

Raw machine output belongs in a stable artifact location and should not be pasted into multiple prose documents.

Prose should summarize and link.

## Update rule

When code changes reality, the same pull request must update the relevant living documentation.

When documentation reveals a mismatch, open or fix the defect.

## Historical logs

Logs are useful history, but they are not a substitute for current state.

Do not make contributors read hundreds of chronological entries to discover the present architecture or next action.

## Writing standard

Use:

- Direct language.
- Defined terms.
- Explicit evidence labels.
- Concrete file and symbol names.
- Tables for status and comparison.
- Diagrams where relationships matter.
- Unknown when the truth is unknown.

Avoid:

- Mystical language as technical explanation.
- Praise as verification.
- Vague references such as read the alpha file without a path or link.
- Claims that depend on reader trust.
- Long narrative where a contract or schema would be clearer.
