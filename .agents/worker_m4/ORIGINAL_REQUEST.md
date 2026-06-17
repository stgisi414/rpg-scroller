## 2026-06-17T00:03:51Z
You are the Worker. Your mission is to implement Milestone 4: Refactor GameScene - Level Gen, Indoors & Progression.
Working directory: c:\Code2\rpg-scroller\.agents\worker_m4

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please do the following:
1. Examine `src/scenes/GameScene.js` and the managers created in Milestone 3 (`src/scene_modules/HUDManager.js`, `src/scene_modules/SpriteDebugger.js`, `src/scene_modules/CutsceneController.js`).
2. Extract the level/biome generation logic into a new file: `src/scene_modules/LevelGenerator.js`.
   - The file should define a class `LevelGenerator` that handles `setBiomeVisuals(zoneData)`.
   - Its constructor should accept `scene` (the GameScene instance) and store it as `this.scene`.
3. Extract the indoor locations / town directories logic into a new file: `src/scene_modules/IndoorManager.js`.
   - The file should define a class `IndoorManager` that handles:
     - `openTownDirectory()`
     - `closeTownDirectory()`
     - `enterIndoorLocation(locationKey)`
     - `exitIndoorLocation()`
   - Its constructor should accept `scene` and store it as `this.scene`.
4. Extract the rewards / XP progression logic into a new file: `src/scene_modules/ProgressionManager.js`.
   - The file should define a class `ProgressionManager` that handles `grantRewards(xpEarned, goldEarned)`.
   - Its constructor should accept `scene` and store it as `this.scene`.
5. Update `src/scenes/GameScene.js`:
   - Instantiate the managers in the GameScene constructor:
     `this.levelGenerator = new LevelGenerator(this);`
     `this.indoorManager = new IndoorManager(this);`
     `this.progressionManager = new ProgressionManager(this);`
   - Delegate methods to the new managers:
     - `setBiomeVisuals(zoneData)` delegates to `this.levelGenerator`
     - `openTownDirectory()`, `closeTownDirectory()`, `enterIndoorLocation(locationKey)`, `exitIndoorLocation()` delegate to `this.indoorManager`
     - `grantRewards(xpEarned, goldEarned)` delegates to `this.progressionManager`
6. Update `index.html` to load these new scripts before `src/scenes/GameScene.js`:
   - `<script src="src/scene_modules/LevelGenerator.js"></script>`
   - `<script src="src/scene_modules/IndoorManager.js"></script>`
   - `<script src="src/scene_modules/ProgressionManager.js"></script>`
7. Run all tests: `node test_logic_constraints.js`, `node test_mechanics.js`, and `node test_architecture.js` to verify they all pass successfully. Document test output in your handoff report at `c:\Code2\rpg-scroller\.agents\worker_m4\handoff.md`.
Report back when finished.
