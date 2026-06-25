const fs = require('fs');
const path = require('path');

const baseAssetDir = 'src/assets/';
const dirsToScan = [
    'GandalfHardcore 36x Hand Items',
    'GandalfHardcore 39x Hats',
    'GandalfHardcore 14x Arm Layers',
    'GandalfHardcore 7x Male Clothing',
    'GandalfHardcore 43x Female Clothing',
    'GandalfHardcore 58x Hair',
    'GandalfHardcore 10x Elven ears',
    'GandalfHardcore FREE Character Asset Pack/GandalfHardcore Character Asset Pack/Male Hand',
    'GandalfHardcore FREE Character Asset Pack/GandalfHardcore Character Asset Pack/Female Hand'
];

let loadStatements = [];
let fileList = {
    hats: [],
    arms: [],
    maleClothing: [],
    femaleClothing: [],
    hair: [],
    ears: [],
    weapons: []
};

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.png') && !file.toLowerCase().includes('dont forget')) {
                results.push(file.replace(/\\/g, '/'));
            }
        }
    });
    return results;
}

dirsToScan.forEach(d => {
    const fullDir = path.join(__dirname, baseAssetDir, d);
    const files = walkDir(fullDir);
    
    files.forEach(f => {
        const relativePath = f.split('src/assets/')[1];
        let baseKey = path.basename(f, '.png').replace(/\s+/g, '_').toLowerCase();
        
        // Ensure unique keys for Male vs Female items
        if (f.includes('Male ') || f.includes('/Male/') || f.includes('Male Hat') || f.includes('Male Ears') || f.includes('Male Hair') || f.includes('Male Clothing') || f.includes('Male Hand')) {
            if (!baseKey.endsWith('_m')) baseKey += '_m';
        } else if (f.includes('Female ') || f.includes('/Female/') || f.includes('Female Hat') || f.includes('Female Ears') || f.includes('Female Hair') || f.includes('Female Clothing') || f.includes('Female Hand')) {
            if (!baseKey.endsWith('_f')) baseKey += '_f';
        }
        
        const key = 'mod_' + baseKey;
        
        loadStatements.push(`        this.scene.load.spritesheet('${key}', 'src/assets/${relativePath}', { frameWidth: 100, frameHeight: 64 });`);
        
        const lowerPath = f.toLowerCase();
        if (lowerPath.includes('hat')) fileList.hats.push(key);
        else if (lowerPath.includes('arm')) fileList.arms.push(key);
        else if (lowerPath.includes('male clothing')) fileList.maleClothing.push(key);
        else if (lowerPath.includes('female clothing')) fileList.femaleClothing.push(key);
        else if (lowerPath.includes('hair')) fileList.hair.push(key);
        else if (lowerPath.includes('ear')) fileList.ears.push(key);
        else if (lowerPath.includes('hand') || lowerPath.includes('sword')) {
            if (!lowerPath.includes('flower') && !lowerPath.includes('basket') && !lowerPath.includes('hoe')) {
                fileList.weapons.push(key);
            }
        }
    });
});

fs.writeFileSync('generated_loaders.txt', loadStatements.join('\n'));
fs.writeFileSync('src/scene_modules/ModularAssetLists.js', `window.MODULAR_ASSETS = ${JSON.stringify(fileList, null, 4)};`);
console.log("Done generating loaders and lists.");
