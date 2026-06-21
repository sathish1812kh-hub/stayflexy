# start-observed.ps1
$ErrorActionPreference = "Continue"

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
                    [Environment]::SetEnvironmentVariable($key, $val, "Process")
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

$services = @(
    @{ Name = "API Gateway"; Path = "infrastructure/gateway"; EnvPort = 8080 },
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
    @{ Name = "Pricing Engine"; Path = "services/pricing-engine-service"; EnvPort = 3011 },
    @{ Name = "Revenue Management"; Path = "services/revenue-management-service"; EnvPort = 3012 }
)

Write-Host "Starting 12 Microservices and API Gateway in background..." -ForegroundColor Yellow
foreach ($svc in $services) {
    Write-Host "  Configuring $($svc.Name)..."
    
    # 1. Clear previous service-specific variables to avoid contamination
    [Environment]::SetEnvironmentVariable("PORT", $null, "Process")
    [Environment]::SetEnvironmentVariable("DATABASE_URL", $null, "Process")

    # 2. Load root configurations (.env and .env.local)
    Load-EnvFile(".env")
    Load-EnvFile(".env.local")

    # 3. Load specific service environment
    Load-EnvFile("$($svc.Path)/.env")

    # 4. Enforce strict development parameters & local connections
    [Environment]::SetEnvironmentVariable("PORT", $svc.EnvPort, "Process")
    [Environment]::SetEnvironmentVariable("NODE_ENV", "development", "Process")
    [Environment]::SetEnvironmentVariable("REDIS_URL", "redis://127.0.0.1:6379", "Process")
    [Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_KEY", "dev-service-key-32-chars-minimum", "Process")

    # Local mappings for API gateway routing
    [Environment]::SetEnvironmentVariable("SERVICE_AUTH_URL", "http://localhost:3001", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_ORGANIZATION_URL", "http://localhost:3002", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_HOTEL_URL", "http://localhost:3003", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_INVENTORY_URL", "http://localhost:3004", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_BOOKING_URL", "http://localhost:3005", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_PAYMENT_URL", "http://localhost:3006", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_OTA_URL", "http://localhost:3007", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_ANALYTICS_URL", "http://localhost:3008", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_NOTIFICATION_URL", "http://localhost:3009", "Process")
    [Environment]::SetEnvironmentVariable("SERVICE_WORKFLOW_URL", "http://localhost:3010", "Process")

    # 5. Launch the process
    Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c set NODE_OPTIONS=--max-old-space-size=512 && npm run dev" -WorkingDirectory $svc.Path
}

Write-Host "Starting Next.js Web Server..." -ForegroundColor Yellow
# Clear gateway variables for next.js
[Environment]::SetEnvironmentVariable("PORT", 3000, "Process")
[Environment]::SetEnvironmentVariable("NODE_ENV", "development", "Process")
Load-EnvFile(".env.local")
Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c set NODE_OPTIONS=--max-old-space-size=512 && npm run dev" -WorkingDirectory "."

Write-Host "Waiting 25 seconds for services to compile and boot up..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

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
