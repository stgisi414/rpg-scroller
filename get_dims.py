import struct
import os

def get_image_size(file_path):
    with open(file_path, 'rb') as f:
        head = f.read(24)
        if len(head) != 24:
            return None
        if head.startswith(b'\x89PNG\r\n\x1a\n'):
            check = struct.unpack('>i', head[4:8])[0]
            if check != 0x0d0a1a0a:
                return None
            width, height = struct.unpack('>ii', head[16:24])
            return width, height
        return None

files = [
    'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png',
    'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png',
    'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Bat sheet.png',
    'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Mushroom sheet.png',
    'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Orc sheet.png'
]

for p in files:
    full_path = os.path.join('C:\\Code2\\rpg-scroller', p)
    size = get_image_size(full_path)
    if size:
        print(f"{p}: {size[0]}x{size[1]}")
    else:
        print(f"{p}: Error reading size")
