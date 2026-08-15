# scripts/stop-neo4j.ps1
# Stops the native Neo4j Community server cleanly using dedicated JDK 21.

$ErrorActionPreference = "Continue"

Write-Host "Stopping native Neo4j Community server..." -ForegroundColor Yellow

$jdk21 = "C:\Stayflexi\.tools\jdk-21"
if (Test-Path $jdk21) {
    $env:JAVA_HOME = $jdk21
    $env:PATH = "$jdk21\bin;$env:PATH"
}

$communityHome = "C:\Stayflexi\.tools\neo4j-community-5.26.0"
$neo4jBin = "$communityHome\bin\neo4j.bat"

if (Test-Path $neo4jBin) {
    & "cmd.exe" /c "`"$neo4jBin`" stop"
    Write-Host "  Native Neo4j Community stop command executed." -ForegroundColor Green
} else {
    $neo4jProc = Get-NetTCPConnection -LocalPort 7687 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($neo4jProc) {
        Stop-Process -Id $neo4jProc.OwningProcess -Force
        Write-Host "  Terminated Neo4j process PID $($neo4jProc.OwningProcess)." -ForegroundColor Green
    } else {
        Write-Host "  No native Neo4j process currently listening on port 7687." -ForegroundColor DarkGray
    }
}
