@echo off
echo Starting Starmie Bridge Server...
echo.
echo This will monitor your ComfyUI output folder and serve files to Gridworm.
echo.
echo Installing requirements...
pip install -r requirements.txt
echo.
echo Starting server...
python starmie_bridge.py
pause