# Starmie Final Fix Guide

## Issues to Fix:

1. ✅ **No preview in ComfyUI node** → Fixed with proper image registration
2. ✅ **404 error on preview click** → Fixed with folder path handling
3. ❌ **HTTP routes not working** → Need manual setup
4. ✅ **No star button UI** → Added star emoji to node name

## Step 1: Update Starmie Files

Copy these files to `C:\Users\emman\Documents\ComfyUI\custom_nodes\comfyui-starmie\`:

1. **Replace `starmie_node.py` with `starmie_node_fixed.py`**:
   ```bash
   cd C:\Users\emman\Documents\ComfyUI\custom_nodes\comfyui-starmie
   del starmie_node.py
   copy starmie_node_fixed.py starmie_node.py
   ```

2. **Replace `__init__.py`**:
   ```bash
   del __init__.py
   copy __init__.py.new __init__.py
   ```

3. **Copy `routes_patch.py`** (new file)

## Step 2: Fix the HTTP Routes (Manual)

Since ComfyUI desktop isn't loading routes automatically, add this to ComfyUI's `main.py`:

Find the line that starts the server (usually near the bottom), and add this BEFORE it:

```python
# Starmie Integration
try:
    import os
    import json
    from pathlib import Path
    from datetime import datetime
    from aiohttp import web
    
    selected_dir = Path("./selected-output")
    selected_dir.mkdir(exist_ok=True)
    manifest_path = selected_dir / ".starmie-manifest.json"
    
    if not manifest_path.exists():
        manifest = {"version": "1.0", "items": [], "metadata": {"created": datetime.now().isoformat(), "last_updated": datetime.now().isoformat()}}
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    @server.app.get('/starmie/manifest')
    async def get_manifest(request):
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    print("[Starmie] ✨ Routes added!")
except Exception as e:
    print(f"[Starmie] Failed: {e}")
```

## Step 3: Restart ComfyUI

Look for these messages:
- `[Starmie] Loading extension...`
- `[Starmie] ✨ Routes added!`

## Step 4: Test

1. **In ComfyUI**: 
   - The node should now show as "Save Image (Starmie ⭐)"
   - Images should preview correctly
   - Check for `selected-output` folder with starred images

2. **In Gridworm**:
   - Should now connect if routes are working
   - Try http://127.0.0.1:8000/starmie/manifest in browser

## What's New:

1. **Better Node**:
   - Shows preview like regular Save Image
   - Uses ComfyUI's proper folder system
   - Star emoji in node name
   - auto_star defaults to True

2. **Folder Structure**:
   ```
   ComfyUI/
   ├── output/          (regular saves)
   └── selected-output/ (starred items)
       └── .starmie-manifest.json
   ```

## If Still Not Connecting:

The desktop version of ComfyUI might need a different approach. Try:

1. **Check if test endpoint works**:
   ```
   curl http://127.0.0.1:8000/starmie/test
   ```

2. **Use the Save Image node anyway** - Even without HTTP routes, the node still saves starred images to `selected-output` folder

3. **Alternative**: Set up a file watcher in Gridworm to monitor the `selected-output` folder directly