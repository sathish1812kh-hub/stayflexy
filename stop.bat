@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Shutdown
echo ===================================================

echo [1/2] Terminating Next.js Web Server (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Found Next.js process with PID %%a. Terminating...
    taskkill /f /pid %%a
)

echo.
echo [2/2] Stopping PostgreSQL Database Server...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\16\data" >nul 2>&1
if %errorlevel% eq 0 (
    "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\16\data"
) else (
    echo Database is already stopped.
)

echo.
echo Shutdown complete.
