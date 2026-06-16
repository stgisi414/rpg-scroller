## 2026-06-16T20:40:29Z
You are worker_fixes_4_b. Your working directory is c:\Code2\rpg-scroller\.agents\worker_fixes_4_b\.
Please implement the following codebase fixes:

1. Double-check `src/PlayerController.js:_getAIClassData(classId)` (around lines 275-310). It should map `megaboss_rival` and `heavy_knight` to return the same 91px spritesheet structure as `knight_rival`, with walkRow 1, attackRow 2, and hit/die animation frame maps. (This is already implemented by the previous worker, but double-check it to make sure stats and spriteScale are correct).

2. In `src/main.js`:
   - Update `classesData.heavy_knight` (around lines 127-149) to use `frameWidth: 91` and `image: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'`. Also set walkRow: 1, attackRow: 2, jumpRow: 1, fallRow: 1, dashRow: 1. Ensure `animFrames` and `comboStartFrame` / `comboEndFrame` values are correct for a 91px spritesheet format.
   - In the derived rival and boss classes block (around lines 220-235), derive `classesData.knight_rival` and `classesData.megaboss_rival` from `classesData.heavy_knight` instead of `classesData.knight`. Make sure you PRESERVE all the rival image assignments and statistics:
     ```javascript
     classesData.knight_rival = { ...classesData.heavy_knight, id: 'knight_rival', stats: { vit: 30, str: 25, dex: 15, int: 8 } };
     classesData.knight_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
     classesData.wizard_rival = { ...classesData.wizard, id: 'wizard_rival', stats: { vit: 20, str: 10, dex: 15, int: 30 } };
     classesData.wizard_rival.image = 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png';
     classesData.samurai_rival = { ...classesData.samurai, id: 'samurai_rival', stats: { vit: 25, str: 20, dex: 30, int: 5 } };
     classesData.samurai_rival.image = 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png';
     classesData.ranger_rival = { ...classesData.ranger, id: 'ranger_rival', stats: { vit: 25, str: 15, dex: 25, int: 15 } };
     classesData.ranger_rival.image = 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png';
     classesData.megaboss_rival = { ...classesData.heavy_knight, id: 'megaboss_rival', stats: { vit: 150, str: 50, dex: 20, int: 20 } };
     classesData.megaboss_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
     ```

3. Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify the build.

4. Write a handoff.md in your working directory (.agents/worker_fixes_4_b/) describing your changes and the build output.
