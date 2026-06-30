# Analysis and Proposed Fix Strategy: Gameplay Issues 2.1 & 2.2

This report presents a thorough code analysis and a step-by-step resolution strategy for **Issue 2.1: Double Jump Mechanics Exploits Falling States** and **Issue 2.2: Free Blessings & Broken Healing at Temples**, based on the audit report.

---

## 1. Issue 2.1: Double Jump Mechanics Exploits Falling States

### Direct Observations & File Locations
- **Target File**: `src/PlayerController.js` (specifically lines 1277-1280 and 1296-1305)
- **Grounded Reset Logic**:
  ```javascript
  // Reset jump counter on ground
  if (onGround) {
      this.jumps = 0;
  }
  ```
- **Air Jump Logic**:
  ```javascript
  if (jumpPressed) {
      const jSpd = (typeof this.jumpVelocity === 'number' && !isNaN(this.jumpVelocity)) ? this.jumpVelocity : -400;
      if (onGround) {
          this.sprite.setVelocityY(jSpd);
          this.jumps = 1;
      } else if (this.jumps < 2) {
          this.sprite.setVelocityY(jSpd);
          this.jumps++;
      }
  }
  ```

### Problem Analysis
When a player walks or falls off a platform, they enter the air without jumping. Thus:
1. `onGround` evaluates to `false`.
2. The code block `if (onGround) { this.jumps = 0; }` is bypassed, meaning `this.jumps` remains `0`.
3. If they press the jump key in mid-air, `this.jumps < 2` evaluates to `0 < 2` (true). The player jumps, and `this.jumps` increments to `1`.
4. If they press the jump key again in mid-air, `this.jumps < 2` evaluates to `1 < 2` (true). The player jumps again, and `this.jumps` increments to `2`.
5. This grants them a total of **two mid-air jumps** after falling, resulting in a sequence of three distinct vertical movements (Fall -> Air Jump 1 -> Air Jump 2). The design specification requires that falling/walking off a ledge should consume the first jump, leaving the player with only **one air jump** remaining.

### Proposed Step-by-Step Fix Strategy

#### Step 1: Update Ledge-Falling Jump Counter Behavior
Modify the ground check in `src/PlayerController.js` to increment the jump counter to `1` as soon as the player falls or walks off a ledge. This ensures that their first mid-air input counts as the "double jump" (second jump), and prevents a third vertical movement.

**Proposed Changes to `src/PlayerController.js`:**
```javascript
// Before
        // Reset jump counter on ground
        if (onGround) {
            this.jumps = 0;
        }

// After
        // Reset jump counter on ground
        if (onGround) {
            this.jumps = 0;
        } else if (this.jumps === 0) {
            // Walking or falling off a ledge consumes the first jump,
            // leaving exactly one air jump remaining.
            this.jumps = 1;
        }
```

#### Step 2: Update Mechanics Test Case in `test_mechanics.js`
The test suite in `test_mechanics.js` currently asserts the buggy/exploitable behavior (expecting two air jumps after falling). We must update the assertions in **Test 1: Double Jump Mechanics** to align with the corrected gameplay behavior:

**Proposed Changes to `test_mechanics.js` (lines 300-330):**
```javascript
    player.update(1000, 16);
    // Since player started with jumps = 0 and update() was run with onGround = false,
    // jumps was automatically set to 1, and the jump input incremented it to 2.
    assert(player.jumps === 2, "First air jump after falling should increment jumps to 2 (consuming the second/air jump)");
    assert(player.sprite.body.velocity.y === player.jumpVelocity, "First air jump should apply jumpVelocity");

    // Second jump press in the air
    player.sprite.body.velocity.y = 0; // reset to check new force
    let secondCheck = true;
    sandbox.Phaser.Input.Keyboard.JustDown = (key) => {
        if (secondCheck) {
            secondCheck = false;
            return true;
        }
        return false;
    };
    player.update(1020, 16);
    // Any subsequent air jump is ignored since jumps = 2 (which is not < 2)
    assert(player.jumps === 2, "Second air jump after falling should be ignored, jumps remains 2");
    assert(player.sprite.body.velocity.y === 0, "Second air jump should NOT apply jumpVelocity");
```

---

## 2. Issue 2.2: Free Blessings & Broken Healing at Temples

### Direct Observations & File Locations
- **Target File**: `src/npc/NPCCampaignHelper.js` (specifically lines 33 and 430-451)
- **State Serialization (`getGameState`)**:
  ```javascript
  gold: p.inventory ? p.inventory.gold : 0,
  ```
