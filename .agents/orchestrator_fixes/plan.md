# Plan: Resolve 8 Critical Issues in rpg-scroller

## Architecture & Codebase Overview
This project aims to resolve 8 critical architectural, gameplay, and stability issues identified in `audit_report.md`.

## Milestones and Phase Breakdown

### Phase 1: Exploration and Analysis
- **Milestone 1**: Analyze all 8 issues using a read-only Explorer agent.
- **Deliverable**: Explorer Handoff Report (`explorer_fixes/handoff.md`) with precise location analysis, root causes, and recommended solutions.

### Phase 2: Implementation of Architecture & Performance Fixes
- **Milestone 2.1**: Address Issue 1.1 (Global Namespace Pollution) and Issue 1.2 (Monolithic Files / modularization).
- **Milestone 2.2**: Address Issue 1.3 (Synchronous Pixel Scanner bottleneck in NPC generation).
- **Deliverable**: Refactored files for architecture, modularity, and texture rendering performance.

### Phase 3: Implementation of Gameplay & Stability Fixes
- **Milestone 3.1**: Address Issue 2.1 (Double Jump exploit) and Issue 2.2 (Temple Blessings & Healing bugs).
- **Milestone 3.2**: Address Issue 3.1 (GPU texture memory leaks), Issue 3.2 (Timeout death crash), Issue 3.3 (Unhandled JSON parse), and Issue 3.4 (HP/MP/SP recalculation reset bug).
- **Deliverable**: Code fixes for all gameplay and stability issues.

### Phase 4: Verification and Quality Assurance
- **Milestone 4.1**: Run automated test suites `test_logic_constraints.js` and `test_mechanics.js` using a Worker or Challenger.
- **Milestone 4.2**: Verify no new console exceptions and complete compliance checks via Reviewers/Auditors.
- **Deliverable**: Clean Forensic Audit report and successful test execution output.

## Code Layout (To Be Maintained)
See `c:\Code2\rpg-scroller\PROJECT.md`. All changes must respect existing structure.
