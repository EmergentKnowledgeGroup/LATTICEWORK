param(
    [string]$EvidencePath = "reengineering\evidence\phase-2\LW-P2-001",
    [int]$Port = 4174
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read the candidate repository HEAD."
}

function Resolve-RepositoryDescendant {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $Candidate = if ([System.IO.Path]::IsPathRooted($Path)) {
        [System.IO.Path]::GetFullPath($Path)
    }
    else {
        [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot $Path))
    }
    $RepositoryPrefix = [System.IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\') + '\'
    if (-not $Candidate.StartsWith($RepositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay inside the LATTICEWORK repository: $Candidate"
    }
    return $Candidate
}

function Invoke-EvidenceCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string[]]$Command,
        [string]$WorkingDirectory = $RepositoryRoot
    )

    $ReceiptDirectory = Join-Path $EvidenceRoot "commands\$Directory"
    $Arguments = @(
        "tools/reengineering/run-evidence-command.mjs",
        "--cwd", $WorkingDirectory,
        "--output", $ReceiptDirectory,
        "--id", $Id,
        "--baseline-sha", $BaselineSha,
        "--candidate-sha", $CandidateSha,
        "--"
    ) + $Command
    & node @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Evidence command $Id failed with exit code $LASTEXITCODE. See $ReceiptDirectory."
    }
}

if ($Port -lt 1024 -or $Port -gt 65535) {
    throw "Port must be between 1024 and 65535."
}
if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) {
    throw "Immutable baseline worktree is missing: $BaselineRoot"
}
$ActualBaselineSha = (& git -C $BaselineRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualBaselineSha -ne $BaselineSha) {
    throw "Immutable baseline SHA mismatch. Expected $BaselineSha; observed $ActualBaselineSha"
}
$BaselineStatus = (& git -C $BaselineRoot status --porcelain)
if ($LASTEXITCODE -ne 0 -or $BaselineStatus) {
    throw "Immutable baseline worktree is dirty or unreadable."
}

$EvidenceRoot = Resolve-RepositoryDescendant -Path $EvidencePath -Label "Evidence path"
$ScratchRoot = Resolve-RepositoryDescendant `
    -Path "runtime\tmp\phase2-verification-$Port" `
    -Label "Scratch path"
$SecondBuildRoot = Join-Path $EvidenceRoot "generated\build-2"
$BrowserOutput = Join-Path $EvidenceRoot "browser"
$LockfileReplayRoot = Join-Path $ScratchRoot "lockfile-replay"

if (Test-Path -LiteralPath $EvidenceRoot -PathType Container) {
    Remove-Item -LiteralPath $EvidenceRoot -Recurse -Force
}
if (Test-Path -LiteralPath $ScratchRoot -PathType Container) {
    Remove-Item -LiteralPath $ScratchRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $EvidenceRoot, $ScratchRoot | Out-Null

$env:TEMP = Join-Path $ScratchRoot "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $ScratchRoot "npm-cache"
$env:npm_config_update_notifier = "false"
$env:npm_config_fund = "false"
$env:npm_config_audit = "false"
$env:npm_config_ignore_scripts = "true"
$env:PLAYWRIGHT_BROWSERS_PATH = Resolve-RepositoryDescendant `
    -Path "runtime\tmp\phase2-playwright-browsers" `
    -Label "Playwright browser path"
$env:LATTICEWORK_P2_PORT = [string]$Port
$env:LATTICEWORK_P2_PLAYWRIGHT_OUTPUT = $BrowserOutput
Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path `
    $env:TEMP, `
    $env:npm_config_cache, `
    $env:PLAYWRIGHT_BROWSERS_PATH | Out-Null

Invoke-EvidenceCommand `
    -Id "LW-P2-001-environment" `
    -Directory "environment" `
    -Command @("cmd.exe", "/d", "/s", "/c", "node --version && npm --version && npx playwright --version && git --version")

$WorkspaceManifestPaths = @(
    "apps\web",
    "packages\contracts",
    "packages\kernel",
    "tests\phase2"
)
New-Item -ItemType Directory -Force -Path $LockfileReplayRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $RepositoryRoot "package.json") `
    -Destination (Join-Path $LockfileReplayRoot "package.json")
Copy-Item -LiteralPath (Join-Path $RepositoryRoot "package-lock.json") `
    -Destination (Join-Path $LockfileReplayRoot "package-lock.json")
