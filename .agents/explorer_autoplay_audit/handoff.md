# Handoff Report - Autoplay AI System Audit

## 1. Observation
### File Locations and Content Reviewed
- **Companion AI State Machine and Core Update Loop**:
  - File: `src/player/CompanionAI.js` (lines 1 to 685)
  - File: `src/player/CompanionAI_Helper.js` (lines 1 to 899)
- **HUD Management & Autoplay UI Preset Settings**:
  - File: `src/scene_modules/HUDManager.js` (lines 1 to 300)
- **Inventory/Potion Management**:
  - File: `src/player/InventoryManager.js` (lines 1 to 240)
- **Auto-Potion Artifact Mechanics**:
  - File: `src/player/StatusEffectManager.js` (lines 180 to 210)
- **Integration Test Tools**:
  - File: `test_architecture.js` (lines 1 to 288)
  - File: `scratch_test_dir_autoplay.js` (lines 1 to 120)
  - File: `package.json` (lines 1 to 21)

### Specific Observations and Code Snippets

#### Observation 1.1: Autoplay AI Self-Potion Healing Gap
- In `src/player/CompanionAI.js`, the check for self-potion consumption only occurs within the hostile rival NPC branch (lines 551-560):
  ```javascript
  // Active dodging for Rivals
  if (player.aiState === 'hostile' && player.classId && player.classId.includes('rival')) {
      if (player.inventory.potions === undefined) player.inventory.potions = 2;
      
      const selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100;
      if (player.hp < player.maxHp * selfPotionThresh && player.inventory.potions > 0 && Math.random() < 0.05) {
          player.inventory.potions--;
          player.hp = Math.min(player.maxHp, player.hp + 50);
          if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Potion!", 0x00ff00);
      }
  ```
- In `src/player/StatusEffectManager.js` (line 184), auto-potion usage is explicitly bypassed for the autoplay AI:
  ```javascript
  // --- Auto-Potion Artifact: use HP potion automatically when below 30% HP ---
  if (!player.isAI && player.hp <= player.maxHp * 0.30) {
      if (player.inventory && player.inventory.artifacts && ...
  ```
- In `src/player/CompanionAI_Helper.js` (lines 870-883), party potion-sharing handles healing *other* party members (companions), but the main hero (`scene.player`) is not in `scene.partyMembers`:
  ```javascript
  // Party Support (Heal Allies) - respect partyPotionPct slider
  const partyPotionThresh = (autoplayConfig ? autoplayConfig.partyPotionPct : 40) / 100;
  if (scene.partyMembers && player.inventory.potions > 0 && time - (this._lastSupportTime || 0) > 3000) {
      let lowAlly = null;
      scene.partyMembers.forEach(m => {
          if (m.hp > 0 && m.hp < m.maxHp * partyPotionThresh) lowAlly = m;
      });
  ```

#### Observation 1.2: Hardcoded Attack Chance
- In `src/player/CompanionAI.js` (lines 541-543):
  ```javascript
  if (!usedSpell && dist <= attackRange) {
      if (Math.random() < 0.3) player.aiInput.attack = true;
  }
  ```
  The probability `0.3` is hardcoded and does not scale with combat presets (e.g. `pacifist`).

#### Observation 1.3: Lack of Horizontal Running Start (Ceiling/Wall Escape) for Virtual Targets
- In `src/player/CompanionAI_Helper.js` (lines 158-171), chest-seeking has a running start escape logic:
  ```javascript
  const isHittingWall = (player.sprite.body.blocked.left && player.aiInput.left) || (player.sprite.body.blocked.right && player.aiInput.right);
  if (player.sprite.body.blocked.up || isHittingWall) {
      if (!player._chestCeilingEscapeTicks || player._chestCeilingEscapeTicks <= 0) {
          player._chestCeilingEscapeDir = (player.sprite.x < cx) ? -1 : 1;
          player._chestCeilingEscapeTicks = 45;
      }
  }
  ```
