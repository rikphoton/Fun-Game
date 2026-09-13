@echo off
title NeonPulse Arcade - Desktop Launcher
echo ==============================================
echo   NeonPulse Arcade - Launching Desktop App
echo ==============================================
echo [1/2] Building latest arcade bundle...
call npm run build
echo [2/2] Starting Electron window...
call npx electron .
pause
