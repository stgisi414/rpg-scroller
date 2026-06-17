## 2026-06-16T21:20:13Z
You are worker_refactor, a versatile worker subagent.
Your working directory is C:\Code2\rpg-scroller\.agents\worker_refactor.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to refactor the Elden Soul codebase to resolve the 5 specific architectural issues:
1. Async API race conditions: Safeguard all callbacks/then/await returns in GeminiService.js, main.js, GameScene.js, WorldManager.js, PlayerController.js, EnemyController.js, NPCController.js to check if the target, scene (scene.sys.isActive()), or DOM elements are destroyed or inactive before execution.
2. Event Listener memory leaks: Store and cleanly unregister window/document event listeners on scene shutdown, restart, and player destruction. E.g. in GameScene.js (beforeunload, keydown for modals, mouseup, town directory ESC key) and PlayerController.js (chat input key handlers on persistent DOM elements).
3. Save Data reference loops: Deep clone saveData (using JSON.parse/JSON.stringify or custom clone) before modifying/assigning properties in main.js, PlayerController.js, and WorldManager.js to ensure saveData is completely unlinked from live gameplay memory.
4. Animation frame freezes: Prevent animations from freezing on frame 0. Cleanly use animation-specific complete callbacks (e.g. animationcomplete-KEY or once/off) for animation complete handling in PlayerController.js (combo completes), EnemyController.js (hit and death completes).
5. Physics garbage collection: Cleanly cull enemies that fall below the vertical level boundary (y > 1000) by destroying their sprite and physics body in EnemyController.js / GameScene.js update.

Also, perform a wider audit to resolve similar anti-patterns.

Additionally, install puppeteer:
- Run 'npm install puppeteer --save-dev' inside C:\Code2\rpg-scroller.
- Create an automated headless browser test script named 'test_architecture.js' in the project root.
- The test script must launch the local game (expecting it to run on port 3000, or starting it with http-server), run Puppeteer to connect, and programmatically simulate rapid player deaths, zone transitions, and continuous attacks.
- It must monitor console errors, verify that no TypeErrors or crashes happen when transitions or deaths occur during pending API calls, and check that event listeners do not stack up on restarts.
- Run this test script and ensure it successfully executes and passes against your refactored codebase.

Document your changes and test results in C:\Code2\rpg-scroller\.agents\worker_refactor\handoff.md.
Send a message to your parent conversation (main agent, id: de78dca1-6b88-4842-bc20-59c7ca25e2c8) when complete.

## 2026-06-16T21:23:58Z
New request update from parent agent:
1. Missing Orc attack animation: In `GameScene.js`, add `this.anims.create({ key: 'orc-attack', frames: this.anims.generateFrameNumbers('orc', { start: 16, end: 19 }), frameRate: 10, repeat: 0 });` near the other orc animations.
2. Enemy platforming/chase state improvements: In `EnemyController.js`, under the `CHASE` state:
- If player is significantly higher (`this.player.sprite.y < this.sprite.y - 40`) and enemy is touching ground, give a strong chance to jump (`this.sprite.setVelocityY(-450)`).
- If enemy is horizontally blocked (`this.sprite.body.blocked.left || this.sprite.body.blocked.right`), trigger a jump.

## 2026-06-16T21:24:46Z
Sentinel has sent HOTFIX REQUEST 2:
1. Air Attack: In both `PlayerController.js` and `EnemyController.js`, ensure the attack logic does NOT prevent attacking while jumping or falling (remove `body.touching.down` restrictions for attacks).
2. Air Velocity: If an entity is attacking in mid-air, DO NOT freeze their horizontal momentum (`this.sprite.setVelocityX(0)`). Allow them to continue their arc.
3. Air Melee Damage: Ensure melee attack hitboxes correctly check target height/y-distance, so if a player/rival jumps OVER an enemy, the melee attack misses if the y-distance is too great.

## 2026-06-16T21:27:05Z
Sentinel has sent HOTFIX REQUEST 3:
1. Double jump for all classes: In `PlayerController.js`, add a mechanism for double jumping (track `this.jumps = 0`, reset to 0 when `body.touching.down` (and possibly when on platform/ground), and allow a second jump if `this.jumps < 2` when the jump key/button is pressed).
2. Double jump for player's party members (allies/companions): Ensure they can also double jump (using similar jumps tracking or when following the player across large gaps).
