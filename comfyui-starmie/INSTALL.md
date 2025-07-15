# Starmie Installation Guide

## Quick Install

1. **Copy the folder to ComfyUI**:
   ```bash
   cp -r comfyui-starmie /path/to/ComfyUI/custom_nodes/
   ```

2. **Restart ComfyUI**

That's it! The star buttons should now appear on your output images.

## Manual Integration (Alternative)

If the automatic installation doesn't work, you can manually integrate Starmie:

### Option 1: Add to ComfyUI's server.py

Add this to your ComfyUI's `server.py` file after the server is created:

```python
# Add near the top with other imports
import sys
sys.path.append('./custom_nodes')

# After server creation (usually near the bottom)
try:
    from comfyui_starmie.starmie_integration import setup_starmie_routes
    setup_starmie_routes(server)
    print("✨ Starmie integration loaded successfully")
except Exception as e:
    print(f"Failed to load Starmie integration: {e}")
```

### Option 2: Use as standalone node

The Starmie node will be available in the node menu under "Starmie" category.

## Folder Structure

After installation, you should have:
```
ComfyUI/
├── custom_nodes/
│   └── comfyui-starmie/
│       ├── __init__.py
│       ├── starmie_node.py
│       ├── starmie_server.py
│       ├── starmie_integration.py
│       └── web/
│           └── starmie.js
├── output/           # Your normal output folder
└── selected-output/  # Created automatically for starred items
    └── .starmie-manifest.json
```

## Verify Installation

1. Start ComfyUI
2. Generate an image
3. Look for the ☆ star button on the output preview
4. Click to star - it should turn to ⭐
5. Check the `selected-output` folder for your starred file

## Troubleshooting

### Star button not appearing
- Check browser console for errors
- Ensure the web extension is loaded (check ComfyUI console)
- Try refreshing the browser with Ctrl+F5

### Files not moving to selected-output
- Check folder permissions
- Ensure `selected-output` folder exists
- Check ComfyUI console for error messages

### Connection to Gridworm fails
- Ensure Gridworm is running
- Check that both are on the same network
- Verify WebSocket port (default: 8188) is not blocked