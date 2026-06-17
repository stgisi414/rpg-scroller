## 2026-06-16T23:57:01Z
You are the Worker. Your mission is to implement Milestone 3: Refactor GameScene - HUD, Debugger & Cutscenes.
Working directory: c:\Code2\rpg-scroller\.agents\worker_m3

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please do the following:
1. Examine `src/scenes/GameScene.js`.
2. Extract the HUD and Character Sheet UI logic into a new file: `src/scene_modules/HUDManager.js`.
   - The file should define a class `HUDManager` that handles:
     - `createHUD()`
     - `updateHUD()`
     - `_updateDebugHUD(time)`
     - `_createCharacterSheetModal()`
     - `toggleCharacterSheet()`
     - `_updateCharacterSheet()`
     - `dismissPartyMember(index)`
     - `startPartyChat(index)`
   - Its constructor should accept `scene` (the GameScene instance) and store it as `this.scene`.
   - Ensure the methods update elements on `this.scene` as expected by other systems.
3. Extract the Debug panel / Sprite debugger logic into a new file: `src/scene_modules/SpriteDebugger.js`.
   - The file should define a class `SpriteDebugger` that handles `createDebugPanel()`.
   - Its constructor should accept `scene` and store it as `this.scene`.
4. Extract the Cutscene logic into a new file: `src/scene_modules/CutsceneController.js`.
   - The file should define a class `CutsceneController` that handles `playCutscene(lines, onComplete)` and `cancelCutscene()`.
   - Its constructor should accept `scene` and store it as `this.scene`.
5. Update `src/scenes/GameScene.js`:
   - Instantiate the managers in the GameScene constructor:
     `this.hudManager = new HUDManager(this);`
     `this.spriteDebugger = new SpriteDebugger(this);`
     `this.cutsceneController = new CutsceneController(this);`
   - Delegate methods to the new managers:
     - `createHUD()`, `updateHUD()`, `_updateDebugHUD()`, `_createCharacterSheetModal()`, `toggleCharacterSheet()`, `_updateCharacterSheet()`, `dismissPartyMember()`, `startPartyChat()` delegate to `this.hudManager`
     - `createDebugPanel()` delegates to `this.spriteDebugger`
     - `playCutscene()`, `cancelCutscene()` delegate to `this.cutsceneController`
6. Update `index.html` to load these new scripts before `src/scenes/GameScene.js`:
   - `<script src="src/scene_modules/HUDManager.js"></script>`
   - `<script src="src/scene_modules/SpriteDebugger.js"></script>`
   - `<script src="src/scene_modules/CutsceneController.js"></script>`
7. Run all tests: `node test_logic_constraints.js`, `node test_mechanics.js`, and `node test_architecture.js` to verify they all pass successfully. Document test output in your handoff report at `c:\Code2\rpg-scroller\.agents\worker_m3\handoff.md`.
Report back when finished.
