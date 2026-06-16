# Orchestration Plan - RPG Scroller Fixes

## 1. Objectives
- Decompose and map out all bugs in the RPG scroller codebase (visual, rendering, gameplay, AI pathing, physics NaNs).
- Identify sprite sheet anomalies (dimensions, frame counts, directions) for `lich_lord.png`, `devil_boss.png`, `frost_giant.png`, `bandit.png`, etc.
- Develop a generalized, robust solution to handle and standardize sprite sheet animations.
- Fix all identified bugs and verify using automated/diagnostic scripts and QA verification.

## 2. Milestones & Task Breakdown

### Milestone 1: Decomposition and Initialization
- [x] Create ORIGINAL_REQUEST.md copy in orchestrator folder.
- [x] Initialize BRIEFING.md.
- [x] Create progress.md and plan.md.
- [ ] Create global PROJECT.md at project root.

### Milestone 2: Deep Codebase & Asset Analysis
- [ ] Dispatch Explorer subagent to analyze the codebase:
  - Sprite rendering / asset loading logic in `AssetManager.js`, `scenes/`, `main.js`, etc.
  - Gameplay & AI logic in `EnemyController.js`, `NPCController.js`, `PlayerController.js`.
  - Check for NaN issues in physics or layout (e.g. velocities, positions, frame timings).
  - Search for console errors/runtime issues.
- [ ] Verify asset file sizes, frame counts, dimensions, and direction discrepancies.

### Milestone 3: Asset Dimensions Verification & Standardization Mapping
- [ ] Establish standard interface contracts and config rules for anomalous sprites.
- [ ] Create a mappings registry/config inside the codebase or `AssetManager` to normalize frames, size, margins, and directional flipping.

### Milestone 4: Robust Fix Implementation
- [ ] Dispatch Worker subagent to implement the sprite sheet standardizer.
- [ ] Implement robust fixes for AI pathing, behaviors, physics NaNs, and visual bugs.

### Milestone 5: Comprehensive QA Verification
- [ ] Design and run tests (Tiers 1-4) or diagnostic scripts to verify rendering and gameplay.
- [ ] Confirm no JS runtime console errors.

### Milestone 6: Final Report & Sentinel Notification
- [ ] Synthesize all results in `bug_fixes_report.md`.
- [ ] Notify the sentinel.
