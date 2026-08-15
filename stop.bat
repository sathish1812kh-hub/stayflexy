@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Shutdown
echo ===================================================
echo.

echo [1/3] Terminating app + service processes (ports 3000-3012, 8080)...
for %%p in (3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 8080) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        echo   Port %%p  -^> killing PID %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo.
echo [2/3] Stopping Redis (via WSL)...
wsl -e bash -lc "redis-cli -a redis_dev shutdown nosave" >nul 2>&1
echo   Redis stopped (if it was running).

echo.
echo [3/3] Stopping PostgreSQL Database Server...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\16\data" >nul 2>&1
if %errorlevel% equ 0 (
    "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\16\data"
) else (
    echo   Database is already stopped.
)

echo.
echo Shutdown complete.
