"""
Starmie Bridge Server - Polling Version
Compatible with Python 3.13 - uses polling instead of file system events
"""

import os
import json
import time
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for browser access

class StarmiePoller:
    def __init__(self, watch_path):
        self.watch_path = Path(watch_path)
        self.files = {}
        self.new_files = []
        self.manifest_path = self.watch_path / '.starmie-manifest.json'
        self.known_files = set()  # Track files we've already seen
        self.polling_interval = 1.0  # Check every second
        self.running = False
        self.poll_thread = None
        self.scan_existing_files()
    
    def scan_existing_files(self):
        """Initial scan of existing files - mark them as already known"""
        if self.watch_path.exists():
            for file_path in self.watch_path.glob('*'):
                if file_path.is_file() and self.is_media_file(file_path):
                    # Just mark existing files as known, don't add to new_files
                    self.known_files.add(str(file_path))
    
    def is_media_file(self, path):
        """Check if file is a supported media file"""
        # All Gridworm-supported file types
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']
        video_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
        audio_extensions = ['.mp3', '.wav', '.ogg', '.flac']
        model_extensions = ['.gltf', '.glb', '.obj', '.fbx', '.stl', '.ply', '.3ds', '.dae']
        document_extensions = ['.pdf', '.txt', '.md', '.rtf', '.doc', '.docx']
        
        all_extensions = image_extensions + video_extensions + audio_extensions + model_extensions + document_extensions
        return path.suffix.lower() in all_extensions
    
    def get_file_id(self, path):
        """Generate unique ID for file"""
        return hashlib.md5(f"{path.name}_{path.stat().st_mtime}".encode()).hexdigest()
    
    def start_polling(self):
        """Start polling thread"""
        self.running = True
        self.poll_thread = threading.Thread(target=self._poll_loop)
        self.poll_thread.daemon = True
        self.poll_thread.start()
    
    def stop_polling(self):
        """Stop polling"""
        self.running = False
        if self.poll_thread:
            self.poll_thread.join()
    
    def _poll_loop(self):
        """Main polling loop"""
        while self.running:
            try:
                self.check_for_changes()
            except Exception as e:
                print(f"[Starmie] Polling error: {e}")
            time.sleep(self.polling_interval)
    
    def check_for_changes(self):
        """Check for new files in the directory"""
        if not self.watch_path.exists():
            return
        
        # Scan directory for any files we haven't seen before
        for file_path in self.watch_path.glob('*'):
            if file_path.is_file():
                file_path_str = str(file_path)
                
                # Debug: show what we're checking
                if not self.is_media_file(file_path) and file_path.suffix.lower() in ['.pdf', '.txt', '.doc']:
                    print(f"[Debug] Skipping non-media file: {file_path.name}")
                
                if self.is_media_file(file_path) and file_path_str not in self.known_files:
                    # Wait a bit to ensure file is fully written
                    time.sleep(0.1)
                    
                    # Add to known files
                    self.known_files.add(file_path_str)
                    
                    # Create file info
                    file_id = self.get_file_id(file_path)
                    file_info = {
                        'path': file_path_str,
                        'name': file_path.name,
                        'size': file_path.stat().st_size,
                        'modified': file_path.stat().st_mtime,
                        'created': file_path.stat().st_ctime,
                        'id': file_id,
                        'timestamp': datetime.now().isoformat(),
                        'type': mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
                    }
                    
                    self.files[file_id] = file_info
                    self.new_files.append(file_info)
                    
                    print(f"[Starmie] New file detected: {file_path.name} (type: {file_info['type']})")
    
    def get_changes(self, since_timestamp=None):
        """Get new files that haven't been sent yet"""
        # Always return and clear the new_files list
        files = self.new_files.copy()
        self.new_files.clear()
        
        if files:
            print(f"[Starmie] Returning {len(files)} new files")
        
        return files
    
    def get_all_files(self):
        """Get all tracked files"""
        return list(self.files.values())

# Global poller instance
poller = None

