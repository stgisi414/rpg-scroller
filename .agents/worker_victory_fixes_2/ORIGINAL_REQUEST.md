## 2026-06-30T19:51:05Z

You are the Worker agent for the second round of victory fixes (identity: worker_victory_fixes_2).
Your working directory is: c:\Code2\rpg-scroller\.agents\worker_victory_fixes_2.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to:
1. In `src/npc/NPCController_Helper.js`, update the calls to `getNpcResponse()` to correctly pass `this.indoorAction || ""` as the fifth argument (`actionContext`):
   - Locate:
     ```javascript
     const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, promptSuffix, state);
     ```
     Change to:
     ```javascript
     const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, promptSuffix, state, this.indoorAction || '');
     ```
   - Do the same for the intro hidden prompt call (around line 486):
     ```javascript
     const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, hiddenPrompt, state, this.indoorAction || '');
     ```
2. In `src/PlayerController.js` constructor (around line 16), allow `isAI = true` to persist across scene restarts by checking `window.autoplayConfig`:
   - Locate:
     ```javascript
     this.isAI = options.isAI || false;
     this.aiState = options.aiState || 'idle';
     ```
     Change to:
     ```javascript
     const autoplayActive = (window.autoplayConfig && window.autoplayConfig.isActive) || (options.isAI);
     this.isAI = autoplayActive || false;
     if (this.isAI) {
         this.aiState = 'party';
     } else {
         this.aiState = options.aiState || 'idle';
     }
     ```
