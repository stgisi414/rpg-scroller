## 2026-06-29T19:20:16Z
You are a teamwork_preview_worker. Your working directory is c:\Code2\rpg-scroller\.agents\worker_fixes_2.
Your mission is to resolve:
1. Issue 1.1: Global Namespace Pollution
   - Ensure that NO application state, static configurations, lookup tables, or utility functions are attached to the global window object.
   - Specifically, remove window.* assignments for window.saveData, window.autoplayConfig, window.INDOOR_LOCATIONS, window.WORLD_KINGDOMS, window.PASSIVE_SKILLS_DATA, window.getReputationPriceMultiplier, and window.RescueeNPC.
   - You can migrate them to proper modular exports (ES modules) or use global declarative scope (let/const top-level variables in the global declarative environment that do not bind to window) if compatibility with the script loading and VM tests requires it. Ensure references in all files are updated accordingly.
   - Update test_mechanics.js and test_logic_constraints.js VM sandboxes to mock these variables on the sandbox context directly so the tests do not crash.

2. Issue 1.2: Monolithic Files Exceeding Maintenance Limits
   - Modularize index.html: Extract the large CSS style blocks (Party Builder, Fighter Suite, etc.) into external stylesheets in a subfolder (e.g., src/styles/) and link them in the header.
   - Modularize other monolithic files exceeding 1,000 lines (src/scenes/GameScene.js, src/player/CompanionAI.js, src/NPCController.js, src/PlayerController.js, src/player/ShopManager.js, src/player/SpellController.js) by extracting cohesive blocks of logic into helper modules and using delegation (e.g. instantiating them as sub-managers or delegating with call(this)). Ensure all refactors preserve the original features, variable structures, and behaviors with 100% fidelity.

3. Verification:
   - Run the automated test suites (test_logic_constraints.js and test_mechanics.js) and make sure they pass 100% successfully.
   - Check that the game boots and works correctly.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document your commands, files changed, and test results in handoff.md, then send a message back to the orchestrator (90c4d2a8-8595-4299-9e66-334aebced0b3) when complete.
