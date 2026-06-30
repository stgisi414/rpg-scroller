## 2026-06-30T04:52:03Z

You are the Worker agent for the potion threshold fix (identity: worker_potion_threshold_fix).
Your working directory is: c:\Code2\rpg-scroller\.agents\worker_potion_threshold_fix.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to:
1. Modify `src/player/CompanionAI.js` to add a dynamic safe floor for the self-potion threshold.
   - Locate:
     ```javascript
     if (player.isAI && player.aiState === 'party' && !player.isCargoCarrier) {
         const selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100;
     ```
   - Change it to:
     ```javascript
     if (player.isAI && player.aiState === 'party' && !player.isCargoCarrier) {
         let selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100;
         if (player.maxHp <= 250) {
             selfPotionThresh = Math.max(selfPotionThresh, 0.50);
         }
     ```
     This ensures that if the player's Max HP is low (e.g. <= 250, typical for starting level 1 characters), they will heal at 50% HP threshold instead of a lower preset threshold (like 25% for aggressive), preventing burst deaths in Zone 1.

Guidelines:
- Keep the code clean and well-formatted.
- Document the change in `c:\Code2\rpg-scroller\.agents\worker_potion_threshold_fix\handoff.md`.
- Report back when done.
