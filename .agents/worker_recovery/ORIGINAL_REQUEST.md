## 2026-06-16T22:22:37Z

You are worker_recovery, a versatile worker subagent.
Your working directory is C:\Code2\rpg-scroller\.agents\worker_recovery.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

We are recovering from a system restart. The previous subagent (worker_refactor) completed most of the refactoring (see its handoff at C:\Code2\rpg-scroller\.agents\worker_refactor\handoff.md). However, we need to review, finalize, and verify the codebase state.

Your tasks:
1. Review the codebase to verify if the 5 specific architectural issues are fully resolved:
   - Async API race conditions (GeminiService.js, main.js, GameScene.js, WorldManager.js, PlayerController.js, EnemyController.js, NPCController.js)
   - Event Listener memory leaks (window/document listener unregistration on scene shutdown/restart/player die)
   - Save Data reference loops (deep cloning saveData on assignment)
   - Animation frame freezes (animation-specific complete callback handlers)
   - Physics garbage collection (culling out-of-bounds enemies when y > 1000)
2. Finalize/implement the following remaining gameplay hotfixes:
   - Double Jump: Ensure all player classes and party members/allies can double jump (track jumps, reset on floor/platform contact, allow second jump in the air).
   - Jumping Attacks: Ensure nobody (player, rivals, or monsters) is prevented from attacking while jumping/falling (remove body.touching.down restriction for attacking).
   - Air Momentum: When attacking in mid-air, do NOT freeze horizontal momentum (do not call setVelocityX(0)). Allow them to continue their arc.
   - Melee Height Alignment: Fix the "air damage" bug by ensuring melee attack hitboxes correctly intersect the target's height. If the player jumps OVER an enemy, the enemy's attack should miss if the y-distance is too great.
   - Negative Zone Loading: Explain or normalize negative zoneIndex values to Gemini API in GeminiService.js, and check saveZoneState caching in WorldManager.js when player transitions left (x < 60) to ensure enemies correctly load/restore.
   - Orc Attack Animation: Verify that the missing 'orc-attack' animation was added to GameScene.js.
   - Platforming AI: Improve enemy platforming AI in EnemyController.js under CHASE state (jumping if player is significantly higher and touching ground, or if horizontally blocked).
   - Note: The user has manually fixed the town platform height and NPC gravity (stuck in mid-air) issues, so you can skip those two specific items.
3. Run the integration test suite by executing 'node test_architecture.js' in the project root. Ensure all tests execute and pass cleanly.
4. Correct any bugs, type errors, or crashes you find in the console or page logs.
5. Document all verified implementation details, audited items, and test execution outcomes in C:\Code2\rpg-scroller\.agents\worker_recovery\handoff.md.
6. Send a message to your parent conversation (main agent, id: de78dca1-6b88-4842-bc20-59c7ca25e2c8) when complete.
