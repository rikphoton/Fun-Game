@echo off
title NeonPulse Arcade - Windows Executable Builder
echo ==============================================
echo   NeonPulse Arcade - Packaging Portable .exe
echo ==============================================
echo [1/2] Building arcade assets...
call npm run build
echo [2/2] Packaging Windows application...
call npx --yes electron-packager . "NeonPulse-Arcade" --platform=win32 --arch=x64 --out=dist-desktop --overwrite --asar
echo.
echo ==============================================
echo Build Complete! Check folder: dist-desktop\
echo ==============================================
pause
