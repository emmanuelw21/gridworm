"""
Check if Starmie is properly installed in ComfyUI
Run this after restarting ComfyUI
"""

import requests
import time

def check_starmie_installation():
    print("🔍 Checking Starmie installation in ComfyUI...")
    print("-" * 50)
    
    # Wait a moment for server to be ready
    time.sleep(1)
    
    # Test HTTP endpoint
    try:
        response = requests.get("http://127.0.0.1:8000/starmie/manifest", 
                               headers={"Origin": "http://localhost:5174"},
                               timeout=5)
        
        if response.status_code == 200:
            print("✅ HTTP endpoint working!")
            print("✅ CORS headers present!")
            manifest = response.json()
            print(f"📋 Manifest version: {manifest.get('version', 'unknown')}")
            print(f"📁 Starred items: {len(manifest.get('items', []))}")
        elif response.status_code == 404:
            print("⚠️  HTTP endpoint exists but returned 404")
            print("   This might mean the endpoint is there but no manifest file yet")
        else:
            print(f"❌ HTTP endpoint returned status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to ComfyUI on port 8000")
        print("   Make sure ComfyUI is running")
    except Exception as e:
        print(f"❌ Error checking HTTP endpoint: {e}")
    
    print("-" * 50)
    
    # Test WebSocket endpoint
    try:
        import websocket
        ws = websocket.WebSocket()
        ws.connect("ws://127.0.0.1:8000/starmie", 
                   origin="http://localhost:5174",
                   timeout=5)
        print("✅ WebSocket endpoint working!")
        ws.close()
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        print("   This is the error preventing connection")
    
    print("-" * 50)
    print("\n📌 Next steps:")
    print("1. If both endpoints fail, Starmie is not loaded")
    print("2. Check ComfyUI console for any error messages")
    print("3. Make sure you restarted ComfyUI after installing")

if __name__ == "__main__":
    check_starmie_installation()