# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location web
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Cyan
Set-Location ..
go build -o kiro-go.exe
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Run .\kiro-go.exe or .\start.ps1 to start the server" -ForegroundColor Yellow