- However, for standard virtual targets (wandering in towns, progression zone portals), the only stuck logic is in `src/player/CompanionAI.js` (lines 633-649):
  ```javascript
  if (player._stuckTicks >= 5) {
      if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
          player.aiInput.up = true;
          player._stuckTicks = 0;
      }
  ```
  This immediately triggers a jump (`up = true`) without walking back or away from the obstruction.

#### Observation 1.4: Stuck Chat UI Loop
- In `src/player/CompanionAI_Helper.js` (lines 640-754), there is no check to close the chat UI if the player decides to progress (`this._wantsToAdventure === true`).
- In `src/player/CompanionAI.js` (lines 80-88), `hasMainHeroSafeZoneInput` evaluates to `true` if `chat-ui` is visible, which skips the entire movement/seeking logic in `CompanionAI.js`:
  ```javascript
  const hasMainHeroSafeZoneInput = player === p && isActuallySafe && (
      ...
      this._isElementVisible('chat-ui') ||
      ...
  );
  ```

#### Observation 1.5: Stuck Directory UI Loop
- In `src/player/CompanionAI_Helper.js` (lines 589-638), if `currentZoneIdx === targetZone` and `this._wantsToAdventure` is `false`, the directory UI is left open. The AI repeatedly searches for locations and clicks location cards. If no locations are found (e.g. empty location list or UI load failure), the directory UI remains open indefinitely.

#### Observation 1.6: Autoplay Mode Toggling and Game State Elements
- In `src/scene_modules/HUDManager.js` (lines 64-80), clicking the Auto-Play button (`#btn-auto-play`) toggles the player attributes:
  ```javascript
  this.scene.player.isAI = !this.scene.player.isAI;
  this.scene.player.aiState = 'party';
  ```
- Game state variables `saveData` and `autoplayConfig` are declared lexically in `index.html` (lines 602-603) but reside in the global execution scope of the script context:
  ```html
  <script>
      let saveData;
      let autoplayConfig;
      ...
  </script>
  ```

---

## 2. Logic Chain

1. **Self-Potion Healing Gap**:
   - The main player's companion AI runs `updateAI` in state `party`.
   - The only block in `CompanionAI.js` that consumes potions for low health is inside the `hostile` state and restricted to `rival` class IDs (Observation 1.1).
   - In `StatusEffectManager.js`, the auto-potion artifact logic is explicitly bypassed when `player.isAI` is true (Observation 1.1).
   - In `CompanionAI_Helper.js`, party support checks only `scene.partyMembers`. The main hero is not a member of `scene.partyMembers` (Observation 1.1).
   - **Conclusion**: The main hero under autoplay will never heal themselves using potions and will die in combat.

2. **Hardcoded Pacifist Attack Behavior**:
   - The preset `pacifist` reduces `spellRate` to 20 but leaves the base attack logic unchanged.
   - The base attack trigger check is hardcoded to a 30% random check per tick when within range (Observation 1.2).
   - **Conclusion**: The pacifist preset fails to restrict standard melee attacks and will fight as frequently as any other preset when in close range.

3. **Ceiling Stuck Loops**:
   - When traveling to virtual/progression targets, the AI moves horizontally.
   - If blocked by a platform overhang or wall, the only stuck recovery mechanism is to jump straight up (Observation 1.3).
   - Jumping straight up under a ceiling keeps the character at the same horizontal coordinates, hitting the ceiling, landing, and repeating.
   - **Conclusion**: Progression characters will become permanently trapped in vertical jump loops under low platform ceilings.

4. **Stuck Chat/Directory Loops**:
   - If the chat UI is visible, the AI movement loop is bypassed (Observation 1.4).
   - If a non-merchant character has decided to adventure, the chat UI has no logic to close itself (Observation 1.4).
   - If the directory UI is open and the player is in the target zone but not adventuring, there is no fallback to close the directory UI if locations are empty (Observation 1.5).
   - **Conclusion**: Any hanging Chat or Directory UI state will permanently paralyze the autoplay AI's movement.

