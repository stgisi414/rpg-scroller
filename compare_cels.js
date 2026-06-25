const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;

const getFrameData = (row, col) => {
    const fx = col * 16;
    const fy = row * 16;
    const pixels = [];
    for (let y = 0; y < 16; y++) {
        const rowPix = [];
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            const r = png.data[idx];
            const g = png.data[idx+1];
            const b = png.data[idx+2];
            const a = png.data[idx+3];
            rowPix.push({ r, g, b, a });
        }
        pixels.push(rowPix);
    }
    return pixels;
};

const smile = getFrameData(13, 4);
const empty = getFrameData(14, 4);

let diffCount = 0;
for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
        const p1 = smile[y][x];
        const p2 = empty[y][x];
        if (p1.r !== p2.r || p1.g !== p2.g || p1.b !== p2.b || p1.a !== p2.a) {
            diffCount++;
            if (diffCount < 10) {
                console.log(`Diff at (${x}, ${y}): Smile=rgba(${p1.r},${p1.g},${p1.b},${p1.a}), Empty=rgba(${p2.r},${p2.g},${p2.b},${p2.a})`);
            }
        }
    }
}
console.log(`Total pixel differences at frame 4 between Smile and Empty: ${diffCount}`);
