## 2026-06-30T23:04:00Z
You are Worker 2. Fix the double-trigger race condition in `src/scene_modules/CutsceneController.js` inside `finishCutscene()`.

Specifically:
- Track `this.isFinishing = false` in the constructor.
- Inside `finishCutscene()`:
  - If `this.isFinishing` is true, immediately return (prevent duplicate calls).
  - Set `this.isFinishing = true`.
  - Immediately disable inputs: remove the key handler (`window.removeEventListener('keydown', this.keyHandler)`), clear the click handler (`overlay.onclick = null`), and set `overlay.style.pointerEvents = 'none'`.
  - Inside the `setTimeout` callback (which fires after 400ms):
    - Reset `this.isFinishing = false`.
    - Restore `overlay.style.pointerEvents = 'auto'`.
    - Call `this.cancelCutscene()`.
    - Cash the callback `const cb = this.onCompleteCallback; this.onCompleteCallback = null;`, and then call `cb()` if it exists.
  - In the fallback `else` branch of `finishCutscene()`:
    - Reset `this.isFinishing = false`.
    - Call `this.cancelCutscene()`.
    - Cash the callback and call it exactly once.
- Inside `advanceCutscene()`, at the very top, add a check: `if (this.isFinishing) return;`.
- Inside `playCutscene()`, reset `this.isFinishing = false` and ensure `overlay.style.pointerEvents` is set to `'auto'` (or similar) when initializing the overlay display.

Verify that all unit and integration tests compile and run successfully using:
- `node test_logic_constraints.js`
- `node test_mechanics.js`
- `node test_autoplay.js 10000`
- `node verify_settings_toggle.js`
- `node test_dialogue_parser_verification.js`

Provide a detailed handoff report when done.
