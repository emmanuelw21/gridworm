# Fix CORS Error in ComfyUI

You're getting a CORS error because ComfyUI is blocking requests from Gridworm (port 5174). Here are two solutions:

## Solution 1: Add --enable-cors-header Flag (Recommended)

Start ComfyUI with the CORS header flag:

```bash
python main.py --enable-cors-header
```

Or if using the desktop app, check if there's a settings option to enable CORS.

## Solution 2: Modify ComfyUI to Allow Gridworm

Add this to your ComfyUI's `server.py` file, right after the PromptServer is created:

```python
# Enable CORS for Gridworm
@server.app.middleware("http")
async def add_cors_headers(request, handler):
    response = await handler(request)
    # Allow requests from Gridworm
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5174'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response
```

## Solution 3: Use ComfyUI's Built-in CORS Setting

Some ComfyUI versions have a setting in the UI:
1. Go to ComfyUI Settings
2. Look for "Enable CORS" or "Allow External Connections"
3. Enable it and restart

## Solution 4: Proxy Approach (Last Resort)

If none of the above work, we can create a proxy server that runs alongside ComfyUI and handles CORS properly.

## Current Issue

The error shows:
- ComfyUI is rejecting requests because origin (localhost:5174) doesn't match host (localhost:8000)
- This is ComfyUI's built-in security feature
- We need to tell ComfyUI to allow requests from Gridworm

Try Solution 1 first - it's the easiest!