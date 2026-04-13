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

echo.
echo ===================================================
echo   SYSTEM LAUNCHING! 
echo   Please keep the two new windows open.
echo   Open your browser to: http://localhost:5173
echo ===================================================
echo.
pause