@app.route('/starmie/status')
def status():
    """Check if bridge is running"""
    return jsonify({
        'status': 'running',
        'mode': 'polling',
        'watching': str(poller.watch_path) if poller else None,
        'file_count': len(poller.files) if poller else 0
    })

@app.route('/starmie/watch', methods=['POST'])
def set_watch_folder():
    """Set folder to watch"""
    global poller
    
    data = request.json
    folder_path = data.get('path', 'C:/Users/emman/Documents/ComfyUI/selected-output')
    
    # Stop existing poller
    if poller:
        poller.stop_polling()
    
    # Create new poller
    poller = StarmiePoller(folder_path)
    # Don't count existing files as new when changing folders
    poller.scan_existing_files()
    poller.start_polling()
    
    return jsonify({
        'success': True,
        'watching': str(folder_path),
        'existing_files': len(poller.files)
    })

@app.route('/starmie/files')
def get_files():
    """Get all files in watched folder"""
    if not poller:
        return jsonify({'error': 'No folder being watched'}), 400
    
    return jsonify({
        'folder': str(poller.watch_path),
        'files': poller.get_all_files()
    })

@app.route('/starmie/changes')
def get_changes():
    """Get new files since last check"""
    if not poller:
        return jsonify({'error': 'No folder being watched'}), 400
    
    since = request.args.get('since', type=float)
    changes = poller.get_changes(since)
    
    return jsonify({
        'folder': str(poller.watch_path),
        'changes': changes,
        'timestamp': int(time.time() * 1000)  # Return milliseconds for JS compatibility
    })

@app.route('/starmie/file/<file_id>')
def get_file(file_id):
    """Serve a specific file"""
    if not poller:
        return jsonify({'error': 'No folder being watched'}), 400
    
    file_info = poller.files.get(file_id)
    if not file_info:
        return jsonify({'error': 'File not found'}), 404
    
    file_path = Path(file_info['path'])
    if not file_path.exists():
        return jsonify({'error': 'File no longer exists'}), 404
    
    mimetype = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
    return send_file(str(file_path), mimetype=mimetype)

@app.route('/starmie/import-all')
def import_all():
    """Force import all files in watched folder"""
    if not poller:
        return jsonify({'error': 'No folder being watched'}), 400
    
    # Get all files
    all_files = poller.get_all_files()
    
    return jsonify({
        'folder': str(poller.watch_path),
        'files': all_files,
        'count': len(all_files),
        'message': 'All files ready for import'
    })

@app.route('/starmie/manifest')
def get_manifest():
    """Get or create manifest file"""
    if not poller:
        return jsonify({'error': 'No folder being watched'}), 400
    
    if poller.manifest_path.exists():
        with open(poller.manifest_path, 'r') as f:
            return jsonify(json.load(f))
    else:
        manifest = {
            'version': '1.2',
            'folder': str(poller.watch_path),
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
    
    # Create folder if it doesn't exist
    Path(default_folder).mkdir(parents=True, exist_ok=True)
    
    print(f"🌟 Starmie Bridge Server (Polling Mode)")
    print(f"📁 Default folder: {default_folder}")
    print(f"🌐 Running on: http://localhost:5555")
    print(f"✅ Compatible with Python 3.13+")
    print(f"")
    print(f"Endpoints:")
    print(f"  GET  /starmie/status     - Check server status")
    print(f"  POST /starmie/watch      - Set folder to watch")
    print(f"  GET  /starmie/files      - List all files")
    print(f"  GET  /starmie/changes    - Get new files")
    print(f"  GET  /starmie/file/<id>  - Download specific file")
    print(f"  GET  /starmie/manifest   - Get manifest")
    
    global poller
    
    # Start watching default folder
    poller = StarmiePoller(default_folder)
    poller.start_polling()
    print(f"\n👀 Polling for changes every {poller.polling_interval}s...")
    
    try:
        # Run Flask app
        app.run(host='0.0.0.0', port=5555, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    finally:
        if poller:
            poller.stop_polling()

if __name__ == '__main__':
    run_server()