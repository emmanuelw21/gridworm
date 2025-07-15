# ComfyUI Starmie Node

A ComfyUI custom node that allows you to star/favorite outputs and sync them with Gridworm.

## Installation

1. Navigate to your ComfyUI custom_nodes folder:
```bash
cd ComfyUI/custom_nodes
```

2. Copy the `comfyui-starmie` folder into custom_nodes

3. Restart ComfyUI

## Features

- ⭐ Star button in ComfyUI output interface
- Automatic file movement to `selected-output` folder
- WebSocket communication with Gridworm
- Manifest file tracking
- Support for all media types

## Usage

1. When ComfyUI generates an output, look for the ⭐ button in the preview
2. Click to star/favorite the output
3. The file will be moved to `./selected-output/` folder
4. Gridworm will automatically detect and import the starred items

## Configuration

Edit the `config.json` file to customize:
- Output directory path
- WebSocket port
- File naming conventions