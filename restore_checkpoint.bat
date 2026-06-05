@echo off
setlocal enabledelayedexpansion
title Restore Ecosystem Checkpoint

echo ===================================================
echo   ONE TO ONE ECOSYSTEM - RESTORE CHECKPOINT
echo ===================================================
echo.
echo WARNING: Restoring a checkpoint will overwrite all uncommitted 
echo changes and revert your files to the selected checkpoint.
echo.

echo Available checkpoints:
echo ---------------------------------------------------
git tag -l "checkpoint-*"
echo ---------------------------------------------------
echo.

set /p CP_NAME="Enter the checkpoint name to restore (e.g. happy, latest): "
if "!CP_NAME!"=="" (
    echo Error: Checkpoint name cannot be empty.
    pause
    exit /b
)

set TAG_NAME=checkpoint-!CP_NAME!

:: Check if tag exists
git rev-parse !TAG_NAME! >nul 2>&1
if errorlevel 1 (
    :: Try with prefix if user didn't type it
    git rev-parse !CP_NAME! >nul 2>&1
    if errorlevel 1 (
        echo Error: Checkpoint '!CP_NAME!' or '!TAG_NAME!' does not exist.
        pause
        exit /b
    ) else (
        set TAG_NAME=!CP_NAME!
    )
)

echo.
echo You selected checkpoint: !TAG_NAME!
set /p CONFIRM="Are you sure you want to restore? This is destructive! (y/n): "
if /i not "!CONFIRM!"=="y" (
    echo Restore cancelled.
    pause
    exit /b
)

echo.
echo Reverting workspace to !TAG_NAME!...
git reset --hard !TAG_NAME!
git clean -df

echo.
echo ===================================================
echo   RESTORE COMPLETED SUCCESSFULLY!
echo   Workspace has been rolled back to: !TAG_NAME!
echo ===================================================
echo.
pause
