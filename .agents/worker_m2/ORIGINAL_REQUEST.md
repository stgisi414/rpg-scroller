## 2026-06-16T23:34:17Z
You are the Worker. Your mission is to implement Milestone 2: Refactor PlayerController - Combat, AI, Quests & Chat.
Working directory: c:\Code2\rpg-scroller\.agents\worker_m2

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please do the following:
1. Examine `src/PlayerController.js` and the managers created in Milestone 1 (`src/player/StatsManager.js`, `src/player/InventoryManager.js`, `src/player/ShopManager.js`).
2. Extract the combat logic into a new file: `src/player/CombatController.js`.
   - The file should define a class `CombatController` that handles:
     - `attack()`
     - `fireArrow()`
     - `fireProjectile()`
     - `superComboSpell()`
     - `startDash()`
     - `takeDamage(amount, knockbackDirection)`
     - `applyLifesteal(dmg)`
     - `applyStatusEffect(effectKey, duration, data)`
     - `updateStatusEffects(delta)`
     - `die()`
   - Its constructor should accept `player` and store it as `this.player`.
   - The methods must update properties directly on `this.player` (e.g. `this.player.hp`, `this.player.mp`, `this.player.sp`, `this.player.isDashing`, `this.player.dashingLeft`, `this.player.dashingRight`, `this.player.dashTimer`, etc.) as other components and tests access them directly on the player controller instance.
3. Extract the companion AI logic into a new file: `src/player/CompanionAI.js`.
   - The file should define a class `CompanionAI` that handles `updateAI(time, delta)`.
   - Its constructor should accept `player` and store it as `this.player`.
4. Extract the quests and alignment tracking into a new file: `src/player/QuestAlignmentManager.js`.
   - The file should define a class `QuestAlignmentManager` that handles:
     - `updateAlignment(amount)`
     - `addQuest(questId)`
     - `progressQuest(questId, objectiveIndex, amount)`
     - `renderQuests()`
   - Its constructor should accept `player` and store it as `this.player`.
5. Extract the Gemini chat system into a new file: `src/player/ChatManager.js`.
   - The file should define a class `ChatManager` that handles:
     - `openChat()`
     - `closeChat()`
     - `addMessageToUI(sender, text, isAi)`
     - `handlePlayerMessage(text)`
     - `triggerHiddenPrompt(promptType)`
   - Its constructor should accept `player` and store it as `this.player`.
6. Update `src/PlayerController.js`:
   - Instantiate the managers in the constructor:
     `this.combatController = new CombatController(this);`
     `this.companionAI = new CompanionAI(this);`
     `this.questManager = new QuestAlignmentManager(this);`
     `this.chatManager = new ChatManager(this);`
   - Delegate methods to the new managers:
     - `attack()`, `fireArrow()`, `fireProjectile()`, `superComboSpell()`, `startDash()`, `takeDamage()`, `applyLifesteal()`, `applyStatusEffect()`, `updateStatusEffects()`, `die()` delegate to `this.combatController`
     - `updateAI()` delegates to `this.companionAI.updateAI()`
     - `updateAlignment()`, `addQuest()`, `progressQuest()`, `renderQuests()` delegate to `this.questManager`
     - `openChat()`, `closeChat()`, `addMessageToUI()`, `handlePlayerMessage()`, `triggerHiddenPrompt()` delegate to `this.chatManager`
7. Update the scripts loaded in `index.html` (before `src/PlayerController.js`) to include the new manager files:
   - `<script src="src/player/CombatController.js"></script>`
   - `<script src="src/player/CompanionAI.js"></script>`
   - `<script src="src/player/QuestAlignmentManager.js"></script>`
   - `<script src="src/player/ChatManager.js"></script>`
8. Update `test_logic_constraints.js` and `test_mechanics.js` VM scripts loading logic to read and run the code of these new files before running `PlayerController.js` in the VM context.
9. Run `node test_logic_constraints.js` and `node test_mechanics.js` and verify that all tests pass successfully. Document the build/test output in your handoff report at `c:\Code2\rpg-scroller\.agents\worker_m2\handoff.md`.
Report back when finished.
