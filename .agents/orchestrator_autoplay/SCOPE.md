# Scope: Autoplay AI Refinement & Multi-Browser Test Suite

## Architecture
- **Autoplay AI (`CompanionAI.js`, `CompanionAI_Helper.js`)**: Integrates into the game loop via `PlayerController.js`. It reads player stats, local map/enemy surroundings, and issues movement/attack simulation keys.
- **Automated Test Runner (`test_autoplay.js`)**: Orchestrator runner using Puppeteer to spin up multiple parallel Chromium pages, connect to `http://localhost:3000`, run simulated players under different presets (`aggressive`, `potion_saver`, `pacifist`), and collect gameplay statistics.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Setup & Planning | Decompose task, define plan, initialize progress and briefings. | None | DONE |
| 2 | Codebase Exploration | Explore CompanionAI, CompanionAI_Helper, inputs, HUD selectors, and test suite setup. | M1 | DONE |
| 3 | AI Combat & Survival Refinements | Implement robust state machine updates for presets, potion consumption, fleeing, and platform hazard navigation. | M2 | DONE |
| 4 | Automated Parallel Test Suite | Implement Node test runner using Puppeteer to run multi-browser test. Add test:autoplay script. | M2 | DONE |
| 5 | Verification & Forensic Audit | Run E2E test runs, challenge edge cases, perform forensic audit checks, confirm stability. | M3, M4 | DONE |

## Interface Contracts
### PlayerController.js ↔ CompanionAI.js
- `CompanionAI` runs during `update()` or a sub-tick. It reads state from the player character object.
- Autoplay triggers keys in `InputManager` or simulates inputs directly by modifying player velocity, triggering attacks, etc. (We need to verify if it triggers via keys or direct class actions in Milestone 2).

### CompanionAI.js ↔ CompanionAI_Helper.js
- Helper functions analyze environment coordinates, determine nearby threats, scan for platforms, hazards, and decide on paths/jumps.
