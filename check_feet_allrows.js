// Measures the lowest opaque pixel (the foot line) in EACH of the 7 animation rows
// of the modular boots layer, per row, to find whether the walk row (row 1) has its
// feet at a different in-frame Y than the idle row (row 0). If they differ, that's why
// composite NPCs sit on the floor when idle but float (or sink) while walking: the body
// is anchored to the idle row's foot line, but the walk pose's feet are elsewhere.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const base = 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack';
const files = {
    'Male Boots':   `${base}/Male Clothing/Boots.png`,
    'Female Boots': `${base}/Female Clothing/Boots.png`,
    'Male Skin1':   `${base}/Character skin colors/Male Skin1.png`,
    'Female Skin1': `${base}/Character skin colors/Female Skin1.png`,
};

const rowH = 64;
const numRows = 7;
const rowNames = ['idle', 'walk', 'row2', 'row3', 'row4', 'row5', 'death'];

function lowestOpaqueInRow(png, rowTop) {
    let lowest = -1;
    for (let y = rowTop; y < rowTop + rowH && y < png.height; y++) {
        let any = false;
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2;
            if (png.data[idx + 3] > 16) { any = true; break; }
        }
        if (any) lowest = y - rowTop; // in-row Y (0..63)
    }
    return lowest;
}

for (const [name, file] of Object.entries(files)) {
    try {
        const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, file)));
        const feet = [];
        for (let r = 0; r < numRows; r++) {
            feet.push(lowestOpaqueInRow(png, r * rowH));
        }
        console.log(`\n${name} (${png.width}x${png.height})`);
        feet.forEach((f, r) => {
            const delta = f - feet[0];
            const tag = r === 0 ? '(idle ref)' : (delta === 0 ? '(same as idle)' : `(${delta > 0 ? '+' : ''}${delta}px vs idle -> ${delta < 0 ? 'feet HIGHER, floats' : 'feet LOWER, sinks'})`);
            console.log(`  ${rowNames[r].padEnd(6)} foot line at in-row y=${f} ${tag}`);
        });
    } catch (e) {
        console.log(`${name} ERROR: ${e.message}`);
    }
}
