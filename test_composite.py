import glob
from PIL import Image
s = glob.glob('src/assets/**/Female skin1.png', recursive=True)[0]
w = glob.glob('src/assets/**/Female Hand/Iron Sword.png', recursive=True)[0]
skin = Image.open(s).convert('RGBA')
img = Image.open(w).convert('RGBA')
skin.alpha_composite(img)
px = skin.load()

res = []
for c in range(8):
    foot = -1
    for yy in range(63, -1, -1):
        for xx in range(80):
            if px[c*80+xx, yy][3] > 16:
                foot = yy
                break
        if foot != -1: break
    res.append(foot)
print("Composite Row 0 (Idle) 80px:", res)
