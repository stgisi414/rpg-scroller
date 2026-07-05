# Scope: Cutscene Enhancements

## Architecture
- `CutsceneController.js` manages cutscene overlay, text typing, portrait drawing, and video playback.
- Settings are configured in `index.html` (DOM UI settings menu), loaded/saved in `main.js`.
- Video generation utility is in `scripts/generate_omni_videos.js`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Planning & Exploration | Investigate codebase and identify cutscene trigger sites | none | DONE |
| 2 | Prompt & Fallback JSON | Create dialogue prompt and dialogue_patterns.json fallback | M1 | DONE |
| 3 | Title Settings Toggle | Integrate setting toggle in Settings menu and persist | M1 | DONE |
| 4 | Dynamic Dialogue Integration | Integrate JSON pattern fetching, substitution, and trigger updates | M2, M3 | DONE |
| 5 | Gemini Video Script | Create generation script calling gemini-omni-flash-preview | M1 | DONE |
| 6 | Omni Video Playback | Implement video playback in CutsceneController with fallback | M4, M5 | DONE |
| 7 | Verification & Review | Perform unit tests, review, challenger checks, and forensic audit | M6 | DONE |
