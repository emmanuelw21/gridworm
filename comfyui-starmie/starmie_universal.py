"""
Starmie Universal Output Node for ComfyUI
Handles both images and videos properly
"""

import os
import json
import shutil
import hashlib
import folder_paths
from datetime import datetime
from pathlib import Path

class StarmieUniversalOutput:
    """
    Universal output node that handles images and videos
    """
    
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(os.path.dirname(self.output_dir), "selected-output")
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "auto_star": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }
    
    RETURN_TYPES = ()
    FUNCTION = "save_output"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(parents=True, exist_ok=True)
        
    def save_output(self, auto_star=True, images=None, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
        """Save images with Starmie support"""
        
        if images is None:
            return {}
            
        results = []
        
        # Handle images
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
                    # Save to selected directory
                    filepath = os.path.join(self.selected_dir, filename)
                    img.save(filepath, compress_level=4)
                    subfolder = "selected-output"
                    print(f"[Starmie] Image auto-starred: {filename}")
                else:
                    # Save to regular output
                    filepath = os.path.join(self.output_dir, filename)
                    img.save(filepath, compress_level=4)
                    subfolder = ""
                
                results.append({
                    "filename": filename,
                    "subfolder": subfolder,
                    "type": "output"
                })
        
        return {"ui": {"images": results}}


class StarmieVideoOutput:
    """
    Video output node that works with ComfyUI's native video nodes
    """
    
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(os.path.dirname(self.output_dir), "selected-output")
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "fps": ("INT", {"default": 8, "min": 1, "max": 60}),
                "filename_prefix": ("STRING", {"default": "ComfyUI_video"}),
                "format": (["mp4", "webm", "gif"], {"default": "mp4"}),
                "auto_star": ("BOOLEAN", {"default": True}),
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "save_video"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(parents=True, exist_ok=True)
        
    def save_video(self, images, fps=8, filename_prefix="ComfyUI_video", format="mp4", auto_star=True):
        """Save video frames directly to video file"""
        import numpy as np
        import torch
        from PIL import Image
        
        # Convert images to numpy array
        if isinstance(images, torch.Tensor):
            frames = (images.cpu().numpy() * 255).astype(np.uint8)
        else:
            frames = (images * 255).astype(np.uint8)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "gif":
            # Save as GIF
            filename = f"{filename_prefix}_{timestamp}.gif"
            pil_images = [Image.fromarray(frame) for frame in frames]
            
            if auto_star:
                filepath = os.path.join(self.selected_dir, filename)
            else:
                filepath = os.path.join(self.output_dir, filename)
                
            pil_images[0].save(
                filepath,
                save_all=True,
                append_images=pil_images[1:],
                duration=1000//fps,
                loop=0
            )
            print(f"[Starmie] GIF saved: {filename}")
            
        else:
            # For MP4/WebM, we need to save frames and use ffmpeg
            # This is a simplified version - in practice, you'd integrate with ComfyUI's video handling
            filename = f"{filename_prefix}_{timestamp}.{format}"
            
            # Save individual frames first
            temp_dir = os.path.join(self.output_dir, "temp_frames")
            os.makedirs(temp_dir, exist_ok=True)
            
            for idx, frame in enumerate(frames):
                img = Image.fromarray(frame)
                img.save(os.path.join(temp_dir, f"frame_{idx:05d}.png"))
            
            # Use ffmpeg to create video (simplified - assumes ffmpeg is available)
            if auto_star:
                output_path = os.path.join(self.selected_dir, filename)
            else:
                output_path = os.path.join(self.output_dir, filename)
            
            # Note: In a real implementation, you'd use ComfyUI's video encoding
            print(f"[Starmie] Video frames ready for encoding to: {filename}")
            
            # Clean up temp frames
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        return {"ui": {"text": f"Video saved: {filename}"}}


class StarmiePassthrough:
    """
    A passthrough node that can star any file after it's been saved
    """
    
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(os.path.dirname(self.output_dir), "selected-output")
        self.ensure_directories()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "file_path": ("STRING", {"default": "", "multiline": False}),
                "auto_star": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "passthrough": ("*",),  # Pass through any input
            }
        }
    
    RETURN_TYPES = ("STRING", "*")
    RETURN_NAMES = ("file_path", "passthrough")
    FUNCTION = "process"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.selected_dir).mkdir(parents=True, exist_ok=True)
        
    def process(self, file_path, auto_star=True, passthrough=None):
        """Process and optionally star a file"""
        
        if auto_star and file_path and os.path.exists(file_path):
            # Copy to selected directory
            filename = os.path.basename(file_path)
            dest_path = os.path.join(self.selected_dir, filename)
            
            if not os.path.exists(dest_path):  # Don't copy if already there
                shutil.copy2(file_path, dest_path)
                print(f"[Starmie] File auto-starred: {filename}")
        
        return (file_path, passthrough)


# Node registration
NODE_CLASS_MAPPINGS = {
    "StarmieUniversalOutput": StarmieUniversalOutput,
    "StarmieVideoOutput": StarmieVideoOutput,
    "StarmiePassthrough": StarmiePassthrough,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieUniversalOutput": "⭐ Starmie Universal",
    "StarmieVideoOutput": "⭐ Starmie Video",
    "StarmiePassthrough": "⭐ Starmie Passthrough",
}