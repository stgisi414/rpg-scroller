## 2026-06-16T22:34:42Z

You are worker_final_fixes, a versatile worker subagent.
Your working directory is C:\Code2\rpg-scroller\.agents\worker_final_fixes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to fix the following critical bugs and memory leaks identified by the reviewers/challengers:

1. **Character Sheet Button Leak (src/scenes/GameScene.js)**:
   In `cleanupScene()`, the character sheet button element (`#btn-char-sheet`) is not removed. Add cleanup logic to remove this button from the DOM:
   ```javascript
   const charBtn = document.getElementById('btn-char-sheet');
   if (charBtn) charBtn.remove();
   ```

2. **NPC updateHUD Crash (src/NPCController.js)**:
   At lines 394 and 405 (or wherever else), the NPC controller calls `this.player.updateHUD()`, which crashes because `updateHUD` is defined on the scene (`GameScene.js`), not the player. Change this call to:
   ```javascript
   if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
   ```

3. **Spacebar Infinite Jumping (src/PlayerController.js)**:
   In `isUpDown()`, the check evaluates `this.inputManager.keys.space` instead of its `.isDown` property. Change this to check `.isDown`:
   ```javascript
   this.inputManager.keys.space.isDown
   ```

4. **Unified Save Keys (src/PlayerController.js)**:
   In `die()` (or wherever `rpg_save` is written, e.g. line 2668), change the localStorage save key from `'rpg_save'` to `'elden_soul_saves'` to unify the save system.

5. **Enhance Integration Test (test_architecture.js)**:
   Update the automated headless browser test script (`test_architecture.js`) to:
   - Click the character sheet button (`#btn-char-sheet`) to open the character sheet modal, then press ESC or close it, during the action loops.
   - Verify that this character sheet action executes cleanly, shows correct active stats, and does not leak event listeners.
   - Ensure that the spacebar mapping check is covered.

6. **Run and Verify**:
   Execute the updated `test_architecture.js` to ensure the test passes cleanly with a 0 listener delta and no console errors.

Document your changes and verification results in C:\Code2\rpg-scroller\.agents\worker_final_fixes\handoff.md.
Send a message to your parent conversation (main agent, id: de78dca1-6b88-4842-bc20-59c7ca25e2c8) when complete.

## 2026-06-16T22:35:18Z
From: main agent (a8cfaadc-68a0-4a7a-9e95-0ae30ebda7ca)
Reviewer 2 has reported two additional issues that must be addressed in your sweep:
1. **Indoor Scene State Cleanup Crash (src/scenes/GameScene.js)**:
   Inside `cleanupScene()`, you must set the following indoor-related scene properties to `null` to prevent crash-on-reentry after a scene restart/player death:
   ```javascript
   this.indoorBlackBg = null;
   this.indoorBg = null;
   this.indoorWallBgGroup = null;
   this.indoorFloor = null;
   this.indoorLeftWall = null;
   this.indoorRightWall = null;
   ```
2. **Unguarded window.saveData accesses (src/PlayerController.js & src/NPCController.js)**:
   Protect all direct accesses to `window.saveData` (e.g. `window.saveData.quests`, `window.saveData.level`, `window.saveData.stats`) to prevent crashes when the game is loaded in mock/sandbox/test environments where `window.saveData` might not be initialized yet. Use safe navigation or default fallbacks:
   - In `PlayerController.js`: e.g. checking if `window.saveData` is defined before accessing `.quests` or `.level`.
   - In `NPCController.js`: e.g. lines 357, 360-362, 508, 511-513, 647.
Action: Please merge these two fixes into your current sweep. Make sure they are fully addressed, then run `node test_architecture.js` to verify.

