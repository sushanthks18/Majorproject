@echo off
echo 🌾 Smart Agriculture System - Installation Script
echo ==================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    exit /b 1
)

echo ✅ Node.js is installed
node -v

REM Check MongoDB
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  MongoDB is not installed. Please install MongoDB or use MongoDB Atlas.
    echo    Download: https://www.mongodb.com/try/download/community
) else (
    echo ✅ MongoDB is installed
)

echo.
echo 📦 Installing Backend Dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend installation failed
    exit /b 1
)

echo.
echo 📦 Installing Frontend Dependencies...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend installation failed
    exit /b 1
)

cd ..

echo.
echo ✅ Installation Complete!
echo.
echo Next Steps:
echo 1. Start MongoDB (if using local):
echo    - Windows: net start MongoDB
echo.
echo 2. Seed test data:
echo    cd backend ^&^& npm run seed
echo.
echo 3. Start backend (in one terminal):
echo    cd backend ^&^& npm run dev
echo.
echo 4. Start frontend (in another terminal):
echo    cd frontend ^&^& npm run dev
echo.
echo 5. Open http://localhost:5173 in your browser
echo.
echo 📖 See QUICKSTART.md for detailed instructions

pause
