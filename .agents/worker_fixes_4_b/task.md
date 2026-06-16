# Task: Correct main.js and PlayerController.js Class Mappings

Implement the following fixes in the codebase:
1. In `src/PlayerController.js:_getAIClassData(classId)` (around lines 275-310), ensure that `megaboss_rival` and `heavy_knight` map to return the same 91px spritesheet structure as `knight_rival`, with walkRow 1, attackRow 2, and hit/die animation frame maps. (This is already implemented by the previous worker, but double-check it and make sure it is correct).
2. In `src/main.js`:
   - Update `classesData.heavy_knight` (around lines 127-149) to use `frameWidth: 91` and `image: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png'`. Update animation rows and other values as appropriate for 91px layout (jumpRow: 1, fallRow: 1, dashRow: 1, walkRow: 1, attackRow: 2, and animFrames/comboStartFrame ranges matching the 91px format).
   - In `src/main.js` (around lines 220-235), derive `classesData.knight_rival` and `classesData.megaboss_rival` from `classesData.heavy_knight` instead of `classesData.knight`, while preserving all their specific image paths (`classesData.knight_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';`, etc.), stats, and other rival class mappings (wizard_rival, samurai_rival, ranger_rival) with their correct image paths and stats.
3. Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify the build.
4. Write a handoff.md in your working directory (.agents/worker_fixes_4_b/) describing your changes and the build output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
