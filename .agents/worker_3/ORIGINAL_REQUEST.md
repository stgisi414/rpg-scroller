## 2026-06-30T23:33:27Z

You are Worker 3. Remove all leftover portrait requirements (Requirement R6) code from `src/scene_modules/HUDCharacterSheet.js` and `src/scene_modules/CutsceneController.js` to fix the 404 resource console error.

Follow these instructions step-by-step:

1. **Revert changes in `src/scene_modules/CutsceneController.js`**:
   - Locate `drawPortrait(canvas, textureKey)` (lines 289-312).
   - Remove the check and call to `window.drawDetailedPortrait`:
     ```javascript
     if (window.drawDetailedPortrait && window.drawDetailedPortrait(canvas, textureKey)) {
         // Will progressive-enhance once loaded. Fallback to pixel art crop below.
     }
     ```
     Keep only the clean Phaser texture/frame drawing code.

2. **Revert changes in `src/scene_modules/HUDCharacterSheet.js`**:
   - In `updateSheet(p)`:
     - Locate and remove:
       ```javascript
       window.drawDetailedPortrait(playerCanvas, cd.id, p.customConfig || null, shouldFlip);
       ```
   - In `updateCompanions(p)`:
     - Locate and remove:
       ```javascript
       window.drawDetailedPortrait(canvas, member.classData.id, member.customConfig || null, shouldFlip);
       ```
   - In `showCompanionInspect(member)`:
     - Locate and remove:
       ```javascript
       window.drawDetailedPortrait(companionCanvas, cd.id, member.customConfig || null, shouldFlip);
       ```
   - Scroll to the bottom of the file (lines 1205 to 1303) and completely delete the detailed/ambient portraits configuration objects, functions, and window methods:
     - Delete `DETAILED_PORTRAITS` constant.
     - Delete `AMBIENT_PORTRAITS` constant and loop.
     - Delete `getAmbientPortraitKey(classId, customConfig)` function.
     - Delete `window.drawDetailedPortrait` function definition.

3. **Verify with Tests**:
   - Verify that all unit and integration tests compile and run successfully using:
     - `node test_logic_constraints.js`
     - `node test_mechanics.js`
     - `node test_autoplay.js 10000`
     - `node test_architecture.js`
     - `node verify_settings_toggle.js`
     - `node test_dialogue_parser_verification.js`
   - Specifically, ensure `node test_architecture.js` passes with exit code 0 and logs `ALL ARCHITECTURE TESTS PASSED!` without any 404 console errors.

Provide a detailed handoff report when done.
