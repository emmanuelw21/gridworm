# Install Starmie in ComfyUI - Quick Guide

Your ComfyUI is running on port 8000, but Starmie is not installed yet. Here's how to fix it:

## Option 1: Quick Install (Easiest)

1. **Find your ComfyUI installation folder**
   - Look for where ComfyUI is installed on your system
   - It should have folders like `custom_nodes`, `models`, `output`, etc.

2. **Copy the Starmie folder**
   ```bash
   # From your Gridworm directory, copy to ComfyUI:
   cp -r comfyui-starmie /path/to/your/ComfyUI/custom_nodes/
   ```

   On Windows, you can also:
   - Open File Explorer
   - Navigate to your Gridworm folder
   - Copy the `comfyui-starmie` folder
   - Paste it into `ComfyUI/custom_nodes/`

3. **Restart ComfyUI**
   - Close ComfyUI completely
   - Start it again

4. **Test the connection**
   - In Gridworm, the Starmie panel should now show "Connected"
   - Or run: `python comfyui-starmie/test_connection.py`

## Option 2: Manual Integration

If ComfyUI doesn't load custom nodes automatically, add this to ComfyUI's `server.py`:

```python
# After the server is created, add:
try:
    import sys
    import os
    custom_nodes_path = os.path.join(os.path.dirname(__file__), "custom_nodes")
    if custom_nodes_path not in sys.path:
        sys.path.append(custom_nodes_path)
    
    from comfyui_starmie.starmie_integration import setup_starmie_routes
    setup_starmie_routes(server)
    print("✨ Starmie integration loaded successfully")
except Exception as e:
    print(f"Failed to load Starmie: {e}")
```

## What You'll See When It Works

1. In ComfyUI console: `✨ Starmie routes added to ComfyUI server`
2. In Gridworm: Starmie panel shows "Connected" with green dot
3. On ComfyUI images: Star button (☆) appears on output previews

## Current Status

- ✅ Gridworm is ready (multi-port support active)
- ❌ ComfyUI needs Starmie installed
- 🔍 Auto-detection will find port 8000 once installed