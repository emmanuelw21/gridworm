"""
Starmie Bridge Diagnostic Tool
Helps identify and fix common issues
"""

import os
import sys
import json
import time
import socket
import requests
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 7:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Need 3.7+")
        return False

def check_dependencies():
    """Check if required packages are installed"""
    print("\n📦 Checking dependencies...")
    required = ['flask', 'flask_cors', 'watchdog']
    missing = []
    
    for package in required:
        try:
            __import__(package)
            print(f"✅ {package} - installed")
        except ImportError:
            print(f"❌ {package} - missing")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Install missing packages: pip install {' '.join(missing)}")
        return False
    return True

def check_port(port=5555):
    """Check if port is available"""
    print(f"\n🔌 Checking port {port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        # Try to bind to the port
        sock.bind(('localhost', port))
        sock.close()
        print(f"✅ Port {port} is available")
        return True
    except OSError:
        print(f"❌ Port {port} is in use")
        # Try to connect to see if it's our bridge
        try:
            response = requests.get(f'http://localhost:{port}/starmie/status', timeout=2)
            if response.ok:
                print("✅ But it's the Starmie Bridge! (already running)")
                return True
        except:
            print("⚠️  And it's NOT the Starmie Bridge")
            print("   Another application is using this port")
        return False

def check_bridge_connection():
    """Check if bridge is accessible"""
    print("\n🌉 Checking bridge connection...")
    try:
        response = requests.get('http://localhost:5555/starmie/status', timeout=5)
        if response.ok:
            data = response.json()
            print("✅ Bridge is running!")
            print(f"   Status: {data.get('status')}")
            print(f"   Watching: {data.get('watching')}")
            print(f"   Files: {data.get('file_count', 0)}")
            return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to bridge")
        print("   Make sure to run: python starmie_bridge.py")
    except Exception as e:
        print(f"❌ Error connecting: {e}")
    return False

def check_watch_folder():
    """Check if default watch folder exists"""
    print("\n📁 Checking watch folder...")
    default_folder = "C:/Users/emman/Documents/ComfyUI/selected-output"
    
    if os.path.exists(default_folder):
        print(f"✅ Default folder exists: {default_folder}")
        # Check permissions
        test_file = os.path.join(default_folder, '.starmie_test')
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print("✅ Folder is writable")
        except:
            print("❌ Cannot write to folder - check permissions")
            return False
    else:
        print(f"❌ Default folder not found: {default_folder}")
        print("   Create it or specify a different folder in Gridworm")
        return False
    return True

def check_gridworm():
    """Check if Gridworm is running"""
    print("\n🎮 Checking Gridworm...")
    try:
        response = requests.get('http://localhost:5174', timeout=2)
        if response.ok:
            print("✅ Gridworm is running on port 5174")
            return True
    except:
        pass
    
    try:
        response = requests.get('http://localhost:5173', timeout=2)
        if response.ok:
            print("✅ Gridworm is running on port 5173")
            return True
    except:
        pass
    
    print("❌ Gridworm not detected")
    print("   Run: npm run dev")
    return False

def test_file_creation():
    """Test creating a file in watch folder"""
    print("\n🧪 Testing file creation...")
    
    if not check_bridge_connection():
        print("⚠️  Skipping - bridge not running")
        return False
    
    try:
        # Get current watch folder from bridge
        response = requests.get('http://localhost:5555/starmie/status')
        data = response.json()
        watch_folder = data.get('watching')
        
        if not watch_folder or not os.path.exists(watch_folder):
            print("❌ Watch folder not set or doesn't exist")
            return False
        
        # Create test file
        test_file = os.path.join(watch_folder, f'diagnostic_test_{int(time.time())}.txt')
        with open(test_file, 'w') as f:
            f.write('Starmie diagnostic test file')
        
        print(f"✅ Created test file: {os.path.basename(test_file)}")
        
        # Check if bridge detected it
        time.sleep(2)
        response = requests.get('http://localhost:5555/starmie/changes')
        data = response.json()
        
        if data.get('changes'):
            print("✅ Bridge detected the new file!")
            # Clean up
            os.remove(test_file)
            return True
        else:
            print("❌ Bridge didn't detect the file")
            os.remove(test_file)
            return False
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

def main():
    print("🌟 Starmie Bridge Diagnostic Tool")
    print("=" * 50)
    
    results = {
        'python': check_python_version(),
        'dependencies': check_dependencies(),
        'port': check_port(),
        'bridge': check_bridge_connection(),
        'folder': check_watch_folder(),
        'gridworm': check_gridworm()
    }
    
    # Only test file creation if bridge is running
    if results['bridge']:
        results['file_test'] = test_file_creation()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    all_good = all(results.values())
    
    if all_good:
        print("✅ Everything looks good!")
        print("\nNext steps:")
        print("1. Make sure bridge is running: python starmie_bridge.py")
        print("2. In Gridworm, click Star button → Browse Folder → Bridge Connection")
        print("3. Click 'Start Auto-Import'")
        print("4. Save files to your watched folder")
    else:
        print("❌ Some issues found:")
        for check, passed in results.items():
            if not passed:
                print(f"   - Fix {check}")
        
        print("\n🔧 Quick fixes:")
        if not results['dependencies']:
            print("   pip install -r requirements.txt")
        if not results['bridge']:
            print("   python starmie_bridge.py")
        if not results['gridworm']:
            print("   npm run dev")
        if not results['folder']:
            print("   Create folder: C:/Users/emman/Documents/ComfyUI/selected-output")

if __name__ == "__main__":
    main()