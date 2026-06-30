# Issue Analysis & Architectural Fix Proposals

This document provides a detailed architectural analysis and a step-by-step resolution strategy for Issues 1.1, 1.2, and 1.3 as identified in the codebase audit report.

---

## Issue 1.1: Global Namespace Pollution

### 1. Root Causes & Code Context
The codebase runs in a traditional browser environment where files are loaded via standard `<script>` tags without module scoping (e.g. `index.html` lines 917-961). Because of this:
- Global variables and state (like `window.saveData`, `window.autoplayConfig`) are attached directly to the global `window` object to make them accessible across different files.
- Static lookup tables and configurations (like `window.INDOOR_LOCATIONS` in `src/main.js` line 7, `window.WORLD_KINGDOMS` in `src/data/WorldFactions.js` line 14, and `window.PASSIVE_SKILLS_DATA`) are attached to `window`.
- Global functions (like `window.getReputationPriceMultiplier` in `src/player/ShopManager.js` line 1) and class definitions (like `window.RescueeNPC = RescueeNPC` in `src/RescueeNPC.js`) are bound to `window` for global accessibility.

This leads to high coupling, potential namespace collisions, difficulty in isolating logic for testing, and hidden dependencies.

### 2. Step-by-Step Fix Strategy
To completely resolve global namespace pollution, the codebase should be migrated to **ES Modules (ESM)**:
1. **Update Script Loaders**:
   - In `index.html`, replace the sequence of script tags with a single entry-point script loaded as a module:
     ```html
     <script type="module" src="src/main.js"></script>
     ```
   - Remove the other `<script src="...">` tags for local codebase modules from `index.html`.
2. **Encapsulate Global State**:
   - Create a dedicated state manager module, e.g. `src/state/SaveState.js`.
   - Expose explicit get/set methods or an exported `SaveState` instance.
   - Refactor references from `window.saveData` to import and call `SaveState.get()` or `saveData` from the module.
3. **Use Explicit Export/Import for Classes & Utilities**:
   - In files defining classes (e.g. `PlayerController`, `CompanionAI`, `RescueeNPC`), add `export default` or named `export` at the declaration:
     ```javascript
     export class PlayerController { ... }
     ```
   - In files consuming these classes, explicitly import them at the top:
     ```javascript
     import { PlayerController } from '../PlayerController.js';
     ```
   - Remove manual `window.ClassName = ClassName;` assignments.
4. **Modularize Data and Configurations**:
   - In configuration files like `src/data/WorldFactions.js`, export constants directly:
     ```javascript
     export const WORLD_KINGDOMS = { ... };
     ```
   - Remove `window.WORLD_KINGDOMS = ...` bindings.
5. **Handle Global Phaser/Library Dependencies**:
   - Since Phaser is loaded as a global script in `index.html` (`window.Phaser`), our local ES modules can safely access the global `Phaser` variable directly. Alternatively, keep Phaser global and import all local application files as modules.

---

## Issue 1.2: Monolithic Files Exceeding Maintenance Limits

### 1. Root Causes & Code Context
Several critical files contain mixed concerns and monolithic logic exceeding the 1,000-line threshold:
- `index.html` (~2,176 lines) mixes DOM structure, multiple game screen HTML overlays (e.g. Party Builder, 1v1 Fighter Suite), and large inline `<style>` CSS blocks.
- `src/scenes/GameScene.js` (~1,486 lines) manages Phaser lifecycle methods, input handling, extensive collision checks, groups setup, and camera bounds.
- `src/PlayerController.js` (~1,458 lines) handles physics updates, player keyboard inputs, AI inputs, animations creation, and combat state triggers.
- Other monoliths: `src/player/CompanionAI.js` (1,567 lines), `src/NPCController.js` (1,624 lines), `src/player/ShopManager.js` (1,056 lines), `src/player/SpellController.js` (1,292 lines).

### 2. Step-by-Step Fix Strategy
Following the codebase modularization rules from `AGENTS.md`, these files should be split into cohesive helper modules:
1. **Modularize `index.html`**:
   - **Extract CSS**: Extract large inline `<style>` blocks (such as the main menu styles, Party Builder styles, and Fighter Suite styles) into dedicated external CSS files (e.g., `src/styles/party-builder.css` and `src/styles/fighter-suite.css`). Reference them using `<link rel="stylesheet">` tags in `index.html`'s `<head>`.
   - **Extract UI Templates**: Move large overlay HTML blocks into HTML templates or load them dynamically.
