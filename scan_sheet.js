const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;
const rows = png.height / 16;

console.log(`Scanning ${cols} x ${rows} frames...`);

let nonZeroFrames = [];
for (let frameIdx = 0; frameIdx < cols * rows; frameIdx++) {
    const fx = (frameIdx % cols) * 16;
    const fy = Math.floor(frameIdx / cols) * 16;
    
    let opaquePixels = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            const a = png.data[idx+3];
            if (a > 0) opaquePixels++;
        }
    }
    if (opaquePixels > 0) {
        nonZeroFrames.push({ idx: frameIdx, x: fx, y: fy, count: opaquePixels });
    }
}

console.log(`Found ${nonZeroFrames.length} non-empty frames.`);
console.log("First 20 non-empty frames:", nonZeroFrames.slice(0, 20));
console.log("Last 20 non-empty frames:", nonZeroFrames.slice(-20));
