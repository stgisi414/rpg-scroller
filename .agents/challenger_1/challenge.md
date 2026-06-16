# verification and Diagnostic Findings

## 1. Overview of Assets & Class Integrity
This report presents empirical findings from programmatically and manually verifying the game's asset configurations and class stats mapping. We wrote and verified a Node.js utility, `verify_assets.js`, and checked the presence of all configured directories and file resources on the filesystem.

---

## 2. Verification Script Code (`verify_assets.js`)
The following script was created at the project root (`c:\Code2\rpg-scroller\verify_assets.js`) to parse classesData in `main.js` and simulate asset loaders in `AssetManager.js`, verifying file existence and checking for duplicate assets:

```javascript
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== RPG Scroller Asset & Class Integrity Verification ===\n');

// 1. Load and Parse main.js classesData
const mainPath = path.join(__dirname, 'src', 'main.js');
if (!fs.existsSync(mainPath)) {
    console.error(`Error: src/main.js not found at ${mainPath}`);
    process.exit(1);
}
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Extract classesData object literal
const classesDataStart = mainContent.indexOf('const classesData = {');
if (classesDataStart === -1) {
    console.error('Error: Could not find "const classesData = {" in src/main.js');
    process.exit(1);
}

let openBraces = 0;
let classesDataEnd = -1;
for (let i = classesDataStart + 'const classesData ='.length; i < mainContent.length; i++) {
    if (mainContent[i] === '{') {
        openBraces++;
    } else if (mainContent[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            classesDataEnd = i + 1;
            break;
        }
    }
}

if (classesDataEnd === -1) {
    console.error('Error: Could not find matching closing brace for classesData in src/main.js');
    process.exit(1);
}

const classesDataCode = mainContent.substring(classesDataStart, classesDataEnd);

// Extract the derived rival classes lines
const derivedLines = [];
const lines = mainContent.split('\n');
for (const line of lines) {
    if (line.includes('classesData.') && line.includes('=') && line.includes('stats:')) {
        derivedLines.push(line);
    }
}

// Evaluate classesData in sandbox
const sandbox = {};
const evalCode = `
${classesDataCode}
${derivedLines.join('\n')}
global.classesDataResult = classesData;
`;

try {
    vm.runInNewContext(evalCode, sandbox);
} catch (err) {
    console.error('Error: Failed to evaluate classesData block:', err);
    process.exit(1);
}

const classesData = sandbox.classesDataResult;
console.log(`Successfully parsed ${Object.keys(classesData).length} classes from main.js.`);

// 2. Load and Parse AssetManager.js preload
const assetManagerPath = path.join(__dirname, 'src', 'AssetManager.js');
if (!fs.existsSync(assetManagerPath)) {
    console.error(`Error: src/AssetManager.js not found at ${assetManagerPath}`);
    process.exit(1);
}
const assetManagerContent = fs.readFileSync(assetManagerPath, 'utf8');

const preloadStart = assetManagerContent.indexOf('preload() {');
if (preloadStart === -1) {
    console.error('Error: Could not find "preload() {" in src/AssetManager.js');
    process.exit(1);
}

let preloadOpenBraces = 0;
let preloadEnd = -1;
for (let i = preloadStart + 'preload()'.length; i < assetManagerContent.length; i++) {
    if (assetManagerContent[i] === '{') {
        preloadOpenBraces++;
    } else if (assetManagerContent[i] === '}') {
        preloadOpenBraces--;
        if (preloadOpenBraces === 0) {
            preloadEnd = i + 1;
            break;
        }
    }
}

if (preloadEnd === -1) {
    console.error('Error: Could not find matching closing brace for preload() in src/AssetManager.js');
    process.exit(1);
}

const preloadBody = assetManagerContent.substring(preloadStart, preloadEnd);
const innerPreloadBody = preloadBody.substring(
    preloadBody.indexOf('{') + 1,
    preloadBody.lastIndexOf('}')
);

// Mock scene loader
const loadedAssets = [];
const mockScene = {
    load: {
        spritesheet(key, pathVal, config) {
            loadedAssets.push({ type: 'spritesheet', key, path: pathVal, config });
        },
        image(key, pathVal) {
            loadedAssets.push({ type: 'image', key, path: pathVal });
        },
        atlas(key, pngPath, jsonPath) {
            loadedAssets.push({ type: 'atlas', key, pngPath, jsonPath });
        }
    }
};

const assetManagerInstance = {
    scene: mockScene
};

try {
    const preloadContext = vm.createContext({
        this: assetManagerInstance,
        console: console
    });
    const preloadFn = vm.runInContext(`(function() { ${innerPreloadBody} })`, preloadContext);
    preloadFn.call(assetManagerInstance);
} catch (err) {
    console.error('Error: Failed to evaluate preload() body:', err);
    process.exit(1);
}

console.log(`Successfully simulated preload() and extracted ${loadedAssets.length} asset loaders.\n`);

// 3. Diagnostics & Integrity Checks
console.log('--- 3.1. Checking Player Class Stats and Paths ---');
const classIssues = [];
for (const [classKey, classInfo] of Object.entries(classesData)) {
    console.log(`\nClass: ${classKey} ("${classInfo.name}")`);
    
    // Check Stats Integrity
    if (!classInfo.stats) {
        classIssues.push({ classKey, issue: 'No stats defined' });
        console.log(`  [FAIL] stats: Missing`);
    } else {
        const stats = classInfo.stats;
        const requiredStats = ['vit', 'str', 'dex', 'int'];
        const missingStats = requiredStats.filter(s => typeof stats[s] !== 'number');
        if (missingStats.length > 0) {
            classIssues.push({ classKey, issue: `Missing or invalid stats: ${missingStats.join(', ')}` });
            console.log(`  [FAIL] stats: Missing or invalid keys: ${missingStats.join(', ')}`);
        } else {
            console.log(`  [PASS] stats: vit=${stats.vit}, str=${stats.str}, dex=${stats.dex}, int=${stats.int}`);
        }
    }
    
    // Check Image Path existence
    if (!classInfo.image) {
        classIssues.push({ classKey, issue: 'No image path defined' });
        console.log(`  [FAIL] image: Missing path`);
    } else {
        const decodedPath = decodeURIComponent(classInfo.image);
        const resolvedPath = path.resolve(__dirname, decodedPath);
        const exists = fs.existsSync(resolvedPath);
        if (!exists) {
            classIssues.push({ classKey, issue: `Image file does not exist: ${decodedPath}` });
            console.log(`  [FAIL] image: File does not exist at "${decodedPath}"`);
        } else {
            console.log(`  [PASS] image: Found at "${decodedPath}"`);
        }
    }
}

console.log('\n--- 3.2. Checking Preloaded Assets Existence & Duplicates ---');
const assetIssues = [];
const keyMap = new Map();
const pathMap = new Map();

for (const asset of loadedAssets) {
    // Check key duplicate
    if (keyMap.has(asset.key)) {
        const prev = keyMap.get(asset.key);
        assetIssues.push({
            type: 'duplicate_key',
            key: asset.key,
            issue: `Duplicate asset key registered. Existing: ${prev.type} at "${prev.path || prev.pngPath}", New: ${asset.type} at "${asset.path || asset.pngPath}"`
        });
        console.log(`  [FAIL] Duplicate Key: "${asset.key}"`);
    } else {
        keyMap.set(asset.key, asset);
    }

    // Check path duplicate
    if (asset.type === 'atlas') {
        const paths = [asset.pngPath, asset.jsonPath];
        for (const p of paths) {
            if (pathMap.has(p)) {
                const prevKey = pathMap.get(p);
                assetIssues.push({
                    type: 'duplicate_path',
                    path: p,
                    issue: `Path "${p}" preloaded multiple times (Keys: "${prevKey}" and "${asset.key}")`
                });
                console.log(`  [WARN] Duplicate Path: "${p}" preloaded for keys "${prevKey}" and "${asset.key}"`);
            } else {
                pathMap.set(p, asset.key);
            }
        }
    } else {
        const p = asset.path;
        if (pathMap.has(p)) {
            const prevKey = pathMap.get(p);
            assetIssues.push({
                type: 'duplicate_path',
                path: p,
                issue: `Path "${p}" preloaded multiple times (Keys: "${prevKey}" and "${asset.key}")`
            });
            console.log(`  [WARN] Duplicate Path: "${p}" preloaded for keys "${prevKey}" and "${asset.key}"`);
        } else {
            pathMap.set(p, asset.key);
        }
    }

    // Check files existence on disk
    if (asset.type === 'atlas') {
        const pngExists = fs.existsSync(path.resolve(__dirname, asset.pngPath));
        const jsonExists = fs.existsSync(path.resolve(__dirname, asset.jsonPath));
        if (!pngExists) {
            assetIssues.push({ type: 'missing_file', key: asset.key, path: asset.pngPath, issue: 'PNG file missing' });
            console.log(`  [FAIL] Missing File: "${asset.pngPath}" (Key: "${asset.key}")`);
        }
        if (!jsonExists) {
            assetIssues.push({ type: 'missing_file', key: asset.key, path: asset.jsonPath, issue: 'JSON file missing' });
            console.log(`  [FAIL] Missing File: "${asset.jsonPath}" (Key: "${asset.key}")`);
        }
    } else {
        const exists = fs.existsSync(path.resolve(__dirname, asset.path));
        if (!exists) {
            assetIssues.push({ type: 'missing_file', key: asset.key, path: asset.path, issue: 'Asset file missing' });
            console.log(`  [FAIL] Missing File: "${asset.path}" (Key: "${asset.key}")`);
        }
    }
}

console.log('\n--- 3.3. Checking if main.js Class Images are Preloaded ---');
const preloadCheckIssues = [];
for (const [classKey, classInfo] of Object.entries(classesData)) {
    const decodedPath = decodeURIComponent(classInfo.image);
    // Find in loadedAssets by path
    const matchByPath = loadedAssets.find(a => {
        if (a.type === 'atlas') {
            return a.pngPath === decodedPath;
        }
        return a.path === decodedPath;
    });
    // Find in loadedAssets by key
    const matchByKey = loadedAssets.find(a => a.key === classKey);

    if (!matchByPath && !matchByKey) {
        preloadCheckIssues.push({
            classKey,
            image: decodedPath,
            issue: `Class "${classKey}" image "${decodedPath}" is configured in main.js but not preloaded in AssetManager.js`
        });
        console.log(`  [FAIL] Class "${classKey}": Image "${decodedPath}" is NOT preloaded in AssetManager.js!`);
    } else {
        console.log(`  [PASS] Class "${classKey}": Image found in preloads (Key: "${matchByPath ? matchByPath.key : matchByKey.key}")`);
    }
}

// 4. Summarize results
console.log('\n================ SUMMARY ================');
console.log(`Total Class Issues: ${classIssues.length}`);
console.log(`Total Asset Loader Issues (Duplicate keys/paths, missing files): ${assetIssues.length}`);
console.log(`Total Alignment/Preload Issues: ${preloadCheckIssues.length}`);

if (classIssues.length > 0 || assetIssues.length > 0 || preloadCheckIssues.length > 0) {
    console.log('\n--- Details of Class Issues ---');
    classIssues.forEach(i => console.log(`- Class [${i.classKey}]: ${i.issue}`));
    
    console.log('\n--- Details of Asset Loader Issues ---');
    assetIssues.forEach(i => console.log(`- [${i.type}] ${i.key || i.path}: ${i.issue}`));

    console.log('\n--- Details of Alignment/Preload Issues ---');
    preloadCheckIssues.forEach(i => console.log(`- Class [${i.classKey}]: ${i.issue}`));
} else {
    console.log('\nAll checks passed successfully! No integrity issues found.');
}
```

