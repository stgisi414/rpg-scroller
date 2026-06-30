import glob
from PIL import Image
import os

print("Checking for bleeds in idle frames 4,5,6,7...")
for filepath in glob.glob('src/assets/**/*.png', recursive=True):
    if 'npc_female' in filepath or 'npc_male' in filepath or 'enemy' in filepath or 'boss' in filepath: continue
    
    # Check if the image size is 800x448
    try:
        img = Image.open(filepath).convert('RGBA')
        if img.size != (800, 448): continue
    except:
        continue

    px = img.load()
    
    # Check row 0, frames 4, 5, 6, 7
    bleed_found = False
    for c in range(4, 8):
        m = -1
        for yy in range(63, -1, -1):
            for xx in range(100):
                if px[c*100+xx, yy][3] > 16:
                    m = yy
                    break
            if m != -1: break
        if m != -1:
            print(f"Bleed in {os.path.basename(filepath)} at frame {c}, footY: {m}")
            bleed_found = True
            break
