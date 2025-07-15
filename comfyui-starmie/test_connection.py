"""
Test script to verify Starmie is properly installed in ComfyUI
Run this from within ComfyUI directory after installation
"""

import requests
import json

def test_starmie_connection():
    # Try multiple ports
    ports_to_try = [8188, 8000]
    working_port = None
    
    print("Testing Starmie connection...")
    print(f"Trying ports: {ports_to_try}")
    
    for port in ports_to_try:
        print(f"\n🔍 Checking port {port}...")
        base_url = f"http://127.0.0.1:{port}"
        
        try:
            response = requests.get(f"{base_url}/starmie/manifest", timeout=2)
            if response.status_code == 200:
                print(f"✅ Port {port}: Manifest endpoint is working!")
                manifest = response.json()
                print(f"   Found {len(manifest.get('items', []))} starred items")
                working_port = port
                break
            elif response.status_code == 404:
                print(f"✅ Port {port}: Endpoint exists (no manifest yet)")
                working_port = port
                break
            else:
                print(f"⚠️  Port {port}: Unexpected status: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"❌ Port {port}: Cannot connect")
        except requests.exceptions.Timeout:
            print(f"❌ Port {port}: Connection timeout")
        except Exception as e:
            print(f"❌ Port {port}: Error: {e}")
    
    if working_port:
        print(f"\n✅ ComfyUI Starmie is working on port {working_port}!")
        print(f"📌 WebSocket endpoint: ws://127.0.0.1:{working_port}/starmie")
        print(f"📌 HTTP endpoints:")
        print(f"   - Manifest: http://127.0.0.1:{working_port}/starmie/manifest")
        print(f"   - Star: http://127.0.0.1:{working_port}/starmie/star")
        print(f"   - Files: http://127.0.0.1:{working_port}/starmie/file/{{item_id}}")
        return True
    else:
        print("\n❌ Could not find Starmie on any port")
        print("Make sure:")
        print("1. ComfyUI is running")
        print("2. Starmie is installed in ComfyUI/custom_nodes/")
        print("3. ComfyUI was restarted after installation")
        return False

if __name__ == "__main__":
    test_starmie_connection()