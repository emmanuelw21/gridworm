# Starmie Complete Solution

## Overview

Since you're running Gridworm in a browser (not Electron), we've created a solution that works within browser limitations:

### 1. **ComfyUI Side - Enhanced Save Node**
- **Custom output folder** - Specify any folder path
- **Preview in node** - See what you're saving
- **Automatic manifest** - Tracks all starred items

### 2. **Gridworm Side - Folder Browser & Watcher**
- **Browse any folder** - Navigate to ComfyUI outputs
- **Auto-sync mode** - Watch folder for new files
- **Batch import** - Select multiple files at once

## ComfyUI Setup

### Install the Enhanced Node

1. Copy `starmie_save_node.py` to your ComfyUI starmie folder
2. Update `__init__.py` to import from `starmie_save_node` instead
3. Restart ComfyUI

### Using the Node

The new "Save to Folder (Starmie) ⭐" node has:
- **output_folder** field - Set your custom path:
  - Relative: `selected-output` (creates in ComfyUI dir)
  - Absolute: `C:/Users/emman/StarredImages`
  - Any path you want!

## Gridworm Usage

### Browse & Import Method

1. Click **Starmie** button in toolbar
2. **Browse Folder** tab (default)
3. Click **"Browse for Folder"**
4. Navigate to your ComfyUI output folder
5. Select images and click **Import**

### Auto-Sync Method

Below the browser, there's a **Folder Auto-Sync** section:

1. **Select folder** to watch
2. Set sync interval (5s, 10s, 30s, 1min)
3. Click **Start Watching**
4. New images auto-import as they appear!

**Browser Limitation**: Due to security, you need to re-select the folder periodically. The browser can't continuously access local files without user interaction.

## Workflow Options

### Option 1: Dedicated Star Folder
```
ComfyUI Node: output_folder = "C:/StarredImages"
Gridworm: Browse to "C:/StarredImages"
```

### Option 2: Subfolder Organization
```
ComfyUI Node: output_folder = "output/starred"
Gridworm: Browse to "ComfyUI/output/starred"
```

### Option 3: Project-Based
```
ComfyUI Node: output_folder = "D:/Projects/Current/starred"
Gridworm: Browse to project folder
```

## Features

### What Works:
- ✅ Custom output folders in ComfyUI
- ✅ Browse any local folder in Gridworm
- ✅ Import with metadata preservation
- ✅ Batch selection and import
- ✅ Auto-sync with folder watching
- ✅ No HTTP connection needed

### Browser Limitations:
- ❌ Can't continuously monitor folders (need to re-select)
- ❌ Can't drag-drop between ComfyUI and Gridworm
- ❌ No true "live" connection without user interaction

## Future Enhancements

To overcome browser limitations, consider:

1. **Gridworm Desktop App** - Would allow true folder monitoring
2. **Browser Extension** - Could bridge local file access
3. **Local Server** - Small Python script to serve files

## Current Best Practice

1. Set a consistent output folder in ComfyUI Starmie node
2. Use Gridworm's folder browser to access it
3. For active sessions, use "Start Watching" for semi-automatic imports
4. For batch work, use manual browse and multi-select

This solution works entirely within browser constraints while providing a smooth workflow between ComfyUI and Gridworm!