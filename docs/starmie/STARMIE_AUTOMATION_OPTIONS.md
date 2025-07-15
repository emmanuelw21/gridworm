# Starmie Automation Options

You're right - manual folder browsing defeats the purpose. Here are ways to achieve true automation:

## 1. Local Bridge Server (Easiest)

Create a tiny Python/Node.js server that runs locally and bridges ComfyUI ↔ Gridworm:

```python
# starmie_bridge.py - Run this locally
from flask import Flask, jsonify, send_file
from flask_cors import CORS
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import json

app = Flask(__name__)
CORS(app)  # Allow browser access

class StarmieWatcher(FileSystemEventHandler):
    def __init__(self):
        self.new_files = []
    
    def on_created(self, event):
        if event.src_path.endswith(('.png', '.jpg', '.jpeg')):
            self.new_files.append(event.src_path)

watcher = StarmieWatcher()
observer = Observer()
observer.schedule(watcher, path='C:/Users/emman/Documents/ComfyUI/selected-output', recursive=False)
observer.start()

@app.route('/starmie/changes')
def get_changes():
    files = watcher.new_files.copy()
    watcher.new_files.clear()
    return jsonify({'new_files': files})

@app.route('/starmie/file/<path:filename>')
def get_file(filename):
    return send_file(f'C:/Users/emman/Documents/ComfyUI/selected-output/{filename}')

if __name__ == '__main__':
    app.run(port=5555)
```

Then in Gridworm, poll `http://localhost:5555/starmie/changes` every few seconds.

## 2. Browser Extension

Create a simple browser extension that has file system access:

```javascript
// manifest.json
{
  "manifest_version": 3,
  "name": "Starmie Bridge",
  "permissions": ["nativeMessaging", "storage"],
  "host_permissions": ["http://localhost:*/*"],
  "background": {
    "service_worker": "background.js"
  }
}

// background.js
// Communicates with a native app that watches folders
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getNewFiles") {
    // Native messaging to local app
    chrome.runtime.sendNativeMessage('com.starmie.watcher',
      {command: 'getChanges'},
      response => sendResponse(response)
    );
  }
});
```

## 3. Progressive Web App (PWA) with File System Access API

Modern browsers support the File System Access API for PWAs:

```javascript
// In Gridworm as a PWA
async function watchFolder() {
  // Request directory access
  const dirHandle = await window.showDirectoryPicker();
  
  // Poll for changes
  setInterval(async () => {
    const newFiles = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (file.lastModified > lastCheck) {
          newFiles.push(file);
        }
      }
    }
    processNewFiles(newFiles);
  }, 5000);
}
```

## 4. WebDAV Server

Run a WebDAV server for the output folder:

```bash
# Install
npm install -g webdav-cli

# Run
webdav-cli --host 0.0.0.0 --port 1900 --path C:/Users/emman/Documents/ComfyUI/selected-output
```

Then Gridworm can access files via HTTP without CORS issues.

## 5. Existing Tools Integration

### Option A: Dropbox/Google Drive/OneDrive
- Save ComfyUI outputs to a synced folder
- Use their APIs in Gridworm to detect changes

### Option B: Syncthing
- Open source, runs locally
- Has REST API for monitoring
- No cloud needed

### Option C: File Server
- Use existing tools like `http-server` or `live-server`
- They auto-refresh on file changes

## 6. ComfyUI Plugin Approach

Make ComfyUI push to Gridworm instead of Gridworm pulling:

```python
# In ComfyUI custom node
import requests

class StarmieAutoSend:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "gridworm_url": ("STRING", {"default": "http://localhost:5173/api/import"}),
            }
        }
    
    def send_to_gridworm(self, images, gridworm_url):
        # Convert and send via HTTP POST
        for img in images:
            requests.post(gridworm_url, files={'image': img_to_bytes(img)})
        return {}
```

## Recommended: Local Bridge Server

The **local bridge server** (#1) is the best balance of:
- ✅ Easy to implement (50 lines of Python)
- ✅ True automation (file watching)
- ✅ No browser security issues
- ✅ Works with your current setup
- ✅ Can be packaged as a simple .exe

**Quick Start:**
1. Install: `pip install flask flask-cors watchdog`
2. Run the bridge: `python starmie_bridge.py`
3. Update Gridworm to poll `http://localhost:5555/starmie/changes`
4. True automatic sync!

## The Real Problem

Browser security exists for good reasons. The real solutions are:
1. **Run a local service** (bridge server)
2. **Use a desktop app framework** (Electron, Tauri)
3. **Use cloud storage** (with APIs)
4. **Reverse the flow** (ComfyUI pushes to Gridworm)

Without one of these, you're stuck with manual intervention due to browser sandboxing.