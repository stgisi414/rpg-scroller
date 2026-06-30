from PIL import Image
import sys

img_path = 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'
try:
    img = Image.open(img_path)
    img = img.convert("RGBA")
except Exception as e:
    print(f"Error opening image: {e}")
    sys.exit(1)

width, height = img.size
frame_w = 91
frame_h = 64
cols = width // frame_w

print(f"Image width: {width}, height: {height}, cols: {cols}")

# Row 1 is walk
y_start = 1 * frame_h
y_end = y_start + frame_h

for c in range(cols):
    x_start = c * frame_w
    x_end = x_start + frame_w
    
    # Check if there are any non-transparent pixels in this frame
    has_pixels = False
    for x in range(x_start, x_end):
        for y in range(y_start, y_end):
            pixel = img.getpixel((x, y))
            if pixel[3] > 0:  # Alpha > 0
                has_pixels = True
                break
        if has_pixels:
            break
            
    print(f"Row 1 Frame {c}: {'Has content' if has_pixels else 'Empty'}")
