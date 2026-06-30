## 2026-06-30T19:33:29Z
You are the Worker agent for victory fixes (identity: worker_victory_fixes).
Your working directory is: c:\Code2\rpg-scroller\.agents\worker_victory_fixes.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to:
1. In `src/player/CompanionAI.js`, update the friendly self-potion safety floor block:
   - Make sure the condition specifically targets friendly autoplay AI:
     ```javascript
     if (player.isAI && player.aiState === 'party' && !player.isCargoCarrier && player.inventory && player.inventory.potions > 0 && player.hp > 0 && player.hp < player.maxHp) {
     ```
   - Scale the threshold based on player's Max HP to prevent early burst deaths for low-HP starting classes (like Priest):
     ```javascript
     let selfPotionThresh = selfPotionPct / 100;
     if (player.maxHp <= 150) {
         selfPotionThresh = Math.max(selfPotionThresh, 0.65); // Priest / Wizard starting HP buffer
     } else if (player.maxHp <= 250) {
         selfPotionThresh = Math.max(selfPotionThresh, 0.50); // Knight / Ranger starting HP buffer
     }
     ```
2. In `src/player/CompanionAI_Helper.js`, ensure `this._lastChatClosedTime = time` is set whenever the chat is closed:
   - Locate the wantsToAdventure chat close block (around line 660) and safety timeout close block (around line 684) and add `this._lastChatClosedTime = time;` inside both blocks. This enforces the 8-second chat cooldown and lets the player walk away from NPCs (like the Guild Master) rather than immediately starting a new conversation.
   - For wantsToAdventure block, check if `chatCloseBtn.click` is a function before calling: `if (chatCloseBtn && typeof chatCloseBtn.click === 'function') { chatCloseBtn.click(); } else { ... }`.
3. In `test_logic_constraints.js` and `test_mechanics.js`:
   - Inside `createMockElement(id)`, add a default `click` function mock: `click: function() { if (listeners['click']) { listeners['click'].forEach(cb => cb()); } else if (typeof this.onclick === 'function') { this.onclick(); } }` or a generic `click: () => {}` to prevent `TypeError: click is not a function` during test runs.
4. Verify your work by running:
   - `node test_mechanics.js`
   - `node test_logic_constraints.js`
   - `node test_autoplay.js --duration 30000` (smoke test)
   - `node test_autoplay.js --duration 300000` (full 5-minute acceptance test)
5. Document all your changes, terminal outputs, and test results in `c:\Code2\rpg-scroller\.agents\worker_victory_fixes\handoff.md`.

Guidelines:
- Carefully modify the files.
- Report back when all tests pass cleanly.
