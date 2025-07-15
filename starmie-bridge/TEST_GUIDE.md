# Starmie Bridge - Testing Guide

## Complete Setup & Testing Procedure

### Step 1: Start the Bridge Server

1. **Open a terminal/command prompt**
2. **Navigate to the bridge folder:**
   ```bash
   cd "C:\Users\emman\Desktop\Gridworm\Gridworm1.3-proper placeholder handling\starmie-bridge"
   ```

3. **Run the bridge:**
   ```bash
   python starmie_bridge.py
   ```
   
   You should see:
   ```
   🌟 Starmie Bridge Server
   📁 Default folder: C:/Users/emman/Documents/ComfyUI/selected-output
   🌐 Running on: http://localhost:5555
   👀 Watching for changes...
   ```

### Step 2: Verify Bridge is Running

1. **Open your browser**
2. **Go to:** http://localhost:5555/starmie/status
3. **You should see JSON like:**
   ```json
   {
     "status": "running",
     "watching": "C:/Users/emman/Documents/ComfyUI/selected-output",
     "file_count": 0
   }
   ```

### Step 3: Set Up in Gridworm

1. **Open Gridworm** (npm run dev)
2. **Click the Star (⭐) button** in the top toolbar
3. **Click "Browse Folder" tab**
4. **Scroll down to "Bridge Connection" section**
5. **You should see:** "Bridge Connected" in green

### Step 4: Configure Watch Folder

1. **In the Bridge Connection section:**
   - Enter your ComfyUI output folder path
   - Default: `C:/Users/emman/Documents/ComfyUI/selected-output`
   - Click "Set" button

2. **Verify it's set:**
   - Look for "Currently watching: [your folder]" message

### Step 5: Start Auto-Import

1. **Click "Start Auto-Import" button**
   - Button should turn red and say "Stop Auto-Import"
   - Status should show "Monitoring"

### Step 6: Test with ComfyUI

1. **In ComfyUI:**
   - Run any workflow that generates an image
   - Make sure it saves to your selected-output folder

2. **In Gridworm:**
   - Within 3 seconds, you should see:
     - A notification: "Auto-imported 1 new files"
     - The image appears in your media panel
     - Import count increases

### Step 7: Verify Features

#### A. Check Auto-Import is Working:
1. Save multiple images in ComfyUI
2. Each should auto-import to Gridworm
3. Check they have "⭐ Auto-imported" tag

#### B. Test Different File Types:
1. Save a PNG
2. Save a JPG
3. Save a video (if your workflow supports it)
4. All should import correctly

#### C. Test Stop/Start:
1. Click "Stop Auto-Import"
2. Save new image in ComfyUI
3. It should NOT import
4. Click "Start Auto-Import"
5. New saves should import again

### Troubleshooting

#### "Bridge Not Found" Error:
```bash
# Make sure bridge is running:
python starmie_bridge.py

# Check Windows Firewall isn't blocking port 5555
# Try: http://localhost:5555/starmie/status in browser
```

#### Files Not Importing:
```bash
# 1. Check bridge console for errors
# 2. Verify folder path is correct
# 3. Make sure files are being saved to watched folder
# 4. Try manually placing a test.jpg in the folder
```

#### Python Errors:
```bash
# Install dependencies:
pip install flask flask-cors watchdog

# Check Python version (need 3.7+):
python --version
```

### Advanced Testing

#### Test Large Batches:
1. Copy 10+ images to the watched folder at once
2. All should import in batches

#### Test File Updates:
1. Save image1.png
2. Wait for import
3. Overwrite image1.png with new content
4. Should import as new file

#### Test Bridge Restart:
1. Stop the bridge (Ctrl+C in terminal)
2. Gridworm should show "Bridge Not Found"
3. Restart bridge
4. Should reconnect automatically

### Performance Check

Monitor in bridge console:
- File detection time (should be instant)
- Serving time per file
- Any errors or warnings

### Success Indicators

✅ Bridge shows "running" status
✅ Gridworm shows "Bridge Connected"
✅ Files appear in Gridworm within 3 seconds
✅ All files get "⭐ Auto-imported" tag
✅ No manual interaction needed
✅ Works with all media types

## Quick Test Script

Create `test_image.py` in the watched folder:
```python
from PIL import Image
import time

# Create test image
img = Image.new('RGB', (100, 100), color='red')
img.save(f'test_{int(time.time())}.png')
print("Test image saved! Check Gridworm...")
```

Run it to quickly test the bridge!