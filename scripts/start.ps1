# Second Brain System Startup Script

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Second Brain System Startup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Switch to project root directory
$ScriptDir = Split-Path $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path $ScriptDir -Parent
Set-Location $ProjectRoot

# Check if nvm exists and switch Node version
if (Get-Command nvm -ErrorAction SilentlyContinue) {
    if (Test-Path ".nvmrc") {
        Write-Host "Detected .nvmrc file, switching Node version..." -ForegroundColor Yellow
        nvm use 20.19.6
    }
}

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js not detected" -ForegroundColor Red
    Write-Host "Please install Node.js (https://nodejs.org/)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm not detected" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "First run, installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Dependency installation failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting backend service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run server" -WindowStyle Normal

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting frontend service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Services are starting..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two new PowerShell windows have been opened:" -ForegroundColor Yellow
Write-Host "- Backend service window" -ForegroundColor White
Write-Host "- Frontend service window" -ForegroundColor White
Write-Host ""
Write-Host "You can close this window now." -ForegroundColor Yellow
Write-Host "The services will continue running in the other windows." -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the services, close the Backend and Frontend windows." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close this window"
