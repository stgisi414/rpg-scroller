## 2026-06-16T20:37:16Z

You are worker_fixes_4. Your working directory is c:\Code2\rpg-scroller\.agents\worker_fixes_4\.
Please implement the following codebase fixes:

1. In `src/PlayerController.js:_getAIClassData(classId)` (around lines 275-300), map `megaboss_rival` and `heavy_knight` to return the same 91px spritesheet structure as `knight_rival`, with walkRow 1, attackRow 2, and hit/die animation frame maps.
Specifically, handle the mapping for `knight_rival`, `megaboss_rival`, and `heavy_knight` such that:
- frameWidth: 91
- frameHeight: 64
- flipX: true
- idleRow: 0
- idleFrames: 5
- walkRow: 1
- attackRow: 2
- jumpRow: 1
- fallRow: 1
- dashRow: 1
- stats should be:
  * For 'megaboss_rival': { vit: 150, str: 50, dex: 20, int: 20 }
  * For 'knight_rival': { vit: 30, str: 25, dex: 15, int: 8 }
  * For 'heavy_knight': { vit: 15, str: 14, dex: 9, int: 8 }
- animFrames should contain:
  * hit: { start: 30, end: 34 }
  * die: { start: 50, end: 54 }
- spriteScale should be:
  * For 'megaboss_rival': 2.2
  * For 'knight_rival' / 'heavy_knight': 1.5

2. In `src/main.js` (around lines 228-237), derive classesData.knight_rival and classesData.megaboss_rival from classesData.heavy_knight instead of classesData.knight:
- classesData.knight_rival = { ...classesData.heavy_knight, id: 'knight_rival', stats: { vit: 30, str: 25, dex: 15, int: 8 } };
- classesData.megaboss_rival = { ...classesData.heavy_knight, id: 'megaboss_rival', stats: { vit: 150, str: 50, dex: 20, int: 20 } };

3. Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify the build.

4. Write a handoff.md in your working directory (.agents/worker_fixes_4/) describing your changes and the build output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
