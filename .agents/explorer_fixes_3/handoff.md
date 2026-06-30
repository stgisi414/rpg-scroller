# Handoff Report — explorer_fixes_3

## 1. Observation
I directly observed the following code structures and paths:

* **Issue 3.1: GPU/Canvas Memory Leaks via Dynamic Textures**
  * `src/RescueeNPCFactory.js` (line 160): `const texture = this.scene.textures.addCanvas(textureKey, canvas);`
  * `src/scene_modules/CharacterComposer.js` (lines 118, 367, 675): `const texture = scene.textures.addCanvas(uniqueKey, canvas);` (adds canvas textures to Phaser's global TextureManager).
  * `src/scenes/GameScene.js` (lines 551-574): Zone transitions clear entity groups (enemies and npcs) but do not remove the textures dynamically registered with the `TextureManager`.

* **Issue 3.2: Fatal Crash Risk on Return to Main Menu During Death Sequence**
  * `src/player/StatusEffectManager.js` (lines 636-642):
    ```javascript
    setTimeout(() => {
        overlay.style.transition = 'background 1.5s ease';
        overlay.style.background = 'rgba(0,0,0,0)';
        setTimeout(() => {
            overlay.remove();
            scene.scene.restart();
        }, 1600);
    }, 6000);
    ```
    This uses native browser timeouts to handle game restarts rather than scene-bound timers.

* **Issue 3.3: Unhandled JSON Parse on LocalStorage Boot Files**
  * Direct unhandled `JSON.parse(localStorage.getItem('elden_soul_saves') || '[]')` calls exist in:
    * `src/NPCController.js` (line 1359)
    * `src/WorldManager.js` (lines 98 and 568)
    * `src/scenes/GameScene.js` (lines 370 and 518)
    * `src/world/TownBuilder.js` (lines 20, 161, and 448)

* **Issue 3.4: HP, MP, and SP Reset Bug During Stat Recalculations**
  * `src/player/StatsManager.js` (lines 139-140):
    ```javascript
    if (!player.isAI && window.saveData && window.saveData.hp !== undefined && window.saveData.hp > 0) {
        player.hp = window.saveData.hp;
    ```
    This actively restores player health, mana, and stamina to checkpoint values during any recalculation.

---

## 2. Logic Chain
* **Issue 3.1**: Dynamically created textures are registered at the global Phaser game level. If they are not removed when the corresponding NPCs or enemies are destroyed on zone transition or scene shutdown, they will accumulate in browser/GPU memory. This causes a memory leak that eventually crashes the browser tab. By selectively removing these textures while preserving those used by active party members during zone transition, we prevent this leak.
* **Issue 3.2**: Because native `setTimeout` is used, the callback executes even if the parent scene is destroyed or shut down. If the player returns to the main menu mid-death, the scene is destroyed, but the timer fires anyway and attempts to call `scene.scene.restart()`, throwing a fatal `TypeError`. Replacing these with `scene.time.delayedCall` ensures they are canceled when the scene is shut down, and adding a cleanup hook for the overlay in `cleanupScene()` avoids leaving a black screen.
* **Issue 3.3**: Direct parsing of local storage strings without `try-catch` means a corrupted JSON string or interrupted write operation throws an unhandled `SyntaxError`, which crashes the boot phase or gameplay loop. Centralizing parsing through a global helper wrapped in a `try-catch` prevents crashes and handles corruption gracefully.
* **Issue 3.4**: Overwriting the player's active health/resources (`player.hp`/`mp`/`sp`) with values from `window.saveData` (which are only updated at checkpoints) during `recalculateStats()` causes the current live resources to reset to checkpoint values. By ensuring this restoration only occurs when the player's stats are initially `undefined` (at first construction/load), we preserve active stats during gameplay while keeping max stat scaling functioning.

---

## 3. Caveats
* I assumed that no other third-party modules or components dynamically create textures starting with `custom_npc_`, `special_enemy_`, or `rescuee_`.
* If a player somehow manages to bypass the scene shutdown handler during an unexpected app shutdown, browser garbage collection will clean up the DOM overlay anyway.
* The analysis is based on static analysis and codebase exploration. No code modifications were performed, in line with the instructions.

---

## 4. Conclusion
The four stability issues stem from lifecycle mismatches (persisted global textures, scene-unbound timers), lack of error handling during I/O operations (unwrapped local storage parses), and erroneous state synchronization (restoring health from checkpoint values during gameplay calculations).

The proposed fix strategies will resolve all four issues cleanly without affecting expected behaviors or gameplay features.

---

## 5. Verification Method
To independently verify the proposed fixes after implementation:
1. **Issue 3.1**: Launch the game, transition zones multiple times, and run the following in the browser console:
   `game.scene.keys.GameScene.textures.getTextureKeys().filter(k => k.startsWith('custom_npc_') || k.startsWith('special_enemy_') || k.startsWith('rescuee_'))`
   Ensure the returned array only contains the texture keys of active party members and does not grow boundlessly.
2. **Issue 3.2**: Trigger the death sequence, immediately hit the Escape key or main menu button, and check the browser console for any `TypeError` crashes. Ensure the screen is not obscured by a black overlay.
3. **Issue 3.3**: Corrupt the local storage saves entry by running `localStorage.setItem('elden_soul_saves', 'invalid_json')` in the console, then reload the game. Confirm the game initializes and does not crash on boot.
4. **Issue 3.4**: Take damage in a zone, then buy/upgrade an item or allocate a passive point. Confirm that your HP, MP, and SP do not reset back to full or checkpoint values.
