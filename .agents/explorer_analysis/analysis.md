# Elden Soul Codebase & Asset Analysis Report

## Executive Summary
A comprehensive codebase scan and asset inspection of the **Elden Soul** RPG scroller game was conducted. Several critical rendering, physics, and gameplay-logic bugs were identified, including double-registration issues, out-of-bounds frame index references, memory leaks in global event binding, and argument signature mismatches that crash the game. This report provides detailed evidence, root causes, and actionable solutions.

---

## 1. Asset & Sprite Sheet Analysis

A custom pixel-level scanner was run on the spritesheets in `src/assets/`. The following grid configurations and properties were verified:

| Key | Asset Path | Dimensions | Grid Size | Active Frames / Row | Notes / Anomalies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`knight`** | `GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png` | 800x1088 | 80x64 | `[5, 8, 8, 8, 4, 4, 4, 5, 8, 8, 8, 4, 4, 4, 6, 8, 10]` | Standard 10 columns. |
| **`wizard`** | `GandalfHardcore Wizard/Black Wizard sheet.png` | 384x704 | 64x64 | `[6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5]` | 6 columns. Row 10 has 5 active. |
| **`samurai`** | `GandalfHardcore Samurai/Samurai Sheet black.png` | 768x1152 | 96x64 | `[5, 8, 8, 8, 8, 4, 4, 4, 5, 8, 5, 4, 4, 6, 5, 8, 8, 1]` | 8 columns. |
| **`ranger`** | `GandalfHardcore Archer/GandalfHardcore Archer black sheet.png` | 704x320 | 64x64 | `[5, 11, 8, 5, 6]` | 11 columns. |
| **`knight_rival`** | `Heavy Knight 2/Heavy Knight 2/Heavy Knighty sheet2 red.png` | 637x192 | 80x64 | `[7, 7, 6]` | **CRITICAL MISMATCH:** Only 3 rows. Configured animations require 12 rows. |
| **`megaboss_rival`** | `Heavy Knight/Heavy Knight/Red heavy.png` | 455x768 | 80x64 | `[5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]` | 5 columns. Remainder width is 55px (non-divisible). |
| **`bandit`** | `bandit.png` | 1024x512 | **Conflict** | `[8, 8, 14, 15, 13, 13, 16, 16]` (64x64) or `[5, 9, 8, 10]` (102x128) | **CRITICAL CONFLICT:** Registered as both 102x128 and 64x64. |
| **`frost_giant`** | `frost_giant.png` | 1024x512 | **Conflict** | `[8, 9, 15, 15, 13, 13, 16, 16]` (64x64) or `[6, 9, 9, 10]` (102x128) | **CRITICAL CONFLICT:** Double loaded. Manually sliced in GameScene. |
| **`lich_lord`** | `lich_lord.png` | 1024x512 | Custom | Loaded as static image | Sliced dynamically at runtime in GameScene. |
| **`skeleton`** | `skeleton.png` | 1024x512 | Custom | Loaded as static image | Sliced dynamically at runtime in GameScene. |
| **`training_dummy`**| `training_dummy.png` | 1024x559 | 128x279 | `[8, 8]` | 8 columns, 2 rows. |
| **`slime`** | `GandalfHardcore Slime Enemy/Slime green.png` | 256x96 | 32x32 | `[5, 8, 6]` | 8 columns. |
| **`goblin`** | `GandalfHardcore Goblin sheet/Goblin enemy green sheet.png` | 504x640 | 84x64 | `[6, 6, 6, 6, 6, 6, 6, 6, 6, 3]` | 6 columns. |

---

## 2. Identified Bugs & Vulnerabilities

### Bug 1: Double-Loaded Sprite Sheet Grid Overwrite (Bandit & Frost Giant)
*   **Location:** `src/AssetManager.js` lines 34-35 and lines 175-176.
*   **Observation:**
    *   Line 34: `this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 102, frameHeight: 128 });`
    *   Line 175: `this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 64, frameHeight: 64 });`
*   **Root Cause:** Duplicated key loading in the preloader. The second registration (64x64) overrides the first (102x128). Because the sheet is 1024x512, Phaser slices it into 16 columns of 64x64. However, the animations in `GameScene.js` assume a 10-column layout of 102x128 frames (e.g. `bandit-move` start: 10, which corresponds to Row 1 Col 0 in a 10-column layout, but Row 0 Col 10 in a 16-column layout). This results in rendering scrambled fragments of multiple frames on screen (visual artifacts).
*   **Solution:** Remove lines 175 and 176 from `src/AssetManager.js`. Ensure `bandit` uses `{ frameWidth: 102, frameHeight: 128 }`. For `frost_giant`, load it as a plain image (`this.scene.load.image`) since it is dynamically sliced in `GameScene.js` anyway.

---

### Bug 2: Heavy Knight / Knight Rival Animation Out-of-Bounds Crash
*   **Location:** `src/main.js` line 132 (`classesData.heavy_knight.image`) and line 140 (`animFrames`).
*   **Observation:** The class `heavy_knight` (inherited by `knight_rival`) is configured with the image `Heavy Knighty sheet2 red.png`. This image is `637x192` (7 columns, 3 rows). However, the animations are defined as:
    *   `die: { start: 50, end: 54 }` (Row 10)
    *   `hit: { start: 30, end: 34 }` (Row 6)
    *   `dashRow: 5` (Row 5)
