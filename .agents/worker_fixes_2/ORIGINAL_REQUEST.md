## 2026-06-16T20:06:12Z
Implement the second round of robust bug fixes and preloader optimizations to address findings from reviews and verification:

1. Fix NPC Activity updateHUD Crash:
   - File: c:\Code2\rpg-scroller\src\NPCController.js
   - Action: In lines 394 and 405 (inside case 'rest' and case 'brew'), change:
     this.player.updateHUD();
     to:
     if (this.scene && this.scene.updateHUD) this.scene.updateHUD();

2. Companion Chat Event Listener Leak:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js
   - Action: In the die() method (under the "if (this.isAI)" branch), add listener removal logic to prevent memory leaks if a companion dies/is dismissed:
     if (this.chatSubmitBtn && this.chatSubmitHandler) {
         this.chatSubmitBtn.removeEventListener('click', this.chatSubmitHandler);
     }
     if (this.chatInput && this.chatKeyHandler) {
         this.chatInput.removeEventListener('keypress', this.chatKeyHandler);
     }

3. Save Key Persistence on Player Death:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js
   - Action: In the die() method (for the real player death branch, around line 2668), replace:
     localStorage.setItem('rpg_save', JSON.stringify(window.saveData));
     with:
     this.hp = window.saveData.hp;
     this.saveGame();
     this._persistToLocalStorage();

4. Key Capture Restoration on Chat Close:
   - File: c:\Code2\rpg-scroller\src\NPCController.js
   - Action: In closeChat() method, add the missing keyboard capture restoration:
     if (this.player.inputManager) {
         this.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
     }

5. Rival Class Config Image Recolor Alignments:
   - File: c:\Code2\rpg-scroller\src\main.js
   - Action: Explicitly set the correct red recolored sprite sheet paths for all rival class data definitions so they match the Phaser preload keys:
     - classesData.knight_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
     - classesData.wizard_rival.image = 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png';
     - classesData.samurai_rival.image = 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png';
     - classesData.ranger_rival.image = 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png';
     - classesData.megaboss_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
     (Ensure they are set right after classesData.knight_rival and other rival classes are defined, around lines 228-233).

6. Clean up Preloader Warnings/Duplicates in AssetManager.js:
   - File: c:\Code2\rpg-scroller\src\AssetManager.js
   - Action: In line 74, remove the duplicate preload of spritesheet 'floor_dungeon':
     this.scene.load.spritesheet('floor_dungeon', 'src/assets/tile castle dungeon.png', { frameWidth: 16, frameHeight: 16 });
     (This is a duplicate of line 118 with conflicting frameWidth).
   - Action: Delete the duplicate block preloading town backgrounds bg_tavern etc. at lines 159-165 (which duplicates lines 131-137).

7. Check isUpDown() Evaluation:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js
   - Action: Double-check line 1387. Make sure it evaluates the spacebar key correctly:
     isUpDown() { return this.isAI ? this.aiInput.up : (this.inputManager.keys.up.isDown || (this.inputManager.keys.space && this.inputManager.keys.space.isDown)); }

Verification:
- Compile tailwindcss and make sure it builds cleanly:
  npx tailwindcss -i ./src/input.css -o ./src/output.css
- Document your changes and verification command and output in c:\Code2\rpg-scroller\.agents\worker_fixes_2\handoff.md.