---

## 3. Caveats
- The behavior of the Gemini AI Service (`player.scene.geminiService`) is assumed to handle tactical responses for hostile rivals but was not executed since it requires an external connection/API key (restricted by the `CODE_ONLY` network mode constraint).
- The team composition and party members were analysed from code, but the dynamic spawning rate during active gameplay was not simulated.

---

## 4. Conclusion
The autoplay AI system is a robust template but suffers from several critical flaws that prevent successful, long-duration autonomous play:
1. **Self-healing Bug**: The main player never consumes potions on themselves, leading to unavoidable deaths in high-level zones.
2. **Stuck loops**:
   - Vertical jump loops under platforms due to lack of backing away/running-start logic for virtual/progression targets.
   - UI loops where the Chat or Directory remains open, blocking any movement inputs.
3. **Preset Execution Gaps**: The pacifist preset continues to perform standard attacks at 30% frequency because the base attack chance is hardcoded.

### Recommendations for Fixes:
1. **Add Self-Potion Usage for Autoplay Hero**:
   Inside `CompanionAI.js` or `CompanionAI_Helper.js` under hostile/party zone behaviors, add a check for the main player:
   ```javascript
   if (player === p && player.isAI) {
       const selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100;
       if (player.hp < player.maxHp * selfPotionThresh && player.inventory.potions > 0) {
           if (typeof player.usePotion === 'function') {
               player.usePotion();
           }
       }
   }
   ```
2. **Scale Standard Attack Chance**:
   Modify the hardcoded attack chance in `CompanionAI.js` to scale down when in `pacifist` or `potion_saver` mode:
   ```javascript
   if (!usedSpell && dist <= attackRange) {
       const baseAttackChance = (autoplayConfig && autoplayConfig.preset === 'pacifist') ? 0.05 : 0.3;
       if (Math.random() < baseAttackChance) player.aiInput.attack = true;
   }
   ```
3. **Implement Ceiling/Wall Escape for Virtual/Progression Targets**:
   Add a generalized `_escapeTicks` logic similar to `_chestCeilingEscapeTicks` so that the player runs away from obstacles when stuck trying to progress or wander.
4. **Auto-close Chat/Directory UI on Progression**:
   Ensure that if `_wantsToAdventure` is `true`, the chat UI and directory UI are explicitly closed by clicking their respective close buttons.

---

## 5. Verification Method

### Test Scripts to Execute
- **Stability and Baseline Verification**:
  Run the architecture integration test:
  ```powershell
  node test_architecture.js
  ```
  This launches Puppeteer, starts the game, runs basic actions, and verifies no event listener leaks or console TypeErrors.

- **Autoplay Navigation and UI Verification**:
  Run the autoplay-specific scratch test:
  ```powershell
  node scratch_test_dir_autoplay.js
  ```
  This script:
  1. Starts the game.
  2. Programmatically sets `p.companionAI._wantsToTravel = true`.
  3. Teleports the player to the Angel Statue.
  4. Clicks the Town Directory location and monitors if the player successfully transitions indoors.

### Manual Verification in Browser (DevTools console)
1. Toggle Autoplay mode:
   ```javascript
   window._gameScene.player.isAI = true;
   window._gameScene.player.aiState = 'party';
   ```
2. Retrieve current game stats:
   ```javascript
   console.log({
       xp: saveData.xp,
       gold: saveData.gold,
       zone: window._gameScene.worldManager.currentZoneIndex,
       hp: window._gameScene.player.hp,
       maxHp: window._gameScene.player.maxHp,
       preset: autoplayConfig.preset
   });
   ```
3. Enable a preset (e.g. `aggressive`):
   ```javascript
   window._gameScene.hudManager._syncAutoplayUI();
   // Click aggressive preset button:
   document.querySelector('.preset-btn[data-preset="aggressive"]').click();
   ```
