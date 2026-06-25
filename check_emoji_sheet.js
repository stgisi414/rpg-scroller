const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const imgPath = 'src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

console.log(`Image width: ${png.width}, height: ${png.height}`);
const cols = png.width / 16;
const rows = png.height / 16;
console.log(`Grid: ${cols} cols x ${rows} rows (total ${cols * rows} frames)`);

// Check some specific frames
for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
    const fx = (frameIdx % cols) * 16;
    const fy = Math.floor(frameIdx / cols) * 16;
    
    let opaquePixels = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            const r = png.data[idx];
            const g = png.data[idx+1];
            const b = png.data[idx+2];
            const a = png.data[idx+3];
            if (a > 0) opaquePixels++;
        }
    }
    console.log(`Frame ${frameIdx} at (${fx}, ${fy}): ${opaquePixels} opaque pixels`);
}
