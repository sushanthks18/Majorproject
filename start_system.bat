@echo off
echo ========================================
echo   KRISHI SAKHA - Starting System
echo ========================================
echo.

REM Refresh environment variables to get Node.js path
set "PATH=%PATH%;C:\Program Files\nodejs"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please:
    echo 1. Close ALL PowerShell windows
    echo 2. Open a NEW PowerShell window
    echo 3. Navigate to project folder:
    echo    cd C:\Users\yalip_c7ukczj\qoderkrishisakha
    echo 4. Run: .\start_system.bat
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Setup Backend
echo ========================================
echo   Setting up Backend...
echo ========================================
cd backend

REM Copy .env file if not exists
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)

REM Install backend dependencies
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

echo.
echo ========================================
echo   Setting up Frontend...
echo ========================================
cd ..\frontend

REM Install frontend dependencies
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)

echo.
echo ========================================
echo   Starting Services...
echo ========================================
echo.
echo Starting Backend Server on port 5001...
cd ..\backend
start "Krishi Sakha Backend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend on port 5173...
cd ..\frontend
start "Krishi Sakha Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:5173
echo.
echo Two new windows have opened:
echo   1. Backend Server (port 5001)
echo   2. Frontend App (port 5173)
echo.
echo Once both servers are running:
echo   1. Open your browser to http://localhost:5173
echo   2. Upload ESP32 code with WiFi and Server IP
echo   3. Watch live sensor data on dashboard!
echo.
echo Press any key to exit this window...
pause >nul
