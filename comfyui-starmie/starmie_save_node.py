"""
Enhanced Starmie Save Node for ComfyUI
Supports custom output folders and drag-drop starring
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path
import numpy as np
from PIL import Image
import torch
import folder_paths
import server
from aiohttp import web

class StarmieSaveNode:
    """
    Enhanced save node with starring capabilities and custom output folder
    """
    
    def __init__(self):
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4
        
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
                "output_folder": ("STRING", {
                    "default": "selected-output",
                    "multiline": False,
                    "tooltip": "Folder path for starred outputs (relative to ComfyUI or absolute)"
                }),
            },
            "optional": {
                "save_preview": ("BOOLEAN", {"default": True, "tooltip": "Show preview in node"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }
    
    RETURN_TYPES = ()
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def save_images(self, images, filename_prefix="ComfyUI", output_folder="selected-output", 
                   save_preview=True, prompt=None, extra_pnginfo=None):
        """Save images to specified folder with preview support"""
        
        # Handle folder path
        if os.path.isabs(output_folder):
            # Absolute path
            full_output_folder = output_folder
        else:
            # Relative to ComfyUI
            full_output_folder = os.path.join(folder_paths.base_path, output_folder)
        
        # Ensure folder exists
        os.makedirs(full_output_folder, exist_ok=True)
        
        # Generate filename with counter
        filename_prefix = filename_prefix.replace("%date%", datetime.now().strftime("%Y-%m-%d"))
        
        results = list()
        saved_paths = list()
        
        for batch_idx, image in enumerate(images):
            # Convert tensor to PIL
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            # Find unique filename
            counter = 1
            while True:
                file = f"{filename_prefix}_{counter:05d}_.png"
                file_path = os.path.join(full_output_folder, file)
                if not os.path.exists(file_path):
                    break
                counter += 1
            
            # Save with metadata
            metadata = {}
            if extra_pnginfo is not None:
                for key, value in extra_pnginfo.items():
                    metadata[key] = value
            
            # Add Starmie metadata
            metadata["starmie"] = json.dumps({
                "starred": True,
                "starred_at": datetime.now().isoformat(),
                "output_folder": output_folder
            })
            
            # Save image
            img.save(file_path, pnginfo=self._make_pnginfo(metadata), compress_level=self.compress_level)
            saved_paths.append(file_path)
            
            # Update manifest
            self.update_manifest(full_output_folder, {
                "filename": file,
                "path": file_path,
                "starred_at": datetime.now().isoformat(),
                "size": os.path.getsize(file_path),
                "workflow": prompt
            })
            
            if save_preview:
                # For preview in UI
                subfolder = output_folder if not os.path.isabs(output_folder) else ""
                results.append({
                    "filename": file,
                    "subfolder": subfolder,
                    "type": self.type
                })
            
            print(f"[Starmie] ⭐ Saved to: {file_path}")
        
        # Store paths for drag-drop functionality
        if hasattr(server.PromptServer.instance, 'starmie_recent_saves'):
            server.PromptServer.instance.starmie_recent_saves = saved_paths
        else:
            server.PromptServer.instance.starmie_recent_saves = saved_paths
        
        return { "ui": { "images": results } }
    
    def _make_pnginfo(self, metadata):
        """Create PNG metadata"""
        from PIL import PngImagePlugin
        pnginfo = PngImagePlugin.PngInfo()
        for key, value in metadata.items():
            if isinstance(value, dict):
                value = json.dumps(value)
            pnginfo.add_text(key, str(value))
        return pnginfo
    
    def update_manifest(self, folder, item_data):
        """Update manifest in the output folder"""
        manifest_path = os.path.join(folder, ".starmie-manifest.json")
        
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
        else:
            manifest = {
                "version": "1.1",
                "folder": folder,
                "items": [],
                "metadata": {
                    "created": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat()
                }
            }
        
        # Add unique ID
        item_data["id"] = f"starmie_{datetime.now().timestamp()}_{item_data['filename']}"
        
        manifest["items"].append(item_data)
        manifest["metadata"]["last_updated"] = datetime.now().isoformat()
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)


class StarmieStarButton:
    """
    A node that creates a star button for any image
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "star_folder": ("STRING", {
                    "default": "selected-output",
                    "multiline": False,
                    "tooltip": "Destination folder for starred images"
                }),
                "show_button": ("BOOLEAN", {"default": True}),
            }
        }
    
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "pass_through"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def pass_through(self, images, star_folder="selected-output", show_button=True):
        """Pass through images while showing star button"""
        # This node just passes through images
        # The actual starring happens via web UI interaction
        return (images,)


# API endpoint for drag-drop starring
@server.PromptServer.instance.routes.post('/starmie/star-image')
async def star_existing_image(request):
    """Star an existing output image"""
    try:
        data = await request.json()
        source_path = data.get('source_path')
        star_folder = data.get('star_folder', 'selected-output')
        
        if not source_path or not os.path.exists(source_path):
            return web.json_response({"error": "Source image not found"}, status=404)
        
        # Determine destination
        if os.path.isabs(star_folder):
            dest_folder = star_folder
        else:
            dest_folder = os.path.join(folder_paths.base_path, star_folder)
        
        os.makedirs(dest_folder, exist_ok=True)
        
        # Copy file
        filename = os.path.basename(source_path)
        dest_path = os.path.join(dest_folder, filename)
        
        # Handle duplicates
        counter = 1
        while os.path.exists(dest_path):
            name, ext = os.path.splitext(filename)
            dest_path = os.path.join(dest_folder, f"{name}_star{counter}{ext}")
            counter += 1
        
        shutil.copy2(source_path, dest_path)
        
        # Update manifest
        manifest_path = os.path.join(dest_folder, ".starmie-manifest.json")
        # ... (manifest update code)
        
        return web.json_response({
            "success": True,
            "starred_path": dest_path,
            "filename": os.path.basename(dest_path)
        })
        
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# Node mappings
NODE_CLASS_MAPPINGS = {
    "StarmieSaveNode": StarmieSaveNode,
    "StarmieStarButton": StarmieStarButton,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieSaveNode": "Save to Folder (Starmie) ⭐",
    "StarmieStarButton": "Star Button ⭐",
}