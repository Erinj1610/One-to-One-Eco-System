@echo off
setlocal enabledelayedexpansion
title Save Ecosystem Checkpoint

echo ===================================================
echo   ONE TO ONE ECOSYSTEM - SAVE CHECKPOINT
echo ===================================================
echo.

:: Ensure we are in a clean state or have changes to commit
git status --short

echo.
set /p CP_NAME="Enter checkpoint name (e.g. happy, before_styles) [default: latest]: "
if "!CP_NAME!"=="" set CP_NAME=latest

:: Normalize name to lowercase, replace spaces with underscores if any
set CP_NAME=!CP_NAME: =_!
set TAG_NAME=checkpoint-!CP_NAME!

echo.
echo Staging all changes...
git add -A

echo.
echo Creating git commit...
:: Format timestamp using powershell for reliability across locale settings
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"`) do set TS=%%i

git commit -m "Checkpoint !CP_NAME! saved at !TS!"

echo.
echo Tagging commit as !TAG_NAME!...
:: Delete tag if it already exists to update it
git tag -d !TAG_NAME! >nul 2>&1
git tag !TAG_NAME!

echo.
echo ===================================================
echo   CHECKPOINT '!TAG_NAME!' SAVED SUCCESSFULLY!
echo   You can restore this checkpoint anytime using
echo   restore_checkpoint.bat
echo ===================================================
echo.
pause
