# start-observed.ps1
$ErrorActionPreference = "Continue"

# Helper function to set variables in both process env block and PS env: scope
function Set-EnvVar($key, $val) {
    if ($null -eq $val) {
        [Environment]::SetEnvironmentVariable($key, $null, "Process")
        if (Test-Path "env:$key") {
            Remove-Item "env:$key"
        }
    } else {
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
        Set-Item -Path "env:$key" -Value $val
    }
}

# Helper function to load env files into current process environment
function Load-EnvFile($filePath) {
    if (Test-Path $filePath) {
        Get-Content $filePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line -split '=', 2
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $val = $parts[1].Trim()
                    if ($val.StartsWith('"') -and $val.EndsWith('"')) {
                        $val = $val.Substring(1, $val.Length - 2)
                    } elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
                        $val = $val.Substring(1, $val.Length - 2)
                    }
                    Set-EnvVar $key $val
                }
            }
        }
    }
}

Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
$pgStatus = & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\16\data" 2>&1
if ($pgStatus -like "*no server running*") {
    & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\16\data"
    Start-Sleep -Seconds 3
}

Write-Host "Verifying Native Neo4j..." -ForegroundColor Yellow
& "$PSScriptRoot\scripts\start-neo4j.ps1"

$services = @(
    @{ Name = "Auth Service"; Path = "services/auth-service"; EnvPort = 3001 },
    @{ Name = "Organization Service"; Path = "services/organization-service"; EnvPort = 3002 },
    @{ Name = "Hotel Service"; Path = "services/hotel-service"; EnvPort = 3003 },
    @{ Name = "Inventory Service"; Path = "services/inventory-service"; EnvPort = 3004 },
    @{ Name = "Booking Service"; Path = "services/booking-service"; EnvPort = 3005 },
    @{ Name = "Payment Service"; Path = "services/payment-service"; EnvPort = 3006 },
    @{ Name = "OTA Service"; Path = "services/ota-service"; EnvPort = 3007 },
    @{ Name = "Analytics Service"; Path = "services/analytics-service"; EnvPort = 3008 },
    @{ Name = "Notification Service"; Path = "services/notification-service"; EnvPort = 3009 },
    @{ Name = "Workflow Service"; Path = "services/workflow-service"; EnvPort = 3010 },
    @{ Name = "Pricing Engine Service"; Path = "services/pricing-engine-service"; EnvPort = 3011 },
    @{ Name = "Revenue Management Service"; Path = "services/revenue-management-service"; EnvPort = 3012 }
)

Write-Host "Starting all 12 Microservices with 6-second compilation gaps..." -ForegroundColor Yellow
foreach ($svc in $services) {
    Write-Host "  Configuring $($svc.Name)..."
    
    # 1. Clear previous service-specific variables to avoid contamination
    Set-EnvVar "PORT" $null
    Set-EnvVar "DATABASE_URL" $null

    # 2. Load root configurations (.env and .env.local)
    Load-EnvFile("$PSScriptRoot/.env")
    Load-EnvFile("$PSScriptRoot/.env.local")

    # 3. Load specific service environment
    Load-EnvFile("$PSScriptRoot/$($svc.Path)/.env")

    # 4. Enforce strict development parameters & local connections
    Set-EnvVar "PORT" $svc.EnvPort
    Set-EnvVar "NODE_ENV" "development"
    Set-EnvVar "REDIS_URL" "redis://:redis_dev@127.0.0.1:6379"
    Set-EnvVar "DATABASE_URL" "postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public"
    Set-EnvVar "SERVICE_KEY" "dev-service-key-32-chars-minimum"
    Set-EnvVar "JWT_SECRET" "dev_secret_replace_in_production_must_be_at_least_64_characters_long_abc123"
    Set-EnvVar "JWT_REFRESH_SECRET" "your-super-secret-refresh-key-minimum-32-chars"

    # Local mappings for API gateway routing
    Set-EnvVar "SERVICE_AUTH_URL" "http://localhost:3001"
    Set-EnvVar "SERVICE_ORGANIZATION_URL" "http://localhost:3002"
    Set-EnvVar "SERVICE_HOTEL_URL" "http://localhost:3003"
    Set-EnvVar "SERVICE_INVENTORY_URL" "http://localhost:3004"
    Set-EnvVar "SERVICE_BOOKING_URL" "http://localhost:3005"

    # 5. Launch the process
    $absWorkingDir = Join-Path $PSScriptRoot $svc.Path
    Start-Process -FilePath "cmd" -ArgumentList "/c set NODE_OPTIONS=--max-old-space-size=512&&npm run dev > stdout.log 2> stderr.log" -WorkingDirectory $absWorkingDir
    Start-Sleep -Seconds 6
}

Write-Host "Waiting another 10 seconds for all subgraphs to finish compiling..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Starting API Gateway..." -ForegroundColor Yellow
Set-EnvVar "PORT" $null
Set-EnvVar "DATABASE_URL" $null
Load-EnvFile("$PSScriptRoot/.env")
Load-EnvFile("$PSScriptRoot/.env.local")

Set-EnvVar "PORT" 8080
Set-EnvVar "NODE_ENV" "development"
Set-EnvVar "REDIS_URL" "redis://:redis_dev@127.0.0.1:6379"
Set-EnvVar "DATABASE_URL" "postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public"
Set-EnvVar "SERVICE_KEY" "dev-service-key-32-chars-minimum"
Set-EnvVar "JWT_SECRET" "dev_secret_replace_in_production_must_be_at_least_64_characters_long_abc123"
Set-EnvVar "JWT_REFRESH_SECRET" "your-super-secret-refresh-key-minimum-32-chars"

Set-EnvVar "SERVICE_AUTH_URL" "http://localhost:3001"
Set-EnvVar "SERVICE_ORGANIZATION_URL" "http://localhost:3002"
Set-EnvVar "SERVICE_HOTEL_URL" "http://localhost:3003"
Set-EnvVar "SERVICE_INVENTORY_URL" "http://localhost:3004"
Set-EnvVar "SERVICE_BOOKING_URL" "http://localhost:3005"

$gwWorkingDir = Join-Path $PSScriptRoot "infrastructure/gateway"
Start-Process -FilePath "cmd" -ArgumentList "/c set NODE_OPTIONS=--max-old-space-size=512&&npm run dev > stdout.log 2> stderr.log" -WorkingDirectory $gwWorkingDir
Start-Sleep -Seconds 6

Write-Host "Starting Next.js Web Server..." -ForegroundColor Yellow
# Clear gateway variables for next.js
Set-EnvVar "PORT" 3000
Set-EnvVar "NODE_ENV" "development"
Load-EnvFile("$PSScriptRoot/.env.local")
Start-Process -FilePath "cmd" -ArgumentList "/c set NODE_OPTIONS=--max-old-space-size=512&&npm run dev > stdout.log 2> stderr.log" -WorkingDirectory $PSScriptRoot

Write-Host "Waiting 20 seconds for Next.js to compile and gateway to bind..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  Port Status Verification Report" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

3000..3012 + 8080 | ForEach-Object {
    $p = $_
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conn) {
        $pidVal = $conn.OwningProcess | Select-Object -Unique
        Write-Host "  Port $p : ONLINE (PID: $pidVal)" -ForegroundColor Green
    } else {
        Write-Host "  Port $p : OFFLINE" -ForegroundColor Red
    }
}

Write-Host "`nKeeping services alive. Do not stop this task." -ForegroundColor Yellow
while ($true) {
    Start-Sleep -Seconds 10
}
