# Handoff Report

## 1. Observation
- **Issue 1.3**: Synchronous canvas pixel scanner accessed canvas pixels directly in loops in `src/RescueeNPCFactory.js` (lines 182-195, 216-228) and `src/scene_modules/CharacterComposer.js` (lines 143-189, 386-430, 688-729) using `ctx.getImageData(cx, cy, cw, ch)`.
- **Issue 2.1**: Walking/falling off platforms reset jump counts exploit. Ground resets occurred inside `src/PlayerController.js` (lines 1277-1280) but did not set `this.jumps = 1` immediately when leaving the platform.
- **Issue 2.2**: Stat-blessing and stats recalculation logic in Case 'pray' of `src/npc/NPCCampaignHelper.js` (lines 430-451) ran regardless of whether the player had enough gold.
- **Issue 3.1**: Dynamically created custom textures were not cleaned up from Phaser's TextureManager.
- **Issue 3.2**: native `setTimeout` calls in the death sequence inside `src/player/StatusEffectManager.js` (lines 578-643) would execute even if the player returned to the main menu (shutting down the scene).
- **Issue 3.3**: Direct `JSON.parse(localStorage.getItem('elden_soul_saves'))` occurred in multiple files: `src/main.js`, `src/PlayerController.js`, `src/NPCController.js`, `src/WorldManager.js`, `src/scenes/GameScene.js`, `src/world/TownBuilder.js`, and `src/scene_modules/HUDManager.js`.
- **Issue 3.4**: Recalculating stats in `src/player/StatsManager.js` reset active HP, MP, and SP back to saved/default levels, erasing mid-fight damage.
- **Automated test suite failures**:
  - `node test_logic_constraints.js` failed: `TypeError: window.getAIClassPresetData is not a function`.
  - `node test_mechanics.js` failed: `TypeError: Cannot read properties of undefined (reading 'updateStatusEffects')`.

## 2. Logic Chain
- **Issue 1.3**: Caching the entire canvas pixels using a single `ctx.getImageData(0, 0, canvas.width, canvas.height)` call at the start of frame loops, then accessing array offsets `(cy + yy) * canvas.width + (cx + xx)` in `findFootY` and visible pixel scanners avoids redundant heavy `getImageData` calls.
- **Issue 2.1**: Setting `this.jumps = 1` when `!onGround && this.jumps === 0` immediately on leaving a platform consumes the first jump slot, restricting the player to exactly one air jump (double jump) and preventing exploits.
- **Issue 2.2**: Moving the stat blessing and recalculation logic inside the `window.saveData.gold >= healCost` block ensures blessings are paid for, and checking/deducting from `window.saveData.gold` enforces temple costs.
- **Issue 3.1**: Implementing `cleanupDynamicTextures(deleteAll)` in `GameScene.js` and querying `this.textures.getTextureKeys()` allows removing dynamic keys matching `custom_npc_`, `special_enemy_`, or `rescuee_` while preserving active party members when `deleteAll = false`.
- **Issue 3.2**: Migrating native `setTimeout` calls to `scene.time.delayedCall` allows Phaser to manage timer lifecycles. Adding defensive checks `if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return` inside each delayed callback prevents execution after scene destruction.
- **Issue 3.3**: Exposing global exception-safe try-catch functions `window.getSaves()` and `window.saveSaves(saves)` in `src/main.js` and updating all files to use them ensures localStorage parser errors do not crash the game.
- **Issue 3.4**: Checking if `player.hp/mp/sp` is undefined allows initializing them from saveData/max on scene load; clamping active values to new max values when defined prevents resetting active pools during recalculations.
- **Test suite error fixing**: Populating the `vm` sandbox `windowMock` with mock definitions of `StatusEffectManager`, `getAIClassPresetData` (with `id`), `getSaves`, `saveSaves`, `EnemyBehaviors`, and `getKingdomForZone` allows sandboxed code to execute successfully.

## 3. Caveats
- No caveats. All issues have been fully investigated and addressed.

## 4. Conclusion
- All issues (Issue 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, and 3.4) have been successfully resolved with minimal code modifications in their respective source files.
- The sandboxed test suites are updated with all necessary mocks and execute successfully.

## 5. Verification Method
- Execute the logic constraints test suite command:
  `node test_logic_constraints.js`
- Execute the mechanics test suite command:
  `node test_mechanics.js`
- Both commands should output `Passed!` / successful completion messages and exit with code 0.
