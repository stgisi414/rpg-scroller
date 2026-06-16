## 2026-06-16T20:32:25Z
Implement the third round of bug fixes and refinements in the RPG scroller codebase:

1. Megaboss Rival & heavy_knight Frame Width Alignment:
   - File: c:\Code2\rpg-scroller\src\AssetManager.js
     In line 25, change 'megaboss_rival' preloader frameWidth to 91 (matching 'knight_rival' at line 21, as both load 'Red heavy.png' which is 455px wide with 5 columns: 455 / 5 = 91).
   - File: c:\Code2\rpg-scroller\src\main.js
     In line 134, update classesData.heavy_knight's frameWidth configuration from 80 to 91.

2. Game Master GM Intervention Bug & HUD updates:
   - File: c:\Code2\rpg-scroller\src\scenes\GameScene.js
     - In line 2020 (HEAL intervention), add:
       if (this.updateHUD) this.updateHUD();
     - In line 2022 (GOLD_RUSH intervention), replace:
       this.player.gold += 500;
       with:
       window.saveData.gold = (window.saveData.gold || 0) + 500;
       if (this.updateHUD) this.updateHUD();

3. Companion closeChat Key Capture Restoration:
   - File: c:\Code2\rpg-scroller\src\PlayerController.js
     In closeChat() method, ensure captured keys are restored to Phaser when closing companion chat:
     if (this.scene.inputManager) {
         this.scene.inputManager.enableForInput();
         this.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
     }

4. Preload heavy_knight Base Class Spritesheet:
   - File: c:\Code2\rpg-scroller\src\AssetManager.js
     Add a spritesheet loader for key 'heavy_knight' (which points to Black heavy.png with frameWidth: 91, frameHeight: 64) in the preload() method:
     this.scene.load.spritesheet('heavy_knight', 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png', { frameWidth: 91, frameHeight: 64 });

Verification:
- Compile tailwindcss to verify build is functional:
  npx tailwindcss -i ./src/input.css -o ./src/output.css
- Document your changes and verification command and output in c:\Code2\rpg-scroller\.agents\worker_fixes_3\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
