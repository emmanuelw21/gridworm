"""
Starmie Bridge Server
Monitors ComfyUI output folders and serves files to Gridworm
"""

import os
import json
import time
import hashlib
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import mimetypes

app = Flask(__name__)
CORS(app)  # Enable CORS for browser access

class StarmieWatcher(FileSystemEventHandler):
    def __init__(self, watch_path):
        self.watch_path = Path(watch_path)
        self.files = {}
        self.new_files = []
        self.manifest_path = self.watch_path / '.starmie-manifest.json'
        self.scan_existing_files()
    
    def scan_existing_files(self):
        """Initial scan of existing files"""
        if self.watch_path.exists():
            for file_path in self.watch_path.glob('*'):
                if file_path.is_file() and self.is_image(file_path):
                    file_id = self.get_file_id(file_path)
                    self.files[file_id] = {
                        'path': str(file_path),
                        'name': file_path.name,
                        'size': file_path.stat().st_size,
                        'modified': file_path.stat().st_mtime,
                        'created': file_path.stat().st_ctime,
                        'id': file_id
                    }
    
    def is_image(self, path):
        """Check if file is an image"""
        return path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
    
    def get_file_id(self, path):
        """Generate unique ID for file"""
        return hashlib.md5(f"{path.name}_{path.stat().st_mtime}".encode()).hexdigest()
    
    def on_created(self, event):
        if not event.is_directory:
            path = Path(event.src_path)
            if self.is_image(path):
                # Wait a bit for file to be fully written
                time.sleep(0.1)
                
                file_id = self.get_file_id(path)
                file_info = {
                    'path': str(path),
                    'name': path.name,
                    'size': path.stat().st_size,
                    'modified': path.stat().st_mtime,
                    'created': path.stat().st_ctime,
                    'id': file_id,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.files[file_id] = file_info
                self.new_files.append(file_info)
                
                print(f"[Starmie] New file detected: {path.name}")
    
    def get_changes(self, since_timestamp=None):
        """Get files added since timestamp"""
        if since_timestamp:
            return [f for f in self.files.values() 
                    if f.get('created', 0) > since_timestamp]
        else:
            # Return recent files
            files = self.new_files.copy()
            self.new_files.clear()
            return files
    
    def get_all_files(self):
        """Get all tracked files"""
        return list(self.files.values())

# Global watcher instance
watcher = None
observer = None

@app.route('/starmie/status')
def status():
    """Check if bridge is running"""
    return jsonify({
        'status': 'running',
        'watching': str(watcher.watch_path) if watcher else None,
        'file_count': len(watcher.files) if watcher else 0
    })

@app.route('/starmie/watch', methods=['POST'])
def set_watch_folder():
    """Set folder to watch"""
    global watcher, observer
    
    data = request.json
    folder_path = data.get('path', 'C:/Users/emman/Documents/ComfyUI/selected-output')
    
    # Stop existing observer
    if observer and observer.is_alive():
        observer.stop()
        observer.join()
    
    # Create new watcher
    watcher = StarmieWatcher(folder_path)
    observer = Observer()
    observer.schedule(watcher, str(folder_path), recursive=False)
    observer.start()
    
    return jsonify({
        'success': True,
        'watching': str(folder_path),
        'existing_files': len(watcher.files)
    })

@app.route('/starmie/files')
def get_files():
    """Get all files in watched folder"""
    if not watcher:
        return jsonify({'error': 'No folder being watched'}), 400
    
    return jsonify({
        'folder': str(watcher.watch_path),
        'files': watcher.get_all_files()
    })

@app.route('/starmie/changes')
def get_changes():
    """Get new files since last check"""
    if not watcher:
        return jsonify({'error': 'No folder being watched'}), 400
    
    since = request.args.get('since', type=float)
    changes = watcher.get_changes(since)
    
    return jsonify({
        'folder': str(watcher.watch_path),
        'changes': changes,
        'timestamp': time.time()
    })

@app.route('/starmie/file/<file_id>')
def get_file(file_id):
    """Serve a specific file"""
    if not watcher:
        return jsonify({'error': 'No folder being watched'}), 400
    
    file_info = watcher.files.get(file_id)
    if not file_info:
        return jsonify({'error': 'File not found'}), 404
    
    file_path = Path(file_info['path'])
    if not file_path.exists():
        return jsonify({'error': 'File no longer exists'}), 404
    
    mimetype = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
    return send_file(str(file_path), mimetype=mimetype)

@app.route('/starmie/manifest')
def get_manifest():
    """Get or create manifest file"""
    if not watcher:
        return jsonify({'error': 'No folder being watched'}), 400
    
    if watcher.manifest_path.exists():
        with open(watcher.manifest_path, 'r') as f:
            return jsonify(json.load(f))
    else:
        manifest = {
            'version': '1.2',
            'folder': str(watcher.watch_path),
            'items': [],
            'metadata': {
                'created': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            }
        }
        return jsonify(manifest)

def run_server():
    # Default watch folder
    default_folder = 'C:/Users/emman/Documents/ComfyUI/selected-output'
    
    print(f"🌟 Starmie Bridge Server")
    print(f"📁 Default folder: {default_folder}")
    print(f"🌐 Running on: http://localhost:5555")
    print(f"")
    print(f"Endpoints:")
    print(f"  GET  /starmie/status     - Check server status")
    print(f"  POST /starmie/watch      - Set folder to watch")
    print(f"  GET  /starmie/files      - List all files")
    print(f"  GET  /starmie/changes    - Get new files")
    print(f"  GET  /starmie/file/<id>  - Download specific file")
    print(f"  GET  /starmie/manifest   - Get manifest")
    
    global watcher, observer
    
    # Start watching default folder
    watcher = StarmieWatcher(default_folder)
    observer = Observer()
    observer.schedule(watcher, default_folder, recursive=False)
    
    # Try to start observer with error handling
    try:
        observer.start()
        print(f"\n👀 Watching for changes...")
    except TypeError as e:
        # Python 3.13 compatibility issue - run without file watching
        print(f"\n⚠️  File watching not available (Python 3.13 issue)")
        print(f"   Bridge will still work, but won't auto-detect new files")
        print(f"   You can still use manual refresh in Gridworm")
        observer = None
    
    try:
        # Run Flask app
        app.run(host='0.0.0.0', port=5555, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    finally:
        if observer and observer.is_alive():
            observer.stop()
            observer.join()

if __name__ == '__main__':
    run_server()