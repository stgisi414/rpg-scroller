const fs = require('fs');
const zlib = require('zlib');
const { PNG } = require('pngjs');

const filepath = 'src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.ase';
const buf = fs.readFileSync(filepath);

// Read file header
const fileSize = buf.readUInt32LE(0);
const magic = buf.readUInt16LE(4);
const framesCount = buf.readUInt16LE(6);
const width = buf.readUInt16LE(8);
const height = buf.readUInt16LE(10);
const depth = buf.readUInt16LE(12);

console.log(`ASEPRITE HEADER:`);
console.log(`File size: ${fileSize} bytes`);
console.log(`Magic: 0x${magic.toString(16)} (expected 0xa5e0)`);
console.log(`Frames count: ${framesCount}`);
console.log(`Dimensions: ${width}x${height}`);
console.log(`Depth: ${depth} bpp`);

let offset = 128; // Header is 128 bytes

const layers = [];
const cels = [];

for (let f = 0; f < framesCount; f++) {
    const frameSize = buf.readUInt32LE(offset);
    const frameMagic = buf.readUInt16LE(offset + 4);
    let chunksCount = buf.readUInt16LE(offset + 6);
    const duration = buf.readUInt16LE(offset + 8);
    const newChunksCount = buf.readUInt32LE(offset + 12);
    if (newChunksCount > 0) chunksCount = newChunksCount;

    let chunkOffset = offset + 16;
    for (let c = 0; c < chunksCount; c++) {
        if (chunkOffset >= offset + frameSize) break;
        
        const chunkSize = buf.readUInt32LE(chunkOffset);
        const chunkType = buf.readUInt16LE(chunkOffset + 4);

        if (chunkType === 0x2004) { // Layer Chunk
            const flags = buf.readUInt16LE(chunkOffset + 6);
            const layerType = buf.readUInt16LE(chunkOffset + 8);
            const childLevel = buf.readUInt16LE(chunkOffset + 10);
            const blendMode = buf.readUInt16LE(chunkOffset + 16);
            const opacity = buf.readUInt8(chunkOffset + 18);
            // Read name
            const nameLen = buf.readUInt16LE(chunkOffset + 22);
            const name = buf.toString('utf8', chunkOffset + 24, chunkOffset + 24 + nameLen);
            layers.push({ name, flags, layerType, childLevel, blendMode, opacity });
            if (f === 0) console.log(`    [Layer ${layers.length-1}] name="${name}", type=${layerType}, opacity=${opacity}`);
        }
        else if (chunkType === 0x2005) { // Cel Chunk
            const layerIndex = buf.readUInt16LE(chunkOffset + 6);
            const x = buf.readInt16LE(chunkOffset + 8);
            const y = buf.readInt16LE(chunkOffset + 10);
            const opacity = buf.readUInt8(chunkOffset + 12);
            const celType = buf.readUInt16LE(chunkOffset + 13);

            if (celType === 2) { // Compressed image data
                const w = buf.readUInt16LE(chunkOffset + 22);
                const h = buf.readUInt16LE(chunkOffset + 24);
                const compressedData = buf.slice(chunkOffset + 26, chunkOffset + chunkSize);
                try {
                    const rawData = zlib.inflateSync(compressedData);
                    cels.push({ frame: f, layerIndex, x, y, w, h, opacity, rawData });
                    if (f === 0) console.log(`    [Cel] Frame ${f}, layer=${layerIndex} ("${layers[layerIndex]?.name}"), x=${x}, y=${y}, w=${w}, h=${h}`);
                } catch (e) {
                    console.error("      -> Failed to decompress cel data:", e.message);
                }
            }
        }
        
        chunkOffset += chunkSize;
    }
    
    offset += frameSize;
}

console.log(`Total layers found: ${layers.length}`);
console.log(`Total cels extracted: ${cels.length}`);
