# scripts/start-services.ps1
# Ensures all backing database services (PostgreSQL, Native Neo4j, Redis) are active and listening on IPv4.

$ErrorActionPreference = "Continue"

function Test-PortActive($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connection = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $connection.AsyncWaitHandle.WaitOne(800, $false)
        if ($success) {
            $tcp.EndConnect($connection)
            $tcp.Close()
            return $true
        }
    } catch {}
    return $false
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   Stayflexi Unified Service Health & Boot     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1. PostgreSQL (Port 5432)
Write-Host "`n[1/3] Checking PostgreSQL (Port 5432)..." -ForegroundColor Yellow
if (Test-PortActive 5432) {
    Write-Host "  [OK] PostgreSQL is ONLINE on port 5432." -ForegroundColor Green
} else {
    Write-Host "  [!] PostgreSQL is OFFLINE. Attempting to start Windows service..." -ForegroundColor DarkYellow
    Start-Service -Name postgresql* -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if (Test-PortActive 5432) {
        Write-Host "  [OK] PostgreSQL started successfully on port 5432." -ForegroundColor Green
    } else {
        Write-Host "  [ERR] PostgreSQL failed to start on port 5432." -ForegroundColor Red
    }
}

# 2. Native Neo4j (Port 7687)
Write-Host "`n[2/3] Checking Native Neo4j Community (Port 7687)..." -ForegroundColor Yellow
if (Test-PortActive 7687) {
    Write-Host "  [OK] Neo4j Bolt is ONLINE on port 7687." -ForegroundColor Green
} else {
    Write-Host "  [!] Neo4j is OFFLINE. Launching native Neo4j server..." -ForegroundColor DarkYellow
    $jdk = "C:\Stayflexi\.tools\jdk-21"
    $communityHome = "C:\Stayflexi\.tools\neo4j-community-5.26.0"
    $neo4jBin = "$communityHome\bin\neo4j.bat"
    
    if (Test-Path $neo4jBin) {
        $startCmd = "`$env:JAVA_HOME = '$jdk'; `$env:PATH = '$jdk\bin;' + `$env:PATH; & '$neo4jBin' console"
        Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", $startCmd
        
        $retries = 35
        while ($retries -gt 0) {
            Start-Sleep -Seconds 1
            if (Test-PortActive 7687) {
                Write-Host "  [OK] Native Neo4j started successfully on port 7687." -ForegroundColor Green
                break
            }
            $retries--
        }
        if ($retries -eq 0) {
            Write-Host "  [WARN] Neo4j did not respond on port 7687 within timeout." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ERR] Neo4j binary not found at $neo4jBin." -ForegroundColor Red
    }
}

# 3. Redis (Port 6379)
Write-Host "`n[3/3] Checking Redis (Port 6379)..." -ForegroundColor Yellow
if (Test-PortActive 6379) {
    Write-Host "  [OK] Redis is ONLINE on port 6379." -ForegroundColor Green
} else {
    Write-Host "  [!] Redis is OFFLINE. Starting Redis daemon in WSL Ubuntu..." -ForegroundColor DarkYellow
    wsl -d Ubuntu -u root -- /usr/bin/redis-server /etc/redis/redis.conf --daemonize yes 2>$null
    Start-Sleep -Seconds 2
    if (Test-PortActive 6379) {
        Write-Host "  [OK] Redis started successfully on port 6379." -ForegroundColor Green
    } else {
        Write-Host "  [ERR] Redis failed to start or port 6379 is unreachable." -ForegroundColor Red
    }
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   Service Health Verification Complete        " -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan
