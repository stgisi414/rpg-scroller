const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const imgPath = 'src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

const cols = png.width / 16;

for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
    const fx = (frameIdx % cols) * 16;
    const fy = Math.floor(frameIdx / cols) * 16;
    
    const outPng = new PNG({ width: 16, height: 16 });
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const srcIdx = ((fy + y) * png.width + (fx + x)) * 4;
            const destIdx = (y * 16 + x) * 4;
            outPng.data[destIdx] = png.data[srcIdx];
            outPng.data[destIdx+1] = png.data[srcIdx+1];
            outPng.data[destIdx+2] = png.data[srcIdx+2];
            outPng.data[destIdx+3] = png.data[srcIdx+3];
        }
    }
    fs.writeFileSync(`emoji_frame_${frameIdx}.png`, PNG.sync.write(outPng));
}
console.log("Frames extracted.");
