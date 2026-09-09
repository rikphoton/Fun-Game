@echo off
echo ========================================================
echo   NeonPulse Arcade - Instant Public Sharing Link
echo ========================================================
echo.
echo Starting local server and public tunnel...
echo (Make sure to keep this window open while sharing!)
echo.
start npm run dev
timeout /t 3 >nul
npx localtunnel --port 3000
pause
