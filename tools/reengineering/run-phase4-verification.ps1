param(
    [int]$Port = 4194,
    [switch]$IndependentReview
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$ImplementationBase = "faf32dbaf8159e8499421fa68d9fba4bede0fdc9"
$WorkId = "LW-P4-001"
$RunEvidenceCommand = Join-Path $PSScriptRoot "run-evidence-command.mjs"
$ManifestEvidenceDirectory = Join-Path $PSScriptRoot "manifest-evidence-directory.mjs"

if ($Port -lt 1024 -or $Port -gt 65535) {
    throw "Port must be between 1024 and 65535."
}

function Resolve-RepositoryDescendant {
    param([string]$Path, [string]$Label)

    $candidate = if ([System.IO.Path]::IsPathRooted($Path)) {
        [System.IO.Path]::GetFullPath($Path)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot $Path))
    }
    $prefix = [System.IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\') + '\'
    if (-not $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay inside this repository: $candidate"
    }
    return $candidate
}

function Get-Sha256Hex {
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            return [System.BitConverter]::ToString($sha256.ComputeHash($stream)).Replace("-", "")
        } finally {
            $sha256.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

function Remove-ExactDirectory {
    param([string]$Path, [string]$ExpectedRelative, [string]$Label)

    $expected = Resolve-RepositoryDescendant -Path $ExpectedRelative -Label $Label
    if (-not [string]::Equals($Path, $expected, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must be exactly $expected."
    }
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Invoke-EvidenceCommand {
    param(
        [string]$Id,
        [string]$Directory,
        [string[]]$Command,
        [string]$WorkingDirectory = $RepositoryRoot,
        [switch]$AllowNonZero
    )

    $receiptDirectory = Join-Path $EvidenceRoot "commands\$Directory"
    $arguments = @(
        $RunEvidenceCommand,
        "--cwd", $WorkingDirectory,
        "--output", $receiptDirectory,
        "--id", $Id,
        "--baseline-sha", $BaselineSha,
        "--candidate-sha", $CandidateSha,
        "--"
    ) + $Command
    & node @arguments
    if ($LASTEXITCODE -ne 0 -and -not $AllowNonZero) {
        throw "Evidence command $Id failed. See $receiptDirectory."
    }
}

function Read-TapCounts {
    param([string]$Receipt)

    $text = Get-Content -LiteralPath $Receipt -Raw
    $counts = [ordered]@{}
    foreach ($name in @("tests", "pass", "fail", "skipped", "todo")) {
        $match = [regex]::Match($text, "(?m)^# $name (?<count>\d+)\r?$")
        $counts[$name] = if ($match.Success) {
            [int]$match.Groups["count"].Value
        } else {
            0
        }
    }
    return $counts
}

if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) {
    throw "Immutable baseline worktree is missing: $BaselineRoot"
}
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha) {
    throw "Immutable baseline SHA mismatch."
}
if (& git -C $BaselineRoot status --porcelain) {
    throw "Immutable baseline worktree is dirty."
}
& git -C $RepositoryRoot merge-base --is-ancestor $ImplementationBase HEAD
if ($LASTEXITCODE -ne 0) {
    throw "Implementation base is not an ancestor of HEAD."
}
if (& git -C $RepositoryRoot status --porcelain) {
    throw "Phase 4 verification must start from a clean candidate worktree."
}

$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()
if ($CandidateSha -notmatch "^[0-9a-f]{40}$") {
    throw "Unable to read candidate HEAD."
}

$EvidenceRelative = if ($IndependentReview) {
    "runtime\tmp\phase4-independent-review-$Port"
} else {
    "reengineering\evidence\phase-4\LW-P4-001"
}
$ScratchRelative = "runtime\tmp\phase4-verification-$Port"
$EvidenceRoot = Resolve-RepositoryDescendant -Path $EvidenceRelative -Label "Evidence path"
$ScratchRoot = Resolve-RepositoryDescendant -Path $ScratchRelative -Label "Scratch path"
$BrowserOutput = Resolve-RepositoryDescendant -Path "runtime\tmp\p4-browser-agent\playwright" -Label "Browser path"

Remove-ExactDirectory -Path $EvidenceRoot -ExpectedRelative $EvidenceRelative -Label "Evidence path"
Remove-ExactDirectory -Path $ScratchRoot -ExpectedRelative $ScratchRelative -Label "Scratch path"
New-Item -ItemType Directory -Force -Path $EvidenceRoot, $ScratchRoot | Out-Null

$env:TEMP = Join-Path $ScratchRoot "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $ScratchRoot "npm-cache"
$env:npm_config_update_notifier = "false"
$env:npm_config_fund = "false"
$env:LATTICEWORK_P4_PORT = [string]$Port
$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
New-Item -ItemType Directory -Force -Path $env:TEMP, $env:npm_config_cache | Out-Null

if ($IndependentReview) {
    Invoke-EvidenceCommand -Id "$WorkId-independent-worktree-start" -Directory "worktree-start" -Command @("git", "status", "--porcelain")
}

$gateReceipts = [ordered]@{}
Invoke-EvidenceCommand -Id "$WorkId-environment" -Directory "environment" -Command @(
    "cmd.exe", "/d", "/s", "/c",
    "node --version && npm --version && npx playwright --version && git --version"
)
$gateReceipts["environment"] = "commands/environment/manifest.json"

$replay = Join-Path $ScratchRoot "lockfile-replay"
New-Item -ItemType Directory -Force -Path $replay | Out-Null
Copy-Item (Join-Path $RepositoryRoot "package.json") (Join-Path $replay "package.json")
Copy-Item (Join-Path $RepositoryRoot "package-lock.json") (Join-Path $replay "package-lock.json")
foreach ($path in @(
    "apps\web",
    "packages\chat",
    "packages\contracts",
    "packages\kernel",
    "packages\providers",
    "packages\storage",
    "tests\phase2",
    "tests\phase3",
    "tests\phase4"
)) {
    $target = Join-Path $replay $path
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Copy-Item (Join-Path $RepositoryRoot "$path\package.json") (Join-Path $target "package.json")
}
Invoke-EvidenceCommand -Id "$WorkId-lockfile-replay" -Directory "lockfile-replay" -WorkingDirectory $replay -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm install --package-lock-only --ignore-scripts"
)
if (
    (Get-Sha256Hex (Join-Path $RepositoryRoot "package-lock.json")) -ne
    (Get-Sha256Hex (Join-Path $replay "package-lock.json"))
) {
    throw "Isolated lockfile replay did not reproduce package-lock.json."
}
$gateReceipts["lockfile-replay"] = "commands/lockfile-replay/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-install" -Directory "install" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm ci --ignore-scripts"
)
$gateReceipts["install"] = "commands/install/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-amendment-validator" -Directory "amendment-validator" -Command @(
    "node.exe", "tools/reengineering/validate-phase4-amendment.mjs"
)
$gateReceipts["amendment-validator"] = "commands/amendment-validator/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-scope-validator" -Directory "scope-validator" -Command @(
    "node.exe", "tools/reengineering/validate-phase4-implementation-scope.mjs"
)
$gateReceipts["scope-validator"] = "commands/scope-validator/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-strict-typecheck" -Directory "strict-typecheck" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p4:typecheck"
)
$gateReceipts["strict-typecheck"] = "commands/strict-typecheck/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-node-unit" -Directory "node-unit" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p4:test"
)
$gateReceipts["node-unit"] = "commands/node-unit/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-browser" -Directory "browser" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p4:browser"
)
$browserEvidence = Join-Path $EvidenceRoot "browser"
New-Item -ItemType Directory -Force -Path $browserEvidence | Out-Null
Get-ChildItem -LiteralPath $BrowserOutput -Force |
    Copy-Item -Destination $browserEvidence -Recurse -Force
