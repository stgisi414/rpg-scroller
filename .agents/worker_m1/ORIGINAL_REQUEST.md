## 2026-06-16T23:27:13Z
You are the Worker. Your mission is to implement Milestone 1: Refactor PlayerController - Stats, Inventory & Shop.
Working directory: c:\Code2\rpg-scroller\.agents\worker_m1

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please do the following:
1. Examine `src/PlayerController.js`.
2. Extract the statistics management logic into a new file: `src/player/StatsManager.js`.
   - The file should define a class `StatsManager` that handles `recalculateStats()` and `clearTempStats()`.
   - Its constructor should accept `player` (the PlayerController instance) and store it as `this.player`.
   - The extracted methods must update values on `this.player` (e.g. `this.player.speed = ...`, `this.player.maxHp = ...`) because other systems and tests look for those properties directly on the player controller instance.
3. Extract the inventory management logic into a new file: `src/player/InventoryManager.js`.
   - The file should define a class `InventoryManager` that handles:
     - `usePotion()`
     - `useMpPotion()`
     - `useSpPotion()`
     - `useMeat()`
     - `_givePotionToParty(itemKey, range)`
     - `cycleArtifact(dir)`
     - `updateInventoryUI()`
     - `setupInventoryPopups()`
   - Its constructor should accept `player` and store it as `this.player`.
4. Extract the shop logic into a new file: `src/player/ShopManager.js`.
   - The file should define a class `ShopManager` that handles:
     - `openShopUI()`
     - `buyItem(itemKey)`
     - `rollChestLoot()`
     - `getNextWeaponUpgrade()`
   - Its constructor should accept `player` and store it as `this.player`.
5. Update `src/PlayerController.js`:
   - Instantiate the managers in the constructor:
     `this.statsManager = new StatsManager(this);`
     `this.inventoryManager = new InventoryManager(this);`
     `this.shopManager = new ShopManager(this);`
   - Delegate methods to the new managers:
     - `recalculateStats()` delegates to `this.statsManager.recalculateStats()`
     - `clearTempStats()` delegates to `this.statsManager.clearTempStats()`
     - `usePotion()`, `useMpPotion()`, `useSpPotion()`, `useMeat()`, `_givePotionToParty()`, `cycleArtifact()`, `updateInventoryUI()`, `setupInventoryPopups()` delegate to `this.inventoryManager`
     - `openShopUI()`, `buyItem()`, `rollChestLoot()`, `getNextWeaponUpgrade()` delegate to `this.shopManager`
6. Update the scripts loaded in `index.html` (before `src/PlayerController.js`) to include the new manager files:
   - `<script src="src/player/StatsManager.js"></script>`
   - `<script src="src/player/InventoryManager.js"></script>`
   - `<script src="src/player/ShopManager.js"></script>`
7. Update `test_logic_constraints.js` and `test_mechanics.js` to read and run the code of these new files before running `PlayerController.js` in the VM context:
   - Specifically, use `fs.readFileSync` for `src/player/StatsManager.js`, `src/player/InventoryManager.js`, and `src/player/ShopManager.js`, and run them using `vm.runInContext(code, sandbox, { filename: ... })` just before `PlayerController.js` is run.
8. Run `node test_logic_constraints.js` and `node test_mechanics.js` and verify that the tests pass successfully. Document the build/test output in your handoff report at `c:\Code2\rpg-scroller\.agents\worker_m1\handoff.md`.
Report back when finished.
