# Scope: PlayerController and GameScene Modularization

This document tracks the refactoring process to modularize `PlayerController.js` and `GameScene.js` into clean, focused sub-classes.

## Architecture
We will extract logic from the two massive controller files into separate, focused class files located in `src/player/` and `src/scene_modules/` respectively.
Both `PlayerController` and `GameScene` will serve as the facade classes, instantiating the components in their constructors and delegating methods to them.
To ensure compatibility with the browser environment and Node VM tests, the extracted scripts will be loaded via `<script>` tags in `index.html` and read/evaluated in `test_logic_constraints.js` and `test_mechanics.js`.

## Code Layout
New files to be created:
- `src/player/StatsManager.js`
- `src/player/InventoryManager.js`
- `src/player/ShopManager.js`
- `src/player/CombatController.js`
- `src/player/CompanionAI.js`
- `src/player/QuestAlignmentManager.js`
- `src/player/ChatManager.js`

- `src/scene_modules/HUDManager.js`
- `src/scene_modules/SpriteDebugger.js`
- `src/scene_modules/CutsceneController.js`
- `src/scene_modules/LevelGenerator.js`
- `src/scene_modules/IndoorManager.js`
- `src/scene_modules/ProgressionManager.js`

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Refactor PlayerController - Stats, Inventory & Shop | Extract StatsManager, InventoryManager, and ShopManager. Update PlayerController, index.html, and tests to load them. | None | DONE |
| 2 | Refactor PlayerController - Combat, AI, Quests & Chat | Extract CombatController, CompanionAI, QuestAlignmentManager, and ChatManager. Update PlayerController, index.html, and tests to load them. | M1 | DONE |
| 3 | Refactor GameScene - HUD, Debugger & Cutscenes | Extract HUDManager, SpriteDebugger, and CutsceneController. Update GameScene and index.html to load them. | M2 | DONE |
| 4 | Refactor GameScene - Level Gen, Indoors & Progression | Extract LevelGenerator, IndoorManager, and ProgressionManager. Update GameScene and index.html to load them. | M3 | DONE |
| 5 | E2E Integration and Testing Gating | Run all automated test suites to ensure 100% functional parity and integrity check. | M4 | DONE |

## Interface Contracts
- Sub-managers will accept the parent instance (e.g., `player` or `scene`) in their constructors and store it as `this.player` or `this.scene` to interact with other components.
- Standard method calls on the parent classes will be preserved exactly to avoid breaking tests.
