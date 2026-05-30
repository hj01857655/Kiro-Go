@echo off
REM Use full path to avoid relying on PATH (fixes "bun not found")
REM Resolve from %USERPROFILE% so it works across machines/usernames
set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"
if not exist "%BUN_EXE%" set "BUN_EXE=bun"

REM Kill any process currently listening on port 5173
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do (
    echo Killing process %%p occupying port 5173...
    taskkill /F /PID %%p >nul 2>&1
)

REM Start frontend dev server (port 5173 is configured in web/package.json)
start "frontend" cmd /k "cd /d "%~dp0web" && "%BUN_EXE%" run dev"

exit
