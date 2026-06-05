@echo off
setlocal
title One to One Ecosystem Launcher

echo ===================================================
echo   ONE TO ONE ECOSYSTEM - MASTER LAUNCHER
echo ===================================================
echo.

:: Step 1: Cleanup
echo [1/3] Clearing old backend sessions...
taskkill /F /IM python.exe /T >nul 2>&1
echo      Cleanup complete.
echo.

:: Step 2: Start Backend
echo [2/3] Starting Backend (FastAPI on Port 8000)...
:: We use the absolute path to the venv python to be 100% sure it works.
start "ECO - Backend" cmd /k "cd backend && .\venv\Scripts\python.exe main.py"

:: Step 3: Start Frontend
echo [3/3] Starting Frontend (React on Port 5173)...
start "ECO - Frontend" cmd /k "cd frontend && npm run dev"

:: Step 4: Launch Web Browser
echo.
echo Launching your default web browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ===================================================
echo   SYSTEM LAUNCHED SUCCESSFULLY!
echo   Please keep the two terminal windows open.
echo   Your browser has been opened to: http://localhost:5173
echo ===================================================
echo.
pause
