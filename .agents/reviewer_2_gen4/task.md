# Reviewer Task

Verify the correctness, completeness, robustness, and layout alignment of the class mapping changes made in Iteration 4:
1. Check `src/PlayerController.js` classesData mapping returned by `_getAIClassData`. Confirm walkRow 1, attackRow 2, and hit/die animation frame maps are correctly set for `megaboss_rival`, `heavy_knight`, and `knight_rival`.
2. Check `src/main.js` `classesData.heavy_knight` uses `frameWidth: 91` and correct animation row mappings for walkRow, attackRow, jumpRow, fallRow, and dashRow.
3. Check derived rival classes inherit from `heavy_knight` where appropriate (knight_rival, megaboss_rival) and preserve their correct custom image assets and stats.
4. Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify the build.
5. Write your handoff.md in your working directory.
