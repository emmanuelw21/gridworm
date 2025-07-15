"""
Manual installation script for Starmie
Run this from your ComfyUI root directory:
python custom_nodes/comfyui-starmie/install_manually.py
"""

import os
import sys

print("=" * 60)
print("Starmie Manual Installation")
print("=" * 60)

# Check if we're in ComfyUI directory
if not os.path.exists("main.py") and not os.path.exists("server.py"):
    print("❌ Error: Run this from your ComfyUI root directory!")
    print("   Current directory:", os.getcwd())
    sys.exit(1)

print("✅ ComfyUI directory detected")

# Find the server file
server_file = None
if os.path.exists("server.py"):
    server_file = "server.py"
elif os.path.exists("main.py"):
    server_file = "main.py"
else:
    print("❌ Could not find server.py or main.py")
    sys.exit(1)

print(f"📄 Found server file: {server_file}")

# Read the server file
with open(server_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if Starmie is already installed
if "starmie" in content.lower():
    print("⚠️  Starmie appears to already be installed")
    response = input("Continue anyway? (y/n): ")
    if response.lower() != 'y':
        sys.exit(0)

# Find where to insert our code
insert_marker = None
if "server.start" in content:
    insert_marker = "server.start"
elif "app.run" in content:
    insert_marker = "app.run"
elif "web.run_app" in content:
    insert_marker = "web.run_app"

if not insert_marker:
    print("❌ Could not find server start point")
    sys.exit(1)

# Code to insert
starmie_code = '''
# === STARMIE INTEGRATION START ===
try:
    print("[Starmie] Adding routes to ComfyUI...")
    import os
    import json
    import shutil
    from datetime import datetime
    from pathlib import Path
    from aiohttp import web
    
    selected_dir = Path("./selected-output")
    selected_dir.mkdir(exist_ok=True)
    manifest_path = selected_dir / ".starmie-manifest.json"
    
    if not manifest_path.exists():
        manifest = {
            "version": "1.0",
            "items": [],
            "metadata": {
                "created": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
        }
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    @server.app.get('/starmie/manifest')
    async def starmie_get_manifest(request):
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return web.json_response(manifest)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    @server.app.get('/starmie/test')
    async def starmie_test(request):
        return web.json_response({"status": "ok", "message": "Starmie is working!"})
    
    print("[Starmie] ✨ Routes added successfully!")
except Exception as e:
    print(f"[Starmie] Failed to add routes: {e}")
# === STARMIE INTEGRATION END ===

'''

# Insert the code before server start
lines = content.split('\n')
new_lines = []
inserted = False

for i, line in enumerate(lines):
    if insert_marker in line and not inserted:
        # Insert our code before this line
        new_lines.extend(starmie_code.strip().split('\n'))
        new_lines.append('')  # Empty line
        inserted = True
    new_lines.append(line)

if not inserted:
    print("❌ Could not find insertion point")
    sys.exit(1)

# Backup original file
backup_file = f"{server_file}.backup"
if not os.path.exists(backup_file):
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"📋 Created backup: {backup_file}")

# Write modified file
with open(server_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("✅ Successfully installed Starmie!")
print("")
print("Next steps:")
print("1. Restart ComfyUI")
print("2. Look for '[Starmie]' messages in console")
print("3. Test: http://127.0.0.1:8000/starmie/test")
print("")
print("To uninstall: restore from backup file")