# Handoff Report - Modularization Plan for PlayerController and GameScene

## 1. Observation
We examined the codebase and tests to define extraction boundaries.

### File: `src/PlayerController.js`
- **Total Lines**: 2974 lines.
- **Base Data**: Contains `window.ARTIFACTS_DATA` (lines 3-18).
- **Initialization & AI configuration**: `_getAIClassData` (lines 279-380) handles class setups.
- **Recalculation & Sanitization**: `recalculateStats` (lines 382-495) handles stats from base/temp values and equips, Sanitizes stats against `NaN` (lines 384-389).
- **Inventory & Shop Systems**:
  - `updateInventoryUI` (lines 603-757), `setupInventoryPopups` (lines 759-833), `usePotion`, `useMpPotion`, `useSpPotion`, `useMeat` (lines 845-920) consume items.
  - `_givePotionToParty` (lines 921-990) transfers items to close party members.
  - `openShopUI` (lines 991-1142) and `buyItem` (lines 1144-1224) handle transactions.
- **Quest & Alignment Systems**:
  - `updateAlignment` (lines 1226-1238) updates alignment.
  - `addQuest` (lines 1240-1253), `progressQuest` (lines 1255-1283), and `renderQuests` (lines 1402-1430) handle quests.
- **Input abstraction**:
  - `isLeftDown`, `isRightDown`, `isUpDown`, `isDownDown`, `consumeDashLeft`, `consumeDashRight`, `consumeAttack`, `consumeSuperSpell` (lines 1431-1459).
- **AI Behavior**: `updateAI` (lines 1460-1655) handles Companion/Hostile combat decision-making, using `GeminiService` (lines 1506-1575).
- **Main Game Update**: `update` (lines 1701-1976) controls movement, jumping, falling, double jump, portals, status effects, and regen.
- **Combat & Action execution**:
  - `attack` (lines 1978-2078) with class formulas (lines 2038-2045) and height checks (lines 2032-2033).
  - `fireArrow` (lines 2080-2134) and `fireProjectile` (lines 2136-2180).
  - `superComboSpell` (lines 2182-2464) and `startDash` (lines 2466-2491).
  - `takeDamage` (lines 2504-2591) and `applyLifesteal` (lines 2593-2616).
  - `applyStatusEffect` (lines 2618-2653) and `updateStatusEffects` (lines 2655-2704).
  - `die` (lines 2706-2797).
- **Gemini Chat Systems**: `openChat`, `closeChat`, `addMessageToUI`, `handlePlayerMessage`, `triggerHiddenPrompt` (lines 2803-2972).

### File: `src/scenes/GameScene.js`
- **Total Lines**: 2614 lines.
- **Asset Slicing / Animation registration**: `create` (lines 13-258) and `createDebugPanel` (lines 1667-2084).
- **HUD & Modal Interfaces**:
  - `createHUD` (lines 577-657), `updateHUD` (lines 1015-1061), `_updateDebugHUD` (lines 464-575).
  - `_createCharacterSheetModal` (lines 663-775), `toggleCharacterSheet` (lines 777-789), `_updateCharacterSheet` (lines 791-985).
  - `dismissPartyMember` (lines 987-1000) and `startPartyChat` (lines 1002-1013).
- **Directory & Room Transitioning**:
  - `openTownDirectory` (lines 1067-1100), `closeTownDirectory` (lines 1102-1113), `enterIndoorLocation` (lines 1115-1295), `exitIndoorLocation` (lines 1312-1376).
- **Zone Progression / Biomes**:
  - `transitionZone` (lines 1378-1447) handles fades and resets.
  - `setBiomeVisuals` (lines 1449-1665) manages sky/floor textures, and generates platforms.
- **Core Update Loop**: `update` (lines 2086-2281) with GM AI logic (lines 2120-2157).
- **Auxiliary Systems**:
  - `spawnHeroAI` (lines 2283-2312) and `spawnLootChest` (lines 2314-2350).
  - `showFloatingText` (lines 2352-2394).
  - `playCutscene`/`cancelCutscene` (lines 2396-2451).
  - `grantRewards` (lines 2453-2535) handles leveling and stats.
  - `cleanupScene` (lines 2537-2612).

