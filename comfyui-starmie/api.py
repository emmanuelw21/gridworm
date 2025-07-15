"""
API routes for Starmie - Alternative method for ComfyUI
Some ComfyUI versions look for api.py instead of server_extension.py
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path
from aiohttp import web
import server

print("[Starmie] api.py loading...")

selected_dir = Path("./selected-output")
selected_dir.mkdir(exist_ok=True)
manifest_path = selected_dir / ".starmie-manifest.json"

# Ensure manifest exists
if not manifest_path.exists():
    manifest = {
        "version": "1.0",
        "items": [],
        "metadata": {
            "created": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
    }
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

@server.PromptServer.instance.routes.get('/starmie/manifest')
async def get_manifest(request):
    """Get the starred items manifest"""
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        return web.json_response(manifest)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.post('/starmie/star')
async def star_item(request):
    """Star an item"""
    try:
        data = await request.json()
        filepath = data.get('filepath')
        
        if not filepath:
            return web.json_response({"error": "No filepath provided"}, status=400)
        
        # Clean up filepath
        if filepath.startswith('/'):
            filepath = filepath[1:]
        
        source_path = Path(filepath)
        if not source_path.exists():
            source_path = Path("output") / os.path.basename(filepath)
            if not source_path.exists():
                return web.json_response({"error": f"File not found: {filepath}"}, status=404)
        
        # Generate unique filename
        dest_filename = source_path.name
        dest_path = selected_dir / dest_filename
        
        counter = 1
        while dest_path.exists():
            stem = source_path.stem
            suffix = source_path.suffix
            dest_filename = f"{stem}_{counter}{suffix}"
            dest_path = selected_dir / dest_filename
            counter += 1
        
        # Copy file
        shutil.copy2(str(source_path), str(dest_path))
        
        # Update manifest
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        item_data = {
            "id": f"starmie_{datetime.now().timestamp()}",
            "filename": dest_filename,
            "original_path": str(source_path),
            "starred_at": datetime.now().isoformat(),
            "type": "image/png",
            "size": dest_path.stat().st_size
        }
        
        manifest["items"].append(item_data)
        manifest["metadata"]["last_updated"] = datetime.now().isoformat()
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        return web.json_response({"success": True, "item": item_data})
        
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.get('/starmie/file/{item_id}')
async def get_file(request):
    """Get a starred file"""
    try:
        item_id = request.match_info.get('item_id')
        
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        item = next((i for i in manifest["items"] if i["id"] == item_id), None)
        if not item:
            return web.json_response({"error": "Item not found"}, status=404)
        
        file_path = selected_dir / item["filename"]
        if not file_path.exists():
            return web.json_response({"error": "File not found"}, status=404)
        
        return web.FileResponse(file_path)
        
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.get('/starmie')
async def websocket_handler(request):
    """WebSocket endpoint"""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    print("[Starmie] WebSocket client connected")
    
    try:
        await ws.send_json({"type": "connected", "message": "Starmie WebSocket connected"})
        
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                # Echo back for now
                await ws.send_str(msg.data)
            elif msg.type == web.WSMsgType.ERROR:
                print(f'[Starmie] WebSocket error: {ws.exception()}')
    finally:
        print("[Starmie] WebSocket client disconnected")
    
    return ws

print("[Starmie] ✨ API routes registered!")
print("[Starmie] Endpoints available:")
print("[Starmie]   - GET  /starmie/manifest")
print("[Starmie]   - POST /starmie/star")
print("[Starmie]   - GET  /starmie/file/{item_id}")
print("[Starmie]   - WS   /starmie")