# MediChain Development Startup Script
# Starts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediChain Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend .env exists
$backendEnv = "medichain-backend\server\.env"
if (-not (Test-Path $backendEnv)) {
    Write-Host "⚠️  Backend .env not found!" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item "medichain-backend\server\.env.example" $backendEnv
    Write-Host "   ✓ Please edit $backendEnv with your API keys" -ForegroundColor Green
    Write-Host ""
}

# Check if frontend .env.local exists
$frontendEnv = "medichain-main\medichain-main\.env.local"
if (-not (Test-Path $frontendEnv)) {
    Write-Host "⚠️  Frontend .env.local not found!" -ForegroundColor Yellow
    Write-Host "   Please ensure it exists with API URL and contract address" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host "Location: medichain-backend/server" -ForegroundColor Gray
Write-Host "URL: http://localhost:4000" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\medichain-backend\server'; Write-Host '🔧 Backend Server' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server..." -ForegroundColor Green
Write-Host "Location: medichain-main/medichain-main" -ForegroundColor Gray
Write-Host "URL: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\medichain-main\medichain-main'; Write-Host '🚀 Frontend Server' -ForegroundColor Cyan; pnpm dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Both servers are starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Wait for servers to start (check new terminal windows)" -ForegroundColor White
Write-Host "   2. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "   3. Connect your MetaMask wallet" -ForegroundColor White
Write-Host "   4. Start using MediChain!" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
