# Analysis and Proposed Fix Strategy for Stability Issues

This document analyzes the root causes of Issues 3.1, 3.2, 3.3, and 3.4 as identified in the `audit_report.md` and proposes detailed, step-by-step fix strategies to resolve them.

---

## Issue 3.1: GPU/Canvas Memory Leaks via Dynamic Textures

### 1. Analysis of Root Cause
The game dynamically generates composite canvas textures for rescuees, random NPCs, and special enemies using:
* `RescueeNPCFactory.js` (line 160): `this.scene.textures.addCanvas(textureKey, canvas)`
* `CharacterComposer.js` (lines 118, 367, 675): `scene.textures.addCanvas(uniqueKey, canvas)`

These dynamic textures are registered in Phaser's global `TextureManager` (which persists across scene transitions and runs at the game-instance level). However:
1. When NPCs or enemies are destroyed or when a zone transition occurs in `GameScene.js` (lines 551-580), these canvas textures are never removed from the `TextureManager`.
2. As the player traverses multiple zones, new unique texture keys containing random numbers or timestamps (e.g. `custom_npc_...`, `special_enemy_...`, `rescuee_...`) are continuously added.
3. This causes an unbounded accumulation of offscreen canvases in GPU/browser memory, leading to severe memory leaks and eventual page crashes.

Active party members (whose `classId`s also start with `custom_npc_`) must preserve their textures during zone transitions as they remain in the party and cross between zones.

### 2. Proposed Fix Strategy
A helper function `cleanupDynamicTextures(deleteAll)` should be introduced in `GameScene.js` to prune unused dynamic textures while preserving textures belonging to active party members.

**Step-by-Step Implementation Strategy:**
1. **Open `src/scenes/GameScene.js`** and define a new method `cleanupDynamicTextures(deleteAll = false)` on the `GameScene` class:
   ```javascript
   cleanupDynamicTextures(deleteAll = false) {
       if (!this.textures) return;

       // 1. Collect texture keys of active party members and the player to preserve them
       const activeKeys = new Set();
       if (!deleteAll) {
           if (this.player && this.player.classId) {
               activeKeys.add(this.player.classId);
           }
           if (this.partyMembers) {
               this.partyMembers.forEach(member => {
                   if (member && member.classId) {
                       activeKeys.add(member.classId);
                   }
               });
           }
       }

       // 2. Iterate through all textures in the manager and remove unused dynamic ones
       const keys = this.textures.getTextureKeys();
       keys.forEach(key => {
           if (key.startsWith('custom_npc_') || key.startsWith('special_enemy_') || key.startsWith('rescuee_')) {
               if (deleteAll || !activeKeys.has(key)) {
                   this.textures.remove(key);
               }
           }
       });
   }
   ```
2. **Hook zone-transition cleanup**: In `src/scenes/GameScene.js` inside the `camerafadeoutcomplete` event callback (around lines 555-556), invoke the cleanup helper:
   ```javascript
   this.cleanupDynamicTextures(false);
   ```
3. **Hook scene-shutdown cleanup**: In `src/scenes/GameScene.js` inside the `cleanupScene()` method (around line 1332), invoke the cleanup helper with `true` to delete all dynamic textures when the scene shuts down:
   ```javascript
   this.cleanupDynamicTextures(true);
   ```

---

## Issue 3.2: Fatal Crash Risk on Return to Main Menu During Death Sequence

### 1. Analysis of Root Cause
In `src/player/StatusEffectManager.js` (lines 578-643), when a player dies, a series of nested native browser `setTimeout` calls are scheduled to manage the visual "YOU HAVE FALLEN" / "REBORN" overlays and transition:
* Line 636: `setTimeout` starts the fade-out of the death overlay.
* Line 639: Nested `setTimeout` executes `overlay.remove()` and `scene.scene.restart()`.

Because these are native browser timers, they are independent of the Phaser scene lifecycle. If the player chooses to exit to the main menu (shutting down the `GameScene` and destroying the Phaser game instance) while this death sequence is active:
1. The `setTimeout` timers remain scheduled in the browser's global event loop.
2. When the final timer fires, it calls `scene.scene.restart()`.
3. Since the scene has been shutdown, `scene.scene` is undefined or inactive, throwing an uncaught `TypeError` and causing a crash.
4. Additionally, the black `#death-rebirth-overlay` DOM element is never removed, leaving a black overlay covering the main menu screen.

### 2. Proposed Fix Strategy
We must replace native browser timers with Phaser's scene-bound timers, which are automatically destroyed when the scene is shut down, and add a cleanup routine to ensure the DOM overlay is removed.

**Step-by-Step Implementation Strategy:**
1. **Open `src/player/StatusEffectManager.js`** and modify the death sequence block. Replace all five instances of `setTimeout(callback, delay)` with `scene.time.delayedCall(delay, callback)`.
2. **Add defensive checks** at the start of each timer callback to abort execution if the scene is no longer active:
   ```javascript
   if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
   ```
   *Example structure:*
   ```javascript
   // Replace:
   // setTimeout(() => { ... }, 2000);
   // With:
   scene.time.delayedCall(2000, () => {
       if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
       // ... inner timer callbacks updated similarly ...
   });
   ```
3. **Clean up DOM element on shutdown**: Open `src/scenes/GameScene.js` and edit `cleanupScene()` (around lines 1332-1370) to query and remove the overlay if it exists when the scene unloads:
   ```javascript
   const overlay = document.getElementById('death-rebirth-overlay');
   if (overlay) {
       overlay.remove();
   }
   ```

---

## Issue 3.3: Unhandled JSON Parse on LocalStorage Boot Files

