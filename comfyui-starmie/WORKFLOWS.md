# Starmie Workflow Examples

## Available Nodes

After installing, you'll have these nodes in ComfyUI:

1. **⭐ Starmie Output** - Original node for images
2. **⭐ Starmie Universal** - Enhanced image handling  
3. **⭐ Starmie Video** - Dedicated video handling
4. **⭐ Starmie Passthrough** - For any file type
5. **⭐ Starmie Watcher** - Utility node

## Image Workflows

### Basic Image Generation
```
Load Model → Sampler → VAE Decode → ⭐ Starmie Universal
                                      └─ auto_star: true
```

### Image with Preview
```
Load Model → Sampler → VAE Decode → Preview Image
                                  └→ ⭐ Starmie Universal
                                      └─ auto_star: true
```

## Video Workflows

### For WebP (animated):
```
VAE Decode → Save Video (WebP) → ⭐ Starmie Video Star
                                  ├─ filename: "output.webp" 
                                  └─ auto_star: true
```

### For MP4:
```
VAE Decode → Create Video → Save Video (MP4) → ⭐ Starmie Video Star
                                                ├─ filename: "output.mp4"
                                                └─ auto_star: true
```

### Direct from VAE (New Starmie Video node):
```
VAE Decode → ⭐ Starmie Video
             ├─ format: "mp4" or "webm" or "gif"
             ├─ fps: 8
             └─ auto_star: true
```

### Important for Videos:
- **Option 1**: Use `⭐ Starmie Video` directly from VAE Decode (replaces Save Video)
- **Option 2**: Use regular Save Video, then add `⭐ Starmie Video Star` after
- **Option 3**: Use `⭐ Starmie Passthrough` if you can get the file path

## Mixed Media Workflow

```
                    ┌→ Image Preview → ⭐ Starmie Universal
Your Workflow ─┤    
                    └→ Video Combine → Save → ⭐ Starmie Passthrough
```

## Important Tips

### For Videos:
1. **Don't connect video directly to Starmie Output** - it will split into frames
2. **Use Starmie Video** or **Starmie Passthrough** for video files
3. **Video must be saved first**, then use the file path

### Auto-Star Setting:
- `auto_star: true` → Files go to `selected-output` folder (watched by bridge)
- `auto_star: false` → Normal ComfyUI output (not sent to Gridworm)

### File Path Nodes:
Some nodes you might need to get file paths:
- "Get Latest File" 
- "String" node with file path
- Custom file path extractors

## Troubleshooting

**Videos becoming individual frames?**
- You're using the wrong node. Use Starmie Video or Passthrough, not Starmie Output

**Files not appearing in Gridworm?**
1. Check `auto_star` is set to `true`
2. Verify bridge is running
3. Check the `selected-output` folder

**Can't find Starmie nodes?**
1. Copy `starmie_universal.py` to `ComfyUI/custom_nodes/comfyui-starmie/`
2. Restart ComfyUI
3. Look under "Starmie" category

## Example: Complete Image + Video Workflow

```
1. Image Path:
   Checkpoint → KSampler → VAE Decode → ⭐ Starmie Universal (auto_star: true)

2. Video Path:
   AnimateDiff → VAE Decode → VHS Combine → VHS Save Video
                                          └→ ⭐ Starmie Passthrough
                                              └─ file_path: [video path]
                                              └─ auto_star: true
```

Both outputs will automatically appear in Gridworm!