# BRIEFING — 2026-06-29T14:24:00-05:00

## Mission
Resolve global namespace pollution and modularize monolithic files exceeding maintenance limits in the rpg-scroller project, verifying with VM sandbox tests.

## 🔒 My Identity
- Archetype: implementer/qa/specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Code2\rpg-scroller\.agents\worker_fixes_2
- Original parent: 90c4d2a8-8595-4299-9e66-334aebced0b3
- Milestone: Resolve namespace pollution and modularize code.

## 🔒 Key Constraints
- Ensure that NO application state, static configurations, lookup tables, or utility functions are attached to the global window object.
- Specifically, remove window.* assignments for window.saveData, window.autoplayConfig, window.INDOOR_LOCATIONS, window.WORLD_KINGDOMS, window.PASSIVE_SKILLS_DATA, window.getReputationPriceMultiplier, and window.RescueeNPC.
- Modularize index.html CSS styles and specific monolithic files exceeding 1000 lines.
- Run the automated test suites (`test_logic_constraints.js` and `test_mechanics.js`) and make sure they pass 100% successfully.
- Check that the game boots and works correctly.

## Current Parent
- Conversation ID: 90c4d2a8-8595-4299-9e66-334aebced0b3
- Updated: not yet

## Task Summary
- **What to build**: Modularize monolithic files (index.html CSS, GameScene.js, CompanionAI.js, NPCController.js, PlayerController.js, ShopManager.js, SpellController.js) and remove window.* assignments for key variables/methods, ensuring tests pass.
- **Success criteria**: Tests pass, global namespace pollution is resolved, modularity is improved, game works.
- **Interface contracts**: No window.* pollution for the specified variables.
- **Code layout**: Source in src/, styles in src/styles/ (or custom subfolder), test scripts in root/tests.

## Key Decisions Made
- Declared target variables in global declarative scope within a script block in index.html, preventing window pollution.
- Replaced `window.varName` with `varName` across all JavaScript source files.
- Proxied the target variables on the VM tests sandbox objects using getters and setters to mirror windowMock, passing all tests.
- Extracted code from massive monolithic files (GameScene.js, CompanionAI.js, NPCController.js, PlayerController.js, ShopManager.js, SpellController.js) into cohesive helper files (GameScene_Helper.js, CompanionAI_Helper.js, NPCController_Helper.js, PlayerController_Helper.js, ShopManager_MarketplaceHelper.js, SpellController_Helper.js) and delegated calls to them.
- Updated Puppeteer/integration test runner to properly support character select passive points and loading screens.

## Artifact Index
- `src/scenes/GameScene_Helper.js` — GameScene offloaded logic
- `src/player/CompanionAI_Helper.js` — CompanionAI offloaded logic
- `src/npc/NPCController_Helper.js` — NPCController offloaded logic
- `src/player/PlayerController_Helper.js` — PlayerController offloaded logic
- `src/player/ShopManager_MarketplaceHelper.js` — ShopManager marketplace logic
- `src/player/SpellController_Helper.js` — SpellController super spells logic
- `src/styles/` — Extracted CSS stylesheets (main.css, title.css, fighter.css)
