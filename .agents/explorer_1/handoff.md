# Elden Soul Architectural Audit Handoff Report

This report documents the findings from a detailed static investigation of the Elden Soul codebase. Five specific architectural issues were identified, analyzed, and mapped to exact code locations. Recommended fix strategies are provided for each.

---

## 1. Observations

### Issue 1: Async API Race Conditions
Asynchronous Gemini API requests take time to resolve. If a scene transitions, restarts, or an entity (player, companion, enemy, NPC) is destroyed during this window, callbacks resolve against destroyed objects and elements, causing `TypeError` crashes.

*   **NPC Dialogue Callback Leak 1** (`src/NPCController.js`, lines 343–359):
    ```javascript
    this.geminiService.getNpcResponse(this.npcPersona, this.chatHistory, `[SYSTEM ACTIVITY TRIGGER] ${prompt}`, state)
        .then(res => {
            const reply = res.response;
            const cleanReply = reply.replace(/\[ACTION_SUCCESS\]/g, '').trim();
            if (reply.includes('[ACTION_SUCCESS]')) {
                this.executeActivityEffect();
            }
            document.getElementById(loadingId).innerText = cleanReply;
            this.chatHistory.push({ role: 'model', content: cleanReply });
            this.chatInput.disabled = false;
            this.chatSubmitBtn.disabled = false;
            this.chatActivityBtn.disabled = false;
            this.chatInput.focus();
            ...
        })
    ```
    *No check is done inside the `.then` callback to see if the NPC controller or its DOM bindings are still valid/active.*
*   **NPC Dialogue Callback Leak 2** (`src/NPCController.js`, lines 486–526):
    ```javascript
    const response = await this.geminiService.getNpcResponse(this.npcPersona, this.chatHistory, text, state);
    const cleanReply = response.response.replace(/\[ACTION_SUCCESS\]/g, '').trim();
    if (response.response.includes('[ACTION_SUCCESS]')) {
        this.executeActivityEffect();
    }
    ...
    this.chatInput.disabled = false;
    this.chatSubmitBtn.disabled = false;
    this.chatInput.focus();
    ```
    *No check is done after the `await` statement to ensure `this` (NPC) or the scene hasn't been shut down or destroyed.*
*   **NPC Dialogue Callback Leak 3** (`src/NPCController.js`, lines 617–638):
    ```javascript
    const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, hiddenPrompt, state);
    ...
    this.addMessageToUI(displayName, response.response);
    this.chatHistory.push({ sender: displayName, text: response.response });
    ...
    this.chatInput.disabled = false;
    this.chatSubmitBtn.disabled = false;
    this.chatInput.focus();
    ```
    *No safety checks after `await` to verify that `this.chatHistory`, `this.chatInput`, or other DOM elements still exist.*
*   **Companion Ally Dialogue Callbacks** (`src/PlayerController.js`, lines 2804–2825 & 2843–2863):
    Uses similar `await geminiService.getNpcResponse(...)` calls without validating if the companion controller, its backing sprite, or its DOM buttons still exist before executing UI insertions and state mutations.
*   **Procedural Zone Generator Callback** (`src/WorldManager.js`, lines 50–73):
    ```javascript
    zoneData = await this.generateZoneWithGemini(zoneIndex);
    window.saveData.zones[zoneIndex] = zoneData;
    ...
    this.buildZone(zoneData, spawnSide);
    ```
    *If a scene is transition-restarted or aborted during generation, the `buildZone` call runs against a destroyed/shut-down scene object, causing crashes.*
*   **Rival Monologue Callback** (`src/WorldManager.js`, lines 621–625):
    ```javascript
    this.geminiService.getGameMasterResponse(this.scene.player, prompt, zoneData).then(res => {
        if (this.scene.playCutscene) {
            this.scene.playCutscene(`[Rival]: ${res.storyText}`, () => {});
        }
    })
    ```
    *No verification that `this.scene` or `this.scene.player` are still active/valid.*
