"""
Starmie Routes for ComfyUI with proper CORS handling
This version works with ComfyUI's built-in CORS validation
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path

try:
    from aiohttp import web
except ImportError:
    # ComfyUI should have aiohttp, but just in case
    import aiohttp
    web = aiohttp.web

def add_starmie_routes(server):
    """
    Add Starmie routes to ComfyUI server with proper CORS handling
    
    Usage in ComfyUI's server.py:
    ```python
    from custom_nodes.comfyui_starmie.starmie_comfyui_routes import add_starmie_routes
    add_starmie_routes(server)
    ```
    """
    
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
    
    # Use ComfyUI's route decorator which handles CORS properly
    @server.routes.get('/starmie/manifest')
    async def get_manifest(request):
        """Get the starred items manifest"""
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    @server.routes.post('/starmie/star')
    async def star_item(request):
        """Star an item"""
        try:
            data = await request.json()
            filepath = data.get('filepath')
            
            if not filepath:
                return web.json_response({"error": "No filepath provided"}, status=400)
            
            # Clean up the filepath
            if filepath.startswith('/'):
                filepath = filepath[1:]
            
            source_path = Path(filepath)
            if not source_path.exists():
                # Try in output directory
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
    
    @server.routes.get('/starmie/file/{item_id}')
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
    
    # WebSocket endpoint for real-time updates
    @server.routes.get('/starmie')
    async def websocket_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    # Handle incoming messages if needed
                    pass
                elif msg.type == web.WSMsgType.ERROR:
                    print(f'WebSocket error: {ws.exception()}')
        finally:
            pass
        
        return ws
    
    print("✨ Starmie routes added to ComfyUI server")
    return True