# RPG Scroller Codebase Audit Report

This report presents a comprehensive quality and architecture audit of the **Elden Soul** side-scrolling RPG codebase. The findings below highlight critical structural hazards, gameplay mechanic discrepancies, memory leaks, and fatal crash conditions identified during the code verification and exploration phase.

---

## 1. Architecture

### Issue 1.1: Global Namespace Pollution
* **Citations**: 
  - `src/main.js` (Lines 201-204, 824)
  - `src/player/ShopManager.js` (Line 1)
  - `src/data/WorldFactions.js` (Line 14)
* **Details**: 
  The codebase extensively pollutes the global `window` namespace by attaching core application state, configurations, lookup tables, and function utilities directly to it. Key examples include:
  - Global save and config data: `window.saveData`, `window.autoplayConfig`
  - Global static configurations: `window.INDOOR_LOCATIONS`, `window.WORLD_KINGDOMS`, `window.PASSIVE_SKILLS_DATA`
  - Global functions: `window.getReputationPriceMultiplier`
  - Class definitions: `window.RescueeNPC = RescueeNPC` (attached instead of utilizing proper ES module import/export structures)
* **Impact**: 
  This tight coupling introduces high risk of namespace collisions, hinders modular unit testing, and complicates codebase refactoring by hiding dependencies behind global scope accesses.

### Issue 1.2: Monolithic Files Exceeding Maintenance Limits
* **Citations**:
  - `index.html` (Entire file - Lines 1-1756)
  - `src/scenes/GameScene.js` (Lines 1-1486)
  - `src/player/CompanionAI.js` (Lines 1-1567)
  - `src/NPCController.js` (Lines 1-1624)
  - `src/PlayerController.js` (Lines 1-1458)
  - `src/player/ShopManager.js` (Lines 1-1056)
  - `src/player/SpellController.js` (Lines 1-1292)
* **Details**: 
  Several core controller, manager, and scene files contain monolithic implementations exceeding 1,000 lines of code. This highly coupled code pattern violates the custom modularization rules defined in `AGENTS.md`, which dictate that large source files should be partitioned into cohesive helper modules. Key examples include `index.html` embedding extensive CSS style rules and HTML templates directly, and scene/controller logic containing mixed concerns (e.g. physics, HUD updates, and player states all coupled inside `PlayerController.js`).
* **Impact**: 
  Monolithic files exceed human comprehension limits and code-assistant context bounds. They significantly increase cognitive load, introduce regression risks during edits, and make maintenance highly error-prone.

### Issue 1.3: Performance Bottleneck via Synchronous Pixel Scanner
* **Citations**: 
  - `src/RescueeNPCFactory.js` (Lines 183-195, 206-227)
* **Details**: 
  Within the composite texture generation logic (`_compositeTexture`), the helper function `findFootY` invokes `ctx.getImageData` inside a nested loop. The loop scans up to 70 frames (7 rows * 10 columns) for every single generated composite NPC sheet. An additional pixel transparency scan is executed for each frame to check for visible pixels, resulting in multiple blocking calls to `getImageData`.
* **Impact**: 
  Because `getImageData` forces CPU-GPU synchronization and runs synchronously on the browser's main execution thread, generating multiple town NPCs during level transitions causes significant CPU freezes and visible frame drops.

---

## 2. Gameplay

### Issue 2.1: Double Jump Mechanics Exploits Falling States
* **Citations**: 
  - `src/PlayerController.js` (Lines 352-371, 1277-1305)
* **Details**: 
  The player's jump tracking mechanism resets the jump counter to `0` only when they are grounded (`onGround` is true). When a player walks or falls off a platform without jumping first, their `this.jumps` count remains at `0`. If they subsequently execute a jump while in mid-air, the input logic allows them to perform another jump because `this.jumps < 2` is still satisfied. This results in a sequence of three distinct vertical movements (Initial Fall -> Air Jump 1 -> Air Jump 2).
* **Impact**: 
  This behavior allows players to exploit falling states to reach unintended heights, bypassing level design boundaries and platforming challenges.

