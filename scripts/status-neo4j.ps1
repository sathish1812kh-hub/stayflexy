# scripts/status-neo4j.ps1
# Checks the health and status of the native Neo4j instance on Windows.

$ErrorActionPreference = "Continue"

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

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Stayflexi Native Neo4j Status Check   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$boltActive = Test-PortActive 7687
$httpActive = Test-PortActive 7474

if ($boltActive) {
    Write-Host " [OK] Neo4j Bolt Protocol (Port 7687): ONLINE" -ForegroundColor Green
} else {
    Write-Host " [!]  Neo4j Bolt Protocol (Port 7687): OFFLINE" -ForegroundColor Red
}

if ($httpActive) {
    Write-Host " [OK] Neo4j HTTP API (Port 7474):      ONLINE" -ForegroundColor Green
    try {
        $res = curl.exe -s http://localhost:7474
        if ($res) {
            $info = $res | ConvertFrom-Json
            Write-Host "      Neo4j Version: $($info.neo4j_version)" -ForegroundColor DarkGreen
            Write-Host "      Neo4j Edition: $($info.neo4j_edition)" -ForegroundColor DarkGreen
        }
    } catch {}
} else {
    Write-Host " [!]  Neo4j HTTP API (Port 7474):      OFFLINE" -ForegroundColor Red
}

# Find Java Process
$neo4jProc = Get-NetTCPConnection -LocalPort 7687 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($neo4jProc) {
    $pidNum = $neo4jProc.OwningProcess
    $proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "      Running as PID: $pidNum ($($proc.ProcessName))" -ForegroundColor Cyan
    }
}
Write-Host "=========================================`n" -ForegroundColor Cyan
