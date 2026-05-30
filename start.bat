@echo off
REM Use full paths to avoid relying on PATH (fixes "air/bun not found")
REM Resolve from %USERPROFILE% so it works across machines/usernames

set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"
set "AIR_EXE=%USERPROFILE%\go\bin\air.exe"

REM Fallback to PATH lookup if the default install location is missing
if not exist "%BUN_EXE%" set "BUN_EXE=bun"
if not exist "%AIR_EXE%" set "AIR_EXE=air"

start "frontend" cmd /k "cd /d "%~dp0web" && "%BUN_EXE%" run dev"

start "backend" cmd /k "cd /d "%~dp0" && "%AIR_EXE%""

exit
