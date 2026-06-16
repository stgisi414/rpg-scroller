# Handoff Report — 2026-06-16T19:56:00Z

## 1. Observation
I directly scanned the project structure and source code:
*   In `src/AssetManager.js` (lines 34–35 and 175–176):
    ```javascript
    this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 102, frameHeight: 128 });
    ...
    this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 64, frameHeight: 64 });
    ```
*   Running `inspect_sheets.py` returned file sizes:
    `[bandit] Path: src/assets/bandit.png | Size: 1024x512`
    `Grid size: 102x128 | Active frames per row: [5, 9, 8, 10]`
*   In `src/main.js` (lines 132–144), `heavy_knight` class specifies:
    `image: 'src/assets/Heavy Knight 2/Heavy Knight 2/Heavy Knighty sheet2 red.png'`
    `die: { start: 50, end: 54 }`
    `inspect_sheets.py` size: `637x192` (7 cols, 3 rows, total 21 frames).
*   In `src/NPCController.js` (lines 79–109):
    ```javascript
    this.chatSubmitBtn.addEventListener('click', () => this.handlePlayerMessage());
    this.chatInput.addEventListener('keypress', (e) => { ... });
    ```
    and the `destroy()` method lacks `removeEventListener` cleanup.
*   In `src/scenes/GameScene.js` (line 2017):
    ```javascript
    const pc = new PlayerController(this, this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'samurai_rival', 'hostile');
    ```
    where the constructor for `PlayerController` expects `(scene, x, y, inputManager, options = {})`.
*   In `src/PlayerController.js` (line 2610):
    `if (window.saveData.worldMap) { ... }`
    while `WorldManager.js` (lines 10-18) initializes save data with `zones: {}`.
*   In `src/PlayerController.js` (line 1340) and `src/InputManager.js`:
    `this.inputManager.keys.space` is referenced but never declared in `addKeys`.

---

## 2. Logic Chain
1. **Asset Collision:** Since `AssetManager.js` preloads `bandit` twice, the second registration overrides the first, forcing Phaser to slice `bandit.png` into 64x64 cells instead of 102x128. Because the animations in `GameScene.js` assume a 10-column layout of 102x128 frames (e.g. index 30 for attack), playing them on a 16-column 64x64 layout displays incorrect frame slices.
2. **Out of Bounds:** Since `Heavy Knighty sheet2 red.png` is `637x192` (total 21 frames), referencing frame indices up to 54 in the `heavy_knight` animation config accesses non-existent indices, producing blank rendering or runtime errors.
3. **Memory Leaks:** Since `NPCController` hooks DOM events on global buttons (`chat-submit`) using anonymous arrow functions and doesn't remove them in `destroy()`, these callbacks accumulate on the DOM buttons and fire on old destroyed controllers upon every click, leading to state corruption.
4. **GM Ambush Crash:** Since the GM Ambush instantiates `PlayerController` with `'samurai_rival'` (a string) as the 4th argument, the controller receives a string instead of an `InputManager` object. When it checks `this.inputManager.keys.left` during update, the game immediately crashes with a `TypeError`.
5. **Progression Mismatch:** Since `saveData` uses `.zones` to record procedurally built levels but `PlayerController` / `NPCController` check `.worldMap` (which is `undefined`), the player always respawns at Zone 0, and NPC deaths/party recruitment states are never saved.

---

## 3. Caveats
*   I did not run the game in a browser interface as this is a headless CODE_ONLY environment.
*   Assumed that `Black heavy.png` or `Red heavy.png` are the correct 12-row replacements for `Heavy Knighty sheet2 red.png` without inspecting every pixel, based on the `Active frames per row: [5, 5...]` matching the animation definitions.

---

## 4. Conclusion
The codebase contains major layout overrides (duplicate preloads), out-of-bounds frame maps (Heavy Knight red sheet), memory leaks in DOM event listeners, a critical crash in the GM ambush event handler, and checkpoint checkpoint bugs due to a `zones`/`worldMap` property rename mismatch.

---

## 5. Verification Method
1.  **Code Inspection:** View `src/AssetManager.js`, `src/scenes/GameScene.js` (line 2017), `src/PlayerController.js` (lines 1340, 2610) to confirm the mismatches.
2.  **Runtime Log Check:** Check browser console after GM Ambush triggers to see `TypeError` (crashes when reading properties of string).
3.  **NPC Dialogue:** Transition between zones and click Chat Submit multiple times. Inspect console for duplicate `handlePlayerMessage` calls.
