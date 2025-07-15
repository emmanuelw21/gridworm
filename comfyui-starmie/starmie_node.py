"""
Starmie Node for ComfyUI
This node manages starred/favorited outputs
"""

import os
import json
import shutil
import hashlib
from datetime import datetime
from pathlib import Path

class StarmieNode:
    """
    A node that allows starring outputs for Gridworm sync
    """
    
    def __init__(self):
        self.type = "output"
        self.output_dir = "./output"
        self.selected_dir = "./selected-output"
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
                "auto_star": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "star_tag": ("STRING", {"default": "starred", "multiline": False}),
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "save_starred"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(exist_ok=True)
        
    def save_starred(self, images, filename_prefix="ComfyUI", auto_star=False, star_tag="starred"):
        """Save images and optionally star them"""
        # This is a simplified version - in practice, you'd integrate with
        # ComfyUI's existing save image functionality
        
        results = []
        
        # Add index to handle batch processing
        for idx, image in enumerate(images):
            # Generate filename with index to avoid collisions
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{filename_prefix}_{timestamp}_{idx:05d}.png"
            
            # Convert tensor to PIL Image and save
            import numpy as np
            from PIL import Image
            import torch
            
            # Convert from tensor format to PIL Image
            if isinstance(image, torch.Tensor):
                i = 255. * image.cpu().numpy()
                img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            else:
                i = 255. * image
                img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            if auto_star:
                # Save directly to selected directory
                selected_path = os.path.join(self.selected_dir, filename)
                img.save(selected_path, compress_level=4)
                
                # Update manifest
                self.update_manifest({
                    "filename": filename,
                    "path": selected_path,
                    "starred_at": datetime.now().isoformat(),
                    "tag": star_tag
                })
                
                results.append({
                    "filename": filename,
                    "subfolder": "selected-output",
                    "type": "output",
                    "starred": True
                })
                print(f"[Starmie] Image starred and saved to: {selected_path}")
            else:
                # Save to regular output directory
                output_path = os.path.join(self.output_dir, filename)
                img.save(output_path, compress_level=4)
                results.append({
                    "filename": filename,
                    "subfolder": "",
                    "type": "output", 
                    "starred": False
                })
                print(f"[Starmie] Image saved to: {output_path}")
        
        # Return format expected by ComfyUI
        return {"ui": {"images": results}}
    
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
                    "created": datetime.now().isoformat()
                }
            }
        
        # Generate unique ID
        item_data["id"] = f"starmie_{datetime.now().timestamp()}_{hashlib.md5(item_data['filename'].encode()).hexdigest()[:8]}"
        
        # Add item
        manifest["items"].append(item_data)
        manifest["metadata"]["last_updated"] = datetime.now().isoformat()
        
        # Save manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)


class StarmieWatcher:
    """
    A utility node that watches for starred items
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "trigger": ("*",),
            }
        }
    
    RETURN_TYPES = ("INT",)
    FUNCTION = "check_starred"
    CATEGORY = "Starmie"
    
    def check_starred(self, trigger):
        """Check how many starred items exist"""
        selected_dir = "./selected-output"
        manifest_path = os.path.join(selected_dir, ".starmie-manifest.json")
        
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
                return (len(manifest.get("items", [])),)
        
        return (0,)


# Node registration
NODE_CLASS_MAPPINGS = {
    "StarmieNode": StarmieNode,
    "StarmieWatcher": StarmieWatcher
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieNode": "⭐ Starmie Output",
    "StarmieWatcher": "⭐ Starmie Watcher"
}