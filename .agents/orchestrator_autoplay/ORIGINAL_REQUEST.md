# Original User Request

## Follow-up — 2026-06-30T04:22:22Z

Refine, debug, and expand the game's AI autoplay system to enable robust autonomous grinding (combat, potion/resource management, and hazard navigation) across aggressive, defensive, and passive presets. Debug CompanionAI.js and CompanionAI_Helper.js. Build a parallel multi-browser autoplay test suite using Puppeteer or Playwright.

### Requirements

#### R1. Autoplay Grinding and Combat AI Refinement
Debug the combat and survival state machine in `CompanionAI.js` and `CompanionAI_Helper.js` to ensure the player character handles fighting, fleeing, potion consumption, and movement seamlessly. The AI must successfully grind without getting stuck, freezing, or dying prematurely under combat presets (`aggressive`, `potion_saver`, `pacifist`).

#### R2. Automated Multi-Browser Autoplay Test Suite
Create a Node-based automated test runner script (using Puppeteer or Playwright) that can launch multiple browser instances in parallel. Each instance should load the local dev server (`http://localhost:3000`), enable autoplay with a different preset (e.g., Aggressive, Potion Saver, Pacifist), and run for a target time duration (e.g., 5 minutes).

### Acceptance Criteria

#### Test Runner Execution
- [ ] A Node script (e.g. `npm run test:autoplay`) can launch multiple headless/headful browser instances concurrently.
- [ ] Each instance connects to the running game server and triggers the Autoplay AI.

#### Autoplay Performance & Stability
- [ ] Autoplay instances run for at least 5 minutes in dangerous zones without dying.
- [ ] The player character successfully gains XP and Gold during the test runs.
- [ ] No unhandled JavaScript console errors or stuck loops (e.g. opening/closing menus, getting stuck in walls) occur during the grinding session.