2. **Modularize JavaScript Controllers (e.g. `PlayerController.js`)**:
   - **Identify Domain Concerns**: Group code by functionality (e.g., Animation Slicing & Setup, Physics & Movement, Combat Attacks & Spells).
   - **Extract Helper Classes**: Create helper files such as `src/player/PlayerPhysics.js` and `src/player/PlayerAnimations.js`.
   - **Delegate via Instance/Delegation Patterns**:
     - Instantiate helpers inside the main class constructor:
       ```javascript
       this.physicsHelper = new PlayerPhysics(this);
       ```
     - Delegate specific calls:
       ```javascript
       update(time, delta) {
           this.physicsHelper.update(time, delta);
       }
       ```
     - Preserve 100% of the original variables and class structures so dependent modules (like `CompanionAI` or `GameScene`) continue working without breaking changes.
3. **Modularize `GameScene.js`**:
   - Extract collision logic overlapping functions into a separate `CollisionManager.js` module.
   - Extract game groups and physics boundary initialization into a `PhysicsSetup.js` helper.
4. **Modularize `CompanionAI.js` and `NPCController.js`**:
   - Extract decision trees, AI behaviors, and pathfinding into standalone utility classes or behavior sub-modules (e.g. `src/player/CompanionDecisions.js`), calling them via delegation.

---

## Issue 1.3: Performance Bottleneck via Synchronous Pixel Scanner

### 1. Root Causes & Code Context
In `src/RescueeNPCFactory.js` (lines 183-195, 206-227) and `src/scene_modules/CharacterComposer.js` (lines 143-156, 178-188, etc.), the game generates dynamic composite textures using HTML5 canvas. For each sheet generated (with up to 70 frames):
- The helper `findFootY` runs a nested loop scanning pixels from bottom to top using `ctx.getImageData`.
- A separate frame pixel scan checks for visible pixels using `ctx.getImageData`.
- This causes up to **140 synchronous calls to `ctx.getImageData`** per composite sheet.
- Because `getImageData` forces CPU-GPU pipeline flushing and runs synchronously on the main thread, this causes severe frame rate drops during scene loading.

### 2. Step-by-Step Fix Strategy
We can reduce the number of `getImageData` calls per generated texture from 140 to **exactly 1** by caching the entire canvas pixels:
1. **Fetch Entire Canvas Once**:
   At the beginning of the frame slicing/scanning block in `_compositeTexture` / `generateTexture`, grab the image data for the entire canvas:
   ```javascript
   const canvasWidth = canvas.width;
   const canvasHeight = canvas.height;
   const entireImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
   ```
2. **Refactor `findFootY` to Read Cached Data**:
   Update `findFootY` to read directly from the cached 1D array instead of making a new `getImageData` call:
   ```javascript
   const findFootY = (fx, fy, fw, fh, data, W) => {
       const cx = Math.max(0, Math.round(fx));
       const cy = Math.max(0, Math.round(fy));
       const cw = Math.min(W - cx, Math.round(fw));
       const ch = Math.round(fh);
       if (cw <= 0 || ch <= 0) return ch - 1;

       // Scan upwards from the bottom of the frame
       for (let yy = ch - 1; yy >= 0; yy--) {
           for (let xx = 0; xx < cw; xx++) {
               const pixelIndex = (cy + yy) * W + (cx + xx);
               const alpha = data[pixelIndex * 4 + 3];
               if (alpha > 16) return yy;
           }
       }
       return ch - 1;
   };
   ```
3. **Refactor Visible Pixel Scanner to Read Cached Data**:
   Inside the frame loop, replace the second `ctx.getImageData` call with a direct lookup in the cached array:
   ```javascript
   let hasPixels = false;
   if (cw > 0 && ch > 0) {
       for (let yy = 0; yy < ch; yy++) {
           for (let xx = 0; xx < cw; xx++) {
               const pixelIndex = (cy + yy) * canvasWidth + (cx + xx);
               if (entireImageData[pixelIndex * 4 + 3] > 16) {
                   hasPixels = true;
                   break;
               }
           }
           if (hasPixels) break;
       }
   }
   ```
4. **Apply to Both Target Files**:
   Implement this optimization in both `src/RescueeNPCFactory.js` and the multiple compositing methods within `src/scene_modules/CharacterComposer.js`.
5. **Expected Performance Gain**:
   Eliminating up to 139 synchronous CPU-GPU roundtrips per NPC sheet will resolve transition frame drops and ensure smooth zone loading.
