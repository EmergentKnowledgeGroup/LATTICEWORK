param(
    [string]$EvidencePath = "reengineering\evidence\phase-3\LW-P3-001",
    [int]$Port = 4193,
    [switch]$FinalizeEvidence,
    [switch]$IndependentReview
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$ImplementationBase = "93a36626f786a880210c53b8486c961e8b86e9ea"
$WorkId = "LW-P3-001"
$RunEvidenceCommand = Join-Path $PSScriptRoot "run-evidence-command.mjs"
$ManifestEvidenceDirectory = Join-Path $PSScriptRoot "manifest-evidence-directory.mjs"
$EvidenceValidator = Join-Path $PSScriptRoot "validate-phase3-evidence.mjs"

if ($FinalizeEvidence -and $IndependentReview) {
    throw "-FinalizeEvidence and -IndependentReview are mutually exclusive."
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
        throw "$Label must stay inside this Z: repository: $candidate"
    }
    $current = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $relative = $candidate.Substring($prefix.Length)
    foreach ($segment in $relative.Split([char[]]@('\', '/'), [System.StringSplitOptions]::RemoveEmptyEntries)) {
        $current = Join-Path $current $segment
        if (-not (Test-Path -LiteralPath $current)) { break }
        if (((Get-Item -LiteralPath $current -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "$Label must not traverse a symbolic link or junction: $current"
        }
    }
    return $candidate
}

function Assert-ExactDescendant {
    param([string]$Path, [string]$ExpectedRelative, [string]$Label)
    $expected = Resolve-RepositoryDescendant -Path $ExpectedRelative -Label $Label
    if (-not [string]::Equals($Path, $expected, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must be exactly $expected; observed $Path"
    }
}

function Remove-ExactRepositoryDirectory {
    param([string]$Path, [string]$ExpectedRelative, [string]$Label)
    Assert-ExactDescendant -Path $Path -ExpectedRelative $ExpectedRelative -Label $Label
    # Resolve-RepositoryDescendant verifies every existing segment before this recursive cleanup.
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
}

function Invoke-EvidenceCommand {
    param([string]$Id, [string]$Directory, [string[]]$Command, [string]$WorkingDirectory = $RepositoryRoot, [switch]$AllowNonZero)
    $receiptDirectory = Join-Path $EvidenceRoot "commands\$Directory"
    $arguments = @($RunEvidenceCommand, "--cwd", $WorkingDirectory, "--output", $receiptDirectory, "--id", $Id, "--baseline-sha", $BaselineSha, "--candidate-sha", $CandidateSha, "--") + $Command
    & node @arguments
    if ($LASTEXITCODE -ne 0 -and -not $AllowNonZero) {
        throw "Evidence command $Id failed with exit code $LASTEXITCODE. See $receiptDirectory."
    }
}

function Read-TapCounts {
    param([string]$Receipt)
    $text = Get-Content -LiteralPath $Receipt -Raw
    $counts = [ordered]@{}
    foreach ($name in @("tests", "pass", "fail", "skipped", "todo")) {
        $match = [regex]::Match($text, "(?m)^# $name (?<count>\d+)\r?$")
        $counts[$name] = if ($match.Success) { [int]$match.Groups["count"].Value } else { 0 }
    }
    return $counts
}

if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be between 1024 and 65535." }
if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) { throw "Immutable baseline worktree is missing: $BaselineRoot" }
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha) { throw "Immutable baseline SHA mismatch." }
if ((& git -C $BaselineRoot status --porcelain)) { throw "Immutable baseline worktree is dirty." }
& git -C $RepositoryRoot merge-base --is-ancestor $ImplementationBase HEAD
if ($LASTEXITCODE -ne 0) { throw "Implementation base is not an ancestor of HEAD." }
if (-not $FinalizeEvidence -and (& git -C $RepositoryRoot status --porcelain)) {
    throw "Canonical Phase 3 verification must start from a clean candidate worktree."
}
$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()
if ($CandidateSha -notmatch "^[0-9a-f]{40}$") { throw "Unable to read candidate HEAD." }

$EvidenceRelative = if ($IndependentReview) {
    "runtime\tmp\phase3-independent-review-$Port"
} else {
    "reengineering\evidence\phase-3\LW-P3-001"
}
if (-not $IndependentReview -and $EvidencePath -ne "reengineering\evidence\phase-3\LW-P3-001") {
    throw "Canonical evidence path override is not authorized."
}
$EvidenceRoot = Resolve-RepositoryDescendant -Path $EvidenceRelative -Label "Evidence path"
Assert-ExactDescendant -Path $EvidenceRoot -ExpectedRelative $EvidenceRelative -Label "Evidence path"
$ScratchRoot = Resolve-RepositoryDescendant -Path "runtime\tmp\phase3-verification-$Port" -Label "Scratch path"
$BrowserCache = Resolve-RepositoryDescendant -Path "runtime\tmp\phase3-playwright-browsers" -Label "Playwright browser cache"
if ($FinalizeEvidence) {
    if (-not (Test-Path -LiteralPath $EvidenceRoot -PathType Container)) {
        throw "-FinalizeEvidence requires an existing canonical evidence directory: $EvidenceRoot"
    }
    & git -C $RepositoryRoot diff --quiet HEAD --
    if ($LASTEXITCODE -ne 0) {
        throw "-FinalizeEvidence refuses tracked changes outside the exact candidate commit."
    }
    $untracked = @(& git -C $RepositoryRoot ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inventory untracked files before final evidence validation."
    }
    $allowedEvidencePrefix = "reengineering/evidence/phase-3/LW-P3-001/"
    $unexpectedUntracked = @(
        $untracked |
            ForEach-Object { $_.Trim().Replace("\", "/") } |
            Where-Object {
                $_ -and
                $_ -ne "reengineering/evidence/phase-3/LW-P3-001" -and
                -not $_.StartsWith($allowedEvidencePrefix, [System.StringComparison]::Ordinal)
            }
    )
    if ($unexpectedUntracked.Count -gt 0) {
        throw "-FinalizeEvidence refuses untracked files outside the evidence bundle: $($unexpectedUntracked -join ', ')"
    }
} else {
    Remove-ExactRepositoryDirectory -Path $EvidenceRoot -ExpectedRelative $EvidenceRelative -Label "Evidence path"
}
Remove-ExactRepositoryDirectory -Path $ScratchRoot -ExpectedRelative "runtime\tmp\phase3-verification-$Port" -Label "Scratch path"
New-Item -ItemType Directory -Force -Path $EvidenceRoot, $ScratchRoot, $BrowserCache | Out-Null

$env:TEMP = Join-Path $ScratchRoot "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $ScratchRoot "npm-cache"
$env:npm_config_update_notifier = "false"
$env:npm_config_fund = "false"
$env:npm_config_audit = "false"
$env:npm_config_ignore_scripts = "true"
$env:PLAYWRIGHT_BROWSERS_PATH = $BrowserCache
$env:LATTICEWORK_P3_PORT = [string]$Port
$env:LATTICEWORK_P3_PLAYWRIGHT_OUTPUT = Join-Path $EvidenceRoot "browser"
$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
New-Item -ItemType Directory -Force -Path $env:TEMP, $env:npm_config_cache | Out-Null

if ($IndependentReview) {
    Invoke-EvidenceCommand -Id "$WorkId-independent-worktree-start" -Directory "worktree-start" -Command @("git.exe", "status", "--porcelain")
}

$gateReceipts = [ordered]@{
    "strict-typecheck" = "commands/strict-typecheck/manifest.json"
    "node-unit" = "commands/node-unit/manifest.json"
    "browser-indexeddb" = "commands/browser-indexeddb/manifest.json"
    "provider-no-egress" = "commands/provider-no-egress/manifest.json"
    "protected-boundary" = "commands/protected-boundary/manifest.json"
    "deterministic-build" = "commands/deterministic-build/manifest.json"
    "lockfile-replay" = "commands/lockfile-replay/manifest.json"
    "supply-chain" = "commands/supply-chain/manifest.json"
    "full-repository-controls" = "commands/full-repository-controls/manifest.json"
    "diff-and-json-hygiene" = "commands/diff-and-json-hygiene/manifest.json"
}

if ($FinalizeEvidence) {
    $preSummaryPath = Join-Path $EvidenceRoot "summary.json"
    if (-not (Test-Path -LiteralPath $preSummaryPath -PathType Leaf)) {
        throw "-FinalizeEvidence requires the pre-independent summary."
    }
    $preSummary = Get-Content -LiteralPath $preSummaryPath -Raw | ConvertFrom-Json
    if ($preSummary.schema -ne "latticework.phase3-pre-independent-summary.v1" -or $preSummary.candidate_sha -ne $CandidateSha) {
        throw "Pre-independent evidence does not belong to candidate $CandidateSha."
    }
    foreach ($receipt in $gateReceipts.Values) {
        $receiptPath = Join-Path $EvidenceRoot ($receipt.Replace("/", "\"))
        if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) {
            throw "Required canonical command receipt is missing: $receipt"
        }
        $record = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
        if ($record.exit_code -ne 0 -or $record.baseline_sha -ne $BaselineSha -or $record.candidate_sha -ne $CandidateSha) {
            throw "Required canonical command receipt is not green or has the wrong identity: $receipt"
        }
    }
    $review = Join-Path $EvidenceRoot "independent-review"
    if (-not (Test-Path -LiteralPath $review -PathType Container)) {
        throw "-FinalizeEvidence requires the copied independent-review directory."
    }
    Invoke-EvidenceCommand -Id "$WorkId-independent-clean-worktree" -Directory "independent-clean-worktree" -Command @("node.exe", $EvidenceValidator, "--independent-review", $review, "--candidate-sha", $CandidateSha)
    $gateReceipts["independent-clean-worktree"] = "commands/independent-clean-worktree/manifest.json"
    $gateReceipts["evidence-manifest"] = "commands/evidence-manifest/manifest.json"
    $gateRecords = [ordered]@{}
    foreach ($gate in $gateReceipts.Keys) {
        $gateRecords[$gate] = [ordered]@{ valid = $true; receipt = $gateReceipts[$gate] }
    }
    $summary = [ordered]@{
        schema = "latticework.phase3-summary.v1"
        evidence_label = "MEASURED"
        work_id = $WorkId
        valid = $true
        baseline_sha = $BaselineSha
        implementation_base_commit = $ImplementationBase
        candidate_sha = $CandidateSha
        safety = [ordered]@{
            real_user_data = "not-accessed"
            real_provider_traffic = "none"
            real_credentials = "none"
            listener = "none"
            legacy_mutation = "none"
            candidate_activation = "none"
            cutover = "none"
        }
        gates = $gateRecords
        repository_controls = $preSummary.repository_controls
    }
    [System.IO.File]::WriteAllText($preSummaryPath, (($summary | ConvertTo-Json -Depth 12) + [Environment]::NewLine), $Utf8NoBom)
    $existingManifest = Join-Path $EvidenceRoot "manifest.json"
    if (Test-Path -LiteralPath $existingManifest -PathType Leaf) {
        Remove-Item -LiteralPath $existingManifest -Force
    }
    $pendingReadme = Join-Path $EvidenceRoot "README.md"
    if (Test-Path -LiteralPath $pendingReadme -PathType Leaf) {
        Remove-Item -LiteralPath $pendingReadme -Force
    }
    # The manifest receipt is captured before the final manifest so that the
    # final manifest can hash that receipt without a self-referential cycle.
    Invoke-EvidenceCommand -Id "$WorkId-evidence-manifest" -Directory "evidence-manifest" -Command @("node.exe", $ManifestEvidenceDirectory, "--directory", $EvidenceRoot, "--output", (Join-Path $ScratchRoot "provisional-manifest.json"), "--id", "$WorkId-bundle", "--baseline-sha", $BaselineSha, "--candidate-sha", $CandidateSha)
    & node $ManifestEvidenceDirectory --directory $EvidenceRoot --output $existingManifest --id "$WorkId-bundle" --baseline-sha $BaselineSha --candidate-sha $CandidateSha
    if ($LASTEXITCODE -ne 0) { throw "Final Phase 3 manifest generation failed." }
    & node $EvidenceValidator --evidence $EvidenceRoot --require-independent true
    if ($LASTEXITCODE -ne 0) { throw "Final Phase 3 evidence validation failed." }
    Write-Host "Phase 3 final evidence validated: $EvidenceRoot"
    exit 0
}

Invoke-EvidenceCommand -Id "$WorkId-environment" -Directory "environment" -Command @("cmd.exe", "/d", "/s", "/c", "node --version && npm --version && npx playwright --version && git --version")

$replay = Join-Path $ScratchRoot "lockfile-replay"
New-Item -ItemType Directory -Force -Path $replay | Out-Null
Copy-Item (Join-Path $RepositoryRoot "package.json") (Join-Path $replay "package.json")
Copy-Item (Join-Path $RepositoryRoot "package-lock.json") (Join-Path $replay "package-lock.json")
foreach ($path in @("apps\web", "packages\contracts", "packages\kernel", "packages\storage", "packages\providers", "tests\phase2", "tests\phase3")) {
    $target = Join-Path $replay $path
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Copy-Item (Join-Path $RepositoryRoot "$path\package.json") (Join-Path $target "package.json")
}
Invoke-EvidenceCommand -Id "$WorkId-lockfile-replay" -Directory "lockfile-replay" -WorkingDirectory $replay -Command @("cmd.exe", "/d", "/s", "/c", "npm install --package-lock-only --ignore-scripts")
$lockMatch = (Get-FileHash (Join-Path $RepositoryRoot "package-lock.json") -Algorithm SHA256).Hash -eq (Get-FileHash (Join-Path $replay "package-lock.json") -Algorithm SHA256).Hash
if (-not $lockMatch) { throw "Isolated lockfile replay did not reproduce package-lock.json." }

Invoke-EvidenceCommand -Id "$WorkId-install" -Directory "install" -Command @("cmd.exe", "/d", "/s", "/c", "npm ci --ignore-scripts")
Invoke-EvidenceCommand -Id "$WorkId-strict-typecheck" -Directory "strict-typecheck" -Command @("cmd.exe", "/d", "/s", "/c", "npm run p3:typecheck")
Invoke-EvidenceCommand -Id "$WorkId-node-unit" -Directory "node-unit" -Command @("cmd.exe", "/d", "/s", "/c", "npm run p3:test")
Invoke-EvidenceCommand -Id "$WorkId-provider-no-egress" -Directory "provider-no-egress" -Command @("node.exe", "--test", "tests/reengineering/phase3-provider-boundary.test.mjs")
Invoke-EvidenceCommand -Id "$WorkId-protected-boundary" -Directory "protected-boundary" -Command @("node.exe", "tools/reengineering/verify-phase3-boundary.mjs")

Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand -Id "$WorkId-deterministic-build-1" -Directory "deterministic-build-1" -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:build")
$secondBuild = Join-Path $EvidenceRoot "generated\phase2-build-2"
$env:LATTICEWORK_P2_OUT_DIR = $secondBuild
Invoke-EvidenceCommand -Id "$WorkId-deterministic-build-2" -Directory "deterministic-build-2" -Command @("cmd.exe", "/d", "/s", "/c", "npm run p2:build")
Remove-Item Env:LATTICEWORK_P2_OUT_DIR -ErrorAction SilentlyContinue
Invoke-EvidenceCommand -Id "$WorkId-deterministic-build" -Directory "deterministic-build" -Command @("node.exe", "tools/reengineering/verify-phase2-build.mjs", "--workspace-root", $RepositoryRoot, "--first", (Join-Path $RepositoryRoot "output\lw-p2-001\web"), "--second", $secondBuild, "--output", (Join-Path $EvidenceRoot "phase2-build-comparison.json"))

Invoke-EvidenceCommand -Id "$WorkId-browser-install" -Directory "browser-install" -Command @("cmd.exe", "/d", "/s", "/c", "npx playwright install chromium")
Invoke-EvidenceCommand -Id "$WorkId-browser-indexeddb" -Directory "browser-indexeddb" -Command @("cmd.exe", "/d", "/s", "/c", "npm run p3:browser")

Invoke-EvidenceCommand -Id "$WorkId-audit" -Directory "audit" -AllowNonZero -Command @("cmd.exe", "/d", "/s", "/c", "npm audit --workspaces --include-workspace-root --json")
$audit = Get-Content (Join-Path $EvidenceRoot "commands\audit\stdout.log") -Raw | ConvertFrom-Json
if ($audit.metadata.vulnerabilities.total -ne 0) { throw "npm audit reported vulnerabilities." }
Copy-Item (Join-Path $EvidenceRoot "commands\audit\stdout.log") (Join-Path $EvidenceRoot "npm-audit.json")
Invoke-EvidenceCommand -Id "$WorkId-sbom" -Directory "sbom" -Command @("cmd.exe", "/d", "/s", "/c", "npm sbom --sbom-format cyclonedx")
Copy-Item (Join-Path $EvidenceRoot "commands\sbom\stdout.log") (Join-Path $EvidenceRoot "sbom.cdx.json")
Invoke-EvidenceCommand -Id "$WorkId-supply-chain" -Directory "supply-chain" -Command @("node.exe", "tools/reengineering/collect-phase2-supply-chain.mjs", "--workspace-root", $RepositoryRoot, "--output", (Join-Path $EvidenceRoot "supply-chain.json"))

Invoke-EvidenceCommand -Id "$WorkId-full-repository-controls" -Directory "full-repository-controls" -Command @("node.exe", "--test", "--test-reporter=tap", "tests/reengineering/*.test.mjs")
$controls = Read-TapCounts (Join-Path $EvidenceRoot "commands\full-repository-controls\stdout.log")
if ($controls.tests -le 0 -or $controls.fail -ne 0 -or $controls.skipped -ne 0 -or $controls.todo -ne 0) { throw "Repository controls must have tests and zero fail, skip, and todo." }
Invoke-EvidenceCommand -Id "$WorkId-diff-and-json-hygiene" -Directory "diff-and-json-hygiene" -Command @("cmd.exe", "/d", "/s", "/c", "git diff --check $ImplementationBase -- && node --check tools/reengineering/validate-phase3-evidence.mjs && node tools/reengineering/validate-phase3-decision-packet.mjs && node tools/reengineering/validate-phase3-preflight.mjs")

if ($IndependentReview) {
    Invoke-EvidenceCommand -Id "$WorkId-independent-worktree-end" -Directory "worktree-end" -Command @("git.exe", "status", "--porcelain")
    $reviewStatus = @(& git -C $RepositoryRoot status --porcelain)
    if ($LASTEXITCODE -ne 0 -or $reviewStatus.Count -ne 0) {
        throw "Independent review worktree is not clean after automated reproduction."
    }
    $independentGates = [ordered]@{}
    foreach ($gate in $gateReceipts.Keys) {
        $independentGates[$gate] = [ordered]@{
            valid = $true
            receipt = $gateReceipts[$gate]
        }
    }
    $automation = [ordered]@{
        schema = "latticework.phase3-independent-review.v1"
        work_id = $WorkId
        evidence_label = "MEASURED"
        valid = $true
        verdict = "AUTOMATED_GATES_GREEN"
        baseline_sha = $BaselineSha
        implementation_base_commit = $ImplementationBase
        candidate_sha = $CandidateSha
        worktree = [ordered]@{
            root = $RepositoryRoot
            clean_start = $true
            clean_end = $true
            start_receipt = "commands/worktree-start/manifest.json"
            install_receipt = "commands/install/manifest.json"
            end_receipt = "commands/worktree-end/manifest.json"
        }
        gates = $independentGates
        repository_controls = $controls
    }
    [System.IO.File]::WriteAllText((Join-Path $EvidenceRoot "automation.json"), (($automation | ConvertTo-Json -Depth 12) + [Environment]::NewLine), $Utf8NoBom)
    $reviewNote = "# Phase 3 independent automation`n`n**Status:** AUTOMATED_GATES_GREEN_REVIEW_JUDGMENT_PENDING`n`nCandidate: ``$CandidateSha``. These receipts were captured from the clean detached worktree at ``$RepositoryRoot``. A separate reviewer must add ``REVIEW.md`` before the bundle may satisfy finalization.`n"
    [System.IO.File]::WriteAllText((Join-Path $EvidenceRoot "README.md"), $reviewNote, $Utf8NoBom)
    Write-Host "Phase 3 independent automation captured: $EvidenceRoot"
    Write-Host "Independent reviewer judgment remains required; this is not a final GREEN bundle."
    exit 0
}

$summary = [ordered]@{ schema = "latticework.phase3-pre-independent-summary.v1"; evidence_label = "MEASURED"; work_id = $WorkId; baseline_sha = $BaselineSha; implementation_base_commit = $ImplementationBase; candidate_sha = $CandidateSha; status = "PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW"; safety = @{ real_user_data = "not-accessed"; real_provider_traffic = "none"; real_credentials = "none"; listener = "none"; legacy_mutation = "none"; candidate_activation = "none"; cutover = "none" }; gates = $gateReceipts; repository_controls = $controls }
[System.IO.File]::WriteAllText((Join-Path $EvidenceRoot "summary.json"), (($summary | ConvertTo-Json -Depth 12) + [Environment]::NewLine), $Utf8NoBom)

$note = "# Phase 3 canonical evidence - pending independent review`n`n**Status:** PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW`n`nCandidate: ``$CandidateSha``. Canonical receipts are complete; do not treat this bundle as independently VERIFIED. Run this script with ``-IndependentReview`` in a separate clean detached worktree, copy its receipt bundle into ``independent-review/``, add the structured ``REVIEW.md`` judgment, and then rerun this script with ``-FinalizeEvidence``.`n"
[System.IO.File]::WriteAllText((Join-Path $EvidenceRoot "README.md"), $note, $Utf8NoBom)

Write-Host "Phase 3 canonical verification receipts captured: $EvidenceRoot"
Write-Host "Independent review remains required; this is not a final GREEN bundle."
