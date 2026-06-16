from PIL import Image
import os

files = [
    ('slime', 'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png', 32, 32),
    ('goblin', 'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png', 72, 64),
    ('bat', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Bat sheet.png', 64, 64),
    ('mushroom', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Mushroom sheet.png', 64, 64),
    ('orc', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Orc sheet.png', 64, 64)
]

for name, rel_path, fw, fh in files:
    full_path = os.path.join('C:\\Code2\\rpg-scroller', rel_path)
    if not os.path.exists(full_path):
        continue
    img = Image.open(full_path).convert('RGBA')
    width, height = img.size
    cols = width // fw
    rows = height // fh
    
    print(f"--- {name} ---")
    for r in range(rows):
        filled_frames = 0
        for c in range(cols):
            box = (c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)
            frame = img.crop(box)
            # Check if there are any non-transparent pixels
            extrema = frame.getextrema()
            # extrema for RGBA is ((min_r, max_r), (min_g, max_g), (min_b, max_b), (min_a, max_a))
            if extrema[3][1] > 0:
                filled_frames += 1
        print(f"Row {r}: {filled_frames} frames")
