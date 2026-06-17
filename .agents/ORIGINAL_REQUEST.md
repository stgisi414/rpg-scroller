# Original User Request

## Follow-up — 2026-06-16T23:24:55Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Refactor `PlayerController.js` and `GameScene.js` to break down their massive file sizes by extracting specific logic into smaller, modular components. Let the agent team decide the best architecture.

Working directory: c:\Code2\rpg-scroller
Integrity mode: benchmark

## Requirements

### R1. Modularize PlayerController and GameScene
Extract logic (such as input handling, UI rendering, combat, or AI) from `PlayerController.js` (2900+ lines) and `GameScene.js` (2600+ lines) into separate, focused class files.

### R2. Maintain Exact Functionality
The refactoring must be purely structural. No features, mechanics, or specific behaviors should be altered or removed during the process.

## Acceptance Criteria

### Functional Parity
- [ ] The game successfully compiles and runs locally without console errors.
- [ ] The player can move, jump, attack, and interact with NPCs exactly as before.
- [ ] The AI companions and enemies retain all of their pathfinding and combat logic.
- [ ] The automated test suite (`test_architecture.js`, `test_mechanics.js`) passes successfully.
- [ ] The towns and town directories work properly.
- [ ] The world platforms make sense.
