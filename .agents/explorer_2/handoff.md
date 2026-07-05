# Handoff Report — Explorer 2 (Cutscene System Exploration)

This report details the investigation of the `CutsceneController` API, its calling sites across the codebase, and the architectural design for dynamically loading dialogue patterns via a JSON database.

---

## 1. Observation

### Exact APIs of `playCutscene` and `cancelCutscene`
In `src/scene_modules/CutsceneController.js`, the following methods govern playing and canceling cutscenes:

- **`playCutscene(lines, onComplete)`** (Lines 13–67):
  ```javascript
  playCutscene(lines, onComplete) {
      this.cancelCutscene();
      this.scene.isCutscene = true;
      
      // Pause physics securely if possible
      if (this.scene.physics && this.scene.physics.pause) {
          this.scene.physics.pause();
      }
      
      // Normalize input: can be a single string, an array of strings, or an array of objects
      if (typeof lines === 'string') {
          this.dialogueQueue = [{ speaker: "Narrator", text: lines }];
      } else if (Array.isArray(lines)) {
          this.dialogueQueue = lines.map(line => {
              if (typeof line === 'string') {
                  return { speaker: "Narrator", text: line };
              }
              return line; // already { speaker, text, portrait, side }
          });
      } else {
          this.dialogueQueue = [{ speaker: "Narrator", text: String(lines) }];
      }
      
      this.currentIndex = 0;
      this.onCompleteCallback = onComplete;
      
      const overlay = document.getElementById('cutscene-overlay');
      if (overlay) {
          overlay.style.display = 'flex';
          // Trigger reflow
          void overlay.offsetWidth;
          overlay.style.opacity = '1';
          
          // Set up click advance on the bottom bar/overlay
          overlay.style.cursor = 'pointer';
          overlay.onclick = (e) => {
              e.stopPropagation();
              this.advanceCutscene();
          };
          
          // Set up keyboard listener (Space/Enter to advance)
          this.keyHandler = (e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  this.advanceCutscene();
              }
          };
          window.addEventListener('keydown', this.keyHandler);
          
          this.showLine();
      } else {
          this.cancelCutscene();
          if (onComplete) onComplete();
      }
  }
  ```

- **`cancelCutscene()`** (Lines 197–216):
  ```javascript
  cancelCutscene() {
      if (this.typingInterval) clearInterval(this.typingInterval);
      this.typingInterval = null;
      
      if (this.keyHandler) {
          window.removeEventListener('keydown', this.keyHandler);
          this.keyHandler = null;
      }
      
      const overlay = document.getElementById('cutscene-overlay');
      if (overlay) {
          overlay.style.display = 'none';
          overlay.onclick = null;
      }
      
      this.scene.isCutscene = false;
      if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.isPaused) {
          this.scene.physics.resume();
      }
  }
  ```

---

### Calling Sites of `playCutscene`
We observed 7 distinct calling sites of `playCutscene` across the codebase:

#### 1. Capital Visit Cutscene
- **File**: `src/WorldManager.js:209` (within `buildZone()`)
- **Trigger**: Spawns when the player first visits the capital of a kingdom (`!saveData.visitedCapitals[currentZoneIdx]`).
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: "Narrator",
            text: `You have entered the capital of ${kingdom ? kingdom.name : 'this region'} — a grand center of power and political intrigue.`
        },
        {
            speaker: `${kingdom ? kingdom.name : 'Capital'} Gatekeeper`,
            portrait: 'knight_rival',
            side: 'left',
            text: `Hold, traveler. State your business in our capital. ${leaderName} rules here, and the ${factionName} demands respect from all who walk these streets.`
        }
    ];
    ```
  - `onComplete`: None passed.

#### 2. Rival Ambush Cutscene
- **File**: `src/WorldManager.js:872` (within `spawnHeroAI()`'s hostile encounter logic)
- **Trigger**: Spawns when a hostile rival hero or megaboss spawns to ambush the player.
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: displayName,
            portrait: rivalPortrait,
            side: 'left',
            text: immediateLine
        }
    ];
    ```
  - `onComplete`: `() => {}` (empty callback).
