# Troubleshooting Starmie Installation in ComfyUI

You've placed Starmie in the correct location: `C:\Users\emman\Documents\ComfyUI\custom_nodes\comfyui-starmie`

## Step 1: Restart ComfyUI

Make sure to:
1. **Completely close** ComfyUI (not just minimize)
2. Start it again
3. Watch the console/terminal for any Starmie-related messages

## Step 2: Check ComfyUI Console

Look for these messages:
- `[Starmie] Loading Starmie extension...` 
- `✨ Starmie routes added to ComfyUI server`
- Any error messages mentioning "starmie"

## Step 3: Common Issues and Fixes

### Issue: No Starmie messages in console
**Fix**: ComfyUI might not be loading custom nodes properly
- Try renaming the folder from `comfyui-starmie` to `comfyui_starmie` (underscore instead of dash)
- Some ComfyUI versions have issues with dashes in folder names

### Issue: Import errors
**Fix**: The extension might have dependency issues
1. Replace `__init__.py` with `simple_init.py`:
   ```bash
   cd C:\Users\emman\Documents\ComfyUI\custom_nodes\comfyui-starmie
   rename __init__.py __init__.py.backup
   copy simple_init.py __init__.py
   ```

### Issue: "setup_server_routes" not called
**Fix**: ComfyUI might not be calling the setup function
- This varies by ComfyUI version
- May need manual integration

## Step 4: Manual Integration (Last Resort)

If automatic loading fails, add this to ComfyUI's `main.py` or `server.py`:

```python
# Add after server is created but before it starts
try:
    import sys
    sys.path.append('./custom_nodes')
    from comfyui_starmie.starmie_comfyui_routes import add_starmie_routes
    add_starmie_routes(server)
    print("✨ Starmie manually integrated")
except Exception as e:
    print(f"Failed to load Starmie: {e}")
```

## Step 5: Verify Installation

After restarting, test from command line:
```bash
curl http://127.0.0.1:8000/starmie/manifest -H "Origin: http://localhost:5174"
```

Should return JSON (or 404 if no manifest yet), not "connection refused".

## Current Status Check

The WebSocket error `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED` specifically means:
- ComfyUI is running ✅
- CORS is enabled ✅  
- But the `/starmie` endpoint doesn't exist ❌

This confirms Starmie is not being loaded by ComfyUI.