@echo off
title NeonPulse Arcade - Dev Server
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting NeonPulse Arcade on http://localhost:3000 ...
REM Vite opens the browser itself once the server is actually ready.
call npm run dev -- --open
pause
