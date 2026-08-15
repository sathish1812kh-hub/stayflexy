# scripts/start-neo4j.ps1
# Ensures the native Neo4j Community server is running on Windows without Docker using dedicated JDK 21.

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

Write-Host "Verifying Native Neo4j Community status..." -ForegroundColor Yellow

if (Test-PortActive 7687) {
    Write-Host "  Neo4j is already running and listening on port 7687." -ForegroundColor Green
    exit 0
}

# Dedicated JDK 21 Runtime
$zuluJdk = "C:\Users\Sathish\.Neo4jDesktop2\Cache\runtime\zulu21.50.19-ca-jre21.0.11-win_x64"
if (Test-Path $zuluJdk) {
    $env:JAVA_HOME = $zuluJdk
    $env:PATH = "$zuluJdk\bin;$env:PATH"
} elseif (Test-Path "C:\Stayflexi\.tools\jdk-21") {
    $env:JAVA_HOME = "C:\Stayflexi\.tools\jdk-21"
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

# Standalone Community Edition Path
$communityHome = "C:\Stayflexi\.tools\neo4j-community-5.26.0"
$neo4jBin = "$communityHome\bin\neo4j.bat"

if (Test-Path $neo4jBin) {
    Write-Host "  Starting native Neo4j Community server from $communityHome using OpenJDK 21..." -ForegroundColor Yellow
    
    # Start via background process
    $startCmd = "`$env:JAVA_HOME = '$env:JAVA_HOME'; `$env:PATH = '$env:JAVA_HOME\bin;' + `$env:PATH; & '$neo4jBin' console"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", $startCmd
    
    # Wait for port 7687 to become active
    $retries = 30
    while ($retries -gt 0) {
        Start-Sleep -Seconds 1
        if (Test-PortActive 7687) {
            Write-Host "  Native Neo4j Community server started successfully on port 7687!" -ForegroundColor Green
            exit 0
        }
        $retries--
    }
    Write-Host "  Warning: Neo4j did not respond on port 7687 within timeout." -ForegroundColor Yellow
} else {
    Write-Host "  Error: Neo4j binary not found at $neo4jBin." -ForegroundColor Red
}
