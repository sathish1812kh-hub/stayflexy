@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Bootstrapper
echo ===================================================

echo [1/2] Verifying PostgreSQL Database Server status...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\16\data" >nul 2>&1
if %errorlevel% neq 0 (
    echo Database is stopped. Starting PostgreSQL...
    "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\16\data"
    timeout /t 3 /nobreak >nul
) else (
    echo Database is already running.
)

echo.
echo [2/2] Starting Next.js Web Server...
echo Next.js will launch on http://localhost:3000
echo.
npm run dev
