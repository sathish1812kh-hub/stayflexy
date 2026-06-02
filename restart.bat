@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Restarter
echo ===================================================

call stop.bat
echo.
echo Waiting for ports to clear...
timeout /t 2 /nobreak >nul
echo.
call start.bat
