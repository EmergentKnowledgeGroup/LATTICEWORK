<!-- Status: LIVING | Owner: Maintainers | Update whenever the upstream baseline changes -->

# Provenance

## Upstream origin

| Field | Value |
|---|---|
| Upstream project | FreeLattice |
| Upstream repository | `https://github.com/Chaos2Cured/FreeLattice` |
| Upstream owner | `Chaos2Cured` |
| Upstream default branch | `main` |
| Upstream license | MIT |
| Baseline commit | `e7585999fc1af2707f410ae87356cf2b52e08d9c` |
| Baseline commit date | `2026-07-30T01:05:26Z` |
| Fork creation date | `2026-07-30T07:05:12Z` |
| LATTICEWORK baseline tag | `v0.0.0-upstream-baseline` |
| Baseline archive path | `Z:\LATTICEWORK_PRESERVATION\freelattice-baseline-e7585999fc1af2707f410ae87356cf2b52e08d9c.zip` |
| Baseline archive hash | `fe7c401aee963051993fd7c0794bfe9de9deb8f8ebbba203a6ee4ce1e1302861` |
| Baseline environment record | `docs/BASELINE.md` |

The external archive is 124,714,814 bytes. Its path, size, and SHA-256 are
machine-recorded in
`reengineering/evidence/phase-0/LW-P0-001/manifest.json`; the repository also
contains a full tracked-tree manifest, so preservation is verifiable without
committing the oversized archive.

## Required commands

Record the exact outputs of:

```bash
git remote -v
git rev-parse HEAD
git show --no-patch --format=fuller HEAD
git status --short
git tag --points-at HEAD
```

## Lineage policy

LATTICEWORK preserves the original Git history unless a technically necessary migration is separately approved and documented.

The original MIT license and copyright notice must remain in all copies or substantial portions of upstream software.

LATTICEWORK modifications must be distinguishable through commit history, release notes, `NOTICE.md`, and the comparison record.

## Independence statement

LATTICEWORK is an independent project. It is not affiliated with, endorsed by, sponsored by, or maintained on behalf of FreeLattice or its maintainers.

## Baseline immutability

The upstream baseline tag is immutable.

If a new upstream baseline is adopted:

1. Create a new baseline tag.
2. Record the previous and new commit SHAs.
3. Generate a full compare report.
4. Update `UPSTREAM_SYNC_LOG.md`.
5. Re-run characterization and compatibility tests.
6. Never move or overwrite an existing baseline tag.
