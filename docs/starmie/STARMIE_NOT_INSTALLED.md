# Starmie is Not Installed in ComfyUI

Your setup status:
- ✅ ComfyUI is running on port 8000
- ✅ CORS is enabled (allows cross-origin requests)
- ✅ Gridworm can detect ComfyUI
- ❌ Starmie extension is NOT installed in ComfyUI

## The Issue

The WebSocket error `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED` means that ComfyUI doesn't have the `/starmie` endpoint. This happens when the Starmie extension isn't installed.

## How to Install Starmie

### Step 1: Locate Your ComfyUI Installation

Find where ComfyUI is installed. Look for a folder structure like:
```
ComfyUI/
├── custom_nodes/     <-- This is where Starmie goes
├── models/
├── output/
├── input/
└── main.py (or ComfyUI.exe)
```

### Step 2: Copy Starmie to custom_nodes

1. In Windows Explorer, navigate to your Gridworm folder
2. Copy the entire `comfyui-starmie` folder
3. Paste it into `ComfyUI/custom_nodes/`

The result should be:
```
ComfyUI/
└── custom_nodes/
    └── comfyui-starmie/
        ├── __init__.py
        ├── starmie_node.py
        ├── starmie_comfyui_routes.py
        └── web/
            └── starmie.js
```

### Step 3: Restart ComfyUI

1. Close ComfyUI completely
2. Start it again
3. Look for this message in the console: `✨ Starmie routes added to ComfyUI server`

### Step 4: Verify Installation

In Gridworm, the Starmie panel should now show:
- Green dot with "Connected"
- No more WebSocket errors

## Alternative: Manual Route Setup

If ComfyUI doesn't automatically load the extension, you may need to manually add it to ComfyUI's server. Create a file called `starmie_loader.py` in your ComfyUI root:

```python
# starmie_loader.py
import sys
import os

# Add custom_nodes to path
sys.path.append(os.path.join(os.path.dirname(__file__), "custom_nodes"))

try:
    from comfyui_starmie import setup_server_routes
    print("Starmie extension found, will setup routes...")
except ImportError:
    print("Starmie extension not found in custom_nodes")
```

Then modify ComfyUI's startup to import this loader.

## Still Having Issues?

The key point is that Starmie must be installed IN ComfyUI, not just in Gridworm. The WebSocket error confirms that ComfyUI doesn't know about the `/starmie` endpoint yet.