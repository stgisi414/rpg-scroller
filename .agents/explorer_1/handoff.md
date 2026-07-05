# Settings Menu Structure and Logic Exploration Report

This report presents a read-only architectural investigation of the settings menu system in Elden Soul and details how to integrate a new cutscene setting toggle (Traditional vs Omni Cutscenes) that persists between sessions.

---

## 1. Observation

Direct observations from the codebase files:

### A. Settings Menu UI Structure (`index.html`)
The settings modal resides at lines 1749–1783 in `index.html`:
```html
<!-- Settings Modal -->
<div id="ui-menu-settings" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); align-items:center; justify-content:center; box-sizing:border-box; font-family:'Space Grotesk', sans-serif;">
  <div style="background:rgba(13, 13, 15, 0.95); border:2px solid #2ddbde; border-radius:12px; padding:28px; width:500px; max-width:95vw; box-shadow:0 0 50px rgba(45,219,222,0.25); position:relative; box-sizing:border-box; color:#fff; display:flex; flex-direction:column; gap:20px;">
    
    <!-- Close button -->
    <button id="btn-close-menu-settings" style="position:absolute; top:20px; right:20px; background:transparent; border:none; color:#aaa; font-size:16px; font-weight:bold; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='#aaa'">✕ CLOSE</button>
    
    <div style="text-align:center;">
      <h2 style="color:#2ddbde; margin:0; font-size:24px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; text-shadow:0 0 10px rgba(45,219,222,0.4);">⚙️ API Configurations</h2>
      <p style="color:#888; font-size:11px; margin:4px 0 0; text-transform:uppercase; letter-spacing:1px;">Configure AI and lore generation keys</p>
    </div>

    <!-- Inputs -->
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="color:#2ddbde; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">Gemini API Key</label>
        <input type="password" id="input-setting-gemini" placeholder="AI storyteller key (AI-xxxx...)" style="background:rgba(255,255,255,0.05); border:1px solid rgba(45,219,222,0.3); border-radius:6px; color:#fff; padding:10px 12px; font-size:14px; font-family:monospace; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#2ddbde'" onblur="this.style.borderColor='rgba(45,219,222,0.3)'">
        <span style="color:#666; font-size:10px;">Used for dynamic AI dialog, game mastering, and procedural story updates.</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="color:#2ddbde; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">Chartopia API Key</label>
        <input type="password" id="input-setting-chartopia" placeholder="Faction & lore generator key (0xsv...)" style="background:rgba(255,255,255,0.05); border:1px solid rgba(45,219,222,0.3); border-radius:6px; color:#fff; padding:10px 12px; font-size:14px; font-family:monospace; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#2ddbde'" onblur="this.style.borderColor='rgba(45,219,222,0.3)'">
        <span style="color:#666; font-size:10px;">Used for generating rich faction histories, custom town layouts, and kingdom lore.</span>
      </div>
    </div>

    <!-- Buttons -->
    <div style="display:flex; gap:12px; margin-top:8px;">
      <button id="btn-save-settings" style="flex:2; background:#2ddbde; border:none; border-radius:6px; color:#0d0d0f; padding:12px 0; font-family:inherit; font-size:14px; font-weight:bold; text-transform:uppercase; cursor:pointer; box-shadow:0 0 15px rgba(45,219,222,0.3); transition:transform 0.1s, opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1.0'" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">Save Settings</button>
      <button id="btn-reset-settings" style="flex:1; background:transparent; border:1px solid #ff4444; border-radius:6px; color:#ff4444; padding:12px 0; font-family:inherit; font-size:14px; font-weight:bold; text-transform:uppercase; cursor:pointer; transition:background 0.2s, color 0.2s;" onmouseover="this.style.background='#ff4444'; this.style.color='#fff';" onmouseout="this.style.background='transparent'; this.style.color='#ff4444';">Clear Keys</button>
    </div>

  </div>
</div>
```

The settings modal is displayed/opened via the button defined at lines 78–80 in `index.html`:
```html
<button id="btn-menu-settings" class="menu-item font-body-lg text-[18px] text-on-surface uppercase tracking-wider cursor-pointer bg-transparent border-none focus:outline-none">
    Settings
</button>
```