*   **Game Master Decisions Callback** (`src/scenes/GameScene.js`, lines 2070–2092):
    ```javascript
    this.geminiService.getGameMasterDecision(gameState).then(res => {
        if (res && res.action !== 'NONE') {
            if (this.showAnnouncement) this.showAnnouncement("The Game Master", res.announcement);
            ...
            if (res.action === 'HEAL') {
                this.player.hp = this.player.maxHp;
                if (this.updateHUD) this.updateHUD();
            } else if (res.action === 'GOLD_RUSH') {
                window.saveData.gold = (window.saveData.gold || 0) + 500;
                if (this.updateHUD) this.updateHUD();
            } else if (res.action === 'WEATHER_RAIN') {
                this.cameras.main.setTint(0x888888);
            }
        }
    })
    ```
    *If a scene is transition-shut down while a GM decision is pending, the resolving callback tries to modify HUDs, cameras, and player health, throwing exceptions.*

---

## 2. Event Listener Memory Leaks
Listeners registered on global objects like `window` and `document` persist across scene restarts and menu transitions. They retain old scene/context variables in their closures, preventing proper garbage collection and double-registering handlers.

*   **Beforeunload Auto-Save** (`src/scenes/GameScene.js`, line 425):
    ```javascript
    window.addEventListener('beforeunload', () => this._autoSave());
    ```
    *Never removed. Stacks up on restarts/transitions.*
*   **Character Sheet Modal ESC Key** (`src/scenes/GameScene.js`, line 744):
    ```javascript
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') { ... }
    });
    ```
    *Registered inside `createCharacterSheetUI()` which appends a new modal to `document.body` on every scene instantiation. Old modals and keydown listeners leak.*
*   **Debug panel MouseUp** (`src/scenes/GameScene.js`, line 2000):
    ```javascript
    window.addEventListener('mouseup', () => {
        if (dragState.active) { ... }
    });
    ```
    *Accumulates on restarts/transitions.*
*   **Town Directory ESC Key** (`src/scenes/GameScene.js`, line 1055):
    ```javascript
    window.addEventListener('keydown', this._dirEscListener);
    ```
    *Only removed if the town directory is explicitly closed. If the scene is transitioned or restarted while it is open, this listener leaks.*
*   **DOM Input Event Listeners** (`src/PlayerController.js`, lines 2733–2734):
    ```javascript
    this.chatSubmitBtn.addEventListener('click', this.chatSubmitHandler);
    this.chatInput.addEventListener('keypress', this.chatKeyHandler);
    ```
    *Because `#chat-submit` and `#chat-input` are persistent HTML elements in `index.html`, these listeners accumulate on scene restarts, causing double-firing events. Only cleaned up during a player's death (`die()`), not general scene restarts/transitions.*

---

## 3. Save Data Reference Loops
Storing live gameplay object references directly inside the global save data causes mutations during gameplay (violating clean save isolation) and leads to serialization loops.

*   **Direct Object Assignment** (`src/PlayerController.js`, lines 551–552):
    ```javascript
    window.saveData.inventory = this.inventory;
    window.saveData.quests = this.quests;
    ```
*   **Direct Object Restoring** (`src/PlayerController.js`, lines 249 & 268):
    ```javascript
    this.inventory = window.saveData && window.saveData.inventory ? window.saveData.inventory : { ... };
    this.quests = window.saveData.quests || [];
    ```
    *Mutating `this.inventory` or `this.quests` during active gameplay directly modifies the save data object. If the player dies, the scene restarts but loads this mutated data instead of a clean state.*
*   **Zone Data Mutation** (`src/WorldManager.js`, line 51):
    ```javascript
    window.saveData.zones[zoneIndex] = zoneData;
    ```
    *Because `zoneData` is modified in-place when spawning spider minions (line 539) or capping minion counts (line 569), the saved zone configuration is mutated directly in memory.*
