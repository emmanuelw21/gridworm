"""
Starmie Integration for ComfyUI
This integrates with ComfyUI's existing server to add Starmie endpoints
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path
from aiohttp import web

def setup_starmie_routes(server):
    """
    Add this to your ComfyUI server initialization to enable Starmie
    
    Example in ComfyUI's server.py:
    ```python
    from custom_nodes.comfyui-starmie.starmie_integration import setup_starmie_routes
    setup_starmie_routes(server)
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
    
    async def star_handler(request):
        """Handle star requests"""
        try:
            data = await request.json()
            filepath = data.get('filepath')
            
            if not filepath:
                return web.json_response({"error": "No filepath provided"}, status=400, headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                })
            
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
            
            # Copy instead of move (to preserve original)
            shutil.copy2(str(source_path), str(dest_path))
            
            # Update manifest
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            item_data = {
                "id": f"starmie_{datetime.now().timestamp()}",
                "filename": dest_filename,
                "original_path": str(source_path),
                "starred_at": datetime.now().isoformat(),
                "type": "image/png",  # You can enhance this
                "size": dest_path.stat().st_size
            }
            
            manifest["items"].append(item_data)
            manifest["metadata"]["last_updated"] = datetime.now().isoformat()
            
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            return web.json_response({"success": True, "item": item_data}, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            })
            
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            })
    
    async def manifest_handler(request):
        """Return the manifest"""
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            })
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            })
    
    async def file_handler(request):
        """Serve starred files"""
        try:
            item_id = request.match_info.get('item_id')
            
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            item = next((i for i in manifest["items"] if i["id"] == item_id), None)
            if not item:
                return web.json_response({"error": "Item not found"}, status=404, headers={
                    'Access-Control-Allow-Origin': '*'
                })
            
            file_path = selected_dir / item["filename"]
            if not file_path.exists():
                return web.json_response({"error": "File not found"}, status=404, headers={
                    'Access-Control-Allow-Origin': '*'
                })
            
            return web.FileResponse(file_path, headers={
                'Access-Control-Allow-Origin': '*'
            })
            
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            })
    
    # CORS preflight handler
    async def cors_handler(request):
        return web.Response(headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        })
    
    # Add routes to ComfyUI server
    server.app.router.add_post('/starmie/star', star_handler)
    server.app.router.add_get('/starmie/manifest', manifest_handler)
    server.app.router.add_get('/starmie/file/{item_id}', file_handler)
    
    # Add CORS preflight handlers
    server.app.router.add_options('/starmie/star', cors_handler)
    server.app.router.add_options('/starmie/manifest', cors_handler)
    server.app.router.add_options('/starmie/file/{item_id}', cors_handler)
    
    print("✨ Starmie routes added to ComfyUI server")