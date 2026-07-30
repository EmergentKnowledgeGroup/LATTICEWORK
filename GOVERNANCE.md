<!-- Status: CANONICAL | Owner: Maintainers -->

# Governance

## Roles

### Maintainers

Maintainers hold final authority over:

- Project charter and principles.
- Brand and public positioning.
- License and attribution handling.
- Security and privacy policy.
- Release approval.
- Breaking compatibility decisions.
- Feature removal.
- Accepted architecture decisions.
- Contributor access and moderation.

### Technical leads

Technical leads may:

- Approve implementation within accepted architecture.
- Coordinate workstreams.
- Review compatibility and migration evidence.
- Accept non-breaking technical ADRs.
- Require additional verification.
- Stop a workstream that threatens data, security, provenance, or project integrity.

### Contributors

Contributors may:

- Claim bounded work.
- Submit code, tests, documentation, audits, and proposals.
- Challenge claims with evidence.
- Request ADR review.
- Review work within their demonstrated domain.

### AI agents

AI agents are contributors, not autonomous authorities.

Agent-generated work must remain attributable to the human or automated workflow that submitted it. An agent may not self-approve a breaking change, security decision, release, or public claim.

## Decision model

LATTICEWORK uses evidence-weighted maintainer decision making.

Consensus is preferred but not required. Final decisions must record:

- Decision.
- Alternatives considered.
- Evidence.
- Risks.
- Owner.
- Review or expiration date when relevant.

Architecture decisions live in `docs/decisions/`.

## Change classes

| Class | Example | Required approval |
|---|---|---|
| Routine | Documentation correction, isolated test, non-breaking fix | One reviewer |
| Structural | Module extraction, interface change, dependency replacement | Technical lead plus verification |
| Breaking | Data format, public API, behavior removal | Maintainer plus ADR |
| Sensitive | Security, privacy, identity, cryptography | Maintainer plus specialist review |
| Canonical | Charter, principles, brand, governance, license | Maintainer decision |

## Emergency authority

A maintainer may immediately disable or revert behavior that creates a credible security, privacy, data-loss, or user-safety risk.

The emergency action must be documented after containment.