### B. Settings Interaction Logic (`src/main.js`)
The javascript event bindings reside at lines 612–646 in `src/main.js`:
```javascript
        // Settings Modal Logic
        const settingsModal = document.getElementById('ui-menu-settings');
        const btnSettings = document.getElementById('btn-menu-settings');
        if (settingsModal && btnSettings) {
            btnSettings.addEventListener('click', () => {
                document.getElementById('input-setting-gemini').value = localStorage.getItem("gemini_api_key") || "";
                document.getElementById('input-setting-chartopia').value = localStorage.getItem("chartopia_api_key") || "";
                settingsModal.style.display = 'flex';
            });
            document.getElementById('btn-close-menu-settings').addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
            document.getElementById('btn-save-settings').addEventListener('click', () => {
                const geminiKey = document.getElementById('input-setting-gemini').value.trim();
                const chartopiaKey = document.getElementById('input-setting-chartopia').value.trim();
                
                if (geminiKey) localStorage.setItem("gemini_api_key", geminiKey);
                else localStorage.removeItem("gemini_api_key");
                
                if (chartopiaKey) localStorage.setItem("chartopia_api_key", chartopiaKey);
                else localStorage.removeItem("chartopia_api_key");
                
                alert("Settings saved successfully!");
                settingsModal.style.display = 'none';
            });
            document.getElementById('btn-reset-settings').addEventListener('click', () => {
                if (confirm("Are you sure you want to clear your stored API keys?")) {
                    localStorage.removeItem("gemini_api_key");
                    localStorage.removeItem("chartopia_api_key");
                    document.getElementById('input-setting-gemini').value = "";
                    document.getElementById('input-setting-chartopia').value = "";
                    alert("API keys cleared.");
                }
            });
        }
```

### C. Storage Locations
The settings/API Keys are read from and written to:
1. **LocalStorage**:
   - `"gemini_api_key"`: Stored as a raw string value.
   - `"chartopia_api_key"`: Stored as a raw string value.
2. **Variables**:
   - `this.apiKey` in `src/GeminiService.js` (constructor, lines 4–13).
   - Temporary values retrieved inside the event listeners inside `src/main.js` and loaded dynamically in `src/GeminiService.js` on demand.

Other `localStorage` items:
- `"elden_soul_saves"`: For saving/loading games.
- `"elden_soul_autoplay_config"`: For persisting autoplay preferences (loaded into global `autoplayConfig` object in `src/main.js` at line 902).
- `"generated_lore_dictionary"`: For procedural lore histories.
- `"sprite_slice_data"` / `"sprite_slice_coldata"`: For dev tool animation frames.

---

## 2. Logic Chain

From the observations:
1. **Displaying**: When `btn-menu-settings` is clicked, the settings modal container (`ui-menu-settings`) style is set to `display = 'flex'`. The input fields are populated directly from `localStorage` using `localStorage.getItem()`.
2. **Closing**: When `btn-close-menu-settings` or `btn-save-settings` (after saving is complete) is clicked, the settings modal container style is set to `display = 'none'`.
3. **Saving**: When `btn-save-settings` is clicked, the values of `input-setting-gemini` and `input-setting-chartopia` are trimmed and checked. If they are non-empty, they are written to `localStorage` via `localStorage.setItem()`. Otherwise, they are deleted via `localStorage.removeItem()`.
4. **Clearing**: When `btn-reset-settings` is clicked, the API keys are removed from `localStorage`, the inputs are set to `""`, and the settings modal remains open.
5. **Adding a Toggle**:
   - To add the **Traditional vs Omni Cutscenes** toggle:
     - Add a `<select>` or checkbox/toggle element with ID `select-setting-cutscene-mode` to the settings modal HTML block.
     - When displaying the settings menu, pull `localStorage.getItem("cutscene_mode") || "traditional"` and apply it to the input element's value.
     - When saving, retrieve the selected option and store it in `localStorage` under the `"cutscene_mode"` key.
     - When clearing settings, remove the `"cutscene_mode"` key and restore the default value (`"traditional"`) in the input element.
     - Within `CutsceneController.js`, retrieve `localStorage.getItem("cutscene_mode") || "traditional"` inside `playCutscene` to determine if cutscenes should be played in "traditional" layout or "omni" layout.

---

## 3. Caveats

- Since Traditional vs Omni cutscenes is a new setting, there is no existing code that visually separates the layouts. The implementer must define the visual layouts or prompt differences themselves.
- Puppeteer integration tests (`test_architecture.js`) clear `localStorage` between/during runs, which will also reset the cutscene setting.

---

## 4. Conclusion

The settings system in Elden Soul is light and fully dependent on direct browser DOM manipulation and `localStorage` persistence. Adding a new `cutscene_mode` settings option is fully consistent with the existing `gemini_api_key` and `chartopia_api_key` patterns, requiring no new state managers or complex React/state flows.

---

## 5. Verification Method

To verify changes made following this report:
1. Run `node test_architecture.js` and `node test_logic_constraints.js` to verify that HTML modifications do not cause parsing issues or syntax errors.
2. In a browser:
   - Click the "Settings" button from the main menu.
   - Verify that the "Cutscene Mode" selection appears.
   - Select "Omni Cutscenes" and click "Save Settings".
   - Reload the browser, open Settings again, and verify that the setting persists as "Omni Cutscenes".
   - Click "Clear Keys" / "Reset", and verify that the setting defaults back to "Traditional Cutscenes".
3. Check the path `.agents/explorer_1/proposed_settings.patch` for a pre-generated unified diff patch file.
