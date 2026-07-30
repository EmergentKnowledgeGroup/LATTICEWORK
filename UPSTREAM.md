<!-- Status: CANONICAL | Owner: Maintainers -->

# Upstream Relationship

## Relationship

FreeLattice is the MIT-licensed upstream source from which LATTICEWORK was derived.

LATTICEWORK is independent and follows its own architecture, governance, release process, and roadmap.

## What LATTICEWORK preserves

- Required copyright and license notices.
- Git provenance.
- Honest credit for upstream ideas and implementation.
- Clear identification of borrowed, preserved, modified, and replaced behavior.
- Links to the exact upstream baseline used for comparison.

## What LATTICEWORK does not imply

- Upstream endorsement.
- Maintainer affiliation.
- Official successor status.
- Feature parity that has not been verified.
- Ownership of upstream names, identity, or community.

## Upstream contribution policy

Contributing a fix upstream is optional, not automatic.

A change may be offered upstream when:

- It is narrowly applicable to upstream.
- It does not depend on LATTICEWORK architecture.
- The upstream contribution can be explained without project drama.
- The contribution would benefit upstream users.
- Maintainers approve the time cost.

A change should remain LATTICEWORK-only when:

- It depends on the new architecture.
- It requires broad migration.
- It reflects an intentional product divergence.
- Upstream has declined or cannot reasonably absorb it.
- Maintaining a separate implementation is clearer.

## Sync policy

Upstream changes are reviewed, not blindly merged.

Every sync decision must record:

- Upstream commit range.
- Relevant changes.
- Compatibility impact.
- Accepted, adapted, deferred, or rejected status.
- Reason.
- Verification result.

See `docs/UPSTREAM_SYNC_LOG.md`.
