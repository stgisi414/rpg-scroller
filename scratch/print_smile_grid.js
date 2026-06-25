const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const cols = png.width / 16;
const targetRow = 13; // Smile

for (let c = 0; c < 7; c++) {
    const fx = c * 16;
    const fy = targetRow * 16;
    console.log(`\nRow ${targetRow}, Col ${c}:`);
    for (let y = 0; y < 16; y++) {
        let line = "";
        for (let x = 0; x < 16; x++) {
            const idx = ((fy + y) * png.width + (fx + x)) * 4;
            const a = png.data[idx+3];
            line += a > 0 ? "#" : ".";
        }
        console.log(line);
    }
}
