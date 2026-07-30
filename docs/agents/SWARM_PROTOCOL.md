<!-- Status: CANONICAL | Owner: Technical leads -->

# Swarm Protocol

## Purpose

The swarm exists to increase verified throughput, not to produce parallel confusion.

## Coordinator responsibilities

The coordinator must:

- Read `PROJECT_STATE.md`.
- Break work into non-overlapping units.
- Assign stable work IDs.
- Define base commit, scope, constraints, and acceptance criteria.
- Prevent two agents from editing the same boundary without coordination.
- Route sensitive decisions to maintainers.
- Require evidence before integration.
- Update project state after merge.

## Worker responsibilities

Each worker must:

- Claim scope.
- Stay inside the claimed boundary.
- State assumptions.
- Link source and tests.
- Preserve compatibility unless authorized otherwise.
- Commit coherent work.
- Produce a handoff.
- Stop when the work requires an unapproved decision.

## Reviewer responsibilities

Reviewers must:

- Reproduce the result.
- Check the exact base and target commits.
- Challenge the strongest claim.
- Inspect for deleted behavior.
- Inspect documentation accuracy.
- Verify tests are meaningful.
- Mark unknowns instead of filling gaps with confidence.

## Work partitioning

Good work units are bounded by:

- Feature.
- Interface.
- Storage schema.
- Provider adapter.
- Test suite.
- Audit question.
- Migration step.
- Documentation concern.

Bad work units are:

- Clean up the project.
- Improve architecture.
- Fix all tests.
- Make it modular.
- Optimize everything.
- Rewrite the app.

## Integration rule

A coordinator may integrate work only when:

- Scope matches the claim.
- Conflicts are resolved.
- Required tests pass.
- Documentation is updated.
- Compatibility impact is recorded.
- Evidence artifacts exist.
- Handoff is complete.

## Context reset test

Before closing a milestone, assign a fresh agent a bounded task using only repository context.

If the agent cannot locate the relevant truth, treat that as a repository defect.

## Swarm anti-patterns

- Many agents generating competing architecture plans.
- Agents self-approving their own claims.
- One agent rewriting another agent work without reading the handoff.
- Shared giant prompts that include the entire project for every task.
- Progress measured by token volume or commit count.
- Private decisions that never enter the repository.
- A coordinator merging because the output sounds authoritative.

## Stop conditions

Stop and escalate when work touches:

- User data migration.
- API keys.
- Security boundaries.
- Privacy claims.
- Identity or cryptographic semantics.
- Feature removal.
- License or provenance.
- Public benchmark publication.
- Breaking compatibility.
