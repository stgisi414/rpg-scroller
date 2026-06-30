from PIL import Image

skin = Image.open('src/assets/GandalfHardcore FREE Character Asset/GandalfHardcore FREE Character Asset/Skin/Female skin1.png').convert('RGBA')
ears = Image.open('src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Bunny ears1.png').convert('RGBA')
skin.alpha_composite(ears)
px = skin.load()

foot_y = []
for c in range(4):
    x_start = c * 100
    foot = -1
    for yy in range(63, -1, -1):
        for xx in range(100):
            if px[x_start + xx, yy][3] > 16:
                foot = yy
                break
        if foot != -1:
            break
    foot_y.append(foot)

print(foot_y)
