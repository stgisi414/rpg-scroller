const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const PORTRAITS_DIR = path.join(__dirname, '..', 'src', 'assets', 'portraits');

async function removeBackgroundFloodFill(filePath) {
    if (!fs.existsSync(filePath)) return;
    try {
        const image = await Jimp.read(filePath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;
        const data = image.bitmap.data;
        
        const visited = new Uint8Array(w * h);
        const seeds = [
            [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
            [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
            [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]
        ];
        
        // Detect corner background color to prevent bleeding into the character's white hair or dark armor
        const cr = data[0];
        const cg = data[1];
        const cb = data[2];
        let bgMode = 'black'; // default fallback
        if (cr > 180 && cg > 180 && cb > 180) {
            bgMode = 'white';
        }
        
        const queue = [];
        
        function isBgColor(r, g, b) {
            if (bgMode === 'white') {
                return r > 180 && g > 180 && b > 180;
            } else {
                return r < 65 && g < 65 && b < 65;
            }
        }
        
        for (const [sx, sy] of seeds) {
            const sIdx = (w * sy + sx) << 2;
            const sr = data[sIdx];
            const sg = data[sIdx + 1];
            const sb = data[sIdx + 2];
            const sa = data[sIdx + 3];
            
            if (sa > 0 && isBgColor(sr, sg, sb)) {
                queue.push([sx, sy]);
                visited[w * sy + sx] = 1;
            }
        }
        
        let changed = false;
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            const idx = (w * cy + cx) << 2;
            
            data[idx + 3] = 0;
            changed = true;
            
            const neighbors = [
                [cx + 1, cy], [cx - 1, cy],
                [cx, cy + 1], [cx, cy - 1]
            ];
            
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nPos = w * ny + nx;
                    if (!visited[nPos]) {
                        const nIdx = nPos << 2;
                        const nr = data[nIdx];
                        const ng = data[nIdx + 1];
                        const nb = data[nIdx + 2];
                        const na = data[nIdx + 3];
                        
                        if (na > 0 && isBgColor(nr, ng, nb)) {
                            queue.push([nx, ny]);
                            visited[nPos] = 1;
                        }
                    }
                }
            }
        }
        
        if (changed) {
            await image.write(filePath);
            console.log(`Cleaned background for: ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Failed to clean background for ${filePath}:`, e.message);
    }
}

async function clean() {
    console.log("Scanning portraits for solid white or black backgrounds...");
    const files = fs.readdirSync(PORTRAITS_DIR);
    for (const f of files) {
        if (f.endsWith('.png')) {
            const filePath = path.join(PORTRAITS_DIR, f);
            await removeBackgroundFloodFill(filePath);
        }
    }
    console.log("Cleanup complete!");
}

clean();
