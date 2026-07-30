<!-- Status: LIVING | Owner: Maintainers | Must match actual implementation -->

# Privacy

## Promise

LATTICEWORK is designed to keep users in control of their data.

Any claim such as local-first, no tracking, private, offline, or user-owned must be backed by implementation evidence and verification.

## Current status

`[DOCUMENT_CURRENT_PRIVACY_STATUS_HERE]`

Do not publish stronger privacy language than the current architecture supports.

## Required disclosure

Document:

- Data stored in browser storage.
- Data written to disk.
- Data sent to local services.
- Data sent to cloud providers.
- API keys and how they are stored.
- Telemetry, analytics, logs, and crash reporting.
- Peer-to-peer data flows.
- Retention and deletion.
- Export and recovery.
- Third-party dependencies with network access.
- Service-worker caching behavior.

## Rules

- No telemetry without explicit documentation and user control.
- No hidden external requests.
- No API key transmission beyond the selected provider.
- No silent migration of user data to a cloud service.
- No privacy claim based only on intended behavior.
- Sensitive data should be minimized, scoped, and deletable.
- Export should be human-readable where practical.
- Destructive migrations require backup and rollback guidance.

See `docs/DATA_AND_STORAGE.md` for the technical inventory.