$browserReport = Get-Content -LiteralPath (Join-Path $browserEvidence "results.json") -Raw |
    ConvertFrom-Json
$browserStats = $browserReport.stats
$browserSpecCount = @(
    $browserReport.suites | ForEach-Object { $_.specs }
).Count
$browserSkipAnnotations = @(
    $browserReport.suites |
        ForEach-Object { $_.specs } |
        ForEach-Object { $_.tests } |
        ForEach-Object { $_.results } |
        ForEach-Object { $_.annotations } |
        Where-Object { $_.type -eq "skip" }
)
if (
    $browserSpecCount -ne 8 -or
    $browserStats.expected -ne 7 -or
    $browserStats.skipped -ne 1 -or
    $browserStats.unexpected -ne 0 -or
    $browserStats.flaky -ne 0 -or
    $browserSkipAnnotations.Count -ne 1 -or
    $browserSkipAnnotations[0].description -ne
        "Candidate does not declare an offline contract."
) {
    throw "Phase 4 browser report does not match the accepted seven-pass, one-explicit-offline-skip inventory."
}
$browserSummary = [ordered]@{
    passed = [int]$browserStats.expected
    skipped = [int]$browserStats.skipped
    skipped_reason = [string]$browserSkipAnnotations[0].description
}
$gateReceipts["browser"] = "commands/browser/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-phase3-boundary" -Directory "phase3-boundary" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p3:boundary"
)
$gateReceipts["phase3-boundary"] = "commands/phase3-boundary/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-full-repository-controls" -Directory "full-repository-controls" -Command @(
    "node.exe", "--test", "--test-reporter=tap", "tests/reengineering/*.test.mjs"
)
$controls = Read-TapCounts (Join-Path $EvidenceRoot "commands\full-repository-controls\stdout.log")
if ($controls.tests -le 0 -or $controls.fail -ne 0 -or $controls.skipped -ne 0 -or $controls.todo -ne 0) {
    throw "Repository controls must have tests and zero fail, skip, and todo."
}
$gateReceipts["full-repository-controls"] = "commands/full-repository-controls/manifest.json"

Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand -Id "$WorkId-build-1" -Directory "build-1" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p2:build"
)
$secondBuild = Join-Path $ScratchRoot "build-2"
$env:LATTICEWORK_P2_OUT_DIR = $secondBuild
Invoke-EvidenceCommand -Id "$WorkId-build-2" -Directory "build-2" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm run p2:build"
)
Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand -Id "$WorkId-deterministic-build" -Directory "deterministic-build" -Command @(
    "node.exe",
    "tools/reengineering/verify-phase2-build.mjs",
    "--workspace-root", $RepositoryRoot,
    "--first", (Join-Path $RepositoryRoot "output\lw-p2-001\web"),
    "--second", $secondBuild,
    "--output", (Join-Path $EvidenceRoot "phase2-build-comparison.json")
)
$gateReceipts["deterministic-build"] = "commands/deterministic-build/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-audit" -Directory "audit" -AllowNonZero -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm audit --workspaces --include-workspace-root --json"
)
$audit = Get-Content (Join-Path $EvidenceRoot "commands\audit\stdout.log") -Raw | ConvertFrom-Json
if ($audit.metadata.vulnerabilities.total -ne 0) {
    throw "npm audit reported vulnerabilities."
}
Copy-Item (Join-Path $EvidenceRoot "commands\audit\stdout.log") (Join-Path $EvidenceRoot "npm-audit.json")
$gateReceipts["audit"] = "commands/audit/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-sbom" -Directory "sbom" -Command @(
    "cmd.exe", "/d", "/s", "/c", "npm sbom --sbom-format cyclonedx"
)
Copy-Item (Join-Path $EvidenceRoot "commands\sbom\stdout.log") (Join-Path $EvidenceRoot "sbom.cdx.json")
$gateReceipts["sbom"] = "commands/sbom/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-supply-chain" -Directory "supply-chain" -Command @(
    "node.exe",
    "tools/reengineering/collect-phase2-supply-chain.mjs",
    "--workspace-root", $RepositoryRoot,
    "--output", (Join-Path $EvidenceRoot "supply-chain.json")
)
$gateReceipts["supply-chain"] = "commands/supply-chain/manifest.json"

