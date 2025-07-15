# Starmie Setup Instructions

To connect Gridworm with ComfyUI, you need to install the Starmie extension in ComfyUI.

## Multi-Port Support

Starmie now supports both ComfyUI default ports:
- **Port 8188** - Standard ComfyUI
- **Port 8000** - ComfyUI desktop app
- **Auto-detection** - Automatically finds the right port

## Step 1: Install Starmie in ComfyUI

### Option A: Quick Install (Recommended)
```bash
# From the Gridworm directory, run:
python comfyui-starmie/quick_install.py /path/to/your/ComfyUI

# Example:
python comfyui-starmie/quick_install.py C:/ComfyUI
```

### Option B: Manual Install
1. Copy the `comfyui-starmie` folder to your ComfyUI's `custom_nodes` directory:
   ```bash
   cp -r comfyui-starmie /path/to/ComfyUI/custom_nodes/
   ```

2. The structure should look like:
   ```
   ComfyUI/
   └── custom_nodes/
       └── comfyui-starmie/
           ├── __init__.py
           ├── starmie_node.py
           ├── starmie_server.py
           ├── starmie_integration.py
           └── web/
               └── starmie.js
   ```

## Step 2: Restart ComfyUI

Stop and restart ComfyUI. You should see this message in the console:
```
✨ Starmie routes added to ComfyUI server
```

## Step 3: Test the Connection

### From ComfyUI directory:
```bash
python custom_nodes/comfyui-starmie/test_connection.py
```

You should see:
```
✅ Manifest endpoint is working!
   Found 0 starred items
✅ HTTP endpoints are working!
```

## Step 4: Use Starmie

1. **In ComfyUI:**
   - Generate an image
   - Look for the ☆ star button on output images
   - Click to star (it will turn to ⭐)
   - The file is moved to `selected-output` folder

2. **In Gridworm:**
   - Click the Starmie button in the toolbar (yellow star icon)
   - The panel should show "Connected" with the detected port
   - Click "Sync Now" to import starred items
   - Or enable "Auto-sync" for automatic imports

## Multi-Port Support

Gridworm now automatically detects ComfyUI on multiple ports:
- **Port 8188** (default ComfyUI port) - checked first
- **Port 8000** (alternative port) - checked if 8188 fails
- **Custom port** - you can manually enter any port in the Starmie panel

The connection status will show which port is being used and whether it was auto-detected or manually configured.

## Troubleshooting

### "Disconnected" in Gridworm
- Make sure ComfyUI is running
- Check the console for "Starmie routes added" message
- Gridworm automatically detects ComfyUI on ports 8188 and 8000
- You can manually set the port in the Starmie panel if needed

### Star button not appearing in ComfyUI
- Clear browser cache (Ctrl+F5)
- Check browser console for errors
- Make sure `web/starmie.js` was copied correctly

### "Cannot connect to ComfyUI" error
- Ensure both apps are on the same network
- Check if ports 8188 or 8000 are blocked by firewall
- Try accessing http://localhost:8188/starmie/manifest or http://localhost:8000/starmie/manifest in your browser
- If ComfyUI is on a custom port, enter it manually in the Starmie panel

## Current Status

Based on your error, ComfyUI doesn't have Starmie installed yet. Follow the installation steps above, then the connection should work!