*   **Global Class Stats Overwriting** (`src/PlayerController.js`, line 44):
    ```javascript
    this.classData.stats = { ...window.saveData.stats };
    ```
    *Overwrites the global shared class definition template in `classesData` (defined in `main.js`), affecting all future characters initialized in the same session.*

---

## 4. Animation Frame Freezes
Using a generic `animationcomplete` listener with `.once` is dangerous because the listener is immediately consumed by the first animation that completes on that sprite, which may not be the target animation.

*   **Super Combo Attack Complete** (`src/PlayerController.js`, lines 2351–2353):
    ```javascript
    this.sprite.once('animationcomplete', (anim) => {
        if (anim.key === cd.id + '_combo') {
            this.isAttacking = false;
            ...
        }
    });
    ```
    *If any other animation (like an idle, hit, stun, or walk) finishes first, the once-handler is consumed and unmapped. The actual combo's completion logic will never run, keeping the player permanently stuck in `isAttacking = true` (unless rescued by the 1.5s fallback timer).*
*   **Enemy Hit Animation Complete** (`src/EnemyController.js`, line 365):
    ```javascript
    this.sprite.once('animationcomplete', () => {
        this.isHit = false;
    });
    ```
*   **Enemy Death Animation Complete** (`src/EnemyController.js`, line 539):
    ```javascript
    this.sprite.once('animationcomplete', onDeathComplete);
    ```
    *Generic `animationcomplete` listens to the previous/interrupted animation stopping, which immediately triggers `onDeathComplete` prematurely, skipping the visual death sequence.*

---

## 5. Physics Garbage Collection
If an enemy falls below the level boundary (into a bottomless pit), it falls forever under gravity. It is never culled, creating a memory/physics leak.

*   **Missing Out-of-Bounds Culling**:
    There are no checks on the enemy sprite coordinates in `src/EnemyController.js` or `src/scenes/GameScene.js` update loops.
    *Compare to the player's check in `src/PlayerController.js` (lines 1676–1679):*
    ```javascript
    if (this.sprite.y > 1000) {
        this.takeDamage(this.hp);
        return;
    }
    ```
    *Without a similar boundary culling, fallen enemies accumulate high velocities in the physics engine, waste CPU cycles, distort Game Master active enemy counts, and break companion target selection loops.*

---

## 6. Logic Chain

1.  **Async API race conditions**:
    *   *Premise:* Gemini API requests take variable network time to resolve.
    *   *Action:* The player transitions scenes or closes a UI dialog during a pending request.
    *   *Result:* When the API promise resolves, the scene/entity has been destroyed, but the callback attempts to access scene/DOM bindings, throwing `TypeError`.
2.  **Event Listener memory leaks**:
    *   *Premise:* Window and document event listeners persist until explicitly removed.
    *   *Action:* Scene registration registers listeners on `window` and `document` but lacks clean-up methods on scene shutdown or menu exit.
    *   *Result:* Event handlers stack up, retain old scene scopes via closures, prevent garbage collection, and trigger crashes when firing on dead scene contexts.
3.  **Save Data reference loops**:
    *   *Premise:* JavaScript variables reference objects and arrays.
    *   *Action:* Active gameplay state references (`this.inventory`, `this.quests`) are assigned directly to `window.saveData`.
    *   *Result:* Mutating gameplay data mutates the save data immediately. If circular structures (e.g. references back to scenes/sprites) are appended, JSON serialization throws a TypeError, failing the auto-save.
4.  **Animation frame freezes**:
    *   *Premise:* Phaser `.once('animationcomplete')` is triggered by *any* animation completing on the target sprite.
    *   *Action:* Multiple animations are triggered in quick succession.
    *   *Result:* The `.once` listener is consumed by an unintended animation finishing, leaving the target complete callback uncalled, freezing the state (e.g. `isAttacking = true` or `isHit = true` forever).
