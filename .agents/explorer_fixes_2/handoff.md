# Handoff Report - explorer_fixes_2

This handoff report details the findings and fix strategies for Issue 2.1 (Double Jump Mechanics Exploits Falling States) and Issue 2.2 (Free Blessings & Broken Healing at Temples).

---

## 1. Observation
### Issue 2.1: Double Jump Ledge Fall Exploit
- **Location**: `src/PlayerController.js` (lines 1277-1280 and 1301-1305):
  ```javascript
  1277:         // Reset jump counter on ground
  1278:         if (onGround) {
  1279:             this.jumps = 0;
  1280:         }
  ...
  1301:             } else if (this.jumps < 2) {
  1302:                 this.sprite.setVelocityY(jSpd);
  1303:                 this.jumps++;
  1304:             }
  ```

### Issue 2.2: Free Blessings & Broken Healing
- **Location 1**: `src/npc/NPCCampaignHelper.js` (line 33):
  ```javascript
  33:                 gold: p.inventory ? p.inventory.gold : 0,
  ```
- **Location 2**: `src/npc/NPCCampaignHelper.js` (lines 430-451):
  ```javascript
  430:             case 'pray':
  431:                 const healCost = 25;
  432:                 let didHeal = false;
  433:                 if (npc.player.gold >= healCost) {
  434:                     npc.player.gold -= healCost;
  435:                     npc.player.hp = npc.player.maxHp;
  436:                     npc.player.mp = npc.player.maxMp;
  437:                     didHeal = true;
  438:                 }
  439:                 const stats = ['vit', 'str', 'dex', 'int'];
  440:                 const randomStat = stats[Math.floor(Math.random() * stats.length)];
  441:                 if (npc.player.classData && npc.player.classData.stats) {
  442:                     npc.player.classData.stats[randomStat]++;
  443:                     npc.player.recalculateStats();
  444:                 }
  ...
  ```

### Standalone Test Status
- Command `node test_mechanics.js` results in:
  ```
  TypeError: Cannot read properties of undefined (reading 'updateStatusEffects')
      at CombatController.updateStatusEffects (CombatController.js:545:43)
  ```
- Command `node test_logic_constraints.js` results in:
  ```
  TypeError: window.getAIClassPresetData is not a function
      at PlayerController._getAIClassData (PlayerController.js:468:23)
  ```

---

## 2. Logic Chain

### Issue 2.1:
1. `this.jumps` starts at `0` on the ground.
2. Walking or falling off a ledge makes `onGround` evaluate to `false`, bypassing the ground reset check.
3. Therefore, `this.jumps` remains `0` while falling.
4. Pressing jump in the air triggers `this.jumps < 2` (`0 < 2`), setting `this.jumps = 1`.
5. Pressing jump again triggers `this.jumps < 2` (`1 < 2`), setting `this.jumps = 2`.
6. This allows two mid-air jumps after falling off a platform (plus the initial falling motion), violating standard double jump constraints.
7. **Conclusion**: Changing the logic to set `this.jumps = 1` immediately when `!onGround && this.jumps === 0` consumes the first jump and limits the player to one air jump.

### Issue 2.2:
1. The `PlayerController` class does not have a `.gold` property (it is stored in global `window.saveData.gold`).
2. Thus, `npc.player.gold` evaluates to `undefined`.
3. In `NPCCampaignHelper.js`, `if (npc.player.gold >= healCost)` evaluates to `if (undefined >= 25)`, which is always `false`.
4. As a result, the healing block is never run, and gold is never deducted.
5. The stat-blessing block sits outside of the conditional check and runs unconditionally, allowing infinite free stats.
6. In `getGameState()`, the prompt builder serialization checks `p.inventory.gold`, which does not exist, supplying a gold balance of `0` to the LLM.
7. **Conclusion**: Checking and deducting from `window.saveData.gold` solves the broken healing, moving the blessing logic inside the check resolves the free blessing exploit, and querying `window.saveData.gold` in `getGameState()` fixes the dialog balance display.

---

## 3. Caveats
- No code was written or modified. All findings are derived from static analysis of the source code and running the existing test scripts.
- The unit test suites are currently failing due to missing sandbox mocks for `StatusEffectManager` and `getAIClassPresetData` which must be resolved to compile and run tests successfully.
- Test 1 in `test_mechanics.js` explicitly tests/asserts the buggy double jump behavior and must be updated to match the new behavior.

---

## 4. Conclusion
The gameplay issues have been fully located and analyzed. Precise, step-by-step fix strategies have been documented in `analysis.md`. Additionally, similar bugs were located in `NPCController.js`'s roleplay parsing for gold and items and documented.

---

## 5. Verification Method
1. Apply the changes proposed in `analysis.md` to `src/PlayerController.js` and `src/npc/NPCCampaignHelper.js`.
2. Update the sandbox configuration in `test_mechanics.js` and `test_logic_constraints.js` to include the missing globals.
3. Update the double jump assertions in `test_mechanics.js` (Test 1) to match the new ledge-falling jump tracking constraints.
4. Execute `node test_mechanics.js` and `node test_logic_constraints.js` to verify all tests pass.
