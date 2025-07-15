# Where to Find the selected-output Folder

## In ComfyUI:

The `selected-output` folder is created automatically when you use the Starmie node with `auto_star` enabled. It will be located:

```
C:\Users\emman\Documents\ComfyUI\
├── output\              (regular ComfyUI outputs)
└── selected-output\     (⭐ starred Starmie outputs)
    └── .starmie-manifest.json
```

## In Gridworm:

I've added a **Browse Folder** tab to the Starmie panel! You can now:

1. **Click the Starmie button** in Gridworm toolbar
2. **Click "Browse Folder"** tab (it's the default tab now)
3. **Click "Browse for Folder"** button
4. **Navigate to**: `C:\Users\emman\Documents\ComfyUI\selected-output`
5. **Select the folder** - Gridworm will show all images inside
6. **Select images** and click "Import"

## Features:

- ✅ **No connection needed** - Works even if HTTP routes fail
- ✅ **See all starred images** from ComfyUI
- ✅ **Batch import** - Select multiple images at once
- ✅ **Preserves metadata** - If manifest exists, tags images as starred
- ✅ **Shows file sizes** - Know what you're importing

## Alternative Locations:

If ComfyUI is installed elsewhere, look for `selected-output` next to the `output` folder:
- Next to where ComfyUI saves regular images
- One level up from the `output` folder
- In the ComfyUI root directory

## Tips:

1. The folder is created the first time you use Starmie node
2. Images are saved there when `auto_star` is True
3. The `.starmie-manifest.json` contains metadata about starred items
4. You can browse this folder anytime, even offline!