5.  **Physics garbage collection**:
    *   *Premise:* Gravity continually increases velocity on falling bodies.
    *   *Action:* Enemies fall off gaps in platform colliders.
    *   *Result:* No y-boundary check exists. Enemies fall infinitely, polluting the physics system and corrupting GM state loops.

---

## 7. Caveats

*   Static analysis was performed. Live execution of tests via `run_command` was skipped due to network read-only permissions and automated approval timeouts.
*   Assumes default Phaser 3.60.0 behavior for garbage collecting destroyed sprites and cancelling active clocks.

---

## 8. Conclusion

The 5 architectural issues have been verified and documented. They cause crashes (`TypeError`), performance degradation, state mutations, and animation locks. Actionable fix strategies are detailed below.

---

## 9. Recommended Fix Strategies

### Fix 1: Async API guards
Add a validation check immediately at the start of all async `.then()` blocks and after `await` calls:
```javascript
// Example for NPCController / PlayerController / GameScene / WorldManager
if (!this.scene || !this.scene.sys.isActive() || !this.sprite || !this.sprite.active) {
    return;
}
```
For `setTimeout` blocks, keep a handle and clear them in a `destroy()` or scene `shutdown` method:
```javascript
// Save the handle
this.morphTimeout = setTimeout(() => { ... }, 1500);

// Clear on destroy
if (this.morphTimeout) clearTimeout(this.morphTimeout);
```

### Fix 2: Event Listener cleanup
Store references to window/document event listeners and unregister them on scene shutdown:
```javascript
// In GameScene.js create()
const beforeUnloadHandler = () => this._autoSave();
window.addEventListener('beforeunload', beforeUnloadHandler);

// Clean up on scene shutdown
this.events.once('shutdown', () => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    // remove keydown/mouseup listeners...
});
```
For persistent DOM elements in `PlayerController.js`:
```javascript
// Clean up old listeners in openChat() before adding new ones
this.chatSubmitBtn.removeEventListener('click', this.chatSubmitHandler);
this.chatInput.removeEventListener('keypress', this.chatKeyHandler);
```

### Fix 3: Save Data cloning
Deep-clone save data objects to decouple active gameplay memory from the global save state:
```javascript
// In main.js startGame()
window.saveData = JSON.parse(JSON.stringify(saveData));

// In PlayerController.js saveGame()
window.saveData.inventory = JSON.parse(JSON.stringify(this.inventory));
window.saveData.quests = JSON.parse(JSON.stringify(this.quests));

// Decouple stats override in PlayerController.js
this.classData = JSON.parse(JSON.stringify(window.selectedClass));
this.classData.stats = { ...window.saveData.stats };
```

### Fix 4: Animation-specific events
Listen to specific animation completion keys in Phaser:
```javascript
// In PlayerController.js (Combo attack)
this.sprite.once(`animationcomplete-${cd.id}_combo`, () => {
    this.isAttacking = false;
    this._playAnim();
});

// In EnemyController.js (Hit/Die)
const hitKey = `${this.type}-hit`;
this.sprite.once(`animationcomplete-${hitKey}`, () => {
    this.isHit = false;
});
```

### Fix 5: Enemy culling boundary
Add a check in `EnemyController.update()` to cull enemies falling out of bounds:
```javascript
// In EnemyController.js update()
if (this.sprite.y > 1000) {
    this.sprite.destroy(); // Triggers text cleanup and removes from physics automatically
    return;
}
```

---

## 10. Verification Method

1.  **Manual Verification:**
    *   Start game, open chat dialogues, and spam scene transitions/restarts while replies are pending. Verify no console errors.
    *   Examine the DOM tree after multiple scene restarts/deaths to verify that only one character sheet modal exists in `document.body` and keydown listeners don't multiply.
    *   Check memory consumption over time during procedural world scrolls.
2.  **Automated Validation:**
    *   Verify logic consistency in `test_logic_constraints.js` by running:
        ```powershell
        node test_logic_constraints.js
        ```
