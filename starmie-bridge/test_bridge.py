"""
Quick test script for Starmie Bridge
Run this to create test images in your watched folder
"""

import os
import time
import random
from PIL import Image, ImageDraw, ImageFont

def create_test_image(index, output_dir):
    """Create a test image with number and timestamp"""
    # Create image
    width, height = 512, 512
    img = Image.new('RGB', (width, height), color=(
        random.randint(100, 255),
        random.randint(100, 255),
        random.randint(100, 255)
    ))
    
    # Draw text
    draw = ImageDraw.Draw(img)
    text = f"Test #{index}"
    timestamp = time.strftime("%H:%M:%S")
    
    # Try to use a nice font, fall back to default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 60)
        small_font = ImageFont.truetype("arial.ttf", 30)
    except:
        font = ImageFont.load_default()
        small_font = font
    
    # Center the text
    draw.text((width//2 - 100, height//2 - 50), text, fill='white', font=font)
    draw.text((width//2 - 80, height//2 + 20), timestamp, fill='white', font=small_font)
    
    # Save
    filename = f"test_image_{index}_{int(time.time())}.png"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath)
    
    return filename

def main():
    # Default ComfyUI output directory
    output_dir = "C:/Users/emman/Documents/ComfyUI/selected-output"
    
    print("🌟 Starmie Bridge Test Script")
    print(f"📁 Output directory: {output_dir}")
    
    # Check if directory exists
    if not os.path.exists(output_dir):
        create = input(f"\nDirectory doesn't exist. Create it? (y/n): ")
        if create.lower() == 'y':
            os.makedirs(output_dir)
            print("✅ Directory created!")
        else:
            custom = input("Enter custom path (or press Enter to exit): ")
            if custom:
                output_dir = custom
                if not os.path.exists(output_dir):
                    os.makedirs(output_dir)
            else:
                return
    
    print("\n🚀 Starting test...")
    print("Press Ctrl+C to stop\n")
    
    # Test options
    print("Choose test mode:")
    print("1. Single image")
    print("2. Burst (5 images quickly)")
    print("3. Continuous (1 image every 5 seconds)")
    
    choice = input("\nEnter choice (1-3): ")
    
    try:
        if choice == '1':
            # Single image
            filename = create_test_image(1, output_dir)
            print(f"✅ Created: {filename}")
            print("\nCheck Gridworm - image should appear within 3 seconds!")
            
        elif choice == '2':
            # Burst mode
            print("Creating 5 images...")
            for i in range(5):
                filename = create_test_image(i+1, output_dir)
                print(f"✅ Created: {filename}")
                time.sleep(0.5)  # Small delay between images
            print("\nAll done! Check Gridworm for 5 new images.")
            
        elif choice == '3':
            # Continuous mode
            print("Creating images every 5 seconds... (Ctrl+C to stop)")
            count = 1
            while True:
                filename = create_test_image(count, output_dir)
                print(f"✅ [{time.strftime('%H:%M:%S')}] Created: {filename}")
                count += 1
                time.sleep(5)
                
    except KeyboardInterrupt:
        print("\n\n👋 Test stopped!")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()