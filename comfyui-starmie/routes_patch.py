"""
Patch ComfyUI to serve files from selected-output folder
This ensures the preview URLs work
"""

import os
import folder_paths

# Add selected-output to ComfyUI's output folders
selected_output_dir = os.path.join(os.path.dirname(folder_paths.get_output_directory()), "selected-output")
if not os.path.exists(selected_output_dir):
    os.makedirs(selected_output_dir, exist_ok=True)

# Patch folder_paths to recognize selected-output
original_get_directory = folder_paths.get_directory_by_type

def patched_get_directory(type_name):
    if type_name == "output":
        # Return our custom directory for selected-output subfolder
        base_output = original_get_directory(type_name)
        return base_output
    return original_get_directory(type_name)

# Apply patch
folder_paths.get_directory_by_type = patched_get_directory

# Also add to folder_paths.folder_names_and_paths if it exists
if hasattr(folder_paths, 'folder_names_and_paths'):
    if 'output' in folder_paths.folder_names_and_paths:
        output_folders = folder_paths.folder_names_and_paths['output']
        if isinstance(output_folders[0], list):
            # Add selected-output to the list of output folders
            output_folders[0].append(selected_output_dir)

print("[Starmie] Patched folder_paths to support selected-output directory")