foreach ($WorkspaceManifestPath in $WorkspaceManifestPaths) {
    $ReplayManifestDirectory = Join-Path $LockfileReplayRoot $WorkspaceManifestPath
    New-Item -ItemType Directory -Force -Path $ReplayManifestDirectory | Out-Null
    Copy-Item `
        -LiteralPath (Join-Path $RepositoryRoot "$WorkspaceManifestPath\package.json") `
        -Destination (Join-Path $ReplayManifestDirectory "package.json")
}
Invoke-EvidenceCommand `
    -Id "LW-P2-001-lockfile-generate" `
    -Directory "lockfile-generate" `
    -WorkingDirectory $LockfileReplayRoot `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm install --package-lock-only --ignore-scripts")
$CanonicalLockfile = Join-Path $RepositoryRoot "package-lock.json"
$ReplayedLockfile = Join-Path $LockfileReplayRoot "package-lock.json"
$CanonicalLockfileHash = (Get-FileHash -LiteralPath $CanonicalLockfile -Algorithm SHA256).Hash.ToLowerInvariant()
$ReplayedLockfileHash = (Get-FileHash -LiteralPath $ReplayedLockfile -Algorithm SHA256).Hash.ToLowerInvariant()
$LockfileComparison = [ordered]@{
    schema = "latticework.phase2-lockfile-comparison.v1"
    evidence_label = "MEASURED"
    valid = $CanonicalLockfileHash -eq $ReplayedLockfileHash
    canonical_sha256 = $CanonicalLockfileHash
    replayed_sha256 = $ReplayedLockfileHash
}
if (-not $LockfileComparison.valid) {
    throw "Isolated npm package-lock replay did not reproduce the canonical lockfile."
}
$LockfileComparisonJson = $LockfileComparison | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText(
    (Join-Path $EvidenceRoot "lockfile-comparison.json"),
    $LockfileComparisonJson + [Environment]::NewLine,
    $Utf8NoBom
)
Copy-Item -LiteralPath $ReplayedLockfile `
    -Destination (Join-Path $EvidenceRoot "package-lock.replayed.json")
Copy-Item -LiteralPath (Join-Path $RepositoryRoot "package-lock.json") `
    -Destination (Join-Path $EvidenceRoot "package-lock.snapshot.json")
Invoke-EvidenceCommand `
    -Id "LW-P2-001-install" `
    -Directory "install" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm ci --ignore-scripts")
Invoke-EvidenceCommand `
    -Id "LW-P2-001-typecheck" `
    -Directory "typecheck" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:typecheck")
Invoke-EvidenceCommand `
    -Id "LW-P2-001-unit" `
    -Directory "unit" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:test")
Invoke-EvidenceCommand `
    -Id "LW-P2-001-controls" `
    -Directory "controls" `
    -Command @("node.exe", "--test", "tests/reengineering/*.test.mjs")

Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand `
    -Id "LW-P2-001-build-1" `
    -Directory "build-1" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:build")
$env:LATTICEWORK_P2_OUT_DIR = $SecondBuildRoot
Invoke-EvidenceCommand `
    -Id "LW-P2-001-build-2" `
    -Directory "build-2" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:build")
Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand `
    -Id "LW-P2-001-build-comparison" `
    -Directory "build-comparison" `
    -Command @(
        "node.exe",
        "tools/reengineering/verify-phase2-build.mjs",
        "--workspace-root", $RepositoryRoot,
        "--first", (Join-Path $RepositoryRoot "output\lw-p2-001\web"),
        "--second", $SecondBuildRoot,
        "--output", (Join-Path $EvidenceRoot "build-comparison.json")
    )

Invoke-EvidenceCommand `
    -Id "LW-P2-001-browser-install" `
    -Directory "browser-install" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npx playwright install chromium")
