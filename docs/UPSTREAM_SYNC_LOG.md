<!-- Status: LIVING | Owner: Upstream sync lead -->

# Upstream Sync Log

## Recorded syncs

### 2026-07-30 — Initial fork baseline at `e7585999fc1af2707f410ae87356cf2b52e08d9c`

**Reviewed by:** Codex root controller

**Summary**

The `EmergentKnowledgeGroup/LATTICEWORK` fork and
`Chaos2Cured/FreeLattice` upstream baseline were verified at the same commit.
Upstream tags were fetched without modifying the detached baseline worktree.

**Decision:** `ACCEPTED` as the immutable reengineering baseline.

**Reason**

The exact baseline is required for provenance, characterization, rollback, and
future shared-fixture comparison.

**Compatibility impact**

None. This entry records the starting point and does not change runtime behavior.

**Verification**

- [`LW-P0-001/manifest.json`](../reengineering/evidence/phase-0/LW-P0-001/manifest.json)
- [`PROVENANCE.md`](../PROVENANCE.md)

**LATTICEWORK commits**

No candidate commit yet; Phase 0 control artifacts remain uncommitted on the
baseline branch.

## Sync entry template

### `[DATE]` — Upstream range `[FROM_SHA]..[TO_SHA]`

**Reviewed by:** `[NAME_OR_WORKFLOW]`

**Summary**

`[SUMMARY]`

**Relevant upstream changes**

- `[CHANGE]`

**Decision**

- `ACCEPTED`
- `ADAPTED`
- `DEFERRED`
- `REJECTED`
- `NOT APPLICABLE`

**Reason**

`[REASON]`

**Compatibility impact**

`[IMPACT]`

**Verification**

`[COMMANDS_AND_ARTIFACTS]`

**LATTICEWORK commits**

`[SHAS]`

---

No upstream change is silently merged. Every decision should remain reviewable.
