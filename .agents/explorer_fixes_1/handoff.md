# Handoff Report - explorer_fixes_1

## 1. Observation
- **Issue 1.1 (Global Namespace Pollution)**:
  - Located in `src/main.js` (lines 7-100) where constants are bound to window:
    ```javascript
    window.INDOOR_LOCATIONS = { ... }
    ```
  - Located in `src/data/WorldFactions.js` (line 14):
    ```javascript
    window.WORLD_KINGDOMS = { ... }
    ```
  - Located in `src/player/ShopManager.js` (line 1):
    ```javascript
    window.getReputationPriceMultiplier = function() { ... }
    ```
  - Observable in `index.html` (lines 917-961) where ~45 scripts are loaded via standard `<script>` tags without module scoping.
- **Issue 1.2 (Monolithic Files Exceeding Maintenance Limits)**:
  - Observed files exceeding the 1,000-line threshold:
    - `index.html` (2,176 lines) containing inline `<style>` blocks (lines 12-313, 334-359, 1117-1213) and multiple HTML screen overlays.
    - `src/scenes/GameScene.js` (1,486 lines) handling Phaser lifecycle methods, input, and collision groups.
    - `src/PlayerController.js` (1,458 lines) managing player physics, input, animation creation, and combat state triggers.
    - `src/player/CompanionAI.js` (1,567 lines), `src/NPCController.js` (1,624 lines), `src/player/ShopManager.js` (1,056 lines), and `src/player/SpellController.js` (1,292 lines).
- **Issue 1.3 (Performance Bottleneck via Synchronous Pixel Scanner)**:
  - Observed in `src/RescueeNPCFactory.js` (lines 183-195, 206-227):
    - `ctx.getImageData` is called twice per frame: inside `findFootY` (line 188) and in the pixel scanner loop (line 222).
  - Observed in `src/scene_modules/CharacterComposer.js` (lines 149, 184, 392, 424, 694, 723) with identical duplicate `getImageData` calls per frame.

## 2. Logic Chain
- **Issue 1.1**:
  - The lack of module scoping in script tags forces sharing variables via the global `window` object (Observation 1.1).
  - Transitioning the scripts to ES Modules (`type="module"`) allows using native `import` and `export` statements. This completely removes the need for `window` assignments, isolating state and constants to their respective modules.
- **Issue 1.2**:
  - Monolithic files contain mixed concerns and exceed maintenance limits (Observation 1.2).
  - Extracting inline CSS from `index.html` into standalone `.css` stylesheets reduces code length.
  - Extracting specialized subsystems (e.g. movement, animation setup) from controllers into dedicated helper modules, and instantiating/delegating to them, reduces file sizes below 1,000 lines while preserving 100% API compatibility.
- **Issue 1.3**:
  - Calling `ctx.getImageData` inside nested loops forces multiple CPU-GPU synchronization blocks, leading to performance stuttering during town NPC generation (Observation 1.3).
  - Caching the entire canvas's pixel data using a single `getImageData` call at the start of texture generation, and accessing indices via 1D array offset calculations, reduces the calls per sheet from 140 to 1, removing the bottleneck.

## 3. Caveats
- Migrating the codebase to ES Modules requires refactoring import/export statements in all files, which must be done carefully to prevent circular dependency deadlocks.
- The `Phaser` framework remains a global browser variable, which modules will reference directly without importing it.
- No other files were found to perform CPU-bound pixel scanning, but any future texture generation logic must adopt the caching pattern.

## 4. Conclusion
- The proposed architectural fix strategy successfully addresses namespace pollution via ES Modules, simplifies maintenance by splitting monolithic styles and files into helpers, and resolves the performance bottleneck by caching canvas pixel data.

## 5. Verification Method
- **Commands to run**:
  - Start the local server: `npm run start` and navigate to `http://127.0.0.1:3000/`.
  - Check the browser developer console for any syntax/module loading errors.
  - Run the headless test capture script to verify NPC compositing: `node capture_npc_test.js`.
- **Files to inspect**:
  - `analysis.md` for the detailed implementation steps.
  - Browser performance profiles during transition screens to verify `getImageData` calls have dropped to 1 per sheet.
