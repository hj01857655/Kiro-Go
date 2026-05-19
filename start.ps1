# Stop any process using port 8080
$port = 8080
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Write-Host "Stopping process $process using port $port..."
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start Kiro-Go
Write-Host "Starting Kiro-Go..."
.\kiro-go.exe
