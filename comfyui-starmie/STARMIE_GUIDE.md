# Starmie ComfyUI Integration Guide

## What is Starmie?

Starmie is a bridge between ComfyUI and Gridworm that automatically imports your ComfyUI outputs into Gridworm's media library.

## Available Nodes

### 1. ⭐ Starmie Output Node
The original node for images only.

**Inputs:**
- `images`: The images to save
- `filename_prefix`: Prefix for saved files
- `auto_star`: If TRUE, saves directly to the watched folder

**Usage:**
1. Connect to any image output (VAE Decode, Image Preview, etc.)
2. Set `auto_star` to TRUE to automatically send to Gridworm
3. Images will be saved to `selected-output` folder

### 2. ⭐ Starmie Universal Output Node
The new node that supports ALL media types.

**Inputs:**
- `filename_prefix`: Prefix for saved files
- `auto_star`: If TRUE, saves to watched folder
- `images` (optional): For image outputs
- `videos` (optional): For video outputs
- `file_path` (optional): For any file type

**Usage Examples:**

**For Images:**
```
VAE Decode → Starmie Universal Output (auto_star: TRUE)
```

**For Videos (with Video Helper Suite):**
```
VHS Video Combine → Starmie Universal Output (auto_star: TRUE)
```

**For Any File:**
```
Save Image/Audio/Video → Get File Path → Starmie Universal Output (file_path input)
```

### 3. ⭐ Starmie Watcher Node
A utility node that counts starred items in your manifest.

**Purpose:**
- Returns the count of starred items
- Can be used to trigger other nodes when items are starred
- Useful for conditional workflows

**Usage:**
```
Any Trigger → Starmie Watcher → Display Int
                                → Compare (if count > 0)
```

## How It Works

1. **Auto-Star Mode**: 
   - When `auto_star` is TRUE, files are saved to `selected-output` folder
   - The bridge watches this folder and imports to Gridworm

2. **Manual Mode**:
   - When `auto_star` is FALSE, files save normally
   - You can manually move them to the watched folder

3. **The Bridge**:
   - Run `python starmie_bridge_polling.py`
   - It watches your selected folder
   - Any new files are auto-imported to Gridworm

## Workflow Examples

### Basic Image Workflow
```
Load Image → Model → Sampler → VAE Decode → Starmie Output (auto_star: TRUE)
```

### Video Workflow
```
Load Video → Process → VHS Combine → Starmie Universal (auto_star: TRUE)
```

### Mixed Media Workflow
```
                    → Image Preview → Starmie Universal ─┐
Generate Content ─┤                                       ├→ All go to Gridworm
                    → Save Video → Starmie Universal ────┘
```

## Tips

1. **Set auto_star to TRUE** for automatic Gridworm import
2. **Use filename_prefix** to organize your outputs
3. **The Watcher node** can help create conditional workflows
4. **Universal node** handles any media type ComfyUI can produce

## Troubleshooting

**Files not importing?**
1. Check bridge is running: `python starmie_bridge_polling.py`
2. Verify folder path in Gridworm Starmie panel
3. Click refresh button (↻) to import existing files

**Wrong file type?**
- Use Starmie Universal Output instead of regular Starmie Output

**Bridge not detecting files?**
- Make sure the watched folder matches where ComfyUI saves
- Default: `ComfyUI/selected-output`