*   **Root Cause:** Mismatch between the asset path loaded (a 3-row sheet subset) and the animation frames configured (which require a 12-row sheet). Playing any out-of-bounds frames (index > 20) results in blank/invisible sprites or Phaser console warnings.
*   **Solution:** Change `heavy_knight`'s image path to `src/assets/Heavy Knight/Heavy Knight/Black heavy.png` (for players) or `Red heavy.png` (for rivals) and load them as 80x64 sheets. These files are `455x768` (5 columns, 12 rows) and contain all 12 rows of animations.

---

### Bug 3: Memory Leaks and Duplicate Binding in NPC Event Listeners
*   **Location:** `src/NPCController.js` lines 79-109 and line 630 (`destroy`).
*   **Observation:**
    *   The constructor adds listeners directly to DOM elements using anonymous arrow functions:
        `this.chatSubmitBtn.addEventListener('click', () => this.handlePlayerMessage());`
        `this.scene.input.keyboard.on('keydown-ESC', () => { ... });`
    *   The `destroy()` method does not remove these listeners.
*   **Root Cause:** Anonymous event handlers are bound globally and never cleaned up when NPC controllers are destroyed (e.g. during zone transitions). Over time, this creates a massive memory leak. When a new NPC is talked to, clicking "Submit" triggers `handlePlayerMessage()` on all old, destroyed NPC controllers, crashing the game or sending duplicate API calls.
*   **Solution:** Store references to the bound functions (e.g. `this.chatSubmitHandler = this.handlePlayerMessage.bind(this)`) and call `removeEventListener` and `this.scene.input.keyboard.off('keydown-ESC')` inside `destroy()`.

---

### Bug 4: Game Master Ambush Instantiation Crash
*   **Location:** `src/scenes/GameScene.js` line 2017.
*   **Observation:**
    `const pc = new PlayerController(this, this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'samurai_rival', 'hostile');`
*   **Root Cause:** Incorrect argument types. The constructor expects:
    `constructor(scene, x, y, inputManager, options = {})`
    Passing the string `'samurai_rival'` as the `inputManager` and the string `'hostile'` as `options` sets `isAI` to `false` (since `'hostile'.isAI` is undefined). During update, the controller tries to read keys from `this.inputManager.keys`, which throws a `TypeError: Cannot read properties of undefined (reading 'keys')` because `this.inputManager` is a string. This crashes the game instantly.
*   **Solution:** Call the scene's helper function instead:
    `this.spawnHeroAI('samurai_rival', this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'hostile');`
    This helper correctly packages parameters and sets up physics groups.

---

### Bug 5: `worldMap` Mismatch causing Checkpoint Progression Failure
*   **Location:**
    *   `src/PlayerController.js` line 2610
    *   `src/NPCController.js` line 564
    *   `src/WorldManager.js` line 158
*   **Observation:** The code references `window.saveData.worldMap` to search for checkpoints, delete NPCs, and write cache updates. However, the world generation database is stored in `window.saveData.zones`.
*   **Root Cause:** Refactoring mismatch. `worldMap` is undefined, causing:
    1.  Players always respawning at Zone 0 on death (checkpoint system broken).
    2.  NPCs never permanently joining the party or being removed when killed.
*   **Solution:** Rename all references to `window.saveData.worldMap` to `window.saveData.zones` throughout the codebase.

---

### Bug 6: Control Mapping Spacebar Defect
*   **Location:** `src/PlayerController.js` line 1340 (`isUpDown()`).
*   **Observation:**
    `isUpDown() { return this.isAI ? this.aiInput.up : (this.inputManager.keys.up.isDown || this.inputManager.keys.space); }`
*   **Root Cause:** `space` is never registered in `InputManager.js`'s `keys` configuration. Therefore, `this.inputManager.keys.space` is `undefined` (falsy). Spacebar does not work for jumping.
*   **Solution:** Add `space: Phaser.Input.Keyboard.KeyCodes.SPACE` to `addKeys` in `src/InputManager.js`.

---

### Bug 7: Infinite Stat Farming Exploit
*   **Location:** `src/NPCController.js` line 425 (`study` action).
*   **Observation:** The "study" activity directly mutates `this.player.classData.stats.int += 1`.
*   **Root Cause:** The mutation permanently alters the base stat and is persisted to local storage. There is no decay, limit, or timer, allowing players to farm infinite INT by repeatedly studying.
*   **Solution:** Convert it into a temporary buff (e.g. status effect) or charge a significant gold fee to make it a balanced permanent upgrade.

---

### Bug 8: AI Potion Use Defect
*   **Location:** `src/PlayerController.js` line 1460 (`HEAL` tactic) and line 259 (inventory fallback).
*   **Observation:** When Gemini commands a `HEAL` tactic, the AI checks `if (this.inventory && this.inventory.potions > 0)`.
*   **Root Cause:** For AI instances, `this.inventory` is initialized as `{ weapon: { key: 'weapon-stick', damageBonus: 5 } }` in the constructor. Potions are only set to 2 inside the fallback AI movement block, which is skipped when Gemini is active. Thus, AIs under Gemini control can never heal.
*   **Solution:** Initialize `potions: 2` in the AI inventory setup in the `PlayerController` constructor (line 259).
