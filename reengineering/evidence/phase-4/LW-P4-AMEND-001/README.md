# LW-P4-AMEND-001 evidence

This directory receipts the control-only Phase 4 amendment and corrected
implementation proposal.

- Original characterization evidence is preserved under
  `../LW-P4-CHAR-001/`.
- Eight confirmed defects are accepted as divergences, never baseline PASS.
- Eleven observations remain bounded retests.
- The only added listener authority is a run-owned, synthetic, no-egress
  `127.0.0.1` test fixture on an OS-selected port.
- The implementation packet is proposed and explicitly unauthorized.
- Real data, credentials, provider traffic, activation, deployment, and cutover
  remain disabled.

Canonical validation:

```powershell
$env:TEMP='Z:\LATTICEWORK\runtime\tmp'
$env:TMP=$env:TEMP
$env:LATTICEWORK_BASELINE_ROOT='Z:\LATTICEWORK_BASELINE_e7585999'
node tools/reengineering/validate-phase4-amendment.mjs
node tools/reengineering/validate-phase4-active-scope.mjs
node --test tests/reengineering/*.test.mjs
git diff --check
```