---

## 3. Detailed Verification Findings & Mismatches

### Finding A: Mismatch on Preloaded Keys vs Class Configuration Images (Rivals & Bosses)
*   **Severity**: Medium
*   **Description**: In `src/main.js`, rival classes (`knight_rival`, `wizard_rival`, `samurai_rival`, `ranger_rival`, `megaboss_rival`) are defined by spreading base classes (e.g. `classesData.knight_rival = { ...classesData.heavy_knight, ... }`).
*   **Observation**:
    *   This copies the base black/dark sheet image configurations:
        *   `knight_rival` and `megaboss_rival` have `image: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'`
        *   `wizard_rival` has `image: '.../Black Wizard sheet.png'`
        *   `samurai_rival` has `image: '.../Samurai Sheet black.png'`
        *   `ranger_rival` has `image: '.../GandalfHardcore Archer black sheet.png'`
    *   However, in `src/AssetManager.js`, these keys are preloaded with **Red recolored** sheets:
        *   `knight_rival` and `megaboss_rival` preload `'src/assets/Heavy Knight/Heavy Knight/Red heavy.png'`
        *   `wizard_rival` preloads `'.../Red Wizard sheet.png'`
        *   `samurai_rival` preloads `'.../Samurai Sheet red.png'`
        *   `ranger_rival` preloads `'.../GandalfHardcore Archer red sheet.png'`
