@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   DahoodBet Windows Server Launcher
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js v22 LTS from: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Installing packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

if not exist "dist" (
    echo [2/3] Building website for production...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] npm run build failed.
        pause
        exit /b 1
    )
)

echo [3/3] Starting DahoodBet server on http://127.0.0.1:3000 ...
start "DahoodBet Server" cmd /k "set NODE_ENV=production&& set PORT=3000&& node server.ts"

timeout /t 3 /nobreak >nul

set "CF_CMD="
if exist "cloudflared.exe" set "CF_CMD=cloudflared.exe"
if not defined CF_CMD (
    where cloudflared >nul 2>&1
    if not errorlevel 1 set "CF_CMD=cloudflared"
)
if not defined CF_CMD if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF_CMD=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CF_CMD if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF_CMD=%ProgramFiles%\cloudflared\cloudflared.exe"

if defined CF_CMD (
    echo.
    echo Creating public HTTPS link via Cloudflare Tunnel...
    echo Look for the https://....trycloudflare.com URL below:
    echo.
    "%CF_CMD%" tunnel --url http://127.0.0.1:3000
) else (
    echo.
    echo Server is running locally at: http://localhost:3000
    echo To get a free public HTTPS link, run this command in Windows CMD/PowerShell:
    echo   winget install --id Cloudflare.cloudflared
    echo Then close and run this file again!
    echo.
    pause
)
