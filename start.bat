@echo off
chcp 65001 >nul
echo ====================================
echo Second Brain System Startup
echo ====================================
echo.

REM Check and set Node.js version
where nvm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist ".nvmrc" (
        echo Detected .nvmrc file, switching Node version...
        echo Y | call nvm use 20.19.6 >nul 2>nul
        echo Node version switched to 20.19.6
    )
)

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js not detected
    echo Please install Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm not detected
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo First run, installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Dependency installation failed
        pause
        exit /b 1
    )
)

echo Starting backend service in new window...
start "Second Brain Backend" cmd /k "cd /d %~dp0 && call npm run server"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend service in new window...
start "Second Brain Frontend" cmd /k "cd /d %~dp0 && call npm run dev"

echo.
echo ====================================
echo Services are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo ====================================
echo.
echo Two new windows have been opened:
echo - Backend service window
echo - Frontend service window
echo.
echo You can close this window now.
echo The services will continue running in the other windows.
echo.
echo To stop the services, close the Backend and Frontend windows.
echo Press any key to close this window...
pause >nul
