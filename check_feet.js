// Measures the vertical foot position within the IDLE row (row 0) of the modular NPC
// layers, to find how far the visible feet sit above the frame bottom. That gap (scaled)
// is why composite NPCs appear to levitate: the physics body bottom is anchored to the
// frame bottom, but the art's feet are a few px higher.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const base = 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack';
const files = {
    'Male Skin1':  `${base}/Character skin colors/Male Skin1.png`,
    'Male Boots':  `${base}/Male Clothing/Boots.png`,
    'Female Skin1': `${base}/Character skin colors/Female Skin1.png`,
    'Female Boots': `${base}/Female Clothing/Boots.png`,
};

const rowH = 64;

function lowestOpaqueInRow0(file) {
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, file)));
    let lowest = -1;
    for (let y = 0; y < rowH && y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2;
            if (png.data[idx + 3] > 16) { lowest = y; break; }
        }
    }
    return { w: png.width, h: png.height, lowestOpaqueY: lowest };
}

console.log('Frame is 64px tall (row 0 = y 0..63). lowestOpaqueY = last row with any pixel.\n');
for (const [name, file] of Object.entries(files)) {
    try {
        const r = lowestOpaqueInRow0(file);
        const padding = (rowH - 1) - r.lowestOpaqueY; // transparent px below the feet
        console.log(`${name.padEnd(14)} ${r.w}x${r.h}  feet end at y=${r.lowestOpaqueY}  -> ${padding}px transparent below feet  (levitation = ${(padding * 1.5).toFixed(1)}px at 1.5x)`);
    } catch (e) {
        console.log(`${name.padEnd(14)} ERROR: ${e.message}`);
    }
}
