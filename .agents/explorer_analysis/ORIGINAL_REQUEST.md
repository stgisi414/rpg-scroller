## 2026-06-16T19:51:33Z
You are a teamwork_preview_explorer agent.
Your working directory is: c:\Code2\rpg-scroller\.agents\explorer_analysis\

Task:
Perform a deep codebase and asset analysis for the RPG scroller game.
1. Scan the codebase (especially src/AssetManager.js, src/PlayerController.js, src/EnemyController.js, src/NPCController.js, src/main.js, index.html) to understand the game loop, physics engine (Phaser arcade/matter/etc.), and sprite sheet animation setup.
2. Examine the sprite sheet assets in src/assets/ (e.g., bandit.png, devil_boss.png, frost_giant.png, lich_lord.png, etc.). Detect their dimensions, frame counts, default orientations, and anomalies. You can run the python/JS scripts at the root (check_frames.py, count_frames.py, get_dims.py, etc.) using the run_command tool to get quick statistics.
3. Identify all logic bugs, AI behavior inconsistencies, pathing bugs, physics NaNs, and rendering/visual artifacts.
4. Define/write c:\Code2\rpg-scroller\PROJECT.md with:
   - Architecture summary
   - Code layout
   - Milestones table
   - Interface contracts for sprite sheet standardization mapping
5. Write your findings, root causes, and recommended solutions in detail to:
   c:\Code2\rpg-scroller\.agents\explorer_analysis\analysis.md
6. Update your own progress.md periodically (with timestamp and steps).
7. Communicate your completion back to me with a detailed message referencing your analysis.md file.

Remember: Do NOT modify any source code files. Just analyze and write PROJECT.md and analysis.md.
