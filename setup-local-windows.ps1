# setup-local-windows.ps1 -- Bootstrap local development environment on Windows natively
# Usage: .\setup-local-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Stayflexi - Windows Native Environment Builder" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# -- 1. Install Shared Packages --------------------------------------------------
Write-Host ""
Write-Host "[1/4] Installing shared packages dependencies..." -ForegroundColor Yellow
$packages = @(
    "shared-types", "shared-errors", "shared-logger", "shared-config", 
    "shared-auth", "shared-events", "shared-validation", "shared-database", "shared-observability"
)

foreach ($pkg in $packages) {
    if (Test-Path "packages/$pkg") {
        Write-Host "  Installing packages/$pkg..." -ForegroundColor Gray
        Push-Location "packages/$pkg"
        npm install --legacy-peer-deps --silent
        Pop-Location
        Write-Host "  [OK] packages/$pkg done" -ForegroundColor Green
    }
}

# -- 2. Install Microservices and Gateway ----------------------------------------
Write-Host ""
Write-Host "[2/4] Installing microservice dependencies..." -ForegroundColor Yellow
$services = @(
    "analytics-service", "auth-service", "booking-service", "hotel-service",
    "inventory-service", "notification-service", "organization-service",
    "ota-service", "payment-service", "pricing-engine-service",
    "revenue-management-service", "workflow-service"
)

foreach ($svc in $services) {
    if (Test-Path "services/$svc") {
        Write-Host "  Installing services/$svc..." -ForegroundColor Gray
        Push-Location "services/$svc"
        npm install --legacy-peer-deps --silent
        Pop-Location
        Write-Host "  [OK] services/$svc done" -ForegroundColor Green
    }
}

if (Test-Path "infrastructure/gateway") {
    Write-Host "  Installing infrastructure/gateway..." -ForegroundColor Gray
    Push-Location "infrastructure/gateway"
    npm install --legacy-peer-deps --silent
    Pop-Location
    Write-Host "  [OK] infrastructure/gateway done" -ForegroundColor Green
}

# -- 3. Create env configs --------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Creating environment files (.env) from templates..." -ForegroundColor Yellow
foreach ($svc in $services) {
    $envPath = "services/$svc/.env"
    $examplePath = "services/$svc/.env.example"
    if (Test-Path $examplePath) {
        if (-not (Test-Path $envPath)) {
            Copy-Item $examplePath $envPath
            Write-Host "  [OK] Created services/$svc/.env" -ForegroundColor Green
        } else {
            Write-Host "  Skipped services/$svc/.env (already exists)" -ForegroundColor DarkGray
        }
    }
}

$gatewayEnv = "infrastructure/gateway/.env"
$gatewayExample = "infrastructure/gateway/.env.example"
if (Test-Path $gatewayExample) {
    if (-not (Test-Path $gatewayEnv)) {
        Copy-Item $gatewayExample $gatewayEnv
        Write-Host "  [OK] Created infrastructure/gateway/.env" -ForegroundColor Green
    } else {
        Write-Host "  Skipped infrastructure/gateway/.env (already exists)" -ForegroundColor DarkGray
    }
}

# -- 4. Setup Local Database & Run Migrations ------------------------------------
Write-Host ""
Write-Host "[4/4] Setting up local PostgreSQL database schema..." -ForegroundColor Yellow

# Verify if Postgres is running before attempting migration
$pgStatus = & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\16\data" 2>&1
if ($pgStatus -like "*no server running*") {
    Write-Host "  Starting local PostgreSQL server..." -ForegroundColor Gray
    & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\16\data"
    Start-Sleep -Seconds 3
}

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public"

Write-Host "  Running Prisma migrations..." -ForegroundColor Gray
npx prisma migrate dev --name init --skip-generate

Write-Host "  Generating Prisma Client..." -ForegroundColor Gray
npx prisma generate

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Native Setup Completed Successfully!" -ForegroundColor Green
Write-Host "  You can now start everything using: .\start.bat" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
