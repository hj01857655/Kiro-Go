@echo off
REM Use full paths to avoid relying on PATH (fixes "bun/air not found")
REM Resolve from %USERPROFILE% so it works across machines/usernames
set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"
set "AIR_EXE=%USERPROFILE%\go\bin\air.exe"
if not exist "%BUN_EXE%" set "BUN_EXE=bun"
if not exist "%AIR_EXE%" set "AIR_EXE=air"

REM Kill any process currently listening on port 5173 (frontend)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do (
    echo Killing process %%p occupying port 5173...
    taskkill /F /PID %%p >nul 2>&1
)

REM Start frontend dev server (port 5173 is configured in web/package.json)
start "frontend" cmd /k "cd /d "%~dp0web" && "%BUN_EXE%" run dev"

REM Start backend with hot reload (air)
start "backend" cmd /k "cd /d "%~dp0" && "%AIR_EXE%""

exit
