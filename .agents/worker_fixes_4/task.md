# Task: Fix AI Controller Class Mappings

Implement the following fixes in the codebase:
1. In `src/PlayerController.js:_getAIClassData(classId)` (around lines 275-300), map `megaboss_rival` and `heavy_knight` to return the same 91px spritesheet structure as `knight_rival`, with walkRow 1, attackRow 2, and hit/die animation frame maps.
2. Derive `classesData.knight_rival` and `classesData.megaboss_rival` from `classesData.heavy_knight` in `src/main.js` to fix the frameWidth configuration mismatch.
3. Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify the build.
