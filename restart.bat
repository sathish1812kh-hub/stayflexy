@echo off
echo ===================================================
echo   Stayflexi - Local Operations Control Restarter
echo ===================================================
echo.

call "%~dp0stop.bat"
echo.
echo Waiting for ports to clear...
timeout /t 3 /nobreak >nul
echo.
call "%~dp0start.bat"
