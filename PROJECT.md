# Elden Soul Project Specifications

## 1. Architecture Summary

Elden Soul is a 2D side-scrolling action RPG built using Phaser 3 and powered by the Gemini API for dynamic AI behaviors.

*   **Game Loop:** Powered by Phaser 3.60.0, utilizing a classic lifecycle (`preload`, `create`, `update`). It runs two concurrent loops: HTML UI updates for overlay menus/HUDs, and the core Phaser loop for physics, animations, and rendering.
*   **Physics Engine:** Phaser Arcade Physics engine is configured with a vertical gravity of `1200`. The engine handles axis-aligned bounding boxes (AABB) for collision detection, velocity-based movement, and platform snapping.
*   **Input Handling:** Mapped in `InputManager.js`. Key bindings are:
    *   `W`/`A`/`S`/`D`: Movement (Up, Left, Down, Right)
    *   `.` (Period): Main Attack
    *   `,` (Comma): Super Spell
    *   `F`: Interact / Dialogue
    *   `I`: Inventory menu toggle
    *   `1`-`6`: Combat skills
    *   Double-tapping `A` or `D` triggers a dash.
*   **Rendering & Assets:** Pixel-art rendering style with `image-rendering: pixelated` configured on canvases and images. Standard resolution is 1280x720. Textures are loaded via spritesheets or atlases, with dynamic slicing implemented at runtime for large boss sheets.
*   **Gemini Service:** Connects via a JSON-over-HTTP API to Gemini. It runs three primary AI tasks:
    1.  **Dynamic Game Master:** Ambush generation, weather shifts, item drops, and healing buffs.
    2.  **Combat AI Tactics:** Returns maneuvers (HEAL, FLEE, BLOCK, DASH_EVADE, CHASE, MELEE_ATTACK, RANGED_ATTACK) for hostile rivals based on health, mana, stamina, and proximity.
    3.  **NPC Dialogues & Quests:** Performs semantic dialogue generation with alignment shifts (+/- alignment points) and dynamic quest objectives.

---

## 2. Code Layout

```
rpg-scroller/
├── index.html                   # HTML GUI Shell, CSS style rules, and loading overlays.
├── package.json                 # Dependency configurations.
├── count_frames.py              # Script to verify opacity in sprite sheet frames.
├── check_frames.py              # Script to verify Warrior sheet frames.
├── check_wizard.py              # Script to verify Wizard sheet frames.
├── slice_dead.js                # Jimp-based asset slicer for Dead Trees pack.
├── tint.js                      # Jimp-based color-channel swapper for healing sheet potions.
└── src/
    ├── main.js                  # Bootstraps game instances, class statistics, and Save/Load System.
    ├── AssetManager.js          # Preloads all images, audio, spritesheets, and generates default fallbacks.
    ├── InputManager.js          # Captures and maps keys, calculates mouse aim angle, and registers double-tap inputs.
    ├── PlayerController.js      # Main player logic (combat, movement state machine, stats, inventory, and companion AI).
    ├── EnemyController.js       # Enemy AI state machines, Monologue triggers, and projectile spawning.
    ├── NPCController.js         # Chat-UI binding, activity behaviors (pray, study, rest), and Shop interfaces.
    ├── WorldManager.js          # Dynamic zone procedural generator and zone builders.
    ├── GeminiService.js         # API integration with Gemini model APIs.
    ├── output.css               # Compiled Tailwind style rules.
    ├── scenes/
    │   ├── TitleScene.js        # Boot menu canvas with animated roaming sprites.
    │   └── GameScene.js         # Main gameplay loop, platforms, zones, colliders, and dynamic texture slicers.
    └── assets/                  # Directory containing all pixel-art sprite sheets and backgrounds.
```

---

## 3. Milestones Table

| Milestone | Task / Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Milestone 1** | Engine & Setup | **Completed** | Mapped core Phaser engine, canvas layers, and game lifecycle. |
| **Milestone 2** | Save & Load Systems | **Completed** | Implemented LocalStorage save serialization for stats, zone progress, and inventory. |
| **Milestone 3** | Class Selection & HUD | **Completed** | Added Knight, Wizard, Samurai, and Ranger player classes with unique HUD resource bars. |
| **Milestone 4** | Procedural Zone Generation | **Completed** | Linked biomes (Forest, Desert, Winter, etc.) to infinite scroll transitions. |
| **Milestone 5** | Gemini GM & Combat AI | **Completed** | Integrated Game Master decisions and tactical combat responses. |
| **Milestone 6** | Sprite Sheet Standardization | **In Progress** | Aligning frame sizes (64x64 vs 102x128) and animation row bounds. |
| **Milestone 7** | Bug Squashing & Memory Leaks| **Upcoming** | Resolving DOM listener leaks, respawn checkpoint bugs, and GM ambush crashes. |

---

## 4. Interface Contracts for Sprite Sheet Standardization Mapping

To prevent rendering artifacts and animation glitches, all loaded sheets must follow strict layout contracts:

### A. Player Classes & Rivals (Hero Sheets)
Standardize on the default 10-column or 12-column grid. Frame dimensions vary by class:
*   **Knight / Knight Rival / Megaboss:** `80x64` (10 columns, 17 rows)
*   **Wizard / Wizard Rival:** `64x64` (6 columns, 11 rows)
*   **Samurai / Samurai Rival:** `96x64` (8 columns, 18 rows)
*   **Ranger / Ranger Rival:** `64x64` (11 columns, 5 rows)

**Hero Row Mapping Contract:**
*   **Row 0:** Idle (usually 5–6 frames)
*   **Row 1:** Walk / Run (8 frames)
*   **Row 2:** Attack (Combat/Strike) (8 frames)
*   **Row 3:** Duck / Block
*   **Row 4:** Jump (Apex pose)
*   **Row 5:** Fall / Ledge hover
*   **Row 6+:** Combat Combos / Dash / Damage Hit / Death

### B. Enemy Assets (Monster Sheets)
Monsters use strict cell grids aligned with their physical collision volumes:
*   **Slime:** `32x32` (8 columns, 3 rows) -> Row 0: Idle/Walk, Row 1: Hit, Row 2: Die
*   **Goblin:** `84x64` (6 columns, 10 rows) -> Row 0: Idle, Row 1: Walk, Row 2: Attack, Row 3: Hit, Row 4: Die
*   **Bat / Mushroom / Orc:** `64x64` -> Standardized on 6 columns (Bat/Mushroom) or 8 columns (Orc)
*   **Spider:** `192x96` (8 columns, 6 rows) -> Large boss scale
*   **Bandit / Frost Giant:** `102x128` (10 columns, 4 rows) -> Row 0: Idle, Row 1: Move, Row 2: Attack, Row 3: Death
*   **Training Dummy:** `128x279` (8 columns, 2 rows)

### C. Texture Slicing Configuration Mapping
For dynamic slicing of large sheets (`lich_lord`, `skeleton`, `frost_giant`), the game reads row height maps from `window.sliceData`:
*   **`lich_lord` (1024x512):** Divided into 8 columns (128px width) and 6 rows of varying heights (85px to 87px).
*   **`skeleton` (1024x512):** Divided into 10 columns (102.4px width) and 4 rows (85px heights).
*   **`frost_giant` (1024x512):** Divided into 10 columns (102.4px width) and 4 rows (128px heights).
