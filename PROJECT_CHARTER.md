<!-- Status: CANONICAL | Owner: Maintainers | Agents: propose changes through review -->

# Project Charter

## Mission

LATTICEWORK will reengineer FreeLattice into a system whose behavior, architecture, data, and verification surfaces remain understandable and modifiable without requiring one continuous global context window.

## Core hypothesis

Complex software does not become agent-navigable by retaining every prior token forever. It becomes agent-navigable by placing durable truth in explicit boundaries, tests, schemas, decisions, interfaces, and handoffs.

## Primary objectives

1. Preserve and characterize worthwhile upstream behavior.
2. Build a reproducible compatibility contract before broad replacement.
3. Replace monolithic and implicit change surfaces with explicit, navigable boundaries.
4. Reduce accidental context requirements without pretending that context loss is free.
5. Make every public comparison reproducible from pinned commits.
6. Support reliable human-agent and multi-agent contribution across interrupted sessions.
7. Maintain local-first and user-controlled behavior unless an intentional divergence is documented and approved.
8. Produce a distinct, maintainable project rather than an unofficial upstream impersonation.

## Non-goals

LATTICEWORK will not:

- Delete complex features merely to produce smaller source.
- Treat fewer lines or more files as proof of better architecture.
- Preserve bugs for the sake of superficial parity.
- Claim architectural superiority based on screenshots alone.
- Use project documentation to attack, diagnose, or speculate about upstream people.
- Promise full compatibility before the verification matrix is complete.
- Convert a technical disagreement into a contributor pile-on.
- Depend on private chat logs as the only explanation for public code.

## Success conditions

LATTICEWORK reaches a credible 1.0 state only when:

- The supported feature set is enumerated and tested.
- Every intentional divergence is documented.
- User data migration and recovery paths are verified.
- Privacy and security claims have explicit evidence.
- Core workflows pass clean-room acceptance tests.
- The architecture map matches the implementation.
- A new agent can complete a bounded change from repository context without a private briefing.
- Public performance and maintainability claims can be reproduced by third parties.
- The project has a release and rollback process that does not depend on one maintainer memory.

## Failure conditions

The project has failed its charter if it becomes:

- A personal revenge artifact.
- A compatibility claim without a compatibility harness.
- A clean-looking rewrite that lost the heart of the original.
- A new monolith wearing better branding.
- An agent swarm that produces volume without accountable ownership.
- A documentation theater layer that does not match the code.

## Decision filter

Before accepting a major change, ask:

1. What user-visible or system behavior does this preserve or improve?
2. Which boundary becomes clearer?
3. Which context dependency is removed or externalized?
4. What evidence proves the change?
5. What new risk or coupling is introduced?
6. Can the next contributor understand this from the repository alone?
