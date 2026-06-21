# run-service.ps1
param(
    [string]$Path,
    [int]$Port
)

$ErrorActionPreference = "Continue"

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

# 1. Load root environments
Load-EnvFile(".env")
Load-EnvFile(".env.local")

# 2. Load service-specific environment
if ($Path -ne ".") {
    Load-EnvFile("$Path/.env")
}

# 3. Set standard overrides
$env:PORT = $Port
$env:NODE_ENV = "development"
$env:REDIS_URL = "redis://127.0.0.1:6379"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public"
$env:SERVICE_KEY = "dev-service-key-32-chars-minimum"
$env:JWT_SECRET = "dev_secret_replace_in_production_must_be_at_least_64_characters_long_abc123"
$env:JWT_REFRESH_SECRET = "dev_secret_replace_in_production_must_be_at_least_64_characters_long_abc123"

# 4. Local mappings for API gateway routing
$env:SERVICE_AUTH_URL = "http://localhost:3001"
$env:SERVICE_ORGANIZATION_URL = "http://localhost:3002"
$env:SERVICE_HOTEL_URL = "http://localhost:3003"
$env:SERVICE_INVENTORY_URL = "http://localhost:3004"
$env:SERVICE_BOOKING_URL = "http://localhost:3005"
$env:SERVICE_PAYMENT_URL = "http://localhost:3006"
$env:SERVICE_OTA_URL = "http://localhost:3007"
$env:SERVICE_ANALYTICS_URL = "http://localhost:3008"
$env:SERVICE_NOTIFICATION_URL = "http://localhost:3009"
$env:SERVICE_WORKFLOW_URL = "http://localhost:3010"

# Limit memory usage for development
$env:NODE_OPTIONS = "--max-old-space-size=512"

# Navigate to target directory and start service
if ($Path -ne ".") {
    cd $Path
}
npm run dev