### Issue 2.2: Free Blessings & Broken Healing at Temples
* **Citations**: 
  - `src/npc/NPCCampaignHelper.js` (Lines 433-435, 439-444)
* **Details**: 
  When the player prays/heals at a temple, the logic checks if `npc.player.gold >= healCost`. However, player gold is stored in `window.saveData.gold` or `npc.player.inventory.gold`. The `PlayerController` instance `npc.player` does not possess a `.gold` property. As a result, `npc.player.gold` evaluates to `undefined`, and the comparison `undefined >= 25` always evaluates to `false`. Gold is never deducted, and the player is never healed. Conversely, the stat blessing logic (which increments a random stat and recalculates stats) is situated outside the conditional scope check and executes unconditionally.
* **Impact**: 
  Players receive infinite stat blessings at temples for free, while the intended temple healing functionality remains completely broken and inaccessible.

---

## 3. Bug Hunting

### Issue 3.1: GPU/Canvas Memory Leaks via Dynamic Textures
* **Citations**: 
  - `src/RescueeNPCFactory.js` (Lines 74, 160)
  - `src/scene_modules/CharacterComposer.js` (Lines 93, 118, 367, 675)
* **Details**: 
  The game dynamically generates unique composite textures for each town NPC using unique keys generated with random numbers or timestamps (e.g., `custom_npc_...` or `rescuee_...`). These textures are added directly to Phaser's TextureManager via `scene.textures.addCanvas`. However, there is no corresponding teardown logic to remove these canvas textures when NPCs are destroyed or when the player changes zones.
* **Impact**: 
  Dynamic textures accumulate in GPU/browser memory indefinitely. Over long play sessions, this continuous accumulation leads to severe memory leaks and eventual browser tab crashes.

### Issue 3.2: Fatal Crash Risk on Return to Main Menu During Death Sequence
* **Citations**: 
  - `src/player/StatusEffectManager.js` (Lines 636-642)
* **Details**: 
  When a player dies, a sequence of nested `setTimeout` timers controls the visual death and fade-out animation. If a player returns to the main menu or exits the game during this sequence, the active GameScene is shut down and the Phaser game instance is destroyed. However, the native `setTimeout` callbacks remain scheduled in the browser event loop. When the final timer fires, it executes `scene.scene.restart()`.
* **Impact**: 
  Since the parent scene reference has been destroyed, calling `scene.scene.restart()` throws an uncaught `TypeError`, causing a fatal crash and freezing the application interface.

### Issue 3.3: Unhandled JSON Parse on LocalStorage Boot Files
* **Citations**: 
  - `src/NPCController.js` (Line 1359)
  - `src/PlayerController.js` (Line 591)
  - `src/WorldManager.js` (Lines 98, 568)
  - `src/main.js` (Lines 407, 455)
* **Details**: 
  The save and load system retrieves save slot strings from browser `localStorage` and parses them directly using `JSON.parse(localStorage.getItem('elden_soul_saves') || '[]')`. While some calls are wrapped in exception handlers, multiple lookup locations (such as inside `NPCController.js` and `WorldManager.js`) completely lack `try-catch` wrapper blocks.
* **Impact**: 
  If a save write operation is interrupted, or if the stored JSON string gets corrupted, any attempt to load or save data will throw an unhandled syntax error. This completely prevents the game from initializing on boot.

### Issue 3.4: HP, MP, and SP Reset Bug During Stat Recalculations
* **Citations**: 
  - `src/player/StatsManager.js` (Lines 139-140)
* **Details**: 
  Inside the stat recalculation utility (`StatsManager.recalculateStats()`), the player's active health (`player.hp`) is synchronized by checking if `window.saveData.hp` exists and copying its value. However, `window.saveData.hp` is only updated when a checkpoint is saved (not dynamically as the player takes damage).
* **Impact**: 
  Any action that triggers a stat recalculation (such as opening or closing shops, upgrading gear, buying items, or allocating passive skills) will instantly reset the player's active health to the checkpoint's saved state, either healing them to full or reversing recent damage.
