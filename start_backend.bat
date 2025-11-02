@echo off
echo 🐍 AI Study Assistant - Python Backend Setup
echo ============================================
echo.

echo Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ Error installing dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.
echo Starting Python backend server...
echo Backend will run on http://127.0.0.1:8000
echo WebSocket endpoint: ws://127.0.0.1:8000/ws/camera
echo.
echo Press Ctrl+C to stop the server
echo.

python backend.py