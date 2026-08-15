@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Bootstrapper
echo ===================================================
echo   Brings up the FULL local stack (Zero Docker):
echo     Postgres + Redis + Native Neo4j + 12 microservices + gateway + Next.js
echo ===================================================
echo.

echo [1/2] Ensuring Redis is running (via WSL)...
wsl -e bash -lc "redis-cli -a redis_dev ping || redis-server --daemonize yes --requirepass redis_dev --bind 0.0.0.0 --protected-mode no" >nul 2>&1
if %errorlevel% neq 0 (
    echo   WARNING: Could not start Redis via WSL. Login/session features will fail.
    echo            Ensure WSL is installed and has redis-server available.
) else (
    echo   Redis is up on 127.0.0.1:6379.
)

echo.
echo [2/2] Launching Postgres + Native Neo4j + services + gateway + Next.js...
echo   Web App:  http://localhost:3000
echo   Gateway:  http://localhost:8080
echo   Neo4j:    http://localhost:7474 (bolt://localhost:7687)
echo.
echo   Keep THIS window open - it holds the stack alive.
echo   Run stop.bat in another window to shut everything down.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start-observed.ps1"
