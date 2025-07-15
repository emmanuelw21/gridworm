# Update Starmie in ComfyUI

I've added new files to make Starmie work with ComfyUI. You need to:

## 1. Copy the Updated Files

Copy these new/updated files to your ComfyUI installation:
```
C:\Users\emman\Documents\ComfyUI\custom_nodes\comfyui-starmie\
├── __init__.py (updated)
├── server_extension.py (NEW - this is important!)
├── requirements.txt (NEW)
└── (all other existing files)
```

## 2. Restart ComfyUI

After copying, restart ComfyUI and look for these messages in the console:
- `[Starmie] Loading extension...`
- `[Starmie] Setting up server routes...`
- `[Starmie] ✨ Server routes added successfully!`

## 3. What Changed

1. **Added `server_extension.py`** - This is the file ComfyUI looks for to add HTTP routes
2. **Simplified `__init__.py`** - Added debug messages to see if it loads
3. **Added `requirements.txt`** - Just in case ComfyUI checks dependencies

## 4. If It Still Doesn't Work

Try renaming the folder:
- From: `comfyui-starmie`
- To: `ComfyUI-Starmie` or `comfyui_starmie`

Some ComfyUI versions are picky about folder naming conventions.

## 5. Manual Test

After restarting, test in your browser:
```
http://127.0.0.1:8000/starmie/manifest
```

Should return JSON instead of "page not found".