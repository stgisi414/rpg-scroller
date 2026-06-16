## 2026-06-16T19:58:48Z

Task:
Implement robust solutions for all identified visual, gameplay, and logic bugs/inconsistencies in the RPG scroller codebase:

1. AssetManager.js Double Preloads & Format:
   - File: c:\Code2\rpg-scroller\src\AssetManager.js
   - Action: Remove lines 175 and 176 (double registrations of 'bandit' and 'frost_giant' at 64x64).
   - Action: In line 35, load 'frost_giant' as a simple image instead of a spritesheet:
     this.scene.load.image('frost_giant', 'src/assets/frost_giant.png');
     (This is because it is dynamically sliced in GameScene.js using its source image).

2. Heavy Knight Sheet Out-of-Bounds Frame Crash:
   - File: c:\Code2\rpg-scroller\src\main.js (around line 132)
     Change classesData.heavy_knight's image path to:
     'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'
   - File: c:\Code2\rpg-scroller\src\AssetManager.js (around line 21)
     Change 'knight_rival' loaded spritesheet path to:
     'src/assets/Heavy Knight/Heavy Knight/Red heavy.png'
     (Make sure both use frameWidth: 80, frameHeight: 64).

3. NPC Event Listener Memory Leaks:
   - File: c:\Code2\rpg-scroller\src\NPCController.js
   - Action: Store the DOM and keyboard listener callbacks as properties on the controller instance in the constructor, then use these properties to bind the event listeners.
   - Action: In the destroy() method, remove these listeners cleanly to prevent memory leaks.
     Callbacks to handle: onSubmitClick (click), onKeyPress (keypress), onTradeClick (click), onActivityClick (click), onEscKeyDown (keydown-ESC).

4. Game Master Ambush Instantiation Crash:
   - File: c:\Code2\rpg-scroller\src\scenes\GameScene.js
   - Action: In line 2017, replace:
     const pc = new PlayerController(this, this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'samurai_rival', 'hostile');
     with:
     this.spawnHeroAI('samurai_rival', this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'hostile');

5. Checkpoint & NPC Persistence worldMap/zones Rename:
   - Files: c:\Code2\rpg-scroller\src\PlayerController.js, c:\Code2\rpg-scroller\src\NPCController.js, c:\Code2\rpg-scroller\src\WorldManager.js
   - Action: Replace all references to window.saveData.worldMap with window.saveData.zones.

6. Input Control Spacebar Defect:
   - File: c:\Code2\rpg-scroller\src\InputManager.js (around lines 8-23)
   - Action: Add the spacebar mapping to the addKeys call:
     space: Phaser.Input.Keyboard.KeyCodes.SPACE

7. Stat Farm Exploit & Temporary INT Buff:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js
     - Action: In constructor, initialize this.tempStats = { vit: 0, str: 0, dex: 0, int: 0 };
     - Action: In recalculateStats(), add these tempStats to base stats before computing derived values.
     - Action: Implement clearTempStats() { this.tempStats = { vit: 0, str: 0, dex: 0, int: 0 }; this.recalculateStats(); if (this.scene && this.scene.updateHUD) this.scene.updateHUD(); }
   - File: c:\Code2\rpg-scroller\src\WorldManager.js (in loadZone())
     - Action: Call this.scene.player.clearTempStats(); during zone transition.
   - File: c:\Code2\rpg-scroller\src\NPCController.js (around lines 415-433)
     - Action: In case 'study', increase this.player.tempStats.int += 1, call recalculateStats(), and update HUD.
     - Action: In case 'pray', call recalculateStats(), and update HUD.
     - Action: In both case 'study' and 'pray', replace the defunct this.player.updateHUD() or calculateDerivedStats() calls with:
       if (this.scene && this.scene.updateHUD) this.scene.updateHUD();

8. AI Potion Healing Defect:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js (line 263 or constructor AI inventory fallback)
     - Action: Add potions: 2 to the fallback AI inventory:
       this.inventory = { weapon: { key: 'weapon-stick', damageBonus: 5 }, potions: 2 };

Verification:
- Verify that your edits compile and have no syntax errors. Run tailwindcss compilation command to make sure CSS builds cleanly:
  npx tailwindcss -i ./src/input.css -o ./src/output.css
- Write a short verification report in your handoff.md under c:\Code2\rpg-scroller\.agents\worker_fixes\ documenting each change and the build verification command and output.