Invoke-EvidenceCommand `
    -Id "LW-P2-001-browser" `
    -Directory "browser" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:browser")

Invoke-EvidenceCommand `
    -Id "LW-P2-001-audit" `
    -Directory "audit" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm audit --all --json")
$AuditReceipt = Join-Path $EvidenceRoot "commands\audit\stdout.log"
$Audit = Get-Content -LiteralPath $AuditReceipt -Raw | ConvertFrom-Json
if ($Audit.metadata.vulnerabilities.total -ne 0) {
    throw "npm audit reported $($Audit.metadata.vulnerabilities.total) vulnerabilities."
}
Copy-Item -LiteralPath $AuditReceipt -Destination (Join-Path $EvidenceRoot "npm-audit.json")

Invoke-EvidenceCommand `
    -Id "LW-P2-001-sbom" `
    -Directory "sbom" `
    -Command @("cmd.exe", "/d", "/s", "/c", "npm sbom --sbom-format cyclonedx")
$SbomReceipt = Join-Path $EvidenceRoot "commands\sbom\stdout.log"
$Sbom = Get-Content -LiteralPath $SbomReceipt -Raw | ConvertFrom-Json
if ($Sbom.bomFormat -ne "CycloneDX") {
    throw "npm SBOM output is not CycloneDX."
}
Copy-Item -LiteralPath $SbomReceipt -Destination (Join-Path $EvidenceRoot "sbom.cdx.json")

Invoke-EvidenceCommand `
    -Id "LW-P2-001-supply-chain" `
    -Directory "supply-chain" `
    -Command @(
        "node.exe",
        "tools/reengineering/collect-phase2-supply-chain.mjs",
        "--workspace-root", $RepositoryRoot,
        "--output", (Join-Path $EvidenceRoot "supply-chain.json")
    )
Invoke-EvidenceCommand `
    -Id "LW-P2-001-boundary" `
    -Directory "boundary" `
    -Command @(
        "node.exe",
        "tools/reengineering/verify-phase2-boundary.mjs",
        "--workspace-root", $RepositoryRoot,
        "--baseline-root", $BaselineRoot,
        "--baseline-sha", $BaselineSha,
        "--output", (Join-Path $EvidenceRoot "boundary.json")
    )
Invoke-EvidenceCommand `
    -Id "LW-P2-001-control-validator" `
    -Directory "control-validator" `
    -Command @(
        "node.exe",
        "tools/reengineering/validate-phase0-control.mjs",
        "--repo-root", $RepositoryRoot
    )

$BrowserResults = Get-Content -LiteralPath (Join-Path $BrowserOutput "results.json") -Raw | ConvertFrom-Json
$BuildComparison = Get-Content -LiteralPath (Join-Path $EvidenceRoot "build-comparison.json") -Raw | ConvertFrom-Json
$Boundary = Get-Content -LiteralPath (Join-Path $EvidenceRoot "boundary.json") -Raw | ConvertFrom-Json
$SupplyChain = Get-Content -LiteralPath (Join-Path $EvidenceRoot "supply-chain.json") -Raw | ConvertFrom-Json
$Summary = [ordered]@{
    schema = "latticework.phase2-summary.v1"
    evidence_label = "MEASURED"
    captured_at = (Get-Date).ToUniversalTime().ToString("o")
    work_id = "LW-P2-001"
    baseline_sha = $BaselineSha
    candidate_sha = $CandidateSha
    port = $Port
    valid = (
        $BrowserResults.stats.expected -eq 6 -and
        $BrowserResults.stats.unexpected -eq 0 -and
        $BrowserResults.stats.skipped -eq 0 -and
        $BrowserResults.stats.flaky -eq 0 -and
        $LockfileComparison.valid -and
        $BuildComparison.valid -and
        $Boundary.valid -and
        $SupplyChain.valid -and
        $Audit.metadata.vulnerabilities.total -eq 0
    )
    browser = $BrowserResults.stats
    lockfile_reproducible = [bool]$LockfileComparison.valid
    build_reproducible = [bool]$BuildComparison.valid
    protected_boundary_valid = [bool]$Boundary.valid
    supply_chain_valid = [bool]$SupplyChain.valid
    audit_vulnerability_total = [int]$Audit.metadata.vulnerabilities.total
    external_package_count = [int]$SupplyChain.external_package_count
    installed_external_package_count = [int]$SupplyChain.installed_external_package_count
    skipped_optional_package_count = [int]$SupplyChain.skipped_optional_package_count
}
if (-not $Summary.valid) {
    throw "Phase 2 summary gate is not valid."
}
$SummaryJson = $Summary | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText(
    (Join-Path $EvidenceRoot "summary.json"),
    $SummaryJson + [Environment]::NewLine,
    $Utf8NoBom
)