- **Note**: If Gemini API returns a custom story monologue, this text is hot-swapped mid-cutscene (`WorldManager.js:885-890`).

#### 3. Marriage Proposal Cutscene
- **File**: `src/npc/NPCCampaignHelper.js:187` (within `handleProposal()`)
- **Trigger**: Spawns when proposing marriage to an NPC with high faction reputation.
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: "Narrator",
            text: `The grand cathedral bells begin to ring, echoing across the land in celebration of a historic union.`
        },
        {
            speaker: npc.npcName,
            portrait: npc.spriteKey,
            side: 'right',
            text: `I do. In times of battle and peace, I bind my soul to yours. Together, we shall face whatever comes next.`
        },
        {
            speaker: "Narrator",
            text: `The priest raises his hands, blessing the bond. With vows sealed and rings exchanged, the ceremony concludes.`
        }
    ];
    ```
  - `onComplete`:
    ```javascript
    () => {
        saveData.spouseData = {
            name: npc.npcName,
            spriteKey: npc.spriteKey,
            faction: npc.faction || null
        };
        
        if (npc.player && npc.player._persistToLocalStorage) {
            npc.player._persistToLocalStorage();
        }

        if (npc.scene.showFloatingText && npc.player && npc.player.sprite && npc.player.sprite.active) {
            npc.scene.showFloatingText(
                npc.player.sprite.x, npc.player.sprite.y - 80,
                `💍 Married to ${npc.npcName}!`, 0xec4899
            );
        }
    }
    ```

#### 4. Sell Frontier Intel Cutscene
- **File**: `src/npc/NPCCampaignHelper.js:256` (within `handleSellIntel()`)
- **Trigger**: Spawns when selling frontier map findings to a royal rank/faction leader NPC.
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: "Narrator",
            text: `You present the map and findings of the procedural frontier kingdom of ${unsoldKingdom.name} to the court.`
        },
        {
            speaker: `${npc.politicalTitle} ${npc.npcName}`,
            portrait: npc.spriteKey,
            side: 'right',
            text: `This map is of incredible importance to the ${window.WORLD_FACTIONS[npc.faction].name}. Knowing who holds the lands beyond is a massive advantage. Take this gold reward for your discovery.`
        }
    ];
    ```
  - `onComplete`:
    ```javascript
    () => {
        if (npc.scene.showFloatingText && npc.player && npc.player.sprite && npc.player.sprite.active) {
            npc.scene.showFloatingText(
                npc.player.sprite.x, npc.player.sprite.y - 80,
                `🗺️ Intel Sold: +250g, +15 rep!`, 0x10b981
            );
        }
    }
    ```