*   **Impact**:
    *   Phaser renders the red-clothed character sprites correctly during battles, but HTML interfaces (like custom slot screens, save slots, or debug menus) that lookup `classesData[classId].image` will display/attempt to load the black-clothed sheet instead. This leads to a visual inconsistency between the HTML overlay and the Phaser canvas.

### Finding B: Missing Preloads for Class `heavy_knight`
*   **Severity**: Low/Medium
*   **Description**: The class `heavy_knight` is fully configured in `src/main.js` with `'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'`, but it is **never loaded** in `src/AssetManager.js`.
*   **Impact**:
    *   If the save slot loader or any gameplay code attempts to spawn a player character of class `heavy_knight`, Phaser will fail to locate the `'heavy_knight'` texture key. This results in standard Phaser fallback box rendering or an runtime exception if the key is missing from the texture cache.

### Finding C: Duplicate Preload/Conflict Key `floor_dungeon`
*   **Severity**: Low
*   **Description**: Key `'floor_dungeon'` is preloaded twice in `src/AssetManager.js`:
    *   Line 74: `this.scene.load.spritesheet('floor_dungeon', 'src/assets/tile castle dungeon.png', { frameWidth: 16, frameHeight: 16 });`
    *   Line 118: `this.scene.load.spritesheet('floor_dungeon', 'src/assets/floor_dungeon.png', { frameWidth: 32, frameHeight: 32 });`
