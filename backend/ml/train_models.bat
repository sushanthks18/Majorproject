@echo off
echo ============================================================
echo CROP RECOMMENDATION ML MODEL TRAINING SETUP
echo ============================================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo Python found!
echo.

echo Installing required packages...
pip install pandas numpy scikit-learn

echo.
echo ============================================================
echo Training ML Models...
echo ============================================================
echo.

python train_model.py

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo SUCCESS! ML Models trained successfully!
    echo ============================================================
    echo.
    echo Models created:
    echo   - decision_tree_model.pkl
    echo   - random_forest_model.pkl
    echo   - label_encoder.pkl
    echo   - model_metadata.json
    echo.
) else (
    echo.
    echo [ERROR] Training failed!
    echo.
)

pause
