const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;
const rows = png.height / 16;

for (let r = 0; r < rows; r++) {
    const frameIdx = r * cols; // Column 0 of row r
    const fx = 0;
    const fy = r * 16;
    
    // Check if the frame is completely transparent
    let opaqueCount = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            if (png.data[idx+3] > 128) opaqueCount++;
        }
    }
    
    console.log(`\nRow ${r} (Frame Index ${frameIdx}): ${opaqueCount} opaque pixels`);
    if (opaqueCount > 0) {
        for (let y = 0; y < 16; y++) {
            let line = "";
            for (let x = 0; x < 16; x++) {
                const idx = ((fy + y) * png.width + (fx + x)) * 4;
                const a = png.data[idx+3];
                line += a > 128 ? "#" : ".";
            }
            console.log(line);
        }
    }
}
