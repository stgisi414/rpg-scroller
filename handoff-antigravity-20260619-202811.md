# Handoff — Ambient / Composite NPC Fixes

**Date:** 2026-06-19 20:28
**Project:** rpg-scroller ("Elden Soul"), Phaser 3.60.0 side-scroller RPG
**Scope:** Ambient/custom NPCs built from composite (canvas-layered) textures using the
GandalfHardcore Character Asset Pack. These are the NPCs whose sprite key starts with
`custom_npc_` and are generated at runtime by `CharacterComposer.generateRandomNPC`.

---

## TL;DR — what was broken and what is now fixed

| # | Bug | Status | Root cause | Fix location |
|---|-----|--------|-----------|--------------|
| 1 | Ambient custom NPCs fell through the floor | FIXED (user-confirmed) | Per-frame body offset made `body.bottom` vary vs `sprite.y`, fighting Arcade separation → tunneling | `NPCController` constructor + `_anchorBody` |
| 2 | Custom NPC animations played backwards (facing wrong way) | FIXED (user-confirmed) | Composite art faces LEFT by default; facing logic treated them as right-facing | `NPCController.update` `isLeftFacing` |
| 3 | Custom NPCs levitated above floor when idle | FIXED (user-confirmed) | Center origin + fixed offset didn't put feet at frame bottom | bottom origin `(0.5, 1)` |
| 4 | Custom NPCs floated above floor **during walk animation only** | FIXED (this session, headless-verified; awaiting user confirm) | Unit mismatch: anchor used SCALED `body.height` (72) instead of SOURCE `body.sourceHeight` (48) | `NPCController._anchorBody` |

---

## The key Phaser 3 gotcha (read this before touching NPC physics)

For an Arcade-physics sprite scaled to 1.5x with `body.setSize(36, 48)`:

- `body.width` / `body.height` return **SCALED world px** → `54` / `72`.
- `body.sourceWidth` / `body.sourceHeight` return the **unscaled setSize() values** → `36` / `48`.
- `body.setOffset(x, y)` is applied in **SOURCE px** (then scaled by the sprite scale internally).

**Therefore any offset computation MUST use the source dimensions, not `body.width/height`.**
Mixing them is what caused bug #4: the feet rendered correctly-anchored body but were buried
36px below the floor.

Also: **never manually write `sprite.y` every frame** to "correct" the body — it creates a
feedback loop with Phaser's body↔gameObject sync and the NPC flies off to y=-254 or y=1958.
We anchor via **offset only**.

---

## Architecture of the fix (bottom-aligned origin)

Composite NPC frames vary in **height and foot position per animation row** because the user
tunes slice data in the Sprite Debugger (idle row might be 64px tall, walk row 56px, etc.).
A single sprite + single physics body cannot keep feet on the floor across frames of differing
height **unless** the origin is bottom-aligned.

We use **origin `(0.5, 1.0)`** for custom NPCs. With bottom origin:

```
displayOriginY = originY * frame.height = fh   (source px)
body.position.y = sprite.y + scale * (offset.y - fh)
body.bottom     = sprite.y + scale * (offset.y - fh + sourceHeight)
```

Choosing `offset.y = footY - sourceHeight` gives:

```
body.bottom = sprite.y + scale * (footY - fh)
```

which is exactly the **visible foot line** in world space. When the physics engine settles
`body.bottom` onto the floor (y=672), the visible feet land on the floor too — in **every**
frame, idle or walk, regardless of frame height. The `fh` terms cancel, so the body's world
position doesn't jump when an idle↔walk swap changes the frame height (stable, no fall-through).

---

## Per-frame foot detection (CharacterComposer)

`CharacterComposer.generateRandomNPC` (`src/scene_modules/CharacterComposer.js`) now measures
the **lowest opaque pixel per frame** while building the composite canvas and stores it:

```js
window.npcFootData[uniqueKey] = footData; // array indexed by frame number
```

`findFootY(x, y, w, h)` scans the composite canvas region for each frame and records the
in-frame source-y of the foot line. `_anchorBody` reads `footData[frameIndex]` so the body
bottom tracks each frame's actual feet (idle row vs walk row can differ). Falls back to frame
bottom when no data exists.

---

## Exact code changed

### `src/NPCController.js` — constructor (custom branch), ~line 36

```js
if (isCustom) {
    const bodyW = 36;
    const bodyH = 48;
    this.sprite.setOrigin(0.5, 1);      // bottom-aligned origin
    this.sprite.body.setSize(bodyW, bodyH);
    this._anchorBody();
} else if (spriteKey === 'knight') {
    this.sprite.body.setSize(36, 48);
    this.sprite.body.setOffset(22, 16);
} else {
    this.sprite.body.setSize(36, 48);
    this.sprite.body.setOffset(30, 16);
}
```

### `src/NPCController.js` — `_anchorBody()`, ~line 184 (THE bug #4 fix)

