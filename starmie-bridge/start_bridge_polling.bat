@echo off
echo Starting Starmie Bridge Server (Polling Mode)...
echo.
echo This version is compatible with Python 3.13+
echo.
echo Installing requirements...
pip install -r requirements.txt
echo.
echo Starting server...
python starmie_bridge_polling.py
pause