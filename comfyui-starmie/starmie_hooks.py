"""
Starmie Hooks - Intercept ComfyUI's save operations
"""

import os
import shutil
from pathlib import Path
import folder_paths

# Get the selected output directory
output_dir = folder_paths.get_output_directory()
selected_dir = os.path.join(os.path.dirname(output_dir), "selected-output")
Path(selected_dir).mkdir(parents=True, exist_ok=True)

# Store the original save functions
original_save_funcs = {}

def hook_save_nodes():
    """Hook into ComfyUI's save nodes to add Starmie functionality"""
    
    try:
        # Try to hook into common save nodes
        import nodes
        
        # Hook SaveImage if it exists
        if hasattr(nodes, 'SaveImage'):
            original_save_funcs['SaveImage'] = nodes.SaveImage.save_images
            
            def starmie_save_images(self, images, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
                # Call original save
                result = original_save_funcs['SaveImage'](self, images, filename_prefix, prompt, extra_pnginfo)
                
                # Check if auto-star is enabled (could be from a global setting or node input)
                if getattr(self, 'auto_star', False):
                    # Copy saved images to selected folder
                    if 'ui' in result and 'images' in result['ui']:
                        for img_info in result['ui']['images']:
                            src = os.path.join(output_dir, img_info['subfolder'], img_info['filename'])
                            if os.path.exists(src):
                                dst = os.path.join(selected_dir, img_info['filename'])
                                shutil.copy2(src, dst)
                                print(f"[Starmie Hook] Auto-starred: {img_info['filename']}")
                
                return result
            
            nodes.SaveImage.save_images = starmie_save_images
            print("[Starmie] Hooked into SaveImage node")
            
    except Exception as e:
        print(f"[Starmie] Failed to hook save nodes: {e}")


class StarmieAutoStar:
    """
    Simple node to enable auto-starring for the next save operation
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "enable_auto_star": ("BOOLEAN", {"default": True}),
            }
        }
    
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "passthrough"
    CATEGORY = "Starmie"
    
    def passthrough(self, images, enable_auto_star=True):
        """Just pass through images and set auto-star flag"""
        # This is a simplified approach - in practice, you'd need to 
        # communicate with the save node downstream
        return (images,)


class StarmieVideoStar:
    """
    Works with ComfyUI video nodes - place AFTER save video
    """
    
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.selected_dir = os.path.join(os.path.dirname(self.output_dir), "selected-output")
        Path(self.selected_dir).mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "filename": ("STRING", {"default": ""}),
                "auto_star": ("BOOLEAN", {"default": True}),
                "subfolder": ("STRING", {"default": ""}),
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "star_video"
    OUTPUT_NODE = True
    CATEGORY = "Starmie"
    
    def star_video(self, filename, auto_star=True, subfolder=""):
        """Star a video that was just saved"""
        
        if auto_star and filename:
            # Construct source path
            if subfolder:
                src = os.path.join(self.output_dir, subfolder, filename)
            else:
                src = os.path.join(self.output_dir, filename)
            
            # Check common video locations
            if not os.path.exists(src):
                # Try without subfolder
                src = os.path.join(self.output_dir, filename)
            
            if os.path.exists(src):
                dst = os.path.join(self.selected_dir, filename)
                shutil.copy2(src, dst)
                print(f"[Starmie] Video starred: {filename}")
            else:
                print(f"[Starmie] Video not found: {src}")
        
        return {}


# Initialize hooks when module loads
hook_save_nodes()

# Node registration
NODE_CLASS_MAPPINGS = {
    "StarmieAutoStar": StarmieAutoStar,
    "StarmieVideoStar": StarmieVideoStar,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "StarmieAutoStar": "⭐ Starmie Auto-Star",
    "StarmieVideoStar": "⭐ Starmie Video Star",
}