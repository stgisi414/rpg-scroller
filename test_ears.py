import glob
from PIL import Image

for e in glob.glob('src/assets/**/Bunny ears*.png', recursive=True):
    img = Image.open(e).convert('RGBA')
    px = img.load()
    res = []
    for c in range(8):
        m = -1
        for yy in range(63, -1, -1):
            for xx in range(100):
                if px[c*100+xx, yy][3] > 16:
                    m = yy
                    break
            if m != -1: break
        res.append(m)
    print(e, res)
