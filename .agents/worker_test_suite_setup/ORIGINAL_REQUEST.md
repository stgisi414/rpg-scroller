## 2026-06-29T23:31:51-05:00
Create a Puppeteer-based test runner script named `test_autoplay.js` in the project root directory (`c:\Code2\rpg-scroller`). The script must:
- Handle launching/connecting to the game server on `http://localhost:3000`. Just like `test_architecture.js`, if no server is running on port 3000, start a local http-server using `spawn('npx', ['http-server', '.', '-p', '3000', '-c-1'], { shell: true, stdio: 'ignore' })` and wait for it to be ready.
- Launch multiple Puppeteer browser instances (or concurrent pages in parallel browsers) for the 3 different presets: `aggressive`, `potion_saver`, and `pacifist` in parallel.
- For each instance:
  - Clear localStorage, stub prompt to empty string.
  - Open `http://localhost:3000`.
  - Create a new character (e.g. name `Hero_aggressive`, `Hero_potion_saver`, `Hero_pacifist`).
  - Click Awaken and wait for the Phaser game canvas to mount.
  - Enable Autoplay by clicking `#btn-auto-play`.
  - Open the autoplay config menu by clicking `#btn-auto-play-config`.
  - Click the corresponding preset button (`.preset-btn[data-preset="aggressive"]`, etc.).
  - Programmatically set `targetZone = 1` inside `autoplayConfig` in the page context and save it using `window._gameScene.hudManager._saveAutoplayConfig()` so they leave town to grind in dangerous zones.
  - Close the config menu by clicking `#btn-close-ap-config`.
- Run the simulation for a target duration of 5 minutes (300000ms), but allow customizing this duration using a command line flag (e.g. `--duration 30000` for a shorter 30-second smoke test) or an environment variable `AUTOPLAY_DURATION`.
- Periodically (e.g. every 15-20 seconds) extract and print telemetry/stats from the browser context:
  - Preset name
  - Elapsed time
  - Current HP and Max HP
  - Current Zone
  - Total Gold and XP
  - Active console error count
- Track and assert that:
  - The characters do not die (HP stays > 0).
  - No unhandled JS console errors or uncaught exceptions occur in any instance.
  - For `aggressive` and `potion_saver`, they successfully gain XP and Gold from initial baseline stats. (For `pacifist`, check that they ran without errors or crashes).
- If any instance fails (character dies, throws uncaught error, doesn't gain XP/gold where expected), fail the test process with exit code 1. Otherwise, exit with code 0.
- Properly clean up all launched browsers and server process on completion or failure.

2. Modify `package.json` to add the script script mapping:
`"test:autoplay": "node test_autoplay.js"`