Invoke-EvidenceCommand -Id "$WorkId-hygiene" -Directory "hygiene" -Command @(
    "cmd.exe", "/d", "/s", "/c",
    "git diff --check $ImplementationBase -- && node --check tools/reengineering/validate-phase4-implementation-scope.mjs && node --check tools/reengineering/validate-phase4-amendment.mjs"
)
$gateReceipts["hygiene"] = "commands/hygiene/manifest.json"

if ($IndependentReview) {
    Invoke-EvidenceCommand -Id "$WorkId-independent-worktree-end" -Directory "worktree-end" -Command @(
        "git", "status", "--porcelain"
    )
    if (& git -C $RepositoryRoot status --porcelain) {
        throw "Independent review worktree is dirty after reproduction."
    }
    $review = [ordered]@{
        schema = "latticework.phase4-independent-review.v1"
        work_id = $WorkId
        evidence_label = "MEASURED"
        verdict = "AUTOMATED_GATES_GREEN_REVIEW_JUDGMENT_PENDING"
        valid = $true
        baseline_sha = $BaselineSha
        implementation_base_commit = $ImplementationBase
        candidate_sha = $CandidateSha
        repository_controls = $controls
        browser = $browserSummary
        gates = $gateReceipts
    }
    [System.IO.File]::WriteAllText(
        (Join-Path $EvidenceRoot "automation.json"),
        (($review | ConvertTo-Json -Depth 10) + [Environment]::NewLine),
        $Utf8NoBom
    )
    Write-Host "Phase 4 independent automation captured: $EvidenceRoot"
    exit 0
}

