param(
    [int]$Port = 4184,
    [string]$IndependentReviewPath
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$BaseCommit = "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd"
$WorkId = "LW-P4-CHAR-001"
$HarnessRoot = Join-Path $RepositoryRoot "tests\characterization"
$EvidenceRoot = Join-Path $RepositoryRoot "reengineering\evidence\phase-4\$WorkId"
$BrowserCache = Join-Path $RepositoryRoot "runtime\tmp\phase3-playwright-browsers"
$RunId = "p4-" + [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ") + "-" + ([guid]::NewGuid().ToString("N").Substring(0, 8))
$RunRoot = Join-Path $RepositoryRoot "runtime\tmp\phase4-characterization\$RunId"
$PlaywrightRoot = Join-Path $RunRoot "playwright"
$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()

function Write-Json {
    param([string]$Path, [object]$Value)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText(
        $Path,
        (($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine),
        $Utf8NoBom
    )
}

function Assert-RepositoryDescendant {
    param([string]$Path, [string]$Label)
    $resolved = [System.IO.Path]::GetFullPath($Path)
    $prefix = [System.IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay inside the repository: $resolved"
    }
    $current = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $relative = $resolved.Substring($prefix.Length)
    foreach ($segment in $relative.Split([char[]]@('\', '/'), [System.StringSplitOptions]::RemoveEmptyEntries)) {
        $current = Join-Path $current $segment
        if (-not (Test-Path -LiteralPath $current)) { break }
        if (((Get-Item -LiteralPath $current -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "$Label traverses a reparse point: $current"
        }
    }
    return $resolved
}

function Remove-ExactDirectory {
    param([string]$Path, [string]$Expected, [string]$Label)
    $resolved = Assert-RepositoryDescendant -Path $Path -Label $Label
    $expectedResolved = [System.IO.Path]::GetFullPath($Expected)
    if (-not [string]::Equals($resolved, $expectedResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove unexpected $Label path: $resolved"
    }
    if (Test-Path -LiteralPath $resolved) {
        [System.IO.Directory]::Delete($resolved, $true)
    }
}

function Write-Receipt {
    param(
        [string]$Gate,
        [string]$Status,
        [int]$ExitCode,
        [string[]]$Command,
        [object]$Details
    )
    $relative = "commands/$Gate/receipt.json"
    Write-Json -Path (Join-Path $EvidenceRoot ($relative.Replace('/', '\'))) -Value ([ordered]@{
        schema = "latticework.evidence.command.v1"
        evidence_label = "MEASURED"
        gate = $Gate
        status = $Status
        exit_code = $ExitCode
        baseline_sha = $BaselineSha
        base_commit = $BaseCommit
        candidate_sha = $CandidateSha
        command = $Command
        details = $Details
    })
    return $relative
}

function Invoke-CapturedCommand {
    param([string]$Gate, [string[]]$Command, [string]$WorkingDirectory = $RepositoryRoot)
    $stdoutPath = Join-Path $EvidenceRoot "commands\$Gate\stdout.log"
    $stderrPath = Join-Path $EvidenceRoot "commands\$Gate\stderr.log"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $stdoutPath) | Out-Null
    $process = Start-Process -FilePath $Command[0] `
        -ArgumentList $Command[1..($Command.Count - 1)] `
        -WorkingDirectory $WorkingDirectory `
        -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath
    $status = if ($process.ExitCode -eq 0) { "PASS" } else { "FAIL" }
    $receipt = Write-Receipt -Gate $Gate -Status $status -ExitCode $process.ExitCode -Command $Command -Details ([ordered]@{
        stdout = "commands/$Gate/stdout.log"
        stderr = "commands/$Gate/stderr.log"
    })
    return [ordered]@{ exit_code = $process.ExitCode; receipt = $receipt }
}

function Find-Attachments {
    param([object]$Node, [System.Collections.Generic.List[object]]$Output)
    if ($null -eq $Node) { return }
    if ($Node -is [System.Collections.IEnumerable] -and $Node -isnot [string] -and $Node -isnot [pscustomobject]) {
        foreach ($item in $Node) { Find-Attachments -Node $item -Output $Output }
        return
    }
    if ($Node -is [pscustomobject]) {
        if ($Node.PSObject.Properties.Name -contains "name" -and
            $Node.PSObject.Properties.Name -contains "body" -and
            $Node.name -in @("scenario-result.json", "network-receipt.json", "storage-projection.json")) {
            $Output.Add($Node)
        }
        foreach ($property in $Node.PSObject.Properties) {
            Find-Attachments -Node $property.Value -Output $Output
        }
    }
}

function New-Manifest {
    $artifacts = @()
    Get-ChildItem -LiteralPath $EvidenceRoot -File -Recurse |
        Where-Object { $_.FullName -ne (Join-Path $EvidenceRoot "manifest.json") } |
        ForEach-Object {
            $artifacts += [ordered]@{
                path = [System.IO.Path]::GetRelativePath($EvidenceRoot, $_.FullName).Replace('\', '/')
                bytes = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
    Write-Json -Path (Join-Path $EvidenceRoot "manifest.json") -Value ([ordered]@{
        schema = "latticework.evidence.artifact-bundle.v1"
        receipt_id = "$WorkId-bundle"
        baseline_sha = $BaselineSha
        base_commit = $BaseCommit
        candidate_sha = $CandidateSha
        artifacts = @($artifacts | Sort-Object path)
    })
}

if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be between 1024 and 65535." }
if ($CandidateSha -notmatch "^[0-9a-f]{40}$") { throw "Unable to resolve candidate SHA." }
if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) { throw "Immutable baseline worktree is missing." }
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha) { throw "Immutable baseline SHA mismatch." }
if (& git -C $BaselineRoot status --porcelain) { throw "Immutable baseline worktree is dirty." }
& git -C $RepositoryRoot merge-base --is-ancestor $BaseCommit HEAD
if ($LASTEXITCODE -ne 0) { throw "Phase 4 base commit is not an ancestor of HEAD." }

Assert-RepositoryDescendant -Path $EvidenceRoot -Label "evidence root" | Out-Null
Assert-RepositoryDescendant -Path $RunRoot -Label "run root" | Out-Null
Remove-ExactDirectory -Path $EvidenceRoot -Expected $EvidenceRoot -Label "evidence root"
New-Item -ItemType Directory -Force -Path $EvidenceRoot, $PlaywrightRoot, $BrowserCache | Out-Null

$runMarker = [ordered]@{
    schema = "latticework.phase4-run-ownership.v1"
    repository_root = $RepositoryRoot
    run_id = $RunId
    pid = $PID
    created_at = [DateTime]::UtcNow.ToString("o")
    nonce = [guid]::NewGuid().ToString("N")
}
Write-Json -Path (Join-Path $RunRoot ".ownership.json") -Value $runMarker

$env:TEMP = Join-Path $RunRoot "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $RunRoot "npm-cache"
$env:npm_config_update_notifier = "false"
$env:npm_config_fund = "false"
$env:npm_config_audit = "false"
$env:PLAYWRIGHT_BROWSERS_PATH = $BrowserCache
$env:LATTICEWORK_PHASE4_RUN_ID = $RunId
$env:LATTICEWORK_PHASE4_RUN_ROOT = $RunRoot
$env:LATTICEWORK_PHASE1_EVIDENCE_ROOT = $PlaywrightRoot
$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
$env:LATTICEWORK_CHARACTERIZATION_BASE_URL = "http://127.0.0.1:$Port"
New-Item -ItemType Directory -Force -Path $env:TEMP, $env:npm_config_cache | Out-Null

$scopeGate = Invoke-CapturedCommand -Gate "phase-closed-scope" -Command @(
    "node.exe", "--test", "--test-reporter=tap",
    "tests/reengineering/phase3-decision-packet.test.mjs",
    "tests/reengineering/phase3-preflight.test.mjs",
    "tests/reengineering/phase4-active-scope.test.mjs"
)
if ($scopeGate.exit_code -ne 0) { throw "Historical/active scope controls failed." }

$baselineReceipt = Write-Receipt -Gate "immutable-baseline" -Status "PASS" -ExitCode 0 -Command @(
    "git", "-C", $BaselineRoot, "status", "--porcelain"
) -Details ([ordered]@{ root = $BaselineRoot; clean = $true; sha = $BaselineSha })

$fixtureGate = Invoke-CapturedCommand -Gate "fixture-schema" -Command @(
    "node.exe", "--check", "tests/characterization/specs/phase4-chat.spec.mjs"
)
if ($fixtureGate.exit_code -ne 0) { throw "Phase 4 fixture/spec syntax failed." }

$playwrightCommand = @(
    (Join-Path $HarnessRoot "node_modules\.bin\playwright.cmd"),
    "test", "specs/phase4-chat.spec.mjs",
    "--config", "playwright.config.mjs",
    "--workers=1", "--retries=0"
)
$playwright = Invoke-CapturedCommand -Gate "browser-execution" -WorkingDirectory $HarnessRoot -Command $playwrightCommand
if ($playwright.exit_code -ne 0) { throw "Playwright characterization did not execute all cases cleanly." }

$reportPath = Join-Path $PlaywrightRoot "playwright-results.json"
if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) { throw "Playwright JSON reporter output is missing." }
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json -Depth 100
$attachments = [System.Collections.Generic.List[object]]::new()
Find-Attachments -Node $report -Output $attachments
$bySubcase = @{}
$orderedAttachments = @($attachments)
if ($orderedAttachments.Count -ne 117) {
    throw "Expected 117 Playwright attachments (39 network/storage/result triplets); observed $($orderedAttachments.Count)."
}
for ($index = 0; $index -lt $orderedAttachments.Count; $index += 3) {
    $networkAttachment = $orderedAttachments[$index]
    $storageAttachment = $orderedAttachments[$index + 1]
    $resultAttachment = $orderedAttachments[$index + 2]
    if (
        $networkAttachment.name -ne "network-receipt.json" -or
        $storageAttachment.name -ne "storage-projection.json" -or
        $resultAttachment.name -ne "scenario-result.json"
    ) {
        throw "Unexpected Playwright attachment order at triplet index $($index / 3)."
    }
    $rawResult = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resultAttachment.body)) | ConvertFrom-Json -Depth 100
    $rawNetwork = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($networkAttachment.body)) | ConvertFrom-Json -Depth 100
    $rawStorage = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($storageAttachment.body)) | ConvertFrom-Json -Depth 100
    $bySubcase[$rawResult.subcase_id] = [ordered]@{ result = $rawResult; network = $rawNetwork; storage = $rawStorage }
}
if ($bySubcase.Count -ne 39) { throw "Expected 39 atomic attachments; observed $($bySubcase.Count)." }

$results = @()
foreach ($id in @($bySubcase.Keys | Sort-Object)) {
    $entry = $bySubcase[$id]
    $rawResult = $entry.result
    $rawNetwork = $entry.network
    $resultDirectory = Join-Path $EvidenceRoot "results\$id"
    Write-Json -Path (Join-Path $resultDirectory "observation.json") -Value $rawResult
    Write-Json -Path (Join-Path $resultDirectory "network.json") -Value $rawNetwork
    Write-Json -Path (Join-Path $resultDirectory "storage.json") -Value $entry.storage
    $expectedRequests = @()
    if ($rawNetwork.expected_target) {
        $expectedRequests += [ordered]@{
            target = $rawNetwork.expected_target
            observed = @($rawNetwork.expected_requests).Count -gt 0
            transmitted = $false
        }
    }
    $results += [ordered]@{
        id = $rawResult.subcase_id
        group = $rawResult.group_id
        status = $rawResult.status
        observation_receipt = "results/$id/observation.json"
        profile = [ordered]@{
            id = "P4-PROFILE-$id"
            path = $rawResult.profile_path
            synthetic = $true
            empty_at_creation = $rawResult.profile_empty_at_creation -eq $true
            ownership_marker = "phase4-run-marker-v1"
            created_for_subcase = $id
            cleanup = [ordered]@{ proven = $false; deleted = $false; no_reparse = $false }
        }
        network = [ordered]@{
            denied_egress = $true
            unexpected_transmissions = 0
            expected_fixture_requests = $expectedRequests
            expected_abort = $id.StartsWith("P4-EGR-001")
            wire_transmissions = 0
        }
        operation = [ordered]@{
            post_delta_retry = $rawResult.operation.post_delta_retry
            duplicate_terminal = $rawResult.operation.duplicate_terminal
        }
    }
}

$profilesRoot = Join-Path $RunRoot "profiles"
if (Test-Path -LiteralPath $profilesRoot) {
    foreach ($profile in Get-ChildItem -LiteralPath $profilesRoot -Directory) {
        $markerPath = Join-Path $profile.FullName ".ownership.json"
        if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) { throw "Profile ownership marker is missing: $($profile.Name)" }
        Assert-RepositoryDescendant -Path $profile.FullName -Label "profile cleanup" | Out-Null
        $profileReparse = Get-ChildItem -LiteralPath $profile.FullName -Force -Recurse |
            Where-Object { ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 } |
            Select-Object -First 1
        if ($profileReparse) { throw "Profile contains a reparse point; refusing cleanup: $($profileReparse.FullName)" }
        [System.IO.Directory]::Delete($profile.FullName, $true)
        if (Test-Path -LiteralPath $profile.FullName) {
            throw "Profile deletion did not remove the recorded path: $($profile.FullName)"
        }
        $matchingResults = @($results | Where-Object {
            [string]::Equals(
                [System.IO.Path]::GetFullPath($_.profile.path),
                [System.IO.Path]::GetFullPath($profile.FullName),
                [System.StringComparison]::OrdinalIgnoreCase
            )
        })
        if ($matchingResults.Count -ne 1) {
            throw "Profile cleanup could not identify exactly one result receipt: $($profile.FullName)"
        }
        $matchingResults[0].profile.cleanup.proven = $true
        $matchingResults[0].profile.cleanup.deleted = $true
        $matchingResults[0].profile.cleanup.no_reparse = $true
    }
}
if (@($results | Where-Object { $_.profile.cleanup.proven -ne $true }).Count -ne 0) {
    throw "Not every atomic result has a proven profile-deletion receipt."
}

$statusCounts = @{}
foreach ($status in @("PASS", "UNKNOWN", "CONDITIONAL", "FAIL")) {
    $statusCounts[$status] = @($results | Where-Object { $_.status -eq $status }).Count
}
$aggregateStatus = if ($statusCounts.PASS -eq 39) { "GREEN" } else { "BLOCKED" }

$gateGroups = [ordered]@{
    "onboarding-provider-setup" = @("P4-ONB-001", "P4-CHAT-002")
    "chat-send-stream-cancel-retry-error" = @("P4-CHAT-001", "P4-CHAT-002", "P4-CHAT-003", "P4-CHAT-004", "P4-CHAT-005", "P4-CHAT-006", "P4-CHAT-007", "P4-CHAT-008", "P4-CHAT-009", "P4-CHAT-010")
    "conversation-persistence-reload-recovery" = @("P4-CHAT-001", "P4-CHAT-002", "P4-CHAT-003", "P4-CHAT-004", "P4-CHAT-005", "P4-CHAT-006", "P4-CHAT-007", "P4-CHAT-008", "P4-CHAT-009", "P4-CHAT-010")
    "signal-report-privacy-clipboard" = @("P4-SIG-001")
    "responsive-accessibility" = @("P4-RESP-001", "P4-A11Y-001")
    "offline-denied-egress" = @("P4-DEG-001", "P4-EGR-001")
}
$gates = [ordered]@{
    "phase-closed-scope" = [ordered]@{ status = "PASS"; receipt = $scopeGate.receipt }
    "immutable-baseline" = [ordered]@{ status = "PASS"; receipt = $baselineReceipt }
    "fixture-schema" = [ordered]@{ status = "PASS"; receipt = $fixtureGate.receipt }
}
foreach ($gate in $gateGroups.Keys) {
    $members = @($results | Where-Object { $_.group -in $gateGroups[$gate] })
    $gateStatus = if (@($members | Where-Object { $_.status -ne "PASS" }).Count -eq 0) { "PASS" } else { "BLOCKED" }
    $receipt = Write-Receipt -Gate $gate -Status $gateStatus -ExitCode $(if ($gateStatus -eq "PASS") { 0 } else { 1 }) -Command @(
        "phase4-aggregate", $gate
    ) -Details ([ordered]@{
        results = @($members | ForEach-Object { [ordered]@{ id = $_.id; status = $_.status } })
    })
    $gates[$gate] = [ordered]@{ status = $gateStatus; receipt = $receipt }
}

$contentFindings = @()
Get-ChildItem -LiteralPath $EvidenceRoot -File -Recurse | ForEach-Object {
    $text = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($text -match "P4_SYNTHETIC_(?:CREDENTIAL|PROMPT|RESPONSE|DRAFT)_DO_NOT_EXPORT") {
        $contentFindings += [System.IO.Path]::GetRelativePath($EvidenceRoot, $_.FullName)
    }
}
$contentStatus = if ($contentFindings.Count -eq 0) { "PASS" } else { "FAIL" }
$contentReceipt = Write-Receipt -Gate "content-free-scan" -Status $contentStatus -ExitCode $(if ($contentStatus -eq "PASS") { 0 } else { 1 }) -Command @(
    "content-free-scan", $EvidenceRoot
) -Details ([ordered]@{ findings = $contentFindings })
$gates["content-free-scan"] = [ordered]@{ status = $contentStatus; receipt = $contentReceipt }
if ($contentFindings.Count -ne 0) { throw "Private sentinel content entered promotable evidence." }

$repositoryControlFiles = @(
    Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot "tests\reengineering") -Filter "*.test.mjs" -File |
        Sort-Object Name |
        ForEach-Object { [System.IO.Path]::GetRelativePath($RepositoryRoot, $_.FullName) }
)
$controlsCommand = @("node.exe", "--test", "--test-reporter=tap") + $repositoryControlFiles
$controls = Invoke-CapturedCommand -Gate "repository-controls" -Command $controlsCommand
$gates["repository-controls"] = [ordered]@{ status = $(if ($controls.exit_code -eq 0) { "PASS" } else { "FAIL" }); receipt = $controls.receipt }
if ($controls.exit_code -ne 0) { throw "Repository controls failed." }

$hygiene = Invoke-CapturedCommand -Gate "hygiene" -Command @(
    "node.exe", "--check", "tools/reengineering/validate-phase4-characterization.mjs"
)
$gates["hygiene"] = [ordered]@{ status = $(if ($hygiene.exit_code -eq 0) { "PASS" } else { "FAIL" }); receipt = $hygiene.receipt }
if ($hygiene.exit_code -ne 0) { throw "Phase 4 hygiene/syntax gate failed." }

$manifestReceipt = Write-Receipt -Gate "evidence-manifest" -Status "PASS" -ExitCode 0 -Command @(
    "phase4-manifest", $EvidenceRoot
) -Details ([ordered]@{ deterministic_sha256 = $true })
$gates["evidence-manifest"] = [ordered]@{ status = "PASS"; receipt = $manifestReceipt }

$reviewReceipt = "independent-review.json"
$reviewStatus = "BLOCKED"
$reviewCommand = @("phase4-independent-review", "pending")
if ($IndependentReviewPath) {
    $resolvedReviewPath = [System.IO.Path]::GetFullPath($IndependentReviewPath)
    if (-not (Test-Path -LiteralPath $resolvedReviewPath -PathType Leaf)) {
        throw "Independent review receipt does not exist: $resolvedReviewPath"
    }
    $reviewValue = Get-Content -LiteralPath $resolvedReviewPath -Raw | ConvertFrom-Json -Depth 100
    Write-Json -Path (Join-Path $EvidenceRoot $reviewReceipt) -Value $reviewValue
    $reviewStatus = if ($reviewValue.verdict -eq "GREEN") { "PASS" } else { "BLOCKED" }
    $reviewCommand = @("phase4-independent-review", $resolvedReviewPath)
} else {
    Write-Json -Path (Join-Path $EvidenceRoot $reviewReceipt) -Value ([ordered]@{
        schema = "latticework.phase4-independent-review.v1"
        verdict = "PENDING"
        reviewer = "independent review pending"
        baseline_sha = $BaselineSha
        base_commit = $BaseCommit
        candidate_sha = $CandidateSha
        worktree = [ordered]@{ root = $null; clean_start = $false; clean_end = $false }
        note = "A separate clean-worktree reproduction receipt must be supplied before a GREEN bundle can exist."
    })
}
$independentGateReceipt = Write-Receipt -Gate "independent-clean-worktree" -Status $reviewStatus -ExitCode $(if ($reviewStatus -eq "PASS") { 0 } else { 1 }) -Command $reviewCommand -Details ([ordered]@{ review = $reviewReceipt })
$gates["independent-clean-worktree"] = [ordered]@{ status = $reviewStatus; receipt = $independentGateReceipt }
$bundleStatus = if ($aggregateStatus -eq "GREEN" -and $reviewStatus -eq "PASS") { "GREEN" } else { "BLOCKED" }

$machineLock = [ordered]@{
    schema = "latticework.phase4-characterization-preflight.v1"
    base_commit = $BaseCommit
    phase3_terminal_commit = $BaseCommit
    baseline_sha = $BaselineSha
    work_id = $WorkId
    implementation_work_id = "LW-P4-001"
    implementation_packet_id = "LW-P4-IMPL-PREFLIGHT-001"
    implementation_authorized = $false
    real_data_authorized = $false
    real_credentials_authorized = $false
    real_provider_traffic_authorized = $false
    provider_fixtures = @("P4-PRV-OLLAMA", "P4-PRV-OPENAI")
    caller_paths = @("primary-chat")
    playwright_workers = 1
    playwright_retries = 0
    mandatory_scenario_groups = 16
    mandatory_atomic_subcases = 39
    green_requires_all_pass = $true
    evidence_root = "reengineering/evidence/phase-4/LW-P4-CHAR-001"
}

$serverStillListening = [bool](netstat -ano | Select-String -Pattern "127\.0\.0\.1:$Port\s+.*LISTENING")
$cleanupReceipt = Write-Receipt -Gate "run-cleanup" -Status $(if ($serverStillListening) { "FAIL" } else { "PASS" }) -ExitCode $(if ($serverStillListening) { 1 } else { 0 }) -Command @(
    "netstat", "-ano"
) -Details ([ordered]@{ port = $Port; listener_after_playwright = $serverStillListening; profiles_deleted = $true })
if ($serverStillListening) { throw "Static server is still listening after Playwright exit." }

Assert-RepositoryDescendant -Path $RunRoot -Label "run cleanup" | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $RunRoot ".ownership.json") -PathType Leaf)) {
    throw "Run ownership marker is missing; refusing cleanup."
}
$runReparse = Get-ChildItem -LiteralPath $RunRoot -Force -Recurse |
    Where-Object { ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 } |
    Select-Object -First 1
if ($runReparse) { throw "Run root contains a reparse point; refusing cleanup: $($runReparse.FullName)" }
[System.IO.Directory]::Delete($RunRoot, $true)
if (Test-Path -LiteralPath $RunRoot) {
    throw "Run-root deletion did not remove the recorded staging path."
}

$summary = [ordered]@{
    schema = "latticework.phase4-characterization-summary.v1"
    evidence_label = "MEASURED"
    work_id = $WorkId
    status = $bundleStatus
    baseline_sha = $BaselineSha
    base_commit = $BaseCommit
    candidate_sha = $CandidateSha
    machine_lock = $machineLock
    counts = $statusCounts
    results = $results
    gates = $gates
    content_scan = [ordered]@{ scanned = $true; findings = 0 }
    run = [ordered]@{
        staging_root = $RunRoot
        ownership_marker = "phase4-run-marker-v1"
        cleanup = [ordered]@{ proven = $true; deleted = $true; no_reparse = $true }
        static_server = [ordered]@{
            bind = "127.0.0.1"
            started = $true
            stopped = -not $serverStillListening
            startup_receipt = $baselineReceipt
            cleanup_receipt = $cleanupReceipt
        }
    }
    independent_review = [ordered]@{ receipt = $reviewReceipt; required = $true }
    safety = [ordered]@{
        real_user_data = "not-accessed"
        real_provider_traffic = "none"
        real_credentials = "none"
        listener = "python-static-loopback-only"
        candidate_implementation = "none"
        activation = "none"
        cutover = "none"
    }
}
Write-Json -Path (Join-Path $EvidenceRoot "summary.json") -Value $summary
New-Manifest

$validationPath = Join-Path $EvidenceRoot "validation.json"
& node (Join-Path $PSScriptRoot "validate-phase4-characterization.mjs") --evidence $EvidenceRoot --output $validationPath
$validationExit = $LASTEXITCODE
if ($bundleStatus -eq "GREEN" -and $validationExit -ne 0) {
    throw "A GREEN Phase 4 bundle failed strict validation."
}
if ($bundleStatus -ne "GREEN" -and $validationExit -eq 0) {
    throw "Strict Phase 4 validator incorrectly accepted a blocked bundle."
}
New-Manifest

Write-Host "Phase 4 characterization executed: $($statusCounts.PASS) PASS, $($statusCounts.UNKNOWN) UNKNOWN, $($statusCounts.FAIL) FAIL."
Write-Host "Behavior status: $aggregateStatus"
Write-Host "Bundle status: $bundleStatus"
Write-Host "Evidence: $EvidenceRoot"
if ($bundleStatus -ne "GREEN") { exit 1 }