### Tests Analysed:
- **`test_architecture.js`**: Integrates via Puppeteer.
  - Verifies event listener count on window and document does not leak (lines 100-120, 229-240).
  - Verifies Character Sheet modal opens, displays "RefactorHero", and closes (lines 128-173).
  - Verifies Spacebar invokes `player.isUpDown()` correctly (lines 175-195).
  - Verifies calling `player.attack()` and `player.superComboSpell()` works (lines 197-206).
  - Verifies calling `transitionZone(1)` works (lines 207-216).
  - Verifies calling `player.die()` restarts the scene (lines 217-228).
- **`test_logic_constraints.js`**: Unit tests in VM context.
  - Verifies InputManager mapping of WASD, SPACE, PERIOD, COMMA, ONE-SIX (lines 258-268).
  - Verifies `disableForInput`/`enableForInput` captures (lines 270-274).
  - Verifies double-tap A/D translates to `consumeDashLeft`/`consumeDashRight` (lines 276-292).
  - Verifies `player.isUpDown()` returns true when Space or Up is pressed (lines 299-352).
  - Verifies `usePotion()`, `useMpPotion()`, `useSpPotion()`, `useMeat()` adjust inventories and stats, and share potions with closest needy party members (lines 357-455).
  - Verifies `recalculateStats()` sanitizes stats against `NaN`/`undefined`/`string` values and sets default (10) for vit, str, dex, int (lines 460-531).
  - Verifies `EnemyController` statistics (slime=100 HP, lich=2000 HP, devil=1500 HP), status effects (freeze speed, poison ticks), damage and knockback directions (lines 536-600).
- **`test_mechanics.js`**: Mechanics tests in VM context.
  - Verifies Double Jump after walking off edge (lines 229-310).
  - Verifies jumping attacks preserve momentum while ground attacks zero horizontal velocity (lines 313-374).
  - Verifies melee attacks miss when target vertical difference `yDiff > 45` (lines 379-446).
  - Verifies negative zones spawn wilderness zones (Dangerous, Forest biome) with slimes (lines 451-477).

---

## 2. Logic Chain
1. The codebase is large and has high complexity. `PlayerController` and `GameScene` combine engine physics, network services, DOM rendering, and logic state.
2. The tests verify specific properties and call specific methods directly on instances of `PlayerController` and `GameScene` (e.g. `player.isUpDown()`, `player.usePotion()`, `player.recalculateStats()`, `player.attack()`, `scene.transitionZone()`).
3. If we change these class method signatures or delete these methods, the test files (which are not being modified) will crash due to `TypeError` (e.g., function undefined).
4. Therefore, any modularization plan must keep `PlayerController` and `GameScene` as the public facade classes.
5. Under the hood, these facades will delegate their implementation to dedicated single-responsibility sub-classes/modules.

---

## 3. Caveats
- Since this is a read-only analysis, no changes have been applied to the code.
- We assume that the folder layout and Phaser game loading sequence remains standard.
- We assume the target execution environment is Node.js + Puppeteer for architecture tests, and Node.js + VM context for logic/mechanics tests.

---

## 4. Conclusion
Modularization must extract the following single-responsibility components and instantiate them as sub-modules within the parent class constructors, utilizing delegation facades to preserve backwards compatibility.

### Sub-Modules to Extract from `PlayerController.js`:
1. **`StatsManager`**:
   - Responsibility: Recalculates stats, sanitizes stats from old saves, and clears temporary buffs.
   - Core code extracted: `recalculateStats()`, `clearTempStats()`.
   - Properties managed: `speed`, `jumpVelocity`, `dashSpeed`, `maxHp`, `critChance`, `maxMp`, `maxSp`.
2. **`InventoryManager`**:
   - Responsibility: Manages items, weapons, potion usage, sharing logic, and UI bindings.
   - Core code extracted: `usePotion()`, `useMpPotion()`, `useSpPotion()`, `useMeat()`, `_givePotionToParty()`, `cycleArtifact()`, `updateInventoryUI()`, `setupInventoryPopups()`.
3. **`ShopManager`**:
   - Responsibility: Handles shop menus, item pricing (with alignment multipliers), and mystery chest rolling.
   - Core code extracted: `openShopUI()`, `buyItem()`, `rollChestLoot()`, `getNextWeaponUpgrade()`.
