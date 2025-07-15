"""
Quick install script for Starmie in ComfyUI
Usage: python quick_install.py /path/to/ComfyUI
"""

import sys
import os
import shutil
from pathlib import Path

def install_starmie(comfyui_path):
    comfyui_path = Path(comfyui_path)
    
    # Verify ComfyUI directory
    if not comfyui_path.exists():
        print(f"❌ ComfyUI directory not found: {comfyui_path}")
        return False
    
    # Check for custom_nodes directory
    custom_nodes = comfyui_path / "custom_nodes"
    if not custom_nodes.exists():
        print(f"❌ custom_nodes directory not found in {comfyui_path}")
        print("   Make sure this is the correct ComfyUI directory")
        return False
    
    # Source directory (current directory)
    source_dir = Path(__file__).parent
    
    # Target directory
    target_dir = custom_nodes / "comfyui-starmie"
    
    # Remove existing installation
    if target_dir.exists():
        print(f"🗑️  Removing existing installation at {target_dir}")
        shutil.rmtree(target_dir)
    
    # Copy files
    print(f"📁 Copying Starmie to {target_dir}")
    shutil.copytree(source_dir, target_dir)
    
    print("✅ Starmie installed successfully!")
    print("\n📌 Next steps:")
    print("1. Restart ComfyUI")
    print("2. Generate an image in ComfyUI")
    print("3. Look for the ☆ star button on output images")
    print("4. Open Gridworm and click the Starmie button to connect")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick_install.py /path/to/ComfyUI")
        sys.exit(1)
    
    comfyui_path = sys.argv[1]
    install_starmie(comfyui_path)