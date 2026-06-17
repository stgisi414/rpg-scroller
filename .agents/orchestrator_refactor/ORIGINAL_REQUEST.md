# Original User Request

## Initial Request — 2026-06-16T16:12:24-05:00

You are the Project Orchestrator for this refactoring mission.
Your working directory is C:\Code2\rpg-scroller\.agents\orchestrator_refactor.
Your identity is teamwork_preview_orchestrator.
Your goal is to coordinate the refactoring of the Elden Soul codebase to resolve the 5 specific architectural issues (Async API race conditions, Event Listener memory leaks, Save Data reference loops, Animation frame freezes, and Physics garbage collection), perform a wider audit to identify/fix similar anti-patterns, and create the automated headless browser test suite 'test_architecture.js'.
Read the original user request from C:\Code2\rpg-scroller\ORIGINAL_REQUEST.md.
You must coordinate the exploration, planning, worker execution, review, and verification phases.
Write your plans to plan.md, progress to progress.md, and handoff to handoff.md in your working directory C:\Code2\rpg-scroller\.agents\orchestrator_refactor.
Report back to the Sentinel (the parent agent) when you are done.

## Follow-up — 2026-06-16T21:23:47Z

URGENT HOTFIX REQUEST FOR CURRENT REFACTORING:

The user has identified two gameplay bugs that need to be addressed in the current sweep:
1. The Orc is missing its attack animation and gets stuck in idle/move when attacking. 
Fix: In `GameScene.js`, please add `this.anims.create({ key: 'orc-attack', frames: this.anims.generateFrameNumbers('orc', { start: 16, end: 19 }), frameRate: 10, repeat: 0 });` near the other orc animations.

2. The AI enemies are getting stuck or falling off the new procedurally generated platforms.
Fix: In `EnemyController.js`, within the `CHASE` state, improve their platforming AI.
- If the player is significantly higher (`this.player.sprite.y < this.sprite.y - 40`) AND they are touching the ground, they should have a strong chance to jump (`this.sprite.setVelocityY(-450)`).
- If they are horizontally blocked (`this.sprite.body.blocked.left || this.sprite.body.blocked.right`), they should jump to get over obstacles.

Please merge these two fixes into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.

## Follow-up — 2026-06-16T21:24:11Z

HOTFIX REQUEST 2 FOR CURRENT REFACTORING:

The user has noted that "nobody can jump and attack in the air, heroes, rivals or monsters".
In your refactor of `PlayerController.js` and `EnemyController.js`:
1. Ensure the attack logic does NOT prevent attacking while jumping or falling (remove `body.touching.down` restrictions for attacks).
2. If an entity is attacking in mid-air, DO NOT freeze their horizontal momentum (`this.sprite.setVelocityX(0)`). Allow them to continue their arc.
3. Fix the "air damage" bug: ensure hitboxes for melee attacks correctly intersect the target's height. If the player jumps OVER an enemy, the enemy's attack should miss if the y-distance is too great.

Please merge these two fixes into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.

## Follow-up — 2026-06-16T21:26:53Z

HOTFIX REQUEST 3 FOR CURRENT REFACTORING:

The user has requested a double jump for all classes because some of the new procedural platforms are unreachable.
In your refactor of `PlayerController.js`:
1. Add a mechanism for double jumping (e.g., track `this.jumps = 0`, reset to 0 when `body.touching.down`, and allow a second `setVelocityY` if `this.jumps < 2` when the jump key is pressed).
2. Ensure the player's party members (allies) can also double jump to follow the player across large gaps.

Please merge this fix into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.

## Follow-up — 2026-06-16T21:30:34Z

HOTFIX REQUEST 4 FOR CURRENT REFACTORING:

The user reported that "after the updates the towns are completely empty". 
This is because `NPCController` instances are hardcoded to spawn at `y = 696` in `WorldManager.js`, which places them inside or below the new expanded ground collision boxes, causing them to fall through the floor.

In your refactor of `WorldManager.js`:
1. Change the hardcoded `696` y-coordinate for all `NPCController` initializations to `500` or `400` so they spawn safely in the air and drop onto the platforms.
2. Ensure you fix this for the standard town NPCs, the fallback Sage, and the wilderness NPCs.

Please merge this fix into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.

## Follow-up — 2026-06-16T21:31:41Z

HOTFIX REQUEST 5 FOR CURRENT REFACTORING:

The user has reported that "when I travel to the negative zones there are no enemies loading at all".
In your refactor of `WorldManager.js` and `GeminiService.js`:
1. Check how negative `zoneIndex` values are handled when prompting the Gemini API. The prompt `Generate data for Zone Index -1` might be confusing the LLM and causing it to return empty `enemies` arrays. You may want to normalize or explain negative indices to the LLM.
2. Also check the `saveZoneState` caching logic. When the player transitions left (`x < 60`), ensure the newly loaded zone correctly populates enemies, and returning to cached zones correctly respawns or restores the enemy state without breaking.

Please merge this fix into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.

## Follow-up — 2026-06-16T21:34:44Z

HOTFIX REQUEST 6 FOR CURRENT REFACTORING:

The user has complained about the terrain generation in `GameScene.js` for wilderness zones: "90 percent of the time the platforms are way too high to get across the zone".

The current logic generates blocks 1 by 1, randomly dropping holes or changing elevation every 46 pixels. This creates chaotic, unplayable, and incredibly jagged terrain where a single missed jump causes the player to fall to their death.

In your refactor of `GameScene.js` (around line 1572):
Please completely rewrite the procedural 2D platforming logic to generate cohesive, continuous platforms rather than random noise.
1. Generate contiguous platforms of random widths (e.g., `let platWidth = Math.floor(Math.random() * 8) + 3;`).
2. Add small manageable gaps between platforms (e.g., 1-3 blocks wide).
3. Change elevation between entire platforms, not block by block.
4. Ensure the max height difference between adjacent platforms is easily clearable by a single or double jump (e.g., max 150 pixels up or down).
5. Add a solid bottom floor across the entire zone at `y = 800` (or make the death plane less punishing) so falling isn't an instant run-ender, or at least make sure the gaps aren't impossible.

Please merge this fix into your planned refactoring changes. This has been appended to the main ORIGINAL_REQUEST.md.