$summary = [ordered]@{
    schema = "latticework.phase4-pre-independent-summary.v1"
    evidence_label = "MEASURED"
    work_id = $WorkId
    valid = $true
    status = "PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW"
    baseline_sha = $BaselineSha
    implementation_base_commit = $ImplementationBase
    candidate_sha = $CandidateSha
    safety = [ordered]@{
        real_user_data = "not-accessed"
        real_provider_traffic = "none"
        real_credentials = "none"
        application_listener = "none"
        test_listener = "exact-loopback-port-zero-run-owned"
        candidate_activation = "none"
        deployment = "none"
        cutover = "none"
    }
    repository_controls = $controls
    browser = $browserSummary
    gates = $gateReceipts
}
[System.IO.File]::WriteAllText(
    (Join-Path $EvidenceRoot "summary.json"),
    (($summary | ConvertTo-Json -Depth 10) + [Environment]::NewLine),
    $Utf8NoBom
)

$readme = @"
# Phase 4 canonical evidence

**Status:** PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW

Candidate: ``$CandidateSha``.

This bundle measures only the accepted, non-default, synthetic-only Phase 4
slice. Real data, credentials, provider traffic, an application listener,
activation, deployment, and cutover remain disabled. Warm offline reload is
honestly unclaimed because this packet authorizes no service worker.
"@
[System.IO.File]::WriteAllText(
    (Join-Path $EvidenceRoot "README.md"),
    ($readme + [Environment]::NewLine),
    $Utf8NoBom
)

& node $ManifestEvidenceDirectory `
    --directory $EvidenceRoot `
    --output (Join-Path $EvidenceRoot "manifest.json") `
    --id "$WorkId-bundle" `
    --baseline-sha $BaselineSha `
    --candidate-sha $CandidateSha
if ($LASTEXITCODE -ne 0) {
    throw "Phase 4 evidence manifest generation failed."
}

Write-Host "Phase 4 canonical verification captured: $EvidenceRoot"
Write-Host "Independent review remains required."
