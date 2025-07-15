"""
Simplified Starmie initialization for ComfyUI
Replace __init__.py with this if the current one doesn't work
"""

# Minimal node mappings to satisfy ComfyUI
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Web directory for UI injection
WEB_DIRECTORY = "./web"

print("[Starmie] Loading Starmie extension...")

# Try to setup server routes if possible
def setup_server_routes(server):
    """Setup Starmie routes when ComfyUI calls this"""
    try:
        print("[Starmie] Setting up server routes...")
        
        # Import here to avoid issues
        from .starmie_comfyui_routes import add_starmie_routes
        result = add_starmie_routes(server)
        
        if result:
            print("[Starmie] ✨ Server routes added successfully!")
        else:
            print("[Starmie] ⚠️  Server routes setup returned False")
            
        return result
    except Exception as e:
        print(f"[Starmie] ❌ Failed to setup routes: {e}")
        import traceback
        traceback.print_exc()
        return False

print("[Starmie] Extension loaded. Waiting for server initialization...")