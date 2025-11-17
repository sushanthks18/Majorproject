# Krishi Sakha - System Startup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KRISHI SAKHA - Starting System" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
} catch {}

if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host "Download the LTS version and install it." -ForegroundColor Yellow
    Write-Host "After installation, restart this script." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host "npm version: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Setup Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setting up Backend..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Set-Location backend

# Copy .env file if not exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# Install backend dependencies
if (-not (Test-Path node_modules)) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Backend dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setting up Frontend..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Set-Location ..\frontend

# Install frontend dependencies
if (-not (Test-Path node_modules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Services..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server on port 5001..." -ForegroundColor Yellow
Set-Location ..\backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== Krishi Sakha Backend ===' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Set-Location ..\frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== Krishi Sakha Frontend ===' -ForegroundColor Cyan; npm run dev"

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   System Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two new windows have opened:" -ForegroundColor White
Write-Host "  1. Backend Server (port 5001)" -ForegroundColor Yellow
Write-Host "  2. Frontend App (port 5173)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once both servers are running:" -ForegroundColor Green
Write-Host "  1. Open your browser to http://localhost:5173" -ForegroundColor White
Write-Host "  2. Register/Login as a farmer" -ForegroundColor White
Write-Host "  3. Upload ESP32 code with WiFi and Server IP" -ForegroundColor White
Write-Host "  4. Watch live sensor data on dashboard!" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
