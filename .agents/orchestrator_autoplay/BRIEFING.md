# BRIEFING — 2026-06-30T04:23:20Z

## Mission
Refine, debug, and expand the game's AI autoplay system (combat, potion management, hazard navigation) across aggressive, defensive, and passive presets, and build a parallel multi-browser autoplay test suite using Puppeteer or Playwright.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Code2\rpg-scroller\.agents\orchestrator_autoplay
- Original parent: main agent
- Original parent conversation ID: d7573633-6728-4727-93d4-f415bd0b37b7

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator Procedure: Assess -> Decompose -> Dispatch -> Iterate -> Gate)
- **Scope document**: c:\Code2\rpg-scroller\.agents\orchestrator_autoplay\SCOPE.md
1. **Decompose**: Split autoplay refinements, combat presets debugging, and automated multi-browser test suite into verifiable milestones.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn specialized subagents for investigation, code implementation, review, and verification.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor.
- **Work items**:
  1. Milestone 1: Setup and Decompose [done]
  2. Milestone 2: Codebase Exploration and Autoplay System Audit [pending]
  3. Milestone 3: Autoplay AI Combat and Survival Refinements [pending]
  4. Milestone 4: Multi-Browser Parallel Test Suite Design and Setup [pending]
  5. Milestone 5: Verification and Final Hardening [pending]
- **Current phase**: 1
- **Current focus**: Milestone 1: Setup and Decompose

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Autoplay instances must run for at least 5 minutes in dangerous zones without dying.
- Player character must successfully gain XP and Gold during test runs.
- No unhandled JavaScript console errors or stuck loops during grinding.

## Current Parent
- Conversation ID: d7573633-6728-4727-93d4-f415bd0b37b7
- Updated: not yet

## Key Decisions Made
- Use Project Pattern with explicit scope document (SCOPE.md).
- Create parallel multi-browser test suite using Puppeteer (since Puppeteer might be already installed in node_modules, or check if we need to install/configure it).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_autoplay_audit | teamwork_preview_explorer | Autoplay AI and UI audit | completed | 4566c078-9c02-4042-9b13-13f51dbdb1bf |
| worker_autoplay_ai_refinement | teamwork_preview_worker | Autoplay AI refinements | completed | 406e237a-3496-4afa-b0ab-130d2f1ee05f |
| worker_test_suite_setup | teamwork_preview_worker | Autoplay test suite setup | completed | eca5dc12-e252-4f87-b64f-7785b542fd53 |
| challenger_autoplay_run | teamwork_preview_challenger | Autoplay E2E verification run | stopped | 7e7e5632-f200-4977-98f7-f8039f3e3b1b |
| auditor_autoplay_verification | teamwork_preview_auditor | Forensic code integrity audit | completed | 3d79839d-1274-4731-bbc1-d8f6c2b5bd7a |
| worker_potion_threshold_fix | teamwork_preview_worker | Potion threshold safe floor | completed | ef3fb66a-dba7-49b1-a81f-8dacd614b861 |
| challenger_final_verification | teamwork_preview_challenger | Autoplay E2E verification run | completed | b1f92b4c-b710-4cb8-a91e-06641be780e5 |
| auditor_final_verification | teamwork_preview_auditor | Forensic code integrity audit | completed | e83af0fa-2070-4d03-9eb0-f559f619d7f5 |
| worker_test_runner_refinement | teamwork_preview_worker | Test runner adjustments | stopped | 3f8d7bd3-5f7f-41d5-9723-7d077e11f804 |
| worker_final_test_runner_clean | teamwork_preview_worker | Test runner clean up & E2E verification | completed | c3b41eb0-e88c-4e2d-909d-5c158068780d |
| worker_victory_fixes | teamwork_preview_worker | Victory fixes and verification | completed | 43b69663-82d9-4f75-93a8-d90bbc88c974 |
| worker_victory_fixes_2 | teamwork_preview_worker | Victory fixes round 2 and verification | in-progress | ea5b5dca-ced4-4b43-baf2-61fb8590f034 |

## Succession Status
- Succession required: no
- Spawn count: 12 / 16
- Pending subagents: ea5b5dca-ced4-4b43-baf2-61fb8590f034
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: e27b0885-38b4-467c-abff-9f78a0a21bef/task-309
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Code2\rpg-scroller\.agents\orchestrator_autoplay\ORIGINAL_REQUEST.md — Verbatim user request.
- c:\Code2\rpg-scroller\.agents\orchestrator_autoplay\progress.md — Heartbeat and step-by-step progress tracking.
- c:\Code2\rpg-scroller\.agents\orchestrator_autoplay\SCOPE.md — Decomposed milestones and interface contracts.
