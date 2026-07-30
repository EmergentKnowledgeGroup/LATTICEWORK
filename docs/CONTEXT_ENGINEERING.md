<!-- Status: CANONICAL | Owner: Maintainers -->

# Context Engineering

## Position

Compaction is not architecture.

Compaction is one continuity mechanism inside a larger engineering system. It is inherently lossy. The correct response is neither to pretend that no loss occurs nor to require every prior token to remain active forever.

The goal is to make loss bounded, visible, and recoverable.

## Durable context hierarchy

LATTICEWORK places truth in this order:

1. Executable behavior and interfaces.
2. Tests and fixtures.
3. Schemas and migrations.
4. Accepted architecture decisions.
5. Current project state and work claims.
6. Source-linked technical documentation.
7. Session handoffs.
8. Conversation history.

Conversation is useful. It is not the final authority.

## What must survive compaction

- Current objective.
- Locked constraints.
- Active work ownership.
- Accepted decisions.
- Behavioral invariants.
- Compatibility impact.
- Base and target commits.
- Commands run and evidence produced.
- Unresolved risks.
- Exact next action.

## What should not remain globally active

- Every prior brainstorming branch.
- Repeated explanations already captured in canonical docs.
- Superseded plans.
- Full logs unrelated to the current boundary.
- Duplicated source included only to remind the agent that it exists.
- Personal narratives that do not alter implementation.

## Local context packets

Each work unit should be resumable from:

- Work claim.
- Relevant architecture boundary.
- Compatibility surface.
- Relevant ADRs.
- Source files.
- Tests and fixtures.
- Latest handoff.
- Current commit.

A local context packet is successful when a competent contributor can continue without reconstructing the entire project story.

## Compaction failure signals

Compaction is failing when:

- A local change repeatedly requires reading the entire repository.
- Critical decisions exist only in chat.
- The same context must be re-explained every session.
- Agents unknowingly repeat completed work.
- A summary preserves facts but loses relationships required for action.
- Multiple docs disagree about current state.
- Tests cannot reveal whether remembered behavior was preserved.

## Architectural response

When compaction loses a critical relationship, do not only enlarge the summary.

Ask whether that relationship belongs in:

- An interface.
- A schema.
- A test.
- An ADR.
- A state document.
- A dependency rule.
- A module boundary.
- A migration contract.

## Thesis

Human recall is also lossy.

A serious system must survive context loss from humans, agents, sessions, staff turnover, time, and tooling changes.

The objective is not perfect memory.

The objective is a repository that knows enough about itself to be safely changed.
