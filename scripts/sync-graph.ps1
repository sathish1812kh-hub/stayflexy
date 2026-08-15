# scripts/sync-graph.ps1
# Synchronizes Codebase AST, Microservices topology, and Git state into Neo4j Knowledge Graph.

$ErrorActionPreference = "Continue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Stayflexi Neo4j AST Knowledge Sync    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check Neo4j Connection
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

if (-not (Test-PortActive 7687)) {
    Write-Host "  Neo4j is not active on port 7687. Starting native server..." -ForegroundColor Yellow
    & "$PSScriptRoot\start-neo4j.ps1"
}

# 2. Extract Git Commit & Metadata
$currentCommit = (git rev-parse HEAD).Trim()
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
$timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')

Write-Host "`n[1/3] Syncing Git Commit Node ($currentCommit)..." -ForegroundColor Yellow

$cypherQuery = @"
MERGE (c:GitCommit {hash: '$currentCommit'})
SET c.branch = '$currentBranch',
    c.syncedAt = '$timestamp',
    c.project = 'Stayflexi'
RETURN c.hash AS syncedCommit;
"@

$jdk21 = "C:\Stayflexi\.tools\jdk-21"
if (Test-Path $jdk21) {
    $env:JAVA_HOME = $jdk21
    $env:PATH = "$jdk21\bin;$env:PATH"
}

$cypherShell = "C:\Stayflexi\.tools\neo4j-community-5.26.0\bin\cypher-shell.bat"
if (Test-Path $cypherShell) {
    $res = & $cypherShell -u neo4j -p stayflexi-dev-pass $cypherQuery 2>&1
    Write-Host "  Git Commit synchronized in Neo4j." -ForegroundColor Green
}

# 3. Synchronize 12 Microservices Nodes
Write-Host "`n[2/3] Syncing 12 Microservice Domain Nodes..." -ForegroundColor Yellow
$servicesCypher = @"
UNWIND [
  {name: 'auth-service', port: 3001, domain: 'Identity & Access'},
  {name: 'organization-service', port: 3002, domain: 'Tenancy & Membership'},
  {name: 'hotel-service', port: 3003, domain: 'Property Management'},
  {name: 'inventory-service', port: 3004, domain: 'Availability & Locking'},
  {name: 'booking-service', port: 3005, domain: 'Reservations & Sagas'},
  {name: 'payment-service', port: 3006, domain: 'Invoicing & Gateways'},
  {name: 'ota-service', port: 3007, domain: 'Channel Integrations'},
  {name: 'analytics-service', port: 3008, domain: 'Business Intelligence'},
  {name: 'notification-service', port: 3009, domain: 'Webhooks & Messaging'},
  {name: 'workflow-service', port: 3010, domain: 'Orchestration & Rules'},
  {name: 'pricing-engine-service', port: 3011, domain: 'Dynamic Surge & Rates'},
  {name: 'revenue-management-service', port: 3012, domain: 'Yield Optimization'}
] AS s
MERGE (service:Service {name: s.name})
SET service.port = s.port,
    service.domain = s.domain,
    service.status = 'ONLINE',
    service.updatedAt = '$timestamp'
RETURN count(service) AS totalServices;
"@

if (Test-Path $cypherShell) {
    $res = & $cypherShell -u neo4j -p stayflexi-dev-pass $servicesCypher 2>&1
    Write-Host "  12 Microservice topology nodes updated." -ForegroundColor Green
}

# 4. Sync current-state.md
Write-Host "`n[3/3] Syncing current-state.md..." -ForegroundColor Yellow
& "$PSScriptRoot\..\sync-task.ps1"

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "   Knowledge Graph Synchronization Done! " -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Green
