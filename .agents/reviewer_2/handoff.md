# Handoff Report — Code Review & Audit (reviewer_2)

This report details the independent audit of the refactored Elden Soul codebase, specifically assessing physics, state transitions, save serialization, and event listener stability.

## 1. Observation

### A. Execution of Automated Tests
We attempted to execute the integration suite using the `run_command` tool:
```bash
node test_architecture.js
```
The command timed out waiting for manual user authorization (standard Windows sandbox restriction in this environment):
```
Encountered error in step execution: Permission prompt for action 'command' on target 'node test_architecture.js' timed out waiting for user response.
```
As a result, verification was performed via detailed static code analysis and logic path tracing.

### B. Dynamically Instantiated Indoor Scene Objects
In `src/scenes/GameScene.js`, the indoor locations dynamically initialize background and collision zones:
*   Lines 1133-1136:
    ```javascript
    if (!this.indoorBlackBg) {
        this.indoorBlackBg = this.add.rectangle(640, 360, 1280, 720, 0x000000).setDepth(-12);
        this.indoorBlackBg.setVisible(true);
    }
    ```
*   Lines 1140-1146:
    ```javascript
    if (!this.indoorBg) {
        this.indoorBg = this.add.image(640, 648, loc.bg).setOrigin(0.5, 1).setDepth(-10);
    } else {
        this.indoorBg.setTexture(loc.bg).setVisible(true);
        this.indoorBg.setPosition(640, 648);
    }
    ```
*   Lines 1157-1158:
    ```javascript
    if (!this.indoorWallBgGroup) {
        this.indoorWallBgGroup = this.add.group();
    ```
*   Lines 1207-1212:
    ```javascript
    if (!this.indoorFloor) {
        this.indoorFloor = this.add.zone(640, 696, 1280, 50);
        this.physics.add.existing(this.indoorFloor, true); // true = static body
        this.physics.add.collider(this.player.sprite, this.indoorFloor);
    } else {
        this.indoorFloor.setActive(true);
        this.indoorFloor.body.enable = true;
    }
    ```
However, in `cleanupScene()` (lines 2514-2571), only `this.decorGroup` is nullified:
```javascript
    this.decorGroup = null;
    this.isSceneDestroyed = true;
```
None of `this.indoorBlackBg`, `this.indoorBg`, `this.indoorWallBgGroup`, `this.indoorFloor`, `this.indoorLeftWall`, or `this.indoorRightWall` are set to `null`/`undefined`.

### C. Save Data Access Integrity
*   In `src/PlayerController.js` line 271:
    ```javascript
    this.quests = window.saveData.quests ? JSON.parse(JSON.stringify(window.saveData.quests)) : [];
    ```
*   In `src/PlayerController.js` lines 2893 and 2932:
    ```javascript
    player: { level: window.saveData.level || 1, class: p.classData ? p.classData.id : "adventurer", hp: `${p.hp}/${p.maxHp}` }
    ```
*   In `src/NPCController.js` lines 357, 360-362, 508, 511-513, 647:
    ```javascript
    level: window.saveData.level || 1,
    gold: window.saveData.gold || 0,
    alignment: window.saveData.alignment || 0,
    isSavior: window.saveData.isSavior || false,
    ```
All these statements access properties on `window.saveData` without ensuring that `window.saveData` itself is defined.

### D. Save Serialization and Deep-Cloning
In `src/PlayerController.js` lines 252-258, constructor cloning is implemented:
```javascript
this.inventory = window.saveData && window.saveData.inventory ? JSON.parse(JSON.stringify(window.saveData.inventory)) : { ... };
```
In `saveGame()` (lines 558-564):
```javascript
window.saveData.inventory = JSON.parse(JSON.stringify(this.inventory));
window.saveData.quests = JSON.parse(JSON.stringify(this.quests));
window.saveData.stats = JSON.parse(JSON.stringify(this.classData.stats));
```

---

## 2. Logic Chain

### A. Indoor Component State Regression (Critical Finding)
1. When a player dies or restarts the scene, Phaser's engine destroys all game objects, images, zones, and groups associated with the current scene instance.
2. If the scene instance is recycled/rebooted (which Phaser does upon scene restart on the same key), properties defined directly on the scene object (like `this.indoorBg`, `this.indoorFloor`, etc.) persist as references pointing to these destroyed Phaser objects.
3. Upon entering a building in the restarted scene, the condition `if (!this.indoorBg)` evaluates to `false` because the property contains a truthy reference to a destroyed Image object.
4. The execution enters the `else` branch, attempting to invoke `.setTexture()` or `.setActive()` on a destroyed instance. This triggers a runtime exception (`TypeError: Cannot read properties of null` or similar), freezing gameplay.
5. Setting these variables to `null` in `cleanupScene()` or updating the checks to verify if the object still has a valid scene context (e.g. `!this.indoorBg || !this.indoorBg.scene`) is required to prevent this regression.

### B. Unguarded Save Object References (Medium Finding)
1. Standard gameplay flow initializes `window.saveData` in the menu scene.
2. However, if a developer runs a sub-scene/testbed directly, or if a user triggers dynamic updates before the initialization sequence completes, `window.saveData` will be `undefined`.
3. Evaluating `window.saveData.quests` or `window.saveData.level` directly without a parent check will throw an uncaught `TypeError` and crash the application.
4. Adding short-circuit evaluations like `window.saveData && window.saveData.quests` prevents this type of crash.

### C. Save Serialization and References (Verified)
1. Using `JSON.parse(JSON.stringify(...))` on `inventory`, `quests`, and `stats` during load and save completely unlinks internal object references from the shared global `window.saveData` state.
2. This eliminates the risk of reference loops, memory leaks, and unintended mutations of saved variables during gameplay.

---

## 3. Caveats
- Since the environment did not permit automated execution of `test_architecture.js`, we could not measure live memory leak deltas or inspect console logs dynamically.
- The evaluation is based on static inspection of code logic and reference flows.

---

## 4. Conclusion
While the codebase contains robust fixes for reference linking, animation completion freezes, and standard `decorGroup` scene reuse issues, a **critical regression** was found regarding the reuse of destroyed Phaser GameObject properties (`indoorBg`, `indoorFloor`, `indoorWallBgGroup`, etc.) across scene restarts.

**VERDICT**: REQUEST_CHANGES

---

## 5. Verification Method
1. Launch the game, play, enter a house (e.g. Sage or Blacksmith).
2. Exit the house, trigger player death or manual restart, then try to enter the house again.
3. Observe the developer console for `TypeError` crashes when accessing properties of the recycled/destroyed game objects.
4. Inspect `src/scenes/GameScene.js` around `cleanupScene()` and verify whether the indoor variables are cleared.
