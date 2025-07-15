"""
Starmie Universal Node for ComfyUI
Supports all media types: images, videos, gifs, etc.
"""

import os
import json
import shutil
import hashlib
import folder_paths
from datetime import datetime
from pathlib import Path

class StarmieUniversalNode:
    """
    A universal node that handles all media types for Gridworm sync
    """
    
    def __init__(self):
        self.type = "output"
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(folder_paths.get_output_directory(), "..", "selected-output")
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
                "auto_star": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "images": ("IMAGE",),
                "videos": ("VHS_FILENAMES",),  # For Video Helper Suite
                "gifs": ("GIF",),  # For GIF nodes
                "star_tag": ("STRING", {"default": "starred", "multiline": False}),
                "file_path": ("STRING", {"default": "", "multiline": False}),  # For direct file path
            }
        }
    
    RETURN_TYPES = ("STRING",)  # Returns the file path
    RETURN_NAMES = ("file_path",)
    FUNCTION = "save_starred"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(parents=True, exist_ok=True)
        
    def save_starred(self, filename_prefix="ComfyUI", auto_star=False, star_tag="starred", 
                    images=None, videos=None, gifs=None, file_path=None):
        """Save media and optionally star them"""
        
        results = []
        saved_paths = []
        
        # Handle direct file path (for any file type)
        if file_path and os.path.exists(file_path):
            if auto_star:
                filename = os.path.basename(file_path)
                selected_path = os.path.join(self.selected_dir, filename)
                shutil.copy2(file_path, selected_path)
                
                self.update_manifest({
                    "filename": filename,
                    "path": selected_path,
                    "type": self.get_file_type(filename),
                    "starred_at": datetime.now().isoformat(),
                    "tag": star_tag
                })
                
                saved_paths.append(selected_path)
                print(f"[Starmie] File starred and copied to: {selected_path}")
        
        # Handle images (existing logic)
        if images is not None:
            import numpy as np
            from PIL import Image
            import torch
            
            for idx, image in enumerate(images):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{filename_prefix}_{timestamp}_{idx:05d}.png"
                
                # Convert tensor to PIL Image
                if isinstance(image, torch.Tensor):
                    i = 255. * image.cpu().numpy()
                    img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
                else:
                    i = 255. * image
                    img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
                
                if auto_star:
                    selected_path = os.path.join(self.selected_dir, filename)
                    img.save(selected_path, compress_level=4)
                    
                    self.update_manifest({
                        "filename": filename,
                        "path": selected_path,
                        "type": "image/png",
                        "starred_at": datetime.now().isoformat(),
                        "tag": star_tag
                    })
                    
                    saved_paths.append(selected_path)
                    print(f"[Starmie] Image starred and saved to: {selected_path}")
                else:
                    output_path = os.path.join(self.output_dir, filename)
                    img.save(output_path, compress_level=4)
                    saved_paths.append(output_path)
        
        # Handle videos (from Video Helper Suite or similar)
        if videos is not None:
            # Videos might come as file paths
            video_files = videos if isinstance(videos, list) else [videos]
            for video_path in video_files:
                if os.path.exists(video_path):
                    if auto_star:
                        filename = os.path.basename(video_path)
                        selected_path = os.path.join(self.selected_dir, filename)
                        shutil.copy2(video_path, selected_path)
                        
                        self.update_manifest({
                            "filename": filename,
                            "path": selected_path,
                            "type": self.get_file_type(filename),
                            "starred_at": datetime.now().isoformat(),
                            "tag": star_tag
                        })
                        
                        saved_paths.append(selected_path)
                        print(f"[Starmie] Video starred and copied to: {selected_path}")
        
        # Return the first saved path (for workflow continuation)
        return (saved_paths[0] if saved_paths else "",)
    
    def get_file_type(self, filename):
        """Determine MIME type from filename"""
        ext = filename.lower().split('.')[-1]
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
        }
        return mime_types.get(ext, 'application/octet-stream')
    
    def update_manifest(self, item_data):
        """Update the manifest file with new starred item"""
        manifest_path = os.path.join(self.selected_dir, ".starmie-manifest.json")
        
        # Load existing manifest
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
        else:
            manifest = {
                "version": "1.2",
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


# Register the node
NODE_CLASS_MAPPINGS = {
    "StarmieUniversalNode": StarmieUniversalNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieUniversalNode": "⭐ Starmie Universal Output",
}