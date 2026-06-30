# Handoff Report — Autoplay Victory Audit (Pass 8)

## 1. Observation
- E2E autoplay test runner (`node test_autoplay.js --duration 300000`) failed:
  - Presets `potion_saver` and `pacifist` remained stuck in Zone 0 town with `0` Gold/XP.
- Logic and Code Analysis:
  - Every tick in town, because `currentZoneIndex (0) !== targetZone (99)`, the target zone check in `CompanionAI_Helper.js` line 323 sets `this._wantsToAdventure = true`.
  - For high-quest presets, the quest override check at line 345 then sets `this._wantsToAdventure = false` and `this._wantsGuildHall = true`.
  - The player walks to the statue and opens the Town Directory.
  - On the next tick (while the directory is open), the target zone check runs first and sets `this._wantsToAdventure = true` again.
  - The local directory navigation block then runs:
    ```javascript
    // 2. Local Directory Navigation
    if (currentZoneIdx === targetZone || this._wantsGuildHall) {
        if (this._wantsToAdventure) {
            const closeBtn = document.getElementById('btn-close-directory');
            if (closeBtn) closeBtn.click();
            return;
        }
    ```
    Since `this._wantsToAdventure` was just reset to `true` by the target zone check, the AI immediately clicks the close button.
  - This prevents the AI from ever clicking the Guild Hall card, entering the building, or triggering the 60-second visit cooldown, resulting in an infinite deadlock.

## 2. Logic Chain
- Adding `&& !this._wantsGuildHall` to the directory close check:
  ```javascript
  if (this._wantsToAdventure && !this._wantsGuildHall)
  ```
  prevents the AI from closing the directory when it intends to visit the Guild Hall, allowing it to enter the Guild Hall, talk to the NPC, and trigger the cooldown to proceed to fast travel.

## 3. Caveats
- None.

## 4. Conclusion
- The victory claim remains **REJECTED** due to a target-zone reset setting `_wantsToAdventure = true` and triggering an immediate close of the Town Directory.

## 5. Verification Method
- Execute the E2E autoplay test:
  ```bash
  npm run test:autoplay
  ```
