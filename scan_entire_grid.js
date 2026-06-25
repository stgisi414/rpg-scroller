const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;
const rows = png.height / 16;

console.log("Grid of Opaque Pixel Counts (Cols = 19, Rows = 15):");
for (let r = 0; r < rows; r++) {
    let rowStr = `Row ${String(r).padStart(2)}: `;
    for (let c = 0; c < cols; c++) {
        const fx = c * 16;
        const fy = r * 16;
        let count = 0;
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const idx = ((fy + y) * png.width + (fx + x)) * 4;
                if (png.data[idx+3] > 0) count++;
            }
        }
        rowStr += String(count).padStart(4);
    }
    console.log(rowStr);
}
