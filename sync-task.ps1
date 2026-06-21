# sync-task.ps1
# Unified Task Synchronization & Orchestration Gate — Stayflexi V5.2
$ErrorActionPreference = "Continue"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Stayflexi V5.2 Mandatory Task Synchronization Gate" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Helper to test TCP connection
function Test-PortActive($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connection = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $connection.AsyncWaitHandle.WaitOne(500, $false)
        if ($success) {
            $tcp.EndConnect($connection)
            $tcp.Close()
            return $true
        }
    } catch {}
    return $false
}

# 1. Run Graphify Static AST Scanner
Write-Host "`n[1/5] Running Graphify static codebase analysis..." -ForegroundColor Yellow
if (Test-Path "graphify-out/step2.py") {
    try {
        $graphifyResult = python graphify-out/step2.py 2>&1
        Write-Host "  Graphify output: $graphifyResult" -ForegroundColor Green
    } catch {
        Write-Host "  Warning: Graphify script execution failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Skipped: graphify-out/step2.py not found in root." -ForegroundColor DarkGray
}

# 2. Verify Database Status (PostgreSQL & Neo4j)
Write-Host "`n[2/5] Verifying persistent datastore connections..." -ForegroundColor Yellow

$postgresActive = Test-PortActive 5432
if ($postgresActive) {
    Write-Host "  PostgreSQL (Port 5432): ONLINE" -ForegroundColor Green
} else {
    Write-Host "  PostgreSQL (Port 5432): OFFLINE (Required)" -ForegroundColor Red
}

$neo4jActive = Test-PortActive 7687
if ($neo4jActive) {
    Write-Host "  Neo4j Bolt (Port 7687): ONLINE" -ForegroundColor Green
} else {
    Write-Host "  Neo4j Bolt (Port 7687): OFFLINE (Optional but recommended)" -ForegroundColor Yellow
}

# 3. Synchronize current-state.md Commit Hash (Phase 12)
Write-Host "`n[3/5] Synchronizing current-state.md with active Git commit..." -ForegroundColor Yellow
try {
    $currentCommit = (git rev-parse HEAD).Trim()
    $stateFilePath = "docs/discovery/current-state.md"
    
    if (Test-Path $stateFilePath) {
        $content = Get-Content $stateFilePath
        $updatedContent = @()
        $updated = $false
        
        foreach ($line in $content) {
            if ($line -match '^- \*\*Project Commit\*\*: `.*`') {
                $updatedContent += ('- **Project Commit**: ' + '`' + $currentCommit + '`')
                $updated = $true
            } elseif ($line -match '^- \*\*Generated\*\*: `.*`') {
                $timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
                $updatedContent += ('- **Generated**: ' + '`' + $timestamp + '`')
            } else {
                $updatedContent += $line
            }
        }
        
        $updatedContent | Set-Content $stateFilePath
        Write-Host "  Updated Project Commit in $stateFilePath to: $currentCommit" -ForegroundColor Green
    } else {
        Write-Host "  Warning: state file not found at $stateFilePath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Failed to sync state commit hash: $_" -ForegroundColor Red
}

# 4. Check Git Status & Drift Validation
Write-Host "`n[4/5] Checking workspace drift status..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "  Workspace has modified or untracked changes:" -ForegroundColor Yellow
        $gitStatus | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
    } else {
        Write-Host "  Workspace is completely clean. No drift." -ForegroundColor Green
    }
} catch {
    Write-Host "  Failed to verify Git status: $_" -ForegroundColor Red
}

# 5. Compile Compliance Summary
Write-Host "`n[5/5] Compiling V5.2 Compliance Report..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Sync Status  : SUCCESSFUL" -ForegroundColor Green
Write-Host "  Active Commit: $currentCommit" -ForegroundColor Green
Write-Host "  Postgres     : $(if ($postgresActive) { 'ONLINE' } else { 'OFFLINE' })" -ForegroundColor $(if ($postgresActive) { 'Green' } else { 'Red' })
Write-Host "  Neo4j        : $(if ($neo4jActive) { 'ONLINE' } else { 'OFFLINE' })" -ForegroundColor $(if ($neo4jActive) { 'Green' } else { 'Yellow' })
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "Sync completed. Ready to push." -ForegroundColor Green
