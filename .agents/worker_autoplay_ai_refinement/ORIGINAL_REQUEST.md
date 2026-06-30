## 2026-06-29T23:27:37-05:00
You are the Worker agent for the autoplay AI refinements (identity: worker_autoplay_ai_refinement).
Your working directory is: c:\Code2\rpg-scroller\.agents\worker_autoplay_ai_refinement.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the following changes in the autoplay AI system files:

1. In `src/player/CompanionAI.js`:
   a. **Self-Potion Healing**: In `updateAI`, implement a check for friendly/neutral AI characters (`player.isAI` and `player.aiState === 'party'` and not `player.isCargoCarrier`).
      - Read the threshold `selfPotionPct` from the global `autoplayConfig` object: `const selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100`.
      - If `player.hp > 0` and `player.hp < player.maxHp * selfPotionThresh` and `player.inventory && player.inventory.potions > 0`:
        - Use a cooldown check: `!player._lastSelfPotTime || time - player._lastSelfPotTime > 3000`.
        - If off cooldown, update `player._lastSelfPotTime = time`.
        - Consume a potion: call `player.usePotion()` if it's a function, fallback to `player.inventoryManager.usePotion()` if it's a function, or manual decrement and healing fallback. Show floating text "Potion (Self)!" if `scene.showFloatingText` exists.
   b. **Pacifist Attack Chance Scaling**: Scale standard melee attack probability inside the attack check:
      - Locate:
        ```javascript
        if (!usedSpell && dist <= attackRange) {
            if (Math.random() < 0.3) player.aiInput.attack = true;
        }
        ```
      - Modify it so that if `autoplayConfig && autoplayConfig.preset === 'pacifist'`, the probability is scaled down to `0.02` (instead of 0.3).
   c. **General Stuck Wall/Ceiling Escape**: Implement a running start escape logic when AI characters are stuck trying to move:
      - Locate where `player._stuckTicks` is computed and updated.
      - If `player._stuckTicks >= 8`, trigger a general escape:
        - If `player._generalEscapeTicks` is not active, set `player._generalEscapeTicks = 40` and `player._generalEscapeDir` to `1` (if they were trying to go left) or `-1` (if trying to go right), or random `1` / `-1` fallback.
      - If `player._generalEscapeTicks > 0`:
        - Decrement `player._generalEscapeTicks`.
        - Override horizontal inputs: set `player.aiInput.right = true; player.aiInput.left = false;` if `_generalEscapeDir === 1`, else set `player.aiInput.left = true; player.aiInput.right = false;`.
        - Jump if on ground: set `player.aiInput.up = true` if `player.sprite.body.blocked.down || player.sprite.body.touching.down`.

2. In `src/player/CompanionAI_Helper.js`:
   a. **Stuck Chat UI Loop**: In `_handleMainHeroAutoPlay` where `isChatOpen` is checked:
      - If `this._wantsToAdventure` is `true`, close the chat UI immediately. Find the active NPC using `scene.npcs.find(n => n.isChatOpen)` and call `closeChat()`. Fallback to `player.closeChat()` if available. Clean up chat state tracking variables (`this._wasChatOpen = false`, `this._currentChatNpc = null`).
   b. **Stuck Town Directory UI Loop**:
      - In `_handleMainHeroAutoPlay` where `isDirOpen` is checked:
        - If `currentZoneIdx === targetZone`, close the directory UI immediately: find the close button `#btn-close-directory`, click it, and return early.
        - Inside the directory location navigation logic (where locations are clicked), if the location container doesn't exist or is empty (i.e. `cards.length === 0`), close the directory UI (`closeBtn.click()`) and return early to avoid freezing.

Guidelines:
- Carefully modify the files using code replacements, keeping exact syntax and indentation.
- Document what changes you made in your handoff report at `c:\Code2\rpg-scroller\.agents\worker_autoplay_ai_refinement\handoff.md`.
- Report back when done.
