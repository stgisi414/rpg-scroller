from PIL import Image

img = Image.open('src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png').convert('RGBA')
data = img.load()
cols = 10
w = 80
h = 64
rows = [4, 5]
res = {}

for r in rows:
    count = 0
    for c in range(cols):
        is_empty = True
        for y in range(r * h, (r + 1) * h):
            for x in range(c * w, (c + 1) * w):
                if data[x, y][3] > 0:
                    is_empty = False
                    break
            if not is_empty:
                break
        if not is_empty:
            count += 1
    res[r] = count

print(res)
