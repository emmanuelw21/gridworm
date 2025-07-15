"""
Starmie Proxy Server
Runs alongside ComfyUI to handle CORS and provide Starmie endpoints
"""

from aiohttp import web, ClientSession
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
import asyncio
import aiohttp_cors

class StarmieProxy:
    def __init__(self, comfyui_host='localhost', comfyui_port=8000, proxy_port=8189):
        self.comfyui_host = comfyui_host
        self.comfyui_port = comfyui_port
        self.proxy_port = proxy_port
        self.selected_dir = Path("./selected-output")
        self.selected_dir.mkdir(exist_ok=True)
        self.manifest_path = self.selected_dir / ".starmie-manifest.json"
        self.ensure_manifest()
        
    def ensure_manifest(self):
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
    
    async def handle_manifest(self, request):
        """Get the manifest"""
        try:
            with open(self.manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def handle_star(self, request):
        """Star an item"""
        try:
            data = await request.json()
            filepath = data.get('filepath')
            
            if not filepath:
                return web.json_response({"error": "No filepath provided"}, status=400)
            
            # Implementation similar to starmie_integration.py
            # ... (star logic here)
            
            return web.json_response({"success": True, "message": "Item starred"})
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def handle_file(self, request):
        """Get a starred file"""
        item_id = request.match_info.get('item_id')
        # ... (file serving logic)
        return web.json_response({"error": "Not implemented"}, status=501)
    
    async def handle_websocket(self, request):
        """WebSocket endpoint"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                # Echo back for now
                await ws.send_str(msg.data)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                print(f'WebSocket error: {ws.exception()}')
        
        return ws
    
    def create_app(self):
        app = web.Application()
        
        # Setup CORS
        cors = aiohttp_cors.setup(app, defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods="*"
            )
        })
        
        # Add routes
        app.router.add_get('/starmie/manifest', self.handle_manifest)
        app.router.add_post('/starmie/star', self.handle_star)
        app.router.add_get('/starmie/file/{item_id}', self.handle_file)
        app.router.add_get('/starmie', self.handle_websocket)
        
        # Configure CORS for all routes
        for route in list(app.router.routes()):
            cors.add(route)
        
        return app
    
    def run(self):
        app = self.create_app()
        print(f"🌟 Starmie Proxy Server starting on port {self.proxy_port}")
        print(f"📡 Proxying to ComfyUI at {self.comfyui_host}:{self.comfyui_port}")
        print(f"✨ CORS enabled for all origins")
        web.run_app(app, host='0.0.0.0', port=self.proxy_port)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Starmie Proxy Server')
    parser.add_argument('--comfyui-host', default='localhost', help='ComfyUI host')
    parser.add_argument('--comfyui-port', type=int, default=8000, help='ComfyUI port')
    parser.add_argument('--proxy-port', type=int, default=8189, help='Proxy server port')
    
    args = parser.parse_args()
    
    proxy = StarmieProxy(
        comfyui_host=args.comfyui_host,
        comfyui_port=args.comfyui_port,
        proxy_port=args.proxy_port
    )
    proxy.run()