from PIL import Image
import sys
import os

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
rows = height // frame_h

print(f"Image has {cols} cols, {rows} rows.")

os.makedirs('scratch/heavy_rows', exist_ok=True)
for r in range(rows):
    y_start = r * frame_h
    # save just the first frame of each row
    crop = img.crop((0, y_start, frame_w, y_start + frame_h))
    crop.save(f"scratch/heavy_rows/row_{r}.png")
    
print("Saved row previews.")