4. **`QuestAlignmentManager`**:
   - Responsibility: Tracks alignment points and quest objectives.
   - Core code extracted: `updateAlignment()`, `addQuest()`, `progressQuest()`, `renderQuests()`.
5. **`CompanionAI`**:
   - Responsibility: Resolves decision state trees and companion pathfinding.
   - Core code extracted: `updateAI()`.
6. **`CombatController`**:
   - Responsibility: Handles physical/ranged attacks, combos, status effects, damage receipt, and death penalties.
   - Core code extracted: `attack()`, `fireArrow()`, `fireProjectile()`, `superComboSpell()`, `startDash()`, `takeDamage()`, `applyLifesteal()`, `applyStatusEffect()`, `updateStatusEffects()`, `die()`.
7. **`ChatManager`**:
   - Responsibility: Integrates Gemini AI service dialogue windows.
   - Core code extracted: `openChat()`, `closeChat()`, `addMessageToUI()`, `handlePlayerMessage()`, `triggerHiddenPrompt()`.

### Sub-Modules to Extract from `GameScene.js`:
1. **`HUDManager`**:
   - Responsibility: Manages HUD DOM creation/updates and character sheet display.
   - Core code extracted: `createHUD()`, `updateHUD()`, `_updateDebugHUD()`, `_createCharacterSheetModal()`, `toggleCharacterSheet()`, `_updateCharacterSheet()`, `dismissPartyMember()`, `startPartyChat()`.
2. **`IndoorManager`**:
   - Responsibility: Handles town directories and indoor rooms.
   - Core code extracted: `openTownDirectory()`, `closeTownDirectory()`, `enterIndoorLocation()`, `exitIndoorLocation()`.
3. **`LevelGenerator`**:
   - Responsibility: Sets biome visuals, and builds dynamic platforming levels.
   - Core code extracted: `setBiomeVisuals()`.
4. **`CutsceneController`**:
   - Responsibility: Standard typewriter cutscenes.
   - Core code extracted: `playCutscene()`, `cancelCutscene()`.
5. **`ProgressionManager`**:
   - Responsibility: Controls experience points and level-up growth stats.
   - Core code extracted: `grantRewards()`.
6. **`SpriteDebugger`**:
   - Responsibility: Interactive sprite slicer canvas overlay.
   - Core code extracted: `createDebugPanel()`.

### Parent Interfaces & Delegation Facades:
- `PlayerController` constructor will create instances:
  ```javascript
  this.statsManager = new StatsManager(this);
  this.inventoryManager = new InventoryManager(this);
  this.shopManager = new ShopManager(this);
  this.questManager = new QuestAlignmentManager(this);
  this.companionAI = new CompanionAI(this);
  this.combatController = new CombatController(this);
  this.chatManager = new ChatManager(this);
  ```
- Expose identical delegation methods on `PlayerController` mapping directly to these sub-modules:
  ```javascript
  recalculateStats() { this.statsManager.recalculateStats(); }
  isUpDown() {
      // Keep direct check or delegate:
      return this.isAI ? this.aiInput.up : (this.inputManager.keys.up.isDown || (this.inputManager.keys.space ? this.inputManager.keys.space.isDown : false));
  }
  usePotion() { return this.inventoryManager.usePotion(); }
  attack() { this.combatController.attack(); }
  takeDamage(amount, knockbackDirection) { this.combatController.takeDamage(amount, knockbackDirection); }
  die() { this.combatController.die(); }
  ```
- Expose identical delegation methods on `GameScene`:
  ```javascript
  transitionZone(dir) { this.zoneManager.transitionZone(dir); }
  ```

---

## 5. Verification Method
1. After modularizing, run the integration and unit tests:
   ```powershell
   node test_logic_constraints.js
   node test_mechanics.js
   node test_architecture.js
   ```
2. Inspect `test_architecture.js` console output. It must read:
   `TEST PASSED: No TypeErrors, no crashes, and event listeners are cleanly managed.`
3. Inspect `test_logic_constraints.js` and `test_mechanics.js` console outputs. They must read:
   `All logic & constraint checks completed successfully without error.`
