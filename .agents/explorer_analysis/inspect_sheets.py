import os
from PIL import Image

# List of assets to inspect with their expected/actual configurations
assets = [
    # Format: (key, relative_path, frame_width, frame_height)
    ('knight', 'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png', 80, 64),
    ('wizard', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png', 64, 64),
    ('wizard_rival', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png', 64, 64),
    ('samurai', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png', 96, 64),
    ('samurai_rival', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png', 96, 64),
    ('ranger', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png', 64, 64),
    ('ranger_rival', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png', 64, 64),
    ('knight_rival', 'src/assets/Heavy Knight 2/Heavy Knight 2/Heavy Knighty sheet2 red.png', 80, 64),
    ('megaboss_rival', 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png', 80, 64),
    ('bandit', 'src/assets/bandit.png', 64, 64),  # We'll check dimensions for both 64x64 and 102x128
    ('bandit_alt', 'src/assets/bandit.png', 102, 128),
    ('frost_giant', 'src/assets/frost_giant.png', 64, 64),
    ('frost_giant_alt', 'src/assets/frost_giant.png', 102, 128),
    ('lich_lord', 'src/assets/lich_lord.png', 0, 0), # Loaded as image in AssetManager
    ('skeleton', 'src/assets/skeleton.png', 0, 0), # Loaded as image in AssetManager
    ('devil_boss', 'src/assets/devil_boss.png', 0, 0), # Loaded as texture atlas
    ('training_dummy', 'src/assets/training_dummy.png', 128, 279),
    ('slime', 'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png', 32, 32),
    ('goblin', 'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png', 84, 64),
    ('goblin_alt', 'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png', 72, 64),
    ('bat', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Bat sheet.png', 64, 64),
    ('mushroom', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Mushroom sheet.png', 64, 64),
    ('orc', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Orc sheet.png', 64, 64),
    ('spider', 'src/assets/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider.png', 192, 96),
    ('mummy', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Mummy.png', 64, 64),
    ('scarab_beetle', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Scarab beetle.png', 32, 32),
    ('npc', 'src/assets/GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess NPC.png', 64, 64),
    ('blacksmith', 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Black Market Dealer.png', 64, 64),
    ('alchemist', 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Mage.png', 64, 64),
    ('loot_chest', 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png', 64, 32)
]

print("Starting Sprite Sheet Analysis...")
print("=================================")

for key, rel_path, fw, fh in assets:
    full_path = os.path.join('C:\\Code2\\rpg-scroller', rel_path.replace('/', '\\'))
    if not os.path.exists(full_path):
        print(f"ERROR: File not found: {rel_path}")
        continue
    
    img = Image.convert = Image.open(full_path).convert('RGBA')
    width, height = img.size
    print(f"[{key}] Path: {rel_path} | Size: {width}x{height}")
    
    if fw > 0 and fh > 0:
        cols = width // fw
        rows = height // fh
        print(f"   Grid size: {fw}x{fh} | Calculated grid: {cols} cols, {rows} rows")
        if width % fw != 0 or height % fh != 0:
            print(f"   WARNING: Image size {width}x{height} is not perfectly divisible by frame size {fw}x{fh}")
        
        # Count non-empty frames for each row
        row_counts = []
        for r in range(rows):
            non_empty_frames = 0
            for c in range(cols):
                box = (c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)
                frame = img.crop(box)
                extrema = frame.getextrema()
                # If there are any non-transparent pixels (extrema[3] represents Alpha)
                if extrema and extrema[3][1] > 0:
                    non_empty_frames += 1
            row_counts.append(non_empty_frames)
        print(f"   Active frames per row: {row_counts}")
    else:
        print("   Loaded as static image or atlas (non-grid analysis skipped)")
    print()
