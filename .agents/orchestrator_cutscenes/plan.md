# Cutscenes System Enhancement Plan

This plan outlines the design, implementation, and verification of the Cutscenes system enhancements.

## Milestones

### Milestone 1: Planning and Codebase Exploration
- **Objective**: Explore TitleScene settings menu, CutsceneController, how settings are persisted, and identify calling sites for cutscenes.
- **Tasks**:
  1. Spawn an Explorer agent to analyze:
     - Settings modal structure in `index.html` and logic in `src/main.js`.
     - CutsceneController logic in `src/scene_modules/CutsceneController.js`.
     - Cutscene trigger sites in `WorldManager.js`, `IndoorManager.js`, `GameScene_Helper.js`, `TownBuilder.js`.
     - Persistence mechanics in `main.js`.
- **Verification**: Explorer handoff report documenting current implementations.

### Milestone 2: Dialogue Patterns Prompt & Fallback Database
- **Objective**: Create the Deepthink prompt and fallback JSON database.
- **Tasks**:
  1. Author `dialogue_generation_prompt.md` containing the Deepthink prompt.
  2. Create a fallback `src/assets/dialogue_patterns.json` file with multiple templates per category.
- **Verification**: Verify files are present, JSON is syntactically valid.

### Milestone 3: Title Settings Menu Toggle
- **Objective**: Add setting toggle (Traditional vs Omni Cutscenes) in settings menu, persisting in localStorage.
- **Tasks**:
  1. Edit `index.html` to add the toggle in the Settings Modal.
  2. Edit `src/main.js` to persist setting in localStorage and expose it.
- **Verification**: Test that the setting saves, loads, and resets correctly.

### Milestone 4: Dynamic Dialogue Integration
- **Objective**: Load JSON patterns, replace placeholders, and prevent repetition.
- **Tasks**:
  1. Update `CutsceneController.js` to fetch `src/assets/dialogue_patterns.json`.
  2. Implement category selection with non-repetition logic.
  3. Implement placeholder replacement for context variables.
  4. Modify cutscene calling sites to pass categories and context.
- **Verification**: Verify cutscenes run correctly and display dynamic text.

### Milestone 5: Gemini Omni Video Generation Script
- **Objective**: Create `scripts/generate_omni_videos.js` to generate videos using Google GenAI SDK.
- **Tasks**:
  1. Write the generation script under `scripts/`.
  2. Document how to invoke it and configure API keys.
- **Verification**: Verify script compiles/runs and calls the correct SDK/model.

### Milestone 6: Omni Cutscene Video Playback
- **Objective**: Play videos in cutscene renderer when setting is "Omni", with traditional fallback.
- **Tasks**:
  1. Add `<video>` element inside `#cutscene-overlay` in `index.html`.
  2. Update `CutsceneController.js` to play videos for categories when Omni is enabled.
  3. Implement automatic fallback to traditional rendering if video loading/playback fails.
- **Verification**: Verify video playback works, falls back gracefully on error.

### Milestone 7: Swarm Verification, Review & Auditing
- **Objective**: Verify all changes, run automated tests, perform reviews and integrity audits.
- **Tasks**:
  1. Spawn Reviewers to check correctness and code layout.
  2. Spawn Challengers to verify behavior under edge cases.
  3. Spawn Forensic Auditor to verify integrity and correctness.
- **Verification**: All tests and audits pass successfully.