- **Temple Interaction Logic (`case 'pray'`)**:
  ```javascript
  case 'pray':
      const healCost = 25;
      let didHeal = false;
      if (npc.player.gold >= healCost) {
          npc.player.gold -= healCost;
          npc.player.hp = npc.player.maxHp;
          npc.player.mp = npc.player.maxMp;
          didHeal = true;
      }
      const stats = ['vit', 'str', 'dex', 'int'];
      const randomStat = stats[Math.floor(Math.random() * stats.length)];
      if (npc.player.classData && npc.player.classData.stats) {
          npc.player.classData.stats[randomStat]++;
          npc.player.recalculateStats();
      }
      if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
      if (didHeal) {
          rewardText = `Healed & Blessed (+1 ${randomStat.toUpperCase()})! -${healCost}g`;
      } else {
          rewardText = `Blessing (+1 ${randomStat.toUpperCase()})! Need ${healCost}g for healing`;
      }
      break;
  ```

### Problem Analysis
1. **Wrong Gold Source**: Player gold is stored globally in `window.saveData.gold`. The `PlayerController` class (referenced via `npc.player` and `p`) does not natively store gold in a `.gold` property (it is only sporadically synced, e.g., in `IndoorManager` during fast travel). Furthermore, `p.inventory.gold` is `undefined` because `inventory` is an object initialized with collections of weapons, artifacts, and items, but no `gold` key.
2. **Broken Comparison and Deductions**: Since `npc.player.gold` evaluates to `undefined`, the condition `npc.player.gold >= healCost` (`undefined >= 25`) evaluates to `false`. Therefore:
   - Gold is never deducted from the player's account.
   - The player is never healed (`hp = maxHp`, `mp = maxMp` is skipped).
   - `didHeal` remains `false`.
3. **Exploitable Blessing Code Scope**: The stat-blessing block (lines 439-444) sits outside the conditional `if` check. Because it is run unconditionally, clicking the pray activity increments a random attribute and triggers stat recalculation completely for free. This allows players to spam blessings indefinitely to max out stats without paying a single gold coin.
4. **Invalid Gold Display in Dialog**: In `getGameState`, the prompt builder passes `gold: p.inventory ? p.inventory.gold : 0` to the LLM. Because `p.inventory.gold` is undefined, the LLM is told the player has 0 gold, causing incorrect roleplay responses.

### Proposed Step-by-Step Fix Strategy

#### Step 1: Query and Modify the Correct Gold Source
Change the gold source in `NPCCampaignHelper.js` to look at `window.saveData.gold`. Additionally, update `npc.player.gold` to maintain local synchronization if other scripts check it.

#### Step 2: Enforce Conditional Scope for Blessings
Move the stat-blessing and stats recalculation block inside the `if` condition so they are only granted upon successful deduction of the 25g cost.

#### Step 3: Adjust the Dialog Failure Path
Update the `else` branch of the pray action to clearly state that the player does not have enough gold for the temple services, rather than falsely claiming they received a blessing anyway.

#### Step 4: Fix State Serialization Gold Reference
Correct the serialized gold property in `getGameState` to check `window.saveData.gold`.

**Proposed Changes to `src/npc/NPCCampaignHelper.js`:**
```javascript
// Line 33 change
// Before:
gold: p.inventory ? p.inventory.gold : 0,

// After:
gold: (window.saveData && window.saveData.gold !== undefined) ? window.saveData.gold : 0,
```

