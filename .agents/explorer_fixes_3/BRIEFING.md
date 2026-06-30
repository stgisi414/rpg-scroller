# BRIEFING — 2026-06-29T14:06:24-05:00

## Mission
Analyze stability issues 3.1, 3.2, 3.3, and 3.4 in the rpg-scroller project and propose detailed fix strategies.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigator, analyzer
- Working directory: c:\Code2\rpg-scroller\.agents\explorer_fixes_3
- Original parent: 90c4d2a8-8595-4299-9e66-334aebced0b3
- Milestone: explorer_fixes_3

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: no external web access, no curl/wget targeting external URLs.
- Propose a detailed, step-by-step fix strategy in analysis.md and write a handoff.md.

## Current Parent
- Conversation ID: 90c4d2a8-8595-4299-9e66-334aebced0b3
- Updated: 2026-06-29T14:06:24-05:00

## Investigation State
- **Explored paths**:
  - `src/RescueeNPCFactory.js`
  - `src/scene_modules/CharacterComposer.js`
  - `src/scenes/GameScene.js`
  - `src/scenes/FighterScene.js`
  - `src/player/StatusEffectManager.js`
  - `src/NPCController.js`
  - `src/PlayerController.js`
  - `src/WorldManager.js`
  - `src/main.js`
  - `src/scene_modules/HUDManager.js`
  - `src/world/TownBuilder.js`
  - `src/player/StatsManager.js`
- **Key findings**:
  - *Issue 3.1*: Custom dynamic canvas textures generated with prefixes (`custom_npc_`, `special_enemy_`, `rescuee_`) are added to the global Phaser `TextureManager` but are never removed, accumulating indefinitely and causing memory leaks.
  - *Issue 3.2*: Native `setTimeout` handles the death sequence and restarts the scene. When returning to the main menu mid-death, the scene is destroyed, but the timer still fires, causing a fatal crash (`scene.scene` is undefined) and leaving a black overlay on the screen.
  - *Issue 3.3*: Direct reads and parsing of `localStorage.getItem('elden_soul_saves')` via `JSON.parse` lack `try-catch` protection in several files (`NPCController.js`, `WorldManager.js`, `GameScene.js`, `TownBuilder.js`), causing crashes if local data is corrupted.
  - *Issue 3.4*: `StatsManager.recalculateStats()` synchronizes current player HP, MP, SP directly from `window.saveData` which is only updated at checkpoints, causing current stats to reset to checkpoint values during any recalculation.
- **Unexplored areas**: None, all four issues have been traced and analyzed.
- **Pending verification**: Verification methods for each proposed fix.

## Key Decisions Made
- Formulated fix strategies for all four stability issues.
- Chose to write the full findings and step-by-step strategy to `analysis.md` in the working directory.

## Artifact Index
- c:\Code2\rpg-scroller\.agents\explorer_fixes_3\analysis.md — Analysis and proposed fix strategy
- c:\Code2\rpg-scroller\.agents\explorer_fixes_3\handoff.md — Handoff report
