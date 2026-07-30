<!-- Status: CANONICAL | Owner: Audit lead -->

# Audit Methodology

## Purpose

The audit establishes reproducible facts about a pinned repository state.

It does not infer personality, competence, intent, or moral worth from code.

## Evidence categories

- **Source evidence** — files, symbols, commits, dependencies, and history.
- **Runtime evidence** — observed behavior, errors, traces, network calls, storage changes.
- **Test evidence** — command, output, exit code, coverage, and assertion quality.
- **Structural evidence** — duplication, coupling, cycles, file concentration, ownership, and boundaries.
- **Operational evidence** — setup, build, release, recovery, and handoff.
- **Documentation evidence** — discoverability, accuracy, contradiction, and stale state.

## Audit sequence

1. Pin the commit.
2. Record environment.
3. Preserve raw source and output.
4. Run documented setup without fixes.
5. Run existing tests.
6. Inventory source, dependencies, storage, and network behavior.
7. Reproduce candidate findings.
8. Separate observation from inference.
9. Attempt disconfirmation.
10. Require independent review for major claims.
11. Publish limitations.

## Measurement requirements

Every measurement must include:

- Metric definition.
- Included paths.
- Excluded paths.
- Tool and version.
- Exact command.
- Commit SHA.
- Environment.
- Raw output.
- Interpretation limits.

## Duplication analysis

Duplication must distinguish:

- Exact duplicate lines.
- Duplicate blocks.
- Generated or vendored code.
- Intentional mirrored artifacts.
- Test fixtures.
- Similar behavior implemented separately.
- Dead or unreachable copies.

Do not convert a duplication number directly into a quality verdict.

## Test analysis

Record:

- Tests discovered.
- Tests executed.
- Tests skipped.
- Tests passed.
- Tests failed.
- Exit code.
- Flakiness.
- Assertions that do not verify behavior.
- Runtime errors not captured by tests.
- Whether the test suite matches the documented claim.

## Architecture analysis

Assess:

- Boundary clarity.
- Dependency direction.
- Global state.
- Change radius.
- Data ownership.
- Interface stability.
- Error containment.
- Test seams.
- Documentation discoverability.
- Handoff requirements.

## Fairness controls

- Use the strongest available upstream instructions.
- Do not intentionally misconfigure the project.
- Record setup failures before attempting fixes.
- Separate baseline results from patched results.
- Invite correction of factual errors.
- Update claims when evidence changes.
- Preserve the original receipt.

## Limitations

Every audit report must state what was not tested and what remains unknown.
