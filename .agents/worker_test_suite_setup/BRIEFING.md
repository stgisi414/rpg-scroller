# BRIEFING — 2026-06-29T23:33:00-05:00

## Mission
Implement a Puppeteer-based autoplay test runner `test_autoplay.js` and add a script mapping to package.json.

## 🔒 My Identity
- Archetype: worker_test_suite_setup
- Roles: implementer, qa, specialist
- Working directory: c:\Code2\rpg-scroller\.agents\worker_test_suite_setup
- Original parent: e27b0885-38b4-467c-abff-9f78a0a21bef
- Milestone: Autoplay test suite setup

## 🔒 Key Constraints
- CODE_ONLY network mode.
- DO NOT CHEAT. All implementations must be genuine.
- Modifying package.json to add script "test:autoplay".
- Puppeteer-based parallel execution of three presets: aggressive, potion_saver, pacifist.

## Current Parent
- Conversation ID: e27b0885-38b4-467c-abff-9f78a0a21bef
- Updated: not yet

## Task Summary
- **What to build**: Puppeteer-based test runner script `test_autoplay.js` that spins up a local server, runs three preset-based game characters in parallel under autoplay, tracks telemetry, asserts survival and progress/no errors, and cleans up.
- **Success criteria**: Test completes successfully, no errors, exit 0, exits with 1 on failure. Package.json mapping added.
- **Interface contracts**: test_autoplay.js, package.json
- **Code layout**: c:\Code2\rpg-scroller\test_autoplay.js

## Key Decisions Made
- Use Puppeteer for browser automation and spawn http-server if port 3000 is not in use.

## Artifact Index
- c:\Code2\rpg-scroller\.agents\worker_test_suite_setup\handoff.md — Handoff report
