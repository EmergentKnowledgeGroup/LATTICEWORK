param(
    [int]$Port = 5195,
    [switch]$IndependentReview,
    [string]$IndependentReviewPath = ""
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$ImplementationBase = "ac45408307e91ee8d850c24753ce6b4d6e903f12"
$WorkId = "LW-P5-MEM-001"
$RunCommand = Join-Path $PSScriptRoot "run-evidence-command.mjs"
$ManifestTool = Join-Path $PSScriptRoot "manifest-evidence-directory.mjs"

if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be between 1024 and 65535." }
if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) { throw "Immutable baseline is missing." }
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha) { throw "Immutable baseline SHA mismatch." }
if (& git -C $BaselineRoot status --porcelain) { throw "Immutable baseline is dirty." }
& git -C $Repo merge-base --is-ancestor $ImplementationBase HEAD
if ($LASTEXITCODE -ne 0) { throw "Implementation base is not an ancestor of HEAD." }
if (& git -C $Repo status --porcelain) { throw "Verification requires a clean candidate worktree." }

$CandidateSha = (& git -C $Repo rev-parse HEAD).Trim()
if ($CandidateSha -notmatch "^[0-9a-f]{40}$") { throw "Unable to read candidate SHA." }

function Resolve-RepoPath([string]$Relative, [string]$Label) {
    $absolute = [System.IO.Path]::GetFullPath((Join-Path $Repo $Relative))
    $prefix = [System.IO.Path]::GetFullPath($Repo).TrimEnd('\') + '\'
    if (-not $absolute.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label escaped the repository."
    }
    return $absolute
}

$EvidenceRelative = if ($IndependentReview) {
    "runtime\tmp\phase5-lattice-memory-independent-$Port"
} else {
    "reengineering\evidence\phase-5\LW-P5-MEM-001"
}
$ScratchRelative = "runtime\tmp\phase5-lattice-memory-verification-$Port"
$Evidence = Resolve-RepoPath $EvidenceRelative "evidence"
$Scratch = Resolve-RepoPath $ScratchRelative "scratch"
$BrowserOutput = Resolve-RepoPath "runtime\tmp\phase5-browser-agent\playwright" "browser output"

foreach ($entry in @(@($Evidence, $EvidenceRelative), @($Scratch, $ScratchRelative))) {
    $expected = Resolve-RepoPath $entry[1] "cleanup target"
    if (-not [string]::Equals($entry[0], $expected, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing ambiguous cleanup target."
    }
    if (Test-Path -LiteralPath $entry[0]) { Remove-Item -LiteralPath $entry[0] -Recurse -Force }
}
New-Item -ItemType Directory -Force -Path $Evidence, $Scratch | Out-Null

$env:TEMP = Join-Path $Scratch "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $Scratch "npm-cache"
$env:npm_config_update_notifier = "false"
$env:npm_config_fund = "false"
$env:LATTICEWORK_P5_PORT = [string]$Port
$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
New-Item -ItemType Directory -Force -Path $env:TEMP, $env:npm_config_cache | Out-Null

function Invoke-Receipt {
    param([string]$Name, [string[]]$Command, [switch]$AllowNonZero)
    $output = Join-Path $Evidence "commands\$Name"
    $args = @(
        $RunCommand, "--cwd", $Repo, "--output", $output, "--id", "$WorkId-$Name",
        "--baseline-sha", $BaselineSha, "--candidate-sha", $CandidateSha, "--"
    ) + $Command
    & node @args | Out-Host
    if ($LASTEXITCODE -ne 0 -and -not $AllowNonZero) { throw "Gate $Name failed." }
    return "commands/$Name/manifest.json"
}

function Read-Tap([string]$File) {
    $text = Get-Content -LiteralPath $File -Raw
    $counts = [ordered]@{}
    foreach ($name in @("tests", "pass", "fail", "skipped", "todo")) {
        $match = [regex]::Match($text, "(?m)^# $name (?<count>\d+)\r?$")
        $counts[$name] = if ($match.Success) { [int]$match.Groups["count"].Value } else { 0 }
    }
    return $counts
}

$gates = [ordered]@{}
$gates.environment = Invoke-Receipt "environment" @("cmd.exe", "/d", "/s", "/c", "node --version && npm --version && npx playwright --version && git --version")
$gates.install = Invoke-Receipt "install" @("cmd.exe", "/d", "/s", "/c", "npm ci --ignore-scripts")
$gates.scope = Invoke-Receipt "scope" @("cmd.exe", "/d", "/s", "/c", "node tools/reengineering/validate-phase5-active-scope.mjs && node tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs")
$gates.typecheck = Invoke-Receipt "typecheck" @("cmd.exe", "/d", "/s", "/c", "npm run p5:typecheck")
$gates.unit = Invoke-Receipt "unit" @("cmd.exe", "/d", "/s", "/c", "npm run p5:test")
$gates.browser = Invoke-Receipt "browser" @("cmd.exe", "/d", "/s", "/c", "npm run p5:browser")

$Browser = Join-Path $Evidence "browser"
$Attachments = Join-Path $Browser "attachments"
New-Item -ItemType Directory -Force -Path $Attachments | Out-Null
Copy-Item (Join-Path $BrowserOutput "results.json") (Join-Path $Browser "results.json")
$browserReport = Get-Content (Join-Path $Browser "results.json") -Raw | ConvertFrom-Json
$browserStats = $browserReport.stats
if ($browserStats.expected -ne 4 -or $browserStats.unexpected -ne 0 -or $browserStats.flaky -ne 0 -or $browserStats.skipped -ne 0) {
    throw "Browser inventory mismatch."
}
$attachmentRows = @($browserReport.suites.specs.tests.results.attachments)
if ($attachmentRows.Count -ne 8) { throw "Expected eight browser receipts." }
foreach ($attachment in $attachmentRows) {
    if ($attachment.contentType -ne "application/json" -or -not $attachment.body) { throw "Browser attachment is not embedded JSON." }
    $bytes = [Convert]::FromBase64String([string]$attachment.body)
    $json = [Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    if ($json.schema -ne "latticework.phase5.browser-receipt.v1" -or $json.content_free -ne $true) {
        throw "Browser attachment is not content-free."
    }
    $safeName = [System.IO.Path]::GetFileName([string]$attachment.name)
    [System.IO.File]::WriteAllBytes((Join-Path $Attachments $safeName), $bytes)
}

$gates.phase3_boundary = Invoke-Receipt "phase3-boundary" @("cmd.exe", "/d", "/s", "/c", "npm run p3:boundary")
$gates.phase4_verification = Invoke-Receipt "phase4-verification" @(
    "cmd.exe", "/d", "/s", "/c",
    "node tools/reengineering/validate-phase4-active-scope.mjs && node tools/reengineering/validate-phase4-amendment.mjs && node tools/reengineering/validate-phase4-implementation-scope.mjs && npm run p4:typecheck && npm run p4:test && npm run p4:browser"
)
$gates.repository_controls = Invoke-Receipt "repository-controls" @("cmd.exe", "/d", "/s", "/c", "node --test --test-reporter=tap tests/reengineering/*.test.mjs")
$controls = Read-Tap (Join-Path $Evidence "commands\repository-controls\stdout.log")
if ($controls.tests -le 0 -or $controls.pass -ne $controls.tests -or $controls.fail -ne 0 -or $controls.skipped -ne 0 -or $controls.todo -ne 0) {
    throw "Repository controls are not all-pass."
}

$pack1 = Join-Path $Scratch "pack-1.json"
$pack2 = Join-Path $Scratch "pack-2.json"
$gates.deterministic_build = Invoke-Receipt "deterministic-build" @(
    "powershell.exe", "-NoProfile", "-Command",
    "`$env:npm_config_cache='$($env:npm_config_cache)'; npm pack --workspace @latticework/lattice-memory --dry-run --json | Set-Content -NoNewline -Encoding utf8 '$pack1'; npm pack --workspace @latticework/lattice-memory --dry-run --json | Set-Content -NoNewline -Encoding utf8 '$pack2'; if ((Get-FileHash '$pack1').Hash -ne (Get-FileHash '$pack2').Hash) { exit 1 }"
)
$gates.audit = Invoke-Receipt "audit" @("cmd.exe", "/d", "/s", "/c", "npm audit --workspaces --include-workspace-root --json") -AllowNonZero
$audit = Get-Content (Join-Path $Evidence "commands\audit\stdout.log") -Raw | ConvertFrom-Json
if ($audit.metadata.vulnerabilities.total -ne 0) { throw "npm audit reported vulnerabilities." }
Copy-Item (Join-Path $Evidence "commands\audit\stdout.log") (Join-Path $Evidence "npm-audit.json")
$gates.sbom = Invoke-Receipt "sbom" @("cmd.exe", "/d", "/s", "/c", "npm sbom --sbom-format cyclonedx")
Copy-Item (Join-Path $Evidence "commands\sbom\stdout.log") (Join-Path $Evidence "sbom.cdx.json")
$gates.hygiene = Invoke-Receipt "hygiene" @(
    "cmd.exe", "/d", "/s", "/c",
    "git diff --check $ImplementationBase -- && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs"
)

$independent = $null
if ($IndependentReview) {
    if (& git -C $Repo status --porcelain) { throw "Independent review dirtied its worktree." }
    $review = [ordered]@{
        schema = "latticework.phase5-independent-review.v1"
        verdict = "GREEN"
        candidate_sha = $CandidateSha
        findings = @()
        repository_controls = $controls
        browser = @{ expected = 4; unexpected = 0; flaky = 0; skipped = 0; content_free_receipts = 8 }
        gates = $gates
    }
    [System.IO.File]::WriteAllText((Join-Path $Evidence "review.json"), (($review | ConvertTo-Json -Depth 12) + "`n"), $Utf8NoBom)
} elseif ($IndependentReviewPath) {
    $resolvedReview = [System.IO.Path]::GetFullPath($IndependentReviewPath)
    if (-not (Test-Path -LiteralPath $resolvedReview -PathType Leaf)) { throw "Independent review receipt is missing." }
    $review = Get-Content $resolvedReview -Raw | ConvertFrom-Json
    if ($review.verdict -ne "GREEN" -or $review.candidate_sha -ne $CandidateSha -or @($review.findings).Count -ne 0) {
        throw "Independent review receipt is not clean GREEN for this candidate."
    }
    New-Item -ItemType Directory -Force (Join-Path $Evidence "independent-review") | Out-Null
    Copy-Item $resolvedReview (Join-Path $Evidence "independent-review\review.json")
    $independent = @{ verdict = "GREEN"; candidate_sha = $CandidateSha; receipt = "independent-review/review.json" }
}

if (-not $IndependentReview) {
    $summary = [ordered]@{
        schema = "latticework.phase5-lattice-memory-implementation-summary.v1"
        evidence_label = "MEASURED"
        work_id = $WorkId
        valid = $true
        status = if ($independent) { "GREEN" } else { "PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW" }
        implementation_base_commit = $ImplementationBase
        candidate_sha = $CandidateSha
        safety = @{
            real_user_data = "not-accessed"; real_provider_traffic = "none"; real_credentials = "none"
            application_listener = "none"; test_listener = "exact-loopback-run-owned"
            candidate_activation = "none"; deployment = "none"; cutover = "none"
        }
        repository_controls = $controls
        browser = @{ expected = 4; unexpected = 0; flaky = 0; skipped = 0; content_free_receipts = 8 }
        gates = $gates
        independent_review = $independent
    }
    [System.IO.File]::WriteAllText((Join-Path $Evidence "summary.json"), (($summary | ConvertTo-Json -Depth 12) + "`n"), $Utf8NoBom)
    [System.IO.File]::WriteAllText(
        (Join-Path $Evidence "README.md"),
        "# Phase 5 LatticeMemory implementation evidence`n`nStatus: $($summary.status)`n`nSynthetic/disposable package-only verification. Real data, credentials, provider traffic, application activation, deployment, and cutover remained disabled.`n",
        $Utf8NoBom
    )
}

& node $ManifestTool --directory $Evidence --output (Join-Path $Evidence "manifest.json") --id "$WorkId-bundle" --baseline-sha $BaselineSha --candidate-sha $CandidateSha
if ($LASTEXITCODE -ne 0) { throw "Evidence manifest generation failed." }

if ($IndependentReview) {
    Write-Host "Independent Phase 5 review GREEN: $(Join-Path $Evidence 'review.json')"
} else {
    Write-Host "Phase 5 evidence captured: $Evidence"
    if (-not $independent) { Write-Host "Independent clean-worktree review remains required." }
}
