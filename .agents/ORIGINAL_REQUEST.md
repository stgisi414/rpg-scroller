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

## Follow-up — 2026-06-29T18:39:20Z

Produce a comprehensive audit report of the RPG scroller project, analyzing codebase architecture, gameplay mechanics (balance, hitboxes), and identifying hidden bugs or crashes.

Working directory: c:\Code2\rpg-scroller
Integrity mode: development

## Requirements

### R1. Deep Codebase & Architecture Audit
Analyze the project for modularity, clean code practices, and performance bottlenecks.

### R2. Gameplay & Mechanics Audit
Review gameplay logic, hitbox precision, balancing, and state management.

### R3. Bug Hunting
Identify potential memory leaks, unhandled edge cases, and crash risks.

## Acceptance Criteria

### Comprehensive Audit Report
- [ ] The deliverable must be a structured markdown file (`audit_report.md`).
- [ ] The report must contain three distinct sections: Architecture, Gameplay, and Bug Hunting.
- [ ] Every identified issue must cite at least one specific file path and line number.
- [ ] The agent team must NOT modify any source code files or implement fixes.

## Follow-up — 2026-06-30T04:22:22Z

Refine, debug, and expand the game's AI autoplay system to enable robust autonomous grinding (combat, potion/resource management, and hazard navigation) across aggressive, defensive, and passive presets.

Working directory: c:/Code2/rpg-scroller
Integrity mode: development

## Requirements

### R1. Autoplay Grinding and Combat AI Refinement
Debug the combat and survival state machine in `CompanionAI.js` and `CompanionAI_Helper.js` to ensure the player character handles fighting, fleeing, potion consumption, and movement seamlessly. The AI must successfully grind without getting stuck, freezing, or dying prematurely under combat presets (`aggressive`, `potion_saver`, `pacifist`).

### R2. Automated Multi-Browser Autoplay Test Suite
Create a Node-based automated test runner script (using Puppeteer or Playwright) that can launch multiple browser instances in parallel. Each instance should load the local dev server (`http://localhost:3000`), enable autoplay with a different preset (e.g., Aggressive, Potion Saver, Pacifist), and run for a target time duration (e.g., 5 minutes).

## Acceptance Criteria

### Test Runner Execution
- [ ] A Node script (e.g. `npm run test:autoplay`) can launch multiple headless/headful browser instances concurrently.
- [ ] Each instance connects to the running game server and triggers the Autoplay AI.

### Autoplay Performance & Stability
- [ ] Autoplay instances run for at least 5 minutes in dangerous zones without dying.
- [ ] The player character successfully gains XP and Gold during the test runs.
- [ ] No unhandled JavaScript console errors or stuck loops (e.g. opening/closing menus, getting stuck in walls) occur during the grinding session.
