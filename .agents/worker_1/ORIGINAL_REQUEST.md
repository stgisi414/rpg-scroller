## 2026-06-30T17:43:31-05:00
You are Worker 1. Implement the cutscenes enhancement features and fix test_architecture.js in the codebase.

Follow these instructions step-by-step:

1. **Create Deepthink Prompt (`dialogue_generation_prompt.md`)**:
   - Create `dialogue_generation_prompt.md` in the project root.
   - Instruct the user on how to generate a JSON file containing varied dialogue patterns for 7 categories: 'town_entrance', 'rival_ambush', 'boss_monologue', 'heaven_encounter', 'hell_encounter', 'throne_room_entrance', and 'guard_warning'.
   - Detail the JSON schema with placeholders like {kingdomName}, {leaderName}, {factionName}, {rivalName}, {rivalClass}, {rivalPortrait}, {zoneName}, {reason}, {playerName}.

2. **Create Fallback JSON (`src/assets/dialogue_patterns.json`)**:
   - Create `src/assets/dialogue_patterns.json` containing a valid fallback JSON database with at least 2 distinct dialogue pattern arrays for each of the 7 categories listed above. Use the exact placeholders.

3. **Add Toggle to Settings Menu**:
   - In `index.html`, find the settings modal ('#ui-menu-settings') and add a dropdown `<select>` with ID `select-setting-cutscene-mode`. Provide option values: 'traditional' and 'omni'.
   - In `src/main.js`, load the setting from `localStorage.getItem("cutscene_mode") || "traditional"` when opening settings, save it as `"cutscene_mode"` when clicking save, and clear/reset it to `"traditional"` when resetting settings.

4. **Add Video Elements to Cutscene Overlay**:
   - In `index.html`, inside the cutscene overlay ('#cutscene-overlay'), in the center transparent region (between the left and right portrait containers), insert a centered `<div id="cutscene-video-container" style="position: absolute; inset: 0; display: none; justify-content: center; align-items: center; z-index: 90; background: rgba(0,0,0,0.85);">` with a `<video id="cutscene-video" style="max-width: 100%; max-height: 100%; object-fit: contain;" loop muted playsinline></video>`.

5. **Implement Logic in CutsceneController (`src/scene_modules/CutsceneController.js`)**:
   - In the constructor, asynchronously fetch `src/assets/dialogue_patterns.json` and save it to `this.dialoguePatterns = {}`. Handle fetch errors gracefully.
   - Update `playCutscene(linesOrCategory, contextOrOnComplete, onComplete)`:
     - Check if `linesOrCategory` is a string matching a key in `this.dialoguePatterns`.
     - If so, pick a pattern from that category (with non-repetition logic tracking `this.lastPlayedIndices[category]`).
     - Clone and format the lines by replacing all placeholders with key-values from the context object (which is passed as `contextOrOnComplete`).
     - If it is not a category, treat it as a raw dialogue array (backwards compatibility).
     - Check the cutscene mode setting: `localStorage.getItem("cutscene_mode") || "traditional"`.
     - If "omni":
       - Hide traditional left/right portraits.
       - Show `#cutscene-video-container` and play the video corresponding to the category (e.g. `src/assets/videos/town_entrance.mp4` for 'town_entrance', etc., or fall back to a generic default video if specific one fails).
       - Add `onerror` to the `<video>` element to hide the video and fallback to traditional rendering (draw portrait/display canvas) if the video fails to load.
     - If "traditional":
       - Hide `#cutscene-video-container` and use traditional portrait/sprite rendering.
     - In `cancelCutscene` and `finishCutscene`, stop and hide the video.

6. **Update Cutscene Trigger Sites**:
   - Modify `src/WorldManager.js`, `src/scene_modules/IndoorManager.js`, `src/scenes/GameScene_Helper.js`, and `src/world/TownBuilder.js` to call `playCutscene` with the category string and context object containing the appropriate placeholders.
   - For `WorldManager.js:872` (rival ambush), make sure the async Gemini text hotswap at line 885 still works perfectly with the dynamically loaded line.

7. **Create video generation utility (`scripts/generate_omni_videos.js`)**:
   - Create `scripts/generate_omni_videos.js` using Node.js and `@google/genai` to generate video files from a storyboard directory and output local .mp4 files. Include a detailed header comment explaining how to run it.

8. **Fix `test_architecture.js` and add unit tests**:
   - In `test_architecture.js` before clicking `#btn-awaken`, select the priest class card and allocate 3 starting points in the skills creation grid to enable the button.
   - In `test_logic_constraints.js`, add unit test cases validating the JSON schema, placeholder interpolation, and non-repetition category selection logic in `CutsceneController`.

Verify that all unit and integration tests compile and run successfully using:
- `node test_logic_constraints.js`
- `node test_mechanics.js`
- `node test_autoplay.js 10000`
- `node test_architecture.js`

Provide a detailed handoff report when done.
