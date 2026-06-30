## 2026-06-29T19:12:14Z
You are a teamwork_preview_worker. Your working directory is c:\Code2\rpg-scroller\.agents\worker_fixes_1.
Your task is to implement the fixes for the following gameplay and stability issues:

1. Issue 1.3: Performance Bottleneck via Synchronous Pixel Scanner
   - In src/RescueeNPCFactory.js and src/scene_modules/CharacterComposer.js, optimize _compositeTexture and character compositing by caching the entire canvas pixels using a single ctx.getImageData call, then accessing the cached array offsets in findFootY and the visible pixel scanner.

2. Issue 2.1: Double Jump Mechanics Exploits Falling States
   - In src/PlayerController.js, update the ground check to set this.jumps = 1 immediately when the player walks or falls off a platform (when !onGround && this.jumps === 0).
   - In test_mechanics.js, update the Double Jump test (Test 1) to assert this new behavior.

3. Issue 2.2: Free Blessings & Broken Healing at Temples
   - In src/npc/NPCCampaignHelper.js, update Case 'pray' to check and deduct gold from window.saveData.gold. Move the stat-blessing and stats recalculation logic INSIDE the successful gold deduction block (requiring payment).
   - In getGameState, update the serialized gold property to check window.saveData.gold.
   - In src/NPCController.js, update the roleplay gold transfer parser to check and deduct from window.saveData.gold.

4. Issue 3.1: GPU/Canvas Memory Leaks via Dynamic Textures
   - In src/scenes/GameScene.js, add a cleanupDynamicTextures(deleteAll) method that removes custom_npc_, special_enemy_, and rescuee_ textures from Phaser's TextureManager (preserving active party members unless deleteAll is true).
   - Hook this cleanup in camerafadeoutcomplete (deleteAll=false) and cleanupScene() (deleteAll=true).

5. Issue 3.2: Fatal Crash Risk on Return to Main Menu During Death Sequence
   - In src/player/StatusEffectManager.js, migrate native setTimeout calls in the death sequence to scene.time.delayedCall. Add defensive checks: if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
   - In src/scenes/GameScene.js inside cleanupScene(), remove the death-rebirth-overlay DOM element if it exists.

6. Issue 3.3: Unhandled JSON Parse on LocalStorage Boot Files
   - In src/main.js, expose window.getSaves() and window.saveSaves(saves) wrapped in exception-safe try-catch blocks.
   - Replace all direct JSON.parse(localStorage.getItem('elden_soul_saves')) and setItem calls with calls to these window utilities across all files (including src/PlayerController.js, src/NPCController.js, src/WorldManager.js, src/scenes/GameScene.js, and src/world/TownBuilder.js).

7. Issue 3.4: HP, MP, and SP Reset Bug During Stat Recalculations
   - In src/player/StatsManager.js inside recalculateStats(), check if player.hp/mp/sp is undefined. If undefined, initialize from saveData/max; otherwise, clamp the current active values to the new maxHp/maxMp/maxSp.

8. Fix the automated test suites:
   - In test_mechanics.js and test_logic_constraints.js, add missing mock globals (like StatusEffectManager, getAIClassPresetData, etc.) to the vm sandbox context so they run without TypeError.
   - Verify that both test files execute successfully and all tests pass.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Run the test suite commands:
- node test_logic_constraints.js
- node test_mechanics.js
Document the commands, their results, and write a handoff.md report. When complete, send a message to the orchestrator (90c4d2a8-8595-4299-9e66-334aebced0b3).
