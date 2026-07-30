<!-- Status: LIVING | Owner: Compatibility lead -->

# Intentional Divergences

This file records every user-visible, data, integration, security, privacy, or operational difference from the pinned upstream baseline.

A divergence is not automatically a defect. An undocumented divergence is.

## Divergence record

| ID | Surface | Upstream behavior | LATTICEWORK behavior | Reason | Migration impact | Evidence | Approval |
|---|---|---|---|---|---|---|---|
| — | No accepted user-visible divergence | — | The Phase 2 candidate shell is isolated and is not a replacement route | Preserve compatibility obligations until shared-fixture evidence and approval exist | None | `reengineering/evidence/phase-2/LW-P2-001/` | ADR-001 through ADR-003 authorize the candidate seam only |

## Divergence classes

- **Bug correction**
- **Security correction**
- **Privacy correction**
- **Architecture-driven change**
- **Product decision**
- **Unsupported legacy behavior**
- **Performance change**
- **Accessibility change**
- **Data-format change**
- **Provider or dependency change**

## Removal rule

A feature may be removed only when:

- The upstream behavior is characterized.
- The removal is explicitly approved.
- User impact is stated.
- Data impact is addressed.
- Migration or alternative path is documented.
- The compatibility matrix changes from unknown to intentional divergence or not supported.

Do not hide feature removal inside a refactor.
