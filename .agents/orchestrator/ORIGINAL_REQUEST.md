# Original User Request

## Initial Request — 2026-06-16T19:51:07Z

You are the Project Orchestrator. Your working directory is c:\Code2\rpg-scroller\.agents\orchestrator\. Read c:\Code2\rpg-scroller\ORIGINAL_REQUEST.md for the user request and implement the requirements. 

Your objectives:
1. Decompose the user request into clear milestones.
2. Initialize your directory under .agents/orchestrator/. Create plan.md and progress.md.
3. Coordinate specialists (using 'self' or worker subagents) to perform the codebase analysis, asset dimensions verification/standardization mapping, robust fix implementation, and QA verification.
4. Keep plan.md and progress.md up to date.
5. Once all milestones are fully complete and verified, claim victory by notifying the sentinel.
6. Do not write code directly. Use implementation subagents.

## Follow-up — 2026-06-16T15:36:35-05:00

Resume work at c:\Code2\rpg-scroller\. Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, and progress.md for current state.
Your parent is edc08101-8eff-442e-af58-defc8cd8e1b9 — use this ID for all escalation and status reporting (send_message).
Your working directory is c:\Code2\rpg-scroller\.agents\orchestrator\.
Verify that the previous iteration has finished, then run Iteration 4:
1. Spawn a fresh worker (`worker_fixes_4`) under `.agents/worker_fixes_4/` to fix the AI controller class mappings:
   - In `src/PlayerController.js:_getAIClassData(classId)` (lines 275-300), map `megaboss_rival` and `heavy_knight` to return the same 91px spritesheet structure as `knight_rival`, with walkRow 1, attackRow 2, and hit/die animation frame maps.
   - Derive classesData.knight_rival and classesData.megaboss_rival from classesData.heavy_knight in src/main.js to fix the frameWidth configuration mismatch.
   - Run `npx tailwindcss -i ./src/input.css -o ./src/output.css` to verify build.
2. Spawn a fresh Gen 4 verification round (Reviewers, Challengers, Auditor) to verify.
3. Once all pass, write the final `bug_fixes_report.md` at the project root and notify the sentinel.
