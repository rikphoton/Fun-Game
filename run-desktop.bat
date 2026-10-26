@echo off
title NeonPulse Arcade - Desktop Launcher
echo ==============================================
echo   NeonPulse Arcade - Launching Desktop App
echo ==============================================
if not exist node_modules (
  echo [0/2] Installing dependencies...
  call npm install
)
echo [1/2] Building latest arcade bundle and starting Electron...
call npm run desktop
pause
