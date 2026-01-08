Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SentinelIQ System Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if backend is running
Write-Host "[1/6] Checking Backend Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ Backend is RUNNING on port 8000" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend is NOT RUNNING or NOT REACHABLE" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check health endpoint
Write-Host ""
Write-Host "[2/6] Checking Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ Health endpoint responding: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Health endpoint FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check frontend dev server
Write-Host ""
Write-Host "[3/6] Checking Frontend Dev Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ Frontend is RUNNING on port 5173" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Frontend is NOT RUNNING" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check if .env exists in frontend
Write-Host ""
Write-Host "[4/6] Checking Frontend Environment..." -ForegroundColor Yellow
$envPath = "c:\Users\vinny\OneDrive\Documents\sentineliq\frontend\.env"
if (Test-Path $envPath) {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
    Write-Host "  Contents:" -ForegroundColor Gray
    Get-Content $envPath | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ✗ .env file MISSING at $envPath" -ForegroundColor Red
}

# 5. Check backend structure
Write-Host ""
Write-Host "[5/6] Checking Backend API Routes..." -ForegroundColor Yellow
$backendMain = "c:\Users\vinny\OneDrive\Documents\sentineliq\backend\app\main.py"
if (Test-Path $backendMain) {
    Write-Host "  ✓ main.py exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ main.py MISSING" -ForegroundColor Red
}

# 6. Test CORS with actual request
Write-Host ""
Write-Host "[6/6] Testing CORS Headers..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "http://localhost:5173"
    }
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -Headers $headers -TimeoutSec 5 -ErrorAction Stop
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "  ✓ CORS header present: $corsHeader" -ForegroundColor Green
    } else {
        Write-Host "  ✗ CORS header MISSING in response" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ CORS test FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