$Readme = @"
# Phase 2 Evidence - ``LW-P2-001``

**Evidence label:** MEASURED
**Baseline:** ``$BaselineSha``
**Candidate HEAD at capture:** ``$CandidateSha``
**Loopback port:** ``$Port``

This bundle proves only the bounded feature-free candidate shell described in
``reengineering/PHASE2_PREFLIGHT.md``. It does not prove legacy parity,
feature migration, production readiness, or cutover readiness.

- Browser: $($BrowserResults.stats.expected) expected, $($BrowserResults.stats.unexpected) unexpected, $($BrowserResults.stats.skipped) skipped.
- Isolated package-lock replay: $($LockfileComparison.valid).
- Deterministic build comparison: $($BuildComparison.valid).
- Protected legacy boundary: $($Boundary.valid).
- Supply-chain receipt: $($SupplyChain.valid).
- npm audit vulnerabilities: $($Audit.metadata.vulnerabilities.total).

Exact commands, exit codes, raw stdout/stderr, environment, and Git state live
under ``commands/``. Browser screenshots, accessibility snapshots, and the JSON
report live under ``browser/``. ``manifest.json`` hashes every other artifact
in this bundle.
"@
[System.IO.File]::WriteAllText(
    (Join-Path $EvidenceRoot "README.md"),
    $Readme + [Environment]::NewLine,
    $Utf8NoBom
)

& node tools/reengineering/manifest-evidence-directory.mjs `
    --directory $EvidenceRoot `
    --output (Join-Path $EvidenceRoot "manifest.json") `
    --id "LW-P2-001" `
    --baseline-sha $BaselineSha `
    --candidate-sha $CandidateSha
if ($LASTEXITCODE -ne 0) {
    throw "Unable to create the Phase 2 evidence manifest."
}

$ValidationScratch = Join-Path $ScratchRoot "phase2-evidence-validation.json"
Invoke-EvidenceCommand `
    -Id "LW-P2-001-evidence-validator" `
    -Directory "evidence-validator" `
    -Command @(
        "node.exe",
        "tools/reengineering/validate-phase2-evidence.mjs",
        "--directory", $EvidenceRoot,
        "--workspace-root", $RepositoryRoot,
        "--baseline-sha", $BaselineSha,
        "--candidate-sha", $CandidateSha,
        "--output", $ValidationScratch
    )
Copy-Item -LiteralPath $ValidationScratch `
    -Destination (Join-Path $EvidenceRoot "validation.json")

& node tools/reengineering/manifest-evidence-directory.mjs `
    --directory $EvidenceRoot `
    --output (Join-Path $EvidenceRoot "manifest.json") `
    --id "LW-P2-001" `
    --baseline-sha $BaselineSha `
    --candidate-sha $CandidateSha
if ($LASTEXITCODE -ne 0) {
    throw "Unable to finalize the Phase 2 evidence manifest."
}

& node tools/reengineering/validate-phase2-evidence.mjs `
    --directory $EvidenceRoot `
    --workspace-root $RepositoryRoot `
    --baseline-sha $BaselineSha `
    --candidate-sha $CandidateSha
if ($LASTEXITCODE -ne 0) {
    throw "Final Phase 2 evidence validation failed."
}

Write-Host "Phase 2 verification passed: $EvidenceRoot"