*   **Observation**:
    *   The second load overrides the first, meaning `'floor_dungeon'` maps to `'src/assets/floor_dungeon.png'` (32x32).
    *   More importantly, the key `'floor_dungeon'` is **never used** in `src/scenes/GameScene.js` or `src/WorldManager.js`. The Dungeon biome actually maps to `'floor_hell'` with `0x7777aa` tint.
*   **Impact**:
    *   Redundant network request and Phaser console warnings for duplicate key registrations.

### Finding D: Exact Duplicate Preload of Town Backgrounds
*   **Severity**: Low
*   **Description**: Indoor town background files are preloaded twice inside `src/AssetManager.js` `preload()` method:
    *   Lines 131-137:
        ```javascript
        this.scene.load.image('bg_tavern', 'src/assets/bg_tavern.jpg');
        this.scene.load.image('bg_blacksmith', 'src/assets/bg_blacksmith.jpg');
        this.scene.load.image('bg_apothecary', 'src/assets/bg_apothecary.jpg');
        this.scene.load.image('bg_guild_hall', 'src/assets/bg_guild_hall.jpg');
        this.scene.load.image('bg_temple', 'src/assets/bg_temple.jpg');
        this.scene.load.image('bg_library', 'src/assets/bg_library.jpg');
        this.scene.load.image('bg_training', 'src/assets/bg_training_grounds.jpg');
        ```
    *   Lines 159-165:
        ```javascript
        this.scene.load.image('bg_tavern', 'src/assets/bg_tavern.jpg');
        this.scene.load.image('bg_blacksmith', 'src/assets/bg_blacksmith.jpg');
        this.scene.load.image('bg_apothecary', 'src/assets/bg_apothecary.jpg');
        this.scene.load.image('bg_guild_hall', 'src/assets/bg_guild_hall.jpg');
        this.scene.load.image('bg_temple', 'src/assets/bg_temple.jpg');
        this.scene.load.image('bg_library', 'src/assets/bg_library.jpg');
        this.scene.load.image('bg_training', 'src/assets/bg_training_grounds.jpg');
        ```
*   **Impact**:
    *   Triggers duplicate load warnings in Phaser and causes redundant file reads, increasing startup latency.

### Finding E: Redundant Asset Loading paths
*   **Chest Assets**: `chest sheet 1.png` is preloaded twice under two different keys:
    *   `loot_chest` (Line 185) as a spritesheet.
    *   `item-chest` (Line 193) as a static image.
*   **Rival Knight Assets**: `Red heavy.png` is loaded twice:
    *   `knight_rival` (Line 21) as spritesheet.
    *   `megaboss_rival` (Line 25) as spritesheet.

---

## 4. Resource Existence Verification
We programmatically verified that the requested assets exist at the configured locations on disk:
- `src/assets/Heavy Knight/Heavy Knight/Red heavy.png`: **PASSED** (Size: 46835 bytes)
- `src/assets/Heavy Knight/Heavy Knight/Black heavy.png`: **PASSED** (Size: 46725 bytes)
- `src/assets/bandit.png`: **PASSED** (Size: 394282 bytes)
- `src/assets/frost_giant.png`: **PASSED** (Size: 534450 bytes)
- All other 100+ files preloaded in `AssetManager.js` (including palm trees, ultimate pines, damned enemies, backgrounds) exist on disk.
