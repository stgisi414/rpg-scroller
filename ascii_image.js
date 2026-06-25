const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png');
const png = PNG.sync.read(data);

const targetW = 76;
const targetH = 60;

console.log(`ASCII Art of the entire GandalfHardcore Emoji.png (${png.width}x${png.height}):`);

for (let y = 0; y < targetH; y++) {
    let line = "";
    for (let x = 0; x < targetW; x++) {
        // Map target pixel to average alpha in a 4x4 block
        let sumA = 0;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const px = x * 4 + dx;
                const py = y * 4 + dy;
                const idx = (py * png.width + px) * 4;
                if (idx < png.data.length) {
                    sumA += png.data[idx+3];
                }
            }
        }
        const avgA = sumA / 16;
        if (avgA > 200) line += "@";
        else if (avgA > 100) line += "#";
        else if (avgA > 50) line += ".";
        else line += " ";
    }
    console.log(line);
}