```js
_anchorBody() {
    const body = this.sprite.body;
    const frame = this.sprite.frame;
    if (!body || !frame) return;
    const fw = frame.width;
    const fh = frame.height;
    // SOURCE px, NOT body.width/height (those are scaled = 54/72 at 1.5x).
    const bodyW = body.sourceWidth;   // 36
    const bodyH = body.sourceHeight;  // 48

    let footY = fh;
    const fd = window.npcFootData && window.npcFootData[this.spriteKey];
    if (fd) {
        const idx = (typeof frame.name === 'number') ? frame.name : parseInt(frame.name, 10);
        if (!isNaN(idx) && fd[idx] != null) footY = fd[idx] + 1;
    }

    body.setOffset(fw / 2 - bodyW / 2, footY - bodyH);
}
```

`_anchorBody()` is re-called every frame in `update()` (`if (this.isCustom) this._anchorBody();`)
so the offset re-derives on each idle↔walk frame swap.

### `src/NPCController.js` — facing fix in `update()`, ~line 237 (bug #2)

```js
const isLeftFacing = this.isCustom ||
    ['knight', 'samurai', 'blacksmith', 'alchemist', 'npc', 'king'].includes(this.spriteKey);
```

Composite art faces LEFT by default — same as the listed fixed-class keys.

### Name/prompt text positioning, ~line 218 (origin-independent, kept safe)

```js
let topOfHeadY = this.sprite.y - (frameH * scale) / 2;
if (this.sprite.body) topOfHeadY = this.sprite.body.bottom - (frameH * scale);
```

---

## Verification (headless Puppeteer)

Dev server: `npm start` (serves on http://127.0.0.1:3000). Then:

- **`node verify_slice_variance.js`** — injects a "good slice" with differing row heights
  (idle `{y:0,h:64}`, walk `{y:72,h:56}`, feet at frame bottom, no bleed). Measures the
  **VISIBLE feet** (derived from `sprite.y` + frame + `npcFootData`), not just `body.bottom`.
  **Latest result: PASS** — visible feet = floor (672) in both idle (64px, offsetY=16) and
  walk (56px, offsetY=8), 0 sink-through.
  - NOTE: it was updated this session to assert on visible feet. Previously it only checked
    `body.bottom`, which is what let bug #4 (buried feet) slip through.

- **`node verify_town_npcs.js`** — regression. **Latest result: PASS** — goddess (`npc`)
  preserved, 2 ambient custom villagers spawned, custom NPCs at y=672 (was 708 with the bug),
  0 fell through.

- **`node check_feet_allrows.js`** — offline PNG analysis proving the real art has feet at the
  row bottom in every row (so the float came from user slice data, not the art).

### IMPORTANT limitation of the headless tests

They run with `localStorage.clear()`, i.e. **default uniform 64px slices** — they cannot
reproduce the user's exact tuned slice data. The math anchors `body.bottom` to each frame's
per-frame measured foot line (exactly the float condition), so it should hold, but the user
must confirm in their real browser with their saved slice data.

---

## CRITICAL constraint — DO NOT break this

**Never wipe, migrate, or "fix" the user's saved Sprite Debugger slice data on load.**
Saved data (`localStorage` keys `sprite_slice_data` / `sprite_slice_coldata`, surfaced as
`window.sliceData` / `window.sliceColData`) is the **source of truth**. The user lost their
tuned slice data 3 times and was extremely angry. Any code path that reads slice data must
treat it as read-only. Composite NPCs key off `npc_male_skin1` / `npc_female_skin1` via the
`lookupSkin` mapping in `CharacterComposer`.

Also note (sprite sheet layout): the **death row is 10 frames @80px** while other rows are
@100px (canonical asset-pack layout) — a single uniform slice grid can't hold both, which is
why per-row column override keys (`<skin>_r<row>`) exist in `sliceColData`.

---

## Remaining / next steps

1. **User to confirm in real browser** with their actual saved slice data that the walk-float
   is fully gone (idle AND wandering).
2. Optional cleanup: `verify_foot_anchor.js` is an obsolete scratch test for an abandoned
   `sprite.y`-compensation approach (which caused runaway). Safe to delete.
3. Other untracked scratch files present: `capture_gameplay.js`, `check_dims.js`,
   `generate_assets.js`, `inject.js`, `generated_loaders.txt`. Not part of the fix.

---

## State of the working tree at handoff

Modified (not committed): `index.html`, `src/AssetManager.js`, `src/GeminiService.js`,
`src/NPCController.js`, `src/RescueeNPC.js`, `src/RescueeNPCFactory.js`, `src/WorldManager.js`,
`src/main.js`, `src/scene_modules/IndoorManager.js`, `src/scene_modules/SpriteDebugger.js`.
Untracked new: `src/scene_modules/CharacterComposer.js`, `src/scene_modules/ModularAssetLists.js`,
plus the verify_*.js / scratch scripts above.

The NPC physics fixes live entirely in `src/NPCController.js` (anchoring/facing) and
`src/scene_modules/CharacterComposer.js` (foot detection + composite build).
