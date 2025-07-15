"""
Server extension for ComfyUI Starmie
This file is automatically loaded by ComfyUI when placed in custom_nodes
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path
from aiohttp import web

# This function is called by ComfyUI when it loads server extensions
def setup(app):
    """
    Setup function called by ComfyUI to add routes
    """
    print("[Starmie] Setting up server routes...")
    
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
    
    @app.get('/starmie/manifest')
    async def get_manifest(request):
        """Get the starred items manifest"""
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    @app.post('/starmie/star')
    async def star_item(request):
        """Star an item"""
        try:
            data = await request.json()
            filepath = data.get('filepath')
            
            if not filepath:
                return web.json_response({"error": "No filepath provided"}, status=400)
            
            # Implementation would go here
            return web.json_response({"success": True, "message": "Star endpoint working"})
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    @app.get('/starmie/file/{item_id}')
    async def get_file(request):
        """Get a starred file"""
        item_id = request.match_info.get('item_id')
        return web.json_response({"message": f"File endpoint working for {item_id}"})
    
    # WebSocket endpoint
    @app.get('/starmie')
    async def websocket_handler(request):
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
    
    print("[Starmie] ✨ Server routes added successfully!")
    print("[Starmie] Available endpoints:")
    print("[Starmie]   - GET  /starmie/manifest")
    print("[Starmie]   - POST /starmie/star")
    print("[Starmie]   - GET  /starmie/file/{item_id}")
    print("[Starmie]   - WS   /starmie")
    
    return True

# Also try the old method name
def server_extension(server):
    """Legacy method name for older ComfyUI versions"""
    return setup(server.app)