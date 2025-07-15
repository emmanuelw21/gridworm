"""
Direct route registration for Starmie
This attempts to register routes immediately when imported
"""

print("[Starmie] routes.py loading...")

import os
import json
import shutil
from datetime import datetime
from pathlib import Path

try:
    from aiohttp import web
    import server
    
    # Get the server instance
    if hasattr(server, 'PromptServer') and hasattr(server.PromptServer, 'instance'):
        app = server.PromptServer.instance.app
        
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
        
        # Define routes
        async def get_manifest(request):
            """Get the starred items manifest"""
            try:
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                return web.json_response(manifest)
            except Exception as e:
                return web.json_response({"error": str(e)}, status=500)
        
        async def test_endpoint(request):
            """Simple test endpoint"""
            return web.json_response({"status": "ok", "message": "Starmie is working!"})
        
        # Register routes
        app.router.add_get('/starmie/manifest', get_manifest)
        app.router.add_get('/starmie/test', test_endpoint)
        
        print("[Starmie] ✨ Routes registered via direct method!")
        print("[Starmie] Test with: http://127.0.0.1:8000/starmie/test")
        
    else:
        print("[Starmie] ⚠️  Server instance not available yet")
        
except Exception as e:
    print(f"[Starmie] ❌ Failed to register routes: {e}")
    import traceback
    traceback.print_exc()