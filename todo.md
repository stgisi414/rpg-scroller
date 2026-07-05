# Project TODO List

This document tracks upcoming features, modifications, and experimental suites for the RPG Scroller.

## 1. Dragon Enemy (Active)
- [x] Complete PixelLab generation for the `dragon` spritesheet (with ground and flying animations)
- [x] Add dragon loading/assets setup in `AssetManager.js`
- [x] Register all dragon animations (including airborne `dragon-fly`) in `GameScene.js`
- [x] Configure `EnemyController.js` for custom wide-and-short hitbox, scaling (2.2x), stats, and dynamic flying remappings.

## 2. Coliseum Autoplay & Steeper Scaling (Approved Plan)
- [x] Add Coliseum Autoplay navigation to `CompanionAI.js`:
  - [x] AI hero enters the Coliseum and automatically talks to the King to start new waves.
  - [x] Disable Safe zone interaction locks when a wave is active.
- [x] Revamp `ArenaManager.js`:
  - [x] Increase enemy wave caps to 25.
  - [x] Apply steeper exponential health and damage scaling formulas per wave.
  - [x] Spawn multiple bosses/elites at higher waves.
  - [x] Propagate `damageMultiplier` to spawned controllers.
- [x] Add dynamic damage scaling to melee attacks and projectiles in `EnemyController.js` and `GameScene.js`.

## 3. One-on-One Fighter Suite
- [x] Design a dedicated experimental battle arena where characters fight 1v1.
- [x] Live animation testing panel:
  - [x] Trigger and preview all character/enemy animation sets (walk, idle, attack, magic, hit, die, etc.) in real time.
- [x] Battle setup options:
  - [x] Select any playable character class or enemy type for Combatant 1 and Combatant 2.
  - [x] Configure matches: Human vs AI, AI vs AI, or Human vs Human.

## 4. Ambient NPC Combat Prowess (Active)
- [x] Debug the ambient NPC party members' combat prowess to optimize their AI and effectiveness. (Completed via Companion Equipment and Inspection modal).

## 5. PixelLab Jump Animations (Future)
- [ ] Add jump animations for all the PixelLab characters created so far.
- [ ] Program the characters to use these jump animations in-game.

