# Starmie Bridge - Setup Guide

## Quick Start (Windows)

1. **Install Python** (if not already installed)
   - Download from https://python.org
   - Make sure to check "Add Python to PATH"

2. **Install Dependencies**
   ```bash
   cd starmie-bridge
   pip install -r requirements.txt
   ```

3. **Run the Bridge**
   - Double-click `start_bridge.bat`
   - Or run: `python starmie_bridge.py`

4. **You should see:**
   ```
   🌟 Starmie Bridge Server
   📁 Default folder: C:/Users/emman/Documents/ComfyUI/selected-output
   🌐 Running on: http://localhost:5555
   ```

## Test the Bridge

Open your browser and go to:
- http://localhost:5555/starmie/status

You should see:
```json
{
  "status": "running",
  "watching": "C:/Users/emman/Documents/ComfyUI/selected-output",
  "file_count": 0
}
```

## Configure in Gridworm

1. Open Gridworm
2. Click the Starmie button
3. Scroll to "Bridge Connection" section
4. It should show "Bridge Connected" in green
5. Set your folder path if different
6. Click "Start Auto-Import"

## How It Works

```
ComfyUI → Saves to folder → Bridge detects → Gridworm polls bridge → Auto-imports
```

## Troubleshooting

### "Bridge Not Found" in Gridworm
- Make sure the bridge is running (check terminal)
- Check Windows Firewall isn't blocking port 5555
- Try: http://localhost:5555/starmie/status in browser

### No files importing
- Check the folder path is correct
- Make sure ComfyUI is saving to that folder
- Try saving a test image to the folder

### Python errors
- Make sure you have Python 3.7+
- Install requirements: `pip install flask flask-cors watchdog`

## Advanced Configuration

Edit `starmie_bridge.py` to change:
- Default port (5555)
- Default watch folder
- File extensions to watch

## Running as a Service (Optional)

To run automatically on startup:

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "When computer starts"
4. Set action: Start `starmie_bridge.py`

### Using NSSM (Non-Sucking Service Manager)
```bash
nssm install StarmieBridge "C:\Python\python.exe" "C:\path\to\starmie_bridge.py"
nssm start StarmieBridge
```