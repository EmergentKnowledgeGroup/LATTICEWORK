<!-- Status: LIVING | Owner: Security lead or maintainers -->

# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| Current stable release | Yes |
| Current pre-release | Best effort |
| Older releases | No, unless explicitly listed |

## Reporting a vulnerability

Do not open a public issue for an unpatched vulnerability.

Contact:

Use GitHub's private security-advisory form:

`https://github.com/EmergentKnowledgeGroup/LATTICEWORK/security/advisories/new`

Include:

- Affected version and commit.
- Reproduction steps.
- Expected and observed behavior.
- Security impact.
- Proof of concept, when safe.
- Suggested mitigation, when available.
- Whether user data, API keys, local models, browser storage, or peer connections are involved.

## Security-sensitive surfaces

The project must treat these areas as sensitive:

- API key handling.
- IndexedDB and local persistence.
- Import and export.
- Service workers and caching.
- Cross-origin requests.
- Local model endpoints.
- Cloud model providers.
- WebRTC and peer-to-peer transport.
- Identity keys, signatures, and hash chains.
- Prompt and tool injection.
- Untrusted user-generated content.
- HTML rendering and XSS.
- Dependency and supply-chain integrity.

## Disclosure process

1. Confirm receipt.
2. Reproduce and classify.
3. Contain when necessary.
4. Develop and verify a fix.
5. Coordinate release.
6. Publish a factual advisory after users can update.

No security claim is final until the relevant threat model and verification evidence are documented.
