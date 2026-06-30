# Autoplay AI & Parallel Multi-Browser Test Suite Implementation Plan

This plan details the steps required to refine, debug, and expand the game's AI autoplay system and build an automated multi-browser test suite.

## 1. Objectives
1. **Autoplay AI Refinements**: Debug and refine `CompanionAI.js` and `CompanionAI_Helper.js`. Ensure player grinding logic handles combat, fleeing, potion/resource management, and hazard navigation across the preset types: `aggressive`, `potion_saver`, and `pacifist` (or passive/defensive/aggressive mappings). Ensure no stuck loops or crash bugs.
2. **Parallel Test Runner**: Implement a Puppeteer-based script `test_autoplay.js` that runs parallel browsers loading the game, toggling different autoplay presets, and monitoring stability, XP, gold, and error logs for 5 minutes.
3. **Execution Integration**: Add script mapping to `package.json` for running the automated tests via `npm run test:autoplay`.

## 2. Milestones

### Milestone 1: Plan, Scope, and Setup
- Create `plan.md` and `SCOPE.md`.
- Initialize `progress.md`.
- Set up the environment and timers.
*Verification*: State files created and tracked.

### Milestone 2: Codebase Exploration & Autoplay Audit
- Spawn `teamwork_preview_explorer` to inspect:
  - `src/player/CompanionAI.js` and `src/player/CompanionAI_Helper.js`
  - How autoplay state and presets (`aggressive`, `potion_saver`, `pacifist`) are configured, triggered, and updated.
  - How input keys (attacks, spells, movements, menus) are simulated in autoplay.
  - Potential issues (infinite loops, door transitions, stuck state in platforms, potion consumption conditions).
- Produce explorer analysis report.
*Verification*: Explorer handoff document.

### Milestone 3: Autoplay AI Refinement & Bug Fixes
- Spawn `teamwork_preview_worker` to apply fixes:
  - Robust potion usage (triggering when health/mana is low, utilizing cooldowns).
  - Combat states for `aggressive` (chase & attack), `potion_saver` (flee and heal when low), and `pacifist` (avoid combat, run past enemies, survive).
  - Hazard/platform navigation (climbing, jump triggers, avoiding bottomless pits).
  - Prevent stuck states (e.g. infinite menu toggles, platform corner bounces).
- Spawn `teamwork_preview_reviewer` to review changes.
*Verification*: Code review and initial local verification.

### Milestone 4: Parallel Autoplay Test Suite Design & Build
- Spawn `teamwork_preview_worker` to:
  - Write `test_autoplay.js` using Puppeteer.
  - Connect to local dev server (`http://localhost:3000`).
  - Implement concurrent browser instances running different autoplay presets.
  - Extract performance data (XP, Gold, console errors, active state) from the browser context periodically.
  - Handle test run configuration (duration, parallel count, logging).
  - Add `"test:autoplay": "node test_autoplay.js"` script to `package.json`.
- Spawn `teamwork_preview_reviewer` to check test reliability and error handling.
*Verification*: Test script created and package.json updated.

### Milestone 5: Verification, Hardening & Audit
- Run E2E Autoplay test suite in development/test environment.
- Spawn `teamwork_preview_challenger` to test the limits of autoplay (e.g., higher difficulty zones, sudden hazards).
- Spawn `teamwork_preview_auditor` to verify code integrity (checks for fake implementations, bypasses).
- Ensure all acceptance criteria are met (5-minute survive run, XP/Gold gain, 0 console errors, clean audit).
*Verification*: E2E test results, challenger/auditor verification logs.
