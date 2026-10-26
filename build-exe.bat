@echo off
title NeonPulse Arcade - Windows Executable Builder
echo ==============================================
echo   NeonPulse Arcade - Packaging Portable .exe
echo ==============================================
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
call npm run package:win
echo.
echo ==============================================
echo Build Complete! Check folder: dist-desktop\
echo ==============================================
pause
