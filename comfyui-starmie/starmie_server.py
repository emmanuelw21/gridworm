"""
Starmie Server Component
Handles WebSocket communication and HTTP endpoints for ComfyUI-Gridworm sync
"""

import os
import json
import asyncio
import aiohttp
from aiohttp import web
from pathlib import Path
import shutil
from datetime import datetime
import mimetypes

class StarmieServer:
    def __init__(self):
        self.selected_dir = Path("./selected-output")
        self.selected_dir.mkdir(exist_ok=True)
        self.manifest_path = self.selected_dir / ".starmie-manifest.json"
        self.websocket_clients = set()
        self.ensure_manifest()
        
    def ensure_manifest(self):
        """Ensure manifest file exists"""
        if not self.manifest_path.exists():
            manifest = {
                "version": "1.0",
                "items": [],
                "metadata": {
                    "created": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat()
                }
            }
            with open(self.manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
    
    def load_manifest(self):
        """Load the current manifest"""
        with open(self.manifest_path, 'r') as f:
            return json.load(f)
    
    def save_manifest(self, manifest):
        """Save the manifest"""
        manifest["metadata"]["last_updated"] = datetime.now().isoformat()
        with open(self.manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    async def star_file(self, filepath):
        """Star a file by moving it to selected-output"""
        source_path = Path(filepath)
        if not source_path.exists():
            return {"error": f"File not found: {filepath}"}
        
        # Generate unique filename if needed
        dest_filename = source_path.name
        dest_path = self.selected_dir / dest_filename
        
        # Handle duplicates
        counter = 1
        while dest_path.exists():
            stem = source_path.stem
            suffix = source_path.suffix
            dest_filename = f"{stem}_{counter}{suffix}"
            dest_path = self.selected_dir / dest_filename
            counter += 1
        
        # Move the file
        shutil.move(str(source_path), str(dest_path))
        
        # Get file info
        file_stats = dest_path.stat()
        mime_type, _ = mimetypes.guess_type(str(dest_path))
        
        # Create item data
        item_data = {
            "id": f"starmie_{datetime.now().timestamp()}_{dest_filename}",
            "filename": dest_filename,
            "original_path": str(source_path),
            "starred_at": datetime.now().isoformat(),
            "type": mime_type or "application/octet-stream",
            "size": file_stats.st_size,
            "metadata": {
                "comfyui_workflow": self.extract_workflow_metadata(dest_path)
            }
        }
        
        # Update manifest
        manifest = self.load_manifest()
        manifest["items"].append(item_data)
        self.save_manifest(manifest)
        
        # Notify WebSocket clients
        await self.notify_clients({
            "type": "new_starred",
            "item": item_data
        })
        
        return {"success": True, "item": item_data}
    
    def extract_workflow_metadata(self, filepath):
        """Extract ComfyUI workflow metadata from file if available"""
        # This would extract embedded workflow data from PNG metadata
        # For now, return empty dict
        return {}
    
    async def notify_clients(self, message):
        """Notify all connected WebSocket clients"""
        if self.websocket_clients:
            message_str = json.dumps(message)
            await asyncio.gather(
                *[ws.send_str(message_str) for ws in self.websocket_clients],
                return_exceptions=True
            )
    
    async def handle_star_request(self, request):
        """HTTP endpoint to star a file"""
        try:
            data = await request.json()
            filepath = data.get('filepath')
            if not filepath:
                return web.json_response({"error": "No filepath provided"}, status=400)
            
            result = await self.star_file(filepath)
            
            if "error" in result:
                return web.json_response(result, status=404)
            
            return web.json_response(result)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def handle_manifest_request(self, request):
        """HTTP endpoint to get the manifest"""
        try:
            manifest = self.load_manifest()
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def handle_file_request(self, request):
        """HTTP endpoint to get a specific file"""
        try:
            item_id = request.match_info.get('item_id')
            if not item_id:
                return web.json_response({"error": "No item_id provided"}, status=400)
            
            # Find the item in manifest
            manifest = self.load_manifest()
            item = next((i for i in manifest["items"] if i["id"] == item_id), None)
            
            if not item:
                return web.json_response({"error": "Item not found"}, status=404)
            
            # Return the file
            file_path = self.selected_dir / item["filename"]
            if not file_path.exists():
                return web.json_response({"error": "File not found"}, status=404)
            
            return web.FileResponse(file_path)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def websocket_handler(self, request):
        """WebSocket handler for real-time updates"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self.websocket_clients.add(ws)
        
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    # Handle incoming messages if needed
                    data = json.loads(msg.data)
                    # Process commands...
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f'WebSocket error: {ws.exception()}')
        finally:
            self.websocket_clients.discard(ws)
        
        return ws
    
    def setup_routes(self, app):
        """Setup HTTP and WebSocket routes"""
        app.router.add_post('/starmie/star', self.handle_star_request)
        app.router.add_get('/starmie/manifest', self.handle_manifest_request)
        app.router.add_get('/starmie/file/{item_id}', self.handle_file_request)
        app.router.add_get('/starmie', self.websocket_handler)

# This will be integrated with ComfyUI's server
# For now, it's a standalone implementation that can be adapted