#### 5. Throne Room Entrance Cutscene
- **File**: `src/scene_modules/IndoorManager.js:778` (within `generateLocation()` when `locationId === 'throne_room'`)
- **Trigger**: Spawns when the player enters the capital's throne room for the first time.
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: "Narrator",
            text: `You step into the grand throne room. The heavy scent of incense and the weight of sovereign authority hang in the air.`
        },
        {
            speaker: titleAndName,
            portrait: spriteKey,
            side: 'right',
            text: `Who approaches the throne? State your purpose, traveler. In these times of conflict, every visitor is either a potential ally... or a spy.`
        }
    ];
    ```
  - `onComplete`: None passed.

#### 6. Alignment Wrath Dimension Encounter Cutscene
- **File**: `src/scenes/GameScene_Helper.js:163` (within `loadZone()` callback post-fadeout)
- **Trigger**: Spawns when entering a pocket dimension (Zone 777: Heaven, or Zone -666: Hell) due to extreme alignment checks.
- **Arguments**:
  - `lines`: Array of raw strings (normalized by CutsceneController to `speaker: "Narrator"`).
    - *Heaven*:
      ```javascript
      [
          "[Celestial Voice] Mortals who bend the scales of fate must face judgment.",
          "[Celestial Voice] Prepare yourself, traveler. The Seraphim will evaluate your soul."
      ]
      ```
    - *Hell*:
      ```javascript
      [
          "[Infernal Screams] A mortal approaches the pit!",
          "[The Devil] Welcome to the Abyss. Your dark deeds have made you ripe for harvest."
      ]
      ```
  - `onComplete`:
    ```javascript
    () => {
        if (this.isSceneDestroyed) return;
        
        if (wrathDimension === 'Heaven') {
            this.spawnHeroAI('heavenly_seraph', wX, wY, 'hostile', 'Heavenly Seraph', 'A divine adjudicator of cosmic balance.');
        } else {
            this.spawnHeroAI('the_devil', wX, wY, 'hostile', 'The Devil', 'A dark tormentor seeking to harvest your dark alignment.');
        }
    }
    ```

#### 7. King's Guard Hostility Cutscene
- **File**: `src/world/TownBuilder.js:389` (within the Kings Guard Hostility block)
- **Trigger**: Spawns when entering a town where guards are hostile due to alignment checks.
- **Arguments**:
  - `lines`:
    ```javascript
    const dialogue = [
        {
            speaker: "King's Guard",
            portrait: 'knight_rival',
            side: 'left',
            text: `STOP RIGHT THERE, OUTLAW! ${reason} Defend yourself!`
         }
    ];
    ```
  - `onComplete`: None passed.

---

## 2. Logic Chain

Based on our observations of the calling sites:
1. Every calling site corresponds to one of 7 categories:
   - `capital_entry`
   - `rival_ambush`
   - `marriage_proposal`
   - `sell_frontier_intel`
   - `throne_room_entrance`
   - `wrath_encounter` (distinguishing Heaven vs. Hell sub-categories/dimensions)
   - `guard_hostility`
2. At each site, variable parameters (like kingdom names, leader titles, NPC names, and guard hostility reasons) are dynamically interpolated into strings before being passed to `playCutscene`.
3. To externalize these dialogues, we can extract the base templates into a JSON file, representing placeholders via token strings like `{kingdomName}`, `{leaderName}`, `{factionName}`, `{npcName}`, `{politicalTitle}`, and `{reason}`.
4. We can load `dialogue_patterns.json` dynamically via the browser's `fetch()` API inside `CutsceneController`'s constructor or via Phaser's loader in `AssetManager`. Using a global-static lazy loader on `CutsceneController` is highly modular and decoupled from the asset load phase, preventing loading race conditions.
5. In `CutsceneController.js`, a new method `playDialogueByCategory(category, context, onComplete)` can:
   - Retrieve templates for the category.
   - Shuffle/pick an index not recently used to avoid immediate repetition.
   - Iterate through the template's lines, substituting placeholders from `context`.
   - Call the standard `playCutscene` logic with the built dialogue queue.

---

## 3. Caveats

- **Gemini Live Hotswap**: The Rival Ambush cutscene (`WorldManager.js:872`) has a hot-swapping listener where the Gemini response replaces the first frame's text live. We must ensure that our dynamic replacement structure preserves the array indices so that if a Gemini call succeeds, the live replacement continues to update the correct first segment of the dialogue queue.
- **Wrath Dialogue Normalization**: The Wrath Dimension encounter uses raw strings (e.g., `"[Celestial Voice] ..."`) which Phaser normalizes under the `"Narrator"` speaker. In the new JSON schema, we can structure them directly as speaker/text objects to make them look cleaner.

---

## 4. Conclusion

The investigation of cutscene triggers and the CutsceneController API is complete. Moving dialogue lines to a dynamic `dialogue_patterns.json` file is highly feasible.
We recommend implementing a method `playDialogueByCategory(category, context, onComplete)` in `CutsceneController` and loading the JSON file asynchronously during initialization.

---

## 5. Verification Method

- Inspect files using `view_file` to confirm call structures and arguments.
- Run autoplay tests with:
  ```powershell
  npm run test:autoplay -- --duration 10000
  ```
  to verify that current cutscenes continue to play without errors and trigger their respective callbacks.
