const fs = require('fs');
const { PNG } = require('pngjs');

for (let frameIdx = 0; frameIdx < 5; frameIdx++) {
    const data = fs.readFileSync(`emoji_frame_${frameIdx}.png`);
    const png = PNG.sync.read(data);

    console.log(`\nFrame ${frameIdx} pixel representation:`);
    for (let y = 0; y < 16; y++) {
        let line = "";
        for (let x = 0; x < 16; x++) {
            const idx = (y * 16 + x) * 4;
            const a = png.data[idx+3];
            line += a > 128 ? "#" : ".";
        }
        console.log(line);
    }
}