### 1. Analysis of Root Cause
The game retrieves the array of save slots from `localStorage` using `localStorage.getItem('elden_soul_saves')` and parses it via `JSON.parse`. While `src/main.js` defines a local helper `getSaves()` that is wrapped in a `try-catch` block, this helper is not exposed globally, leading other source files to parse local storage directly. 

The following locations completely lack `try-catch` protection around `JSON.parse(localStorage.getItem('elden_soul_saves') || '[]')`:
* `src/NPCController.js` (line 1359)
* `src/WorldManager.js` (line 98)
* `src/WorldManager.js` (line 568)
* `src/scenes/GameScene.js` (line 370)
* `src/scenes/GameScene.js` (line 518)
* `src/world/TownBuilder.js` (line 20)
* `src/world/TownBuilder.js` (line 161)
* `src/world/TownBuilder.js` (line 448)

If any save operation is interrupted (e.g. browser close or tab crash mid-write) or the JSON string gets corrupted, any parse call in these locations will throw an unhandled `SyntaxError`, halting execution and preventing the game from booting or saving/loading.

### 2. Proposed Fix Strategy
A centralized, exception-safe pair of global save/load utilities should be exposed on the `window` object, and all direct `localStorage` accesses should be replaced with calls to these utilities.

**Step-by-Step Implementation Strategy:**
1. **Open `src/main.js`** and expose `getSaves()` and a writing helper on the `window` object:
   ```javascript
   window.getSaves = function() {
       try {
           const data = localStorage.getItem('elden_soul_saves');
           return data ? JSON.parse(data) : [];
       } catch (e) {
           console.error('Failed to parse saves from localStorage:', e);
           return [];
       }
   };

   window.saveSaves = function(saves) {
       try {
           localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
       } catch (e) {
           console.error('Failed to write saves to localStorage:', e);
       }
   };
   ```
2. **Replace direct reads and writes** across all other files:
   * In `src/main.js`, update internal calls to use `window.getSaves()` and `window.saveSaves(saves)`.
   * In `src/PlayerController.js` (lines 591-595), update `_persistToLocalStorage()` to use `window.getSaves()` and `window.saveSaves(saves)`.
   * In `src/NPCController.js` (lines 1359-1363), update `removeFromWorld()` to use `window.getSaves()` and `window.saveSaves(saves)`.
   * In `src/WorldManager.js` (lines 98-106, 568-572), update both save spots to use `window.getSaves()` and `window.saveSaves(saves)`.
   * In `src/scenes/GameScene.js` (lines 370-374, 518-525), update both saves to use `window.getSaves()` and `window.saveSaves(saves)`.
   * In `src/world/TownBuilder.js` (lines 20-26, 161-165, 448-452), update all three spots to use `window.getSaves()` and `window.saveSaves(saves)`.

---

## Issue 3.4: HP, MP, and SP Reset Bug During Stat Recalculations

### 1. Analysis of Root Cause
Inside `src/player/StatsManager.js` (lines 139-156), the player's active health (`player.hp`), mana (`player.mp`), and stamina (`player.sp`) are synchronized directly from `window.saveData` during `StatsManager.recalculateStats()`:
```javascript
        if (!player.isAI && window.saveData && window.saveData.hp !== undefined && window.saveData.hp > 0) {
            player.hp = window.saveData.hp;
        } else {
            player.hp = player.maxHp;
        }
```
However:
1. `window.saveData.hp` (along with `mp` and `sp`) is only updated when a checkpoint is saved or auto-save occurs, not dynamically during live gameplay.
2. `recalculateStats()` is called frequently during normal gameplay, including when buying/selling items, equipping gear, upgrading equipment, leveling up, or opening and closing the character/passive menus.
3. As a result, opening a shop or toggling the character sheet instantly resets the player's active HP, MP, and SP back to their last checkpoint values, effectively acting as a free heal exploit or reversing damage recently sustained in battle.

### 2. Proposed Fix Strategy
We must modify `StatsManager.recalculateStats()` so that current resources are only initialized from save data on initial load (when they are `undefined`). During active gameplay (when they are already defined), their current live values must be preserved and clamped to the newly calculated maximums.

**Step-by-Step Implementation Strategy:**
1. **Open `src/player/StatsManager.js`** and locate lines 135-156.
2. **Rewrite the HP synchronization check** to preserve `player.hp` if it is already defined:
   ```javascript
   if (player.hp === undefined) {
       // First initialization: load from save data or default to max
       if (!player.isAI && window.saveData && window.saveData.hp !== undefined && window.saveData.hp > 0) {
           player.hp = window.saveData.hp;
       } else {
           player.hp = player.maxHp;
       }
   } else {
       // Live gameplay: clamp current hp to new maxHp
       player.hp = Math.min(player.hp, player.maxHp);
   }
   ```
3. **Rewrite the MP and SP synchronization checks** similarly:
   ```javascript
   if (player.mp === undefined) {
       // First initialization: load from save data or default to max
       if (!player.isAI && window.saveData && typeof window.saveData.mp === 'number' && !isNaN(window.saveData.mp)) {
           player.mp = Math.min(window.saveData.mp, player.maxMp);
       } else {
           player.mp = player.maxMp;
       }
   } else {
       // Live gameplay: clamp current mp to new maxMp
       player.mp = Math.min(player.mp, player.maxMp);
   }

   if (player.sp === undefined) {
       // First initialization: load from save data or default to max
       if (!player.isAI && window.saveData && typeof window.saveData.sp === 'number' && !isNaN(window.saveData.sp)) {
           player.sp = Math.min(window.saveData.sp, player.maxSp);
       } else {
           player.sp = player.maxSp;
       }
   } else {
       // Live gameplay: clamp current sp to new maxSp
       player.sp = Math.min(player.sp, player.maxSp);
   }
   ```
