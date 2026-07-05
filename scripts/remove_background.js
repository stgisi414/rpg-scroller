const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

function removeBlackBackground(inputPath, outputPath) {
    if (!fs.existsSync(inputPath)) {
        console.error("Input file does not exist:", inputPath);
        return;
    }
    
    const inputBuffer = fs.readFileSync(inputPath);
    const png = PNG.sync.read(inputBuffer);
    
    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2;
            const r = png.data[idx];
            const g = png.data[idx + 1];
            const b = png.data[idx + 2];
            
            // If the pixel is very dark (close to black), make it transparent
            if (r < 18 && g < 18 && b < 18) {
                png.data[idx + 3] = 0; // Set alpha to 0
            }
        }
    }
    
    const outputBuffer = PNG.sync.write(png);
    fs.writeFileSync(outputPath, outputBuffer);
    console.log("Background removed and saved to:", outputPath);
}

// If run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node remove_background.js <input_path> <output_path>");
        process.exit(1);
    }
    removeBlackBackground(args[0], args[1]);
}

module.exports = { removeBlackBackground };