3. In `src/scene_modules/HUDManager.js` (around line 58), initialize the Auto-Play button's text and background color dynamically based on `this.scene.player.isAI` when created, and update `window.autoplayConfig.isActive` in its click listener:
   - Locate the button creation (around lines 58-90):
     ```javascript
     if (this.scene.hudElements.nameLevel && !document.getElementById('btn-auto-play')) {
         const btnAP = document.createElement('button');
         btnAP.id = 'btn-auto-play';
         btnAP.innerText = '🤖 Auto-Play';
         btnAP.title = 'Toggle AI Auto-Play';
         btnAP.style.cssText = 'margin-left:8px;background:rgba(30,60,80,0.9);border:1px solid #2b83a0;color:#8ae6fd;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;';
         btnAP.addEventListener('click', () => {
             if (this.scene.player) {
                 this.scene.player.isAI = !this.scene.player.isAI;
                 this.scene.player.aiState = 'party';
                 btnAP.style.background = this.scene.player.isAI ? 'rgba(80,160,30,0.9)' : 'rgba(30,60,80,0.9)';
                 btnAP.innerText = this.scene.player.isAI ? '🛑 Stop AI' : '🤖 Auto-Play';
                 ...
     ```
     Change it to:
     ```javascript
     if (this.scene.hudElements.nameLevel && !document.getElementById('btn-auto-play')) {
         const btnAP = document.createElement('button');
         btnAP.id = 'btn-auto-play';
         const isAIActive = this.scene.player && this.scene.player.isAI;
         btnAP.innerText = isAIActive ? '🛑 Stop AI' : '🤖 Auto-Play';
         btnAP.title = 'Toggle AI Auto-Play';
         btnAP.style.cssText = `margin-left:8px;background:${isAIActive ? 'rgba(80,160,30,0.9)' : 'rgba(30,60,80,0.9)'};border:1px solid #2b83a0;color:#8ae6fd;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;`;
         btnAP.addEventListener('click', () => {
             if (this.scene.player) {
                 this.scene.player.isAI = !this.scene.player.isAI;
                 this.scene.player.aiState = 'party';
                 if (window.autoplayConfig) {
                     window.autoplayConfig.isActive = this.scene.player.isAI;
                     this._saveAutoplayConfig();
                 }
                 btnAP.style.background = this.scene.player.isAI ? 'rgba(80,160,30,0.9)' : 'rgba(30,60,80,0.9)';
                 btnAP.innerText = this.scene.player.isAI ? '🛑 Stop AI' : '🤖 Auto-Play';
                 ...
     ```
4. Verify your work by running:
   - `node test_mechanics.js`
   - `node test_logic_constraints.js`
   - `node test_autoplay.js --duration 30000` (smoke test)
   - `node test_autoplay.js --duration 300000` (full 5-minute acceptance test)
5. Document all your changes, terminal outputs, and test results in `c:\Code2\rpg-scroller\.agents\worker_victory_fixes_2\handoff.md`.

## 2026-06-30T20:01:05Z

**Context**: Additional Victory Auditor fixes.
**Content**: The Victory Auditor has rejected the verification with the following finding:
1. **Angel Statue Interaction Conflict**:
   - In `src/player/CompanionAI_Helper.js` (around line 933), the distance threshold `dist > 60` allows interaction when the player is closer to nearby NPCs than the statue. Reduce this threshold to `dist > 10` (so they walk directly on top of the statue before interacting).
   - In `src/player/CompanionAI_Helper.js`'s chat handler (around line 660), add a precaution check to immediately close the chat if the player wants to visit the Guild Hall (`this._wantsGuildHall`) or travel (`this._wantsToTravel`) and they are outdoors (`!scene.isIndoors`).
   That is, the condition should be:
   `if (this._wantsToAdventure || ((this._wantsGuildHall || this._wantsToTravel) && !scene.isIndoors))`

Please implement these additional changes along with the previous round of fixes, run the verification tests (mechanics, logic constraints, smoke test, full E2E test), and report back.
**Action**: Update workload, implement fixes, and verify.

## 2026-06-30T20:13:05Z

**Context**: Revive subagent and add round 4 fixes.
**Content**: The Victory Auditor has rejected the validation with the following findings:
1. **2D Distance Interaction Hijack (GameScene.js)**:
   - In `src/scenes/GameScene.js` (around line 863), compare 1D (horizontal) distance `Math.abs(this.player.sprite.x - npc.sprite.x)` rather than 2D distance when checking if an NPC is closer to the player than the statue.
   - For example, check:
     ```javascript
     const npcHorizontalDist = Math.abs(this.player.sprite.x - npc.sprite.x);
     const statueHorizontalDist = Math.abs(this.player.sprite.x - this.angelStatue.x);
     if (npcHorizontalDist < 80 && npcHorizontalDist < statueHorizontalDist) {
         npcCloser = true;
     }
     ```
2. **Missing Interaction Cooldown (CompanionAI_Helper.js)**:
   - In `src/player/CompanionAI_Helper.js` (around line 952), wrap the statue interaction in a cooldown check:
     ```javascript
     if (time - (this._lastChatClosedTime || 0) > 4000) {
         player.aiInput.interact = true;
         this._wantsToTravel = false;
     }
     ```

Please include these fixes in your code, run the unit/E2E test suites (smoke and full E2E), and report back.
**Action**: Implement round 4 fixes, run verification, and compile handoff.md.

## 2026-06-30T20:24:19Z

**Context**: Additional Victory Auditor fixes (Round 5).
**Content**: The Victory Auditor has rejected the validation with the following findings:
1. **Low-Quest Preset Directory Loop**:
   - In `src/player/CompanionAI_Helper.js` (around line 344), update the quest/guild hall override check to clear `_wantsGuildHall` when questFocus is low or when they already have quests:
     ```javascript
     if (this._wantsToAdventure && activeQuestCountNav < 1 && questFocus > 50 && !scene.isIndoors) {
         this._wantsToAdventure = false;
         this._wantsGuildHall = true;
     } else if (questFocus <= 50 || activeQuestCountNav >= 1) {
         this._wantsGuildHall = false;
     }
     ```
2. **NPC Distraction Loop**:
   - In `src/player/CompanionAI_Helper.js` (around line 835), block interactions with random town NPCs if the player has an active travel or Guild Hall target:
     ```javascript
     if (scene.npcs && !isChatOpen && !isShopOpen && !this._wantsToAdventure && !this._wantsGuildHall && !this._wantsToTravel && time - (this._lastChatClosedTime || 0) > 8000) {
     ```

Please include these changes in your code, run the unit/E2E test suites (smoke and full E2E test), and report back.
**Action**: Update workload, implement fixes, and verify.

## 2026-06-30T20:36:19Z

**Context**: Additional Victory Auditor fixes (Round 6).
**Content**: The Victory Auditor has rejected the validation with the following findings:
- **Interaction Hijack by Wandering NPCs (GameScene.js & NPCController.js)**:
  - In `src/scenes/GameScene.js` (around line 863), bypass the NPC hijack check if the player is very close to the statue (within 20 pixels):
    ```javascript
    if (npcHorizontalDist < 80 && npcHorizontalDist < statueHorizontalDist && statueHorizontalDist >= 20) {
        npcCloser = true;
    }
    ```
  - In `src/NPCController.js` (around line 659), symmetrically bypass the check:
    ```javascript
    if (distToStatue < 100 && (distToStatue < distanceToPlayer || distToStatue < 20)) {
        statueCloser = true;
    }
    ```

Please incorporate these changes, run the test suites (mechanics, logic constraints, smoke test, full E2E test), and report back.
**Action**: Implement round 6 fixes, run tests, and write handoff.

## 2026-06-30T20:46:25Z

**Context**: Additional Victory Auditor fixes (Round 7).
**Content**: The Victory Auditor has rejected the validation with the following finding:
- **Progression Hijack at Angel Statue (CompanionAI.js)**:
  - In `src/player/CompanionAI.js` (around line 106), the `hasMainHeroSafeZoneInput` check does not verify `this._wantsGuildHall || this._wantsToTravel`.
  - Update `hasMainHeroSafeZoneInput` to include these:
    ```javascript
    const hasMainHeroSafeZoneInput = player === p && isActuallySafe && (
        player.aiInput.left || 
        player.aiInput.right || 
        player.aiInput.interact ||
        this._wantsGuildHall ||
        this._wantsToTravel ||
        (!this._wantsToAdventure && hasCloseNpc) ||
        this._isElementVisible('chat-ui') ||
        this._isElementVisible('ui-shop') ||
        this._isElementVisible('ui-town-directory')
    );
    ```

Please incorporate this change, run all the test suites (mechanics, logic constraints, smoke test, full E2E test), and report back.
**Action**: Implement round 7 fixes, run tests, and write handoff.

## 2026-06-30T20:59:01Z

**Context**: Additional Victory Auditor fixes (Round 8).
**Content**: The Victory Auditor has rejected the validation with the following finding:
- **Town Directory Auto-Close Deadlock (CompanionAI_Helper.js)**:
  - In `src/player/CompanionAI_Helper.js` (around line 658), update the check to:
    ```javascript
    if (this._wantsToAdventure && !this._wantsGuildHall) {
    ```
    This prevents the directory from auto-closing when the AI wants to visit the Guild Hall, allowing them to click the card and proceed.

Please incorporate this change, run all the test suites (mechanics, logic constraints, smoke test, full E2E test), and report back.
**Action**: Implement round 8 fixes, run tests, and write handoff.
