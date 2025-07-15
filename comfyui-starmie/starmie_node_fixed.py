"""
Starmie Node for ComfyUI
This node manages starred/favorited outputs with preview
"""

import os
import json
import shutil
import hashlib
from datetime import datetime
from pathlib import Path
import numpy as np
from PIL import Image
import torch
import folder_paths

class StarmieNode:
    """
    A node that allows starring outputs for Gridworm sync
    """
    
    def __init__(self):
        self.type = "output"
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(os.path.dirname(self.output_dir), "selected-output")
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
            },
            "optional": {
                "auto_star": ("BOOLEAN", {"default": True}),
                "star_tag": ("STRING", {"default": "starred"}),
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(exist_ok=True)
        
    def save_images(self, images, filename_prefix="ComfyUI", auto_star=True, star_tag="starred"):
        """Save images with preview support"""
        filename_prefix = filename_prefix.replace("%date%", datetime.now().strftime("%Y-%m-%d"))
        results = list()
        
        for batch_idx, image in enumerate(images):
            # Convert tensor to numpy array
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            # Generate unique filename
            file = f"{filename_prefix}_{batch_idx:05d}_.png"
            
            if auto_star:
                # Save to selected directory
                file_path = os.path.join(self.selected_dir, file)
                subfolder = "selected-output"
                
                # Save the image
                img.save(file_path, compress_level=4)
                
                # Update manifest
                self.update_manifest({
                    "filename": file,
                    "path": file_path,
                    "starred_at": datetime.now().isoformat(),
                    "tag": star_tag
                })
                
                # Add to ComfyUI's output folder structure so preview works
                # Create a symlink or reference in the regular output folder
                output_link = os.path.join(self.output_dir, "selected-output")
                if not os.path.exists(output_link):
                    try:
                        # Try to create a symlink (might not work on Windows without admin)
                        os.symlink(self.selected_dir, output_link, target_is_directory=True)
                    except:
                        # Fallback: just ensure the directory exists
                        Path(output_link).mkdir(exist_ok=True)
                        # Copy the file there too
                        shutil.copy2(file_path, os.path.join(output_link, file))
                
                print(f"[Starmie] ⭐ Starred image saved to: {file_path}")
            else:
                # Save to regular output directory
                file_path = os.path.join(self.output_dir, file)
                subfolder = ""
                img.save(file_path, compress_level=4)
                print(f"[Starmie] Image saved to: {file_path}")
            
            results.append({
                "filename": file,
                "subfolder": subfolder,
                "type": self.type
            })
        
        return { "ui": { "images": results } }
    
    def update_manifest(self, item_data):
        """Update the manifest file with new starred item"""
        manifest_path = os.path.join(self.selected_dir, ".starmie-manifest.json")
        
        # Load existing manifest
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
        else:
            manifest = {
                "version": "1.0",
                "items": [],
                "metadata": {
                    "created": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat()
                }
            }
        
        # Add unique ID
        item_data["id"] = f"starmie_{datetime.now().timestamp()}_{item_data['filename']}"
        
        # Add item
        manifest["items"].append(item_data)
        manifest["metadata"]["last_updated"] = datetime.now().isoformat()
        
        # Save manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)

# ComfyUI node mappings
NODE_CLASS_MAPPINGS = {
    "StarmieNode": StarmieNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieNode": "Save Image (Starmie ⭐)"
}