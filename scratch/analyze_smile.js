const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;
const rows = png.height / 16;

console.log(`Grid: ${cols} x ${rows}`);

const targetRow = 13; // Smile
console.log(`\nRow ${targetRow} (Smile):`);
for (let c = 0; c < cols; c++) {
    const frameIdx = targetRow * cols + c;
    const fx = c * 16;
    const fy = targetRow * 16;
    
    let opaqueCount = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            if (png.data[idx+3] > 0) opaqueCount++;
        }
    }
    console.log(`Column ${c} (Frame ${frameIdx}): ${opaqueCount} opaque pixels`);
}
