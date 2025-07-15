"""
ComfyUI Starmie Node
Allows starring/favoriting outputs for sync with Gridworm
"""

print("[Starmie] Loading extension...")

# Import original nodes
from .starmie_node import NODE_CLASS_MAPPINGS as STARMIE_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as STARMIE_DISPLAY_MAPPINGS

# Initialize with original nodes
NODE_CLASS_MAPPINGS = STARMIE_MAPPINGS.copy()
NODE_DISPLAY_NAME_MAPPINGS = STARMIE_DISPLAY_MAPPINGS.copy()

# Try to import universal nodes
try:
    from .starmie_universal import NODE_CLASS_MAPPINGS as UNIVERSAL_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as UNIVERSAL_DISPLAY_MAPPINGS
    # Add universal nodes
    NODE_CLASS_MAPPINGS.update(UNIVERSAL_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(UNIVERSAL_DISPLAY_MAPPINGS)
    print(f"[Starmie] Loaded {len(UNIVERSAL_MAPPINGS)} universal nodes")
except Exception as e:
    print(f"[Starmie] Universal nodes not loaded: {e}")

# Try to import hook nodes
try:
    from .starmie_hooks import NODE_CLASS_MAPPINGS as HOOK_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as HOOK_DISPLAY_MAPPINGS
    # Add hook nodes
    NODE_CLASS_MAPPINGS.update(HOOK_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(HOOK_DISPLAY_MAPPINGS)
    print(f"[Starmie] Loaded {len(HOOK_MAPPINGS)} hook nodes")
except Exception as e:
    print(f"[Starmie] Hook nodes not loaded: {e}")

# Web extension to inject UI into ComfyUI
WEB_DIRECTORY = "./web"

print(f"[Starmie] Web directory: {WEB_DIRECTORY}")
print(f"[Starmie] Nodes loaded: {len(NODE_CLASS_MAPPINGS)}")

# Try to register routes using different methods
try:
    # Method 1: Direct import (some ComfyUI versions)
    from . import routes
    print("[Starmie] Attempted route registration via routes.py")
except Exception as e:
    print(f"[Starmie] routes.py import failed: {e}")

try:
    # Method 2: API import (other ComfyUI versions)
    from . import api
    print("[Starmie] Attempted route registration via api.py")
except Exception as e:
    print(f"[Starmie] api.py import failed: {e}")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']