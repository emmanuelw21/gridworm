"""
Test if Starmie can be imported in ComfyUI environment
Run this from ComfyUI root directory:
python custom_nodes/comfyui-starmie/test_import.py
"""

import sys
import os

# Add ComfyUI paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

print("Testing Starmie import...")
print("-" * 50)

try:
    # Test basic import
    import custom_nodes.comfyui_starmie as starmie
    print("✅ Basic import successful")
    
    # Check for required attributes
    if hasattr(starmie, 'NODE_CLASS_MAPPINGS'):
        print("✅ NODE_CLASS_MAPPINGS found")
    else:
        print("❌ NODE_CLASS_MAPPINGS missing")
    
    if hasattr(starmie, 'WEB_DIRECTORY'):
        print(f"✅ WEB_DIRECTORY found: {starmie.WEB_DIRECTORY}")
    else:
        print("❌ WEB_DIRECTORY missing")
    
    if hasattr(starmie, 'setup_server_routes'):
        print("✅ setup_server_routes function found")
    else:
        print("❌ setup_server_routes function missing")
        
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print("\nTrying individual imports...")
    
    try:
        from custom_nodes.comfyui_starmie.starmie_node import NODE_CLASS_MAPPINGS
        print("✅ Can import NODE_CLASS_MAPPINGS directly")
    except ImportError as e:
        print(f"❌ Cannot import starmie_node: {e}")
    
    try:
        from custom_nodes.comfyui_starmie.starmie_comfyui_routes import add_starmie_routes
        print("✅ Can import add_starmie_routes directly")
    except ImportError as e:
        print(f"❌ Cannot import routes: {e}")

print("-" * 50)
print("\nIf imports fail, check:")
print("1. File permissions")
print("2. Python syntax errors")
print("3. Missing dependencies")