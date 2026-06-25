const fs = require('fs');

const assetFile = 'src/AssetManager.js';
const loaders = fs.readFileSync('generated_loaders.txt', 'utf8');

let content = fs.readFileSync(assetFile, 'utf8');

// Find the spot to insert (at the end of preload before the closing brace)
const insertMarker = "// --- AUTO GENERATED MODULAR LOADERS ---";
if (content.includes(insertMarker)) {
    // Already inserted, replace it
    const regex = new RegExp(`// --- AUTO GENERATED MODULAR LOADERS ---\\n[\\s\\S]*?// --- END AUTO GENERATED ---`);
    content = content.replace(regex, `// --- AUTO GENERATED MODULAR LOADERS ---\n${loaders}\n        // --- END AUTO GENERATED ---`);
} else {
    // Insert before the last `        // UI Assets` or similar. Actually let's find `// UI Assets` and insert before it
    content = content.replace('        // UI Assets', `        // --- AUTO GENERATED MODULAR LOADERS ---\n${loaders}\n        // --- END AUTO GENERATED ---\n\n        // UI Assets`);
}

fs.writeFileSync(assetFile, content);
console.log("Updated AssetManager.js");
