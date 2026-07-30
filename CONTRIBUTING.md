<!-- Status: CANONICAL | Owner: Maintainers -->

# Contributing

LATTICEWORK welcomes contributions that make the system more correct, navigable, compatible, secure, testable, and understandable.

## Before starting

Read `AGENTS.md`, `PROJECT_STATE.md`, and the relevant technical documents.

Search existing issues, work claims, and pull requests to avoid duplicate or conflicting work.

## Contribution requirements

Every pull request must state:

- Base commit.
- Problem being solved.
- User-visible or system behavior affected.
- Compatibility surfaces affected.
- Invariant being preserved or changed.
- Files and boundaries changed.
- Tests and commands run.
- Evidence artifacts.
- Known risks.
- Documentation updated.
- Rollback approach for structural or sensitive changes.

## Pull request scope

Prefer one coherent boundary change per pull request.

Do not combine:

- Broad formatting with behavior changes.
- Dependency replacement with unrelated features.
- Data migrations with visual redesign.
- Benchmark changes with source changes that alter the benchmark target.
- Audit claims with fixes that erase the baseline evidence.

## Commit messages

Use clear, factual messages.

Recommended prefixes:

- `audit:`
- `test:`
- `fix:`
- `refactor:`
- `architecture:`
- `compat:`
- `migration:`
- `docs:`
- `security:`
- `release:`

## Review standard

Reviewers should ask:

1. Is the behavior clearly stated?
2. Is the evidence reproducible?
3. Does the change reduce or merely move complexity?
4. Are new boundaries explicit?
5. Is compatibility preserved or intentionally diverged?
6. Does documentation match the implementation?
7. Can another contributor resume from the repository?

## AI-generated contributions

AI assistance is welcome.

The submitter remains responsible for:

- Understanding the change.
- Verifying generated code.
- Disclosing material agent involvement in the pull request.
- Removing fabricated references or unsupported claims.
- Confirming licenses and provenance.
- Responding to review.

## Respecting upstream

Critique code and claims with evidence. Do not use issues or pull requests to pursue personal disputes.
