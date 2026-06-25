// Measures the actual frame layout of the death (last) row in the NPC skin sheet
// by scanning non-transparent pixel columns. Confirms how many frames the row holds
// and how wide they are, so the slicing grid can be set from fact, not assumption.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const file = path.join(__dirname,
    'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin1.png');

const png = PNG.sync.read(fs.readFileSync(file));
console.log('Image dimensions:', png.width, 'x', png.height);

const rowH = 64;
const numRows = Math.round(png.height / rowH);
console.log('Rows (at 64px):', numRows);

// Per-row: count opaque pixels per column, then report contiguous occupied bands.
function scanRow(rowIndex) {
    const y0 = rowIndex * rowH;
    const colOccupied = new Array(png.width).fill(false);
    for (let x = 0; x < png.width; x++) {
        for (let y = y0; y < y0 + rowH && y < png.height; y++) {
            const idx = (png.width * y + x) << 2;
            if (png.data[idx + 3] > 16) { colOccupied[x] = true; break; }
        }
    }
    // Collapse into contiguous bands (gaps of >=4 transparent px split frames)
    const bands = [];
    let start = -1, gap = 0;
    for (let x = 0; x < png.width; x++) {
        if (colOccupied[x]) {
            if (start === -1) start = x;
            gap = 0;
        } else if (start !== -1) {
            gap++;
            if (gap >= 6) { bands.push([start, x - gap]); start = -1; gap = 0; }
        }
    }
    if (start !== -1) bands.push([start, png.width - 1 - gap]);
    return bands;
}

for (let r = 0; r < numRows; r++) {
    const bands = scanRow(r);
    const desc = bands.map(b => `${b[0]}-${b[1]}(w${b[1] - b[0] + 1})`).join('  ');
    console.log(`Row ${r}: ${bands.length} content bands  ${desc}`);
}

// Focus on the death row: report assuming evenly-spaced frames at common widths.
const last = numRows - 1;
const bands = scanRow(last);
console.log(`\nDeath row (Row ${last}) content spans x=${bands.length ? bands[0][0] : '-'}..${bands.length ? bands[bands.length-1][1] : '-'}`);
[8, 10].forEach(n => console.log(`  If ${n} frames: each ${png.width / n}px wide`));
