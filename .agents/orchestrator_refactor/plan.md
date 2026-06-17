# Refactoring Plan - Elden Soul Architectural Issues

## Objective
Refactor the Elden Soul codebase to resolve 5 specific architectural issues:
1. **Async API race conditions**: Ensure the game does not crash when player transitions zones or dies while Gemini API calls are pending.
2. **Event Listener memory leaks**: Ensure `window.addEventListener` instances do not stack/multiply on repeated scene restarts.
3. **Save Data reference loops**: Ensure `window.saveData` correctly unlinks from live gameplay memory using deep cloning.
4. **Animation frame freezes**: Ensure Phaser animations do not freeze on frame 0 and correctly use `.once` for animation complete callbacks.
5. **Physics garbage collection**: Ensure enemies falling out of bounds are safely culled without leaving ghost colliders.

Additionally:
- Perform a wider audit of the codebase for similar anti-patterns.
- Create an automated headless browser test suite `test_architecture.js` (using Playwright or Puppeteer) simulating rapid player deaths, zone transitions, and continuous attacks to verify correctness.
- Implement Gameplay Hotfixes:
  1. Add missing `orc-attack` animation in `GameScene.js`.
  2. Improve enemy platforming AI under `CHASE` state in `EnemyController.js` (jumping when player is significantly higher, or when horizontally blocked).
  3. Allow jump-attacks for both player and enemies in the air (remove touching.down restriction for attacking).
  4. Ensure air attacks do not halt horizontal velocity (allow entities to continue their arc).
  5. Fix the "air damage" bug by validating that melee hitboxes correctly check target height (miss if y-distance is too great).
  6. Add player double jump mechanism (up to 2 jumps, resetting when touching down).
  7. Add companion/ally double jump mechanism to allow following player over large gaps.
  8. Fix NPC spawn y-coordinates in `WorldManager.js` (change hardcoded 696 to 500 or 400 for standard town NPCs, fallback Sage, and wilderness NPCs to prevent falling through floor).
  9. Normalize or explain negative zoneIndex values in GeminiService.js prompts so negative zones spawn enemies correctly.
  10. Fix saveZoneState caching logic in WorldManager.js to ensure transitioning left (negative zoneIndex) correctly saves, restores, and respawns enemy state without breaking.
  11. Rewrite the procedural 2D platforming logic in `GameScene.js` (around line 1572) to generate contiguous platforms of random widths (3-10 blocks) separated by small manageable gaps (1-3 blocks), changing elevation only between platforms by max 150px, and add a solid bottom floor at `y = 800` (or make death plane less punishing).

---

## Phases

### Phase 1: Exploration
- **Action**: Spawn `teamwork_preview_explorer` to inspect `GeminiService.js`, `main.js`, `GameScene.js`, `WorldManager.js`, `PlayerController.js`, and `EnemyController.js`.
- **Output**: Detailed analysis of the exact lines and patterns causing the 5 issues.

### Phase 2: Test Suite Design
- **Action**: Write the headless browser test suite (`test_architecture.js`) using Puppeteer (or Playwright).
- **Details**: It should spin up the Phaser game, simulate zone transitions, player deaths, and rapid attacks, monitoring console logs for errors, and checking memory/event listener counts if possible.

### Phase 3: Refactoring Implementation
- **Action**: Spawn `teamwork_preview_worker` to apply fixes for all 5 issues and any additional issues discovered.
- **Verification**: Run local tests, check error logs, and run `test_architecture.js`.

### Phase 4: Broader Audit and Verification
- **Action**: Spawn `teamwork_preview_reviewer` and `teamwork_preview_challenger` to verify code correctness and stress test the fixes.
- **Action**: Spawn `teamwork_preview_auditor` to audit the code for cheating, hardcoding, or bypasses.
- **Output**: Pass verdict and `bug_fixes_report.md` updates if needed.

### Phase 5: Handoff and Submission
- **Action**: Generate `handoff.md` and report completion to Sentinel.