```javascript
// Lines 430-451 change
// Before:
            case 'pray':
                const healCost = 25;
                let didHeal = false;
                if (npc.player.gold >= healCost) {
                    npc.player.gold -= healCost;
                    npc.player.hp = npc.player.maxHp;
                    npc.player.mp = npc.player.maxMp;
                    didHeal = true;
                }
                const stats = ['vit', 'str', 'dex', 'int'];
                const randomStat = stats[Math.floor(Math.random() * stats.length)];
                if (npc.player.classData && npc.player.classData.stats) {
                    npc.player.classData.stats[randomStat]++;
                    npc.player.recalculateStats();
                }
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                if (didHeal) {
                    rewardText = `Healed & Blessed (+1 ${randomStat.toUpperCase()})! -${healCost}g`;
                } else {
                    rewardText = `Blessing (+1 ${randomStat.toUpperCase()})! Need ${healCost}g for healing`;
                }
                break;

// After:
            case 'pray':
                const healCost = 25;
                let didHeal = false;
                
                // Read gold balance from window.saveData
                const currentGold = (window.saveData && window.saveData.gold !== undefined) ? window.saveData.gold : 0;
                
                if (currentGold >= healCost) {
                    // Deduct gold from window.saveData
                    window.saveData.gold -= healCost;
                    
                    // Maintain player instance sync and apply heals
                    if (npc.player) {
                        npc.player.gold = window.saveData.gold;
                        npc.player.hp = npc.player.maxHp;
                        npc.player.mp = npc.player.maxMp;
                    }
                    
                    // Stat blessing is now conditional on successful payment
                    const stats = ['vit', 'str', 'dex', 'int'];
                    const randomStat = stats[Math.floor(Math.random() * stats.length)];
                    if (npc.player && npc.player.classData && npc.player.classData.stats) {
                        npc.player.classData.stats[randomStat]++;
                        npc.player.recalculateStats();
                    }
                    
                    didHeal = true;
                    rewardText = `Healed & Blessed (+1 ${randomStat.toUpperCase()})! -${healCost}g`;
                } else {
                    // Inform the player they need enough gold for both healing and blessing
                    rewardText = `Need ${healCost}g for healing & blessing!`;
                }
                
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                break;
```

---

## 3. Related Issues & Vulnerabilities Found

During the exploration of `NPCController.js`, a highly similar bug was discovered in the roleplay parser.

### Issue 3A: Roleplay Gold Transfer Bug
- **Location**: `src/NPCController.js` (lines 1314-1322)
- **Problem**: When a player types a roleplay action like `*give 500 gold*`, it checks `this.player.gold` and deducts from it. Since `this.player.gold` is `undefined` by default, the action fails, falsely reporting that the player doesn't have enough gold even if they have thousands in their save file.
- **Proposed Fix**:
  ```javascript
  // Before
          if (giveGoldMatch) {
              const amount = parseInt(giveGoldMatch[1]);
              if (!this.player.gold || this.player.gold < amount) {
                  return { success: false, reason: `You don't have enough gold. (Have: ${Math.floor(this.player.gold || 0)} gold)` };
              }
              this.player.gold -= amount;
  
  // After
          if (giveGoldMatch) {
              const amount = parseInt(giveGoldMatch[1]);
              const currentGold = (window.saveData && window.saveData.gold !== undefined) ? window.saveData.gold : 0;
              if (currentGold < amount) {
                  return { success: false, reason: `You don't have enough gold. (Have: ${Math.floor(currentGold)} gold)` };
              }
              window.saveData.gold -= amount;
              this.player.gold = window.saveData.gold;
  ```

### Issue 3B: Roleplay Item Giving Crash
- **Location**: `src/NPCController.js` (lines 1324-1338)
- **Problem**: When a player types `*give [item name]*`, the code attempts to query the player's inventory to find the item. It does:
  ```javascript
  const inventory = this.player.inventory || [];
  const itemIdx = inventory.findIndex(i => (i.name || '').toLowerCase().includes(itemName));
  ```
  However, `this.player.inventory` is a structured JSON **object** containing sub-arrays (`potions`, `potionList`, `weapons`, etc.), not a flat array. Calling `.findIndex()` directly on the object will throw a fatal `TypeError` and crash the NPC chat interface.
- **Proposed Fix**:
  Check inside each sub-array property of the inventory object (such as `potionList`, `weapons`, `artifacts`, etc.) rather than on the inventory object itself.

---

## 4. Test Suite Compilation & Sandboxing Issues
Running the tests manually exposes that the standalone test suites (`test_mechanics.js` and `test_logic_constraints.js`) are currently broken on the main branch because of out-of-date sandboxing mocks:
- `test_mechanics.js` crashes because it tries to call `window.StatusEffectManager.updateStatusEffects` which is not mock-defined in the test's `sandbox`.
- `test_logic_constraints.js` crashes because it calls `window.getAIClassPresetData` which is not mock-defined in the test's `sandbox`.

To execute these tests successfully after implementation, these mocks must be added to the test script setup blocks:
```javascript
// In test_mechanics.js sandbox definition:
window: {
    ...
    StatusEffectManager: {
        updateStatusEffects: function() { return []; }
    }
}

// In test_logic_constraints.js sandbox definition:
window: {
    ...
    getAIClassPresetData: function() { return { stats: {} }; }
}
```
