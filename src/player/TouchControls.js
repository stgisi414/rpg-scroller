// src/player/TouchControls.js - Modern Virtual Touch Controls for Mobile/Touch play

class TouchControls {
    constructor() {
        this.visible = false;
        this.container = null;
        this.toggleBtn = null;
        this.activeKeys = {};
        this._interactMode = false; // true when big button is INTERACT, false when ATTACK

        this.keyConfigs = {
            'W': { char: 'w', code: 'KeyW', keyCode: 87, label: '▲', color: '#4fc3f7' },
            'A': { char: 'a', code: 'KeyA', keyCode: 65, label: '◀', color: '#4fc3f7' },
            'S': { char: 's', code: 'KeyS', keyCode: 83, label: '▼', color: '#4fc3f7' },
            'D': { char: 'd', code: 'KeyD', keyCode: 68, label: '▶', color: '#4fc3f7' },
            'WA': { keys: ['W', 'A'], label: '◤', color: '#4fc3f7' },
            'WD': { keys: ['W', 'D'], label: '◥', color: '#4fc3f7' },
            'M': { char: 'm', code: 'KeyM', keyCode: 77, label: 'SUMMON', color: '#2ddbde' },
            'COMMA': { char: ',', code: 'Comma', keyCode: 188, label: 'SUPER', color: '#ffaa00' },
            'SLASH': { char: '/', code: 'Slash', keyCode: 191, label: 'MEGA', color: '#bb88ff' },
            'BACKTICK': { char: '`', code: 'Backquote', keyCode: 192, label: '🎒 INV', color: '#ffffff' },
            'C': { char: 'c', code: 'KeyC', keyCode: 67, label: '📊 STATS', color: '#ffffff' },
            'P': { char: 'p', code: 'KeyP', keyCode: 80, label: '👥 PARTY', color: '#ffffff' }
        };

        // The big button config - starts as ATTACK (period key)
        this.bigButtonConfig = { char: '.', code: 'Period', keyCode: 190 };

        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;
        this.createToggleButton();
        this.createControlsOverlay();
        this.injectStyles();

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouchDevice && this.toggleBtn) {
            this.toggleBtn.style.display = 'flex';
        }

        // Poll for interact state every frame
        const poll = () => {
            this.pollInteractState();
            requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
    }

    // ─── INTERACT vs ATTACK state polling ───
    pollInteractState() {
        const btn = this._bigButton;
        if (!btn) return;

        const shouldInteract = this.isNearInteractable();

        if (shouldInteract && !this._interactMode) {
            // Switch to INTERACT
            this._interactMode = true;
            // Release attack key if held
            if (this.activeKeys['.']) {
                delete this.activeKeys['.'];
                btn.classList.remove('active');
            }
            this.bigButtonConfig.char = 'f';
            this.bigButtonConfig.code = 'KeyF';
            this.bigButtonConfig.keyCode = 70;
            btn.innerText = 'INTERACT';
            btn.style.color = '#ffea00';
            btn.style.borderColor = 'rgba(255, 234, 0, 0.6)';
            btn.style.boxShadow = '0 0 20px rgba(255, 234, 0, 0.3)';
        } else if (!shouldInteract && this._interactMode) {
            // Switch back to ATTACK
            this._interactMode = false;
            if (this.activeKeys['f']) {
                delete this.activeKeys['f'];
                btn.classList.remove('active');
            }
            this.bigButtonConfig.char = '.';
            this.bigButtonConfig.code = 'Period';
            this.bigButtonConfig.keyCode = 190;
            btn.innerText = 'ATTACK';
            btn.style.color = '#ff4444';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        }
    }

    isNearInteractable() {
        // Access the game instance directly via window.game (set in main.js line 606)
        const g = window.game;
        if (!g || !g.scene) return false;

        const scene = g.scene.scenes[0];
        if (!scene || !scene.player) return false;

        // Check NPC prompt texts
        if (scene.npcs) {
            for (const npc of scene.npcs) {
                if (npc.promptText && npc.promptText.visible) return true;
            }
        }

        // Check loot chest prompt texts
        if (scene.lootChests) {
            for (const chest of scene.lootChests) {
                if (chest.promptText && chest.promptText.visible) return true;
            }
        }

        // Check angel statue prompt text
        if (scene.angelPromptText && scene.angelPromptText.visible) return true;

        return false;
    }

    // ─── STYLES ───
    injectStyles() {
        if (document.getElementById('touch-controls-styles')) return;
        const style = document.createElement('style');
        style.id = 'touch-controls-styles';
        style.innerHTML = `
            .touch-toggle-btn {
                position: fixed; top: 16px; left: 16px; z-index: 10000;
                background: rgba(13,13,15,0.7); backdrop-filter: blur(8px);
                border: 1px solid rgba(45,219,222,0.3); border-radius: 8px;
                width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
                cursor: pointer; color: #2ddbde;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                transition: transform 0.1s, border-color 0.2s, color 0.2s;
                font-family: 'Space Grotesk', sans-serif;
                user-select: none; -webkit-user-select: none;
            }
            .touch-toggle-btn:active { transform: scale(0.95); border-color: #2ddbde; color: #fff; }

            .touch-controls-overlay {
                position: fixed; inset: 0; z-index: 50; pointer-events: none;
                font-family: 'Space Grotesk', sans-serif;
                user-select: none; -webkit-user-select: none;
            }
            .touch-left-side {
                position: absolute; bottom: 40px; left: 40px; pointer-events: auto;
                display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 56px); gap: 6px;
            }
            .touch-right-side {
                position: absolute; bottom: 40px; right: 40px; pointer-events: auto;
                display: grid; grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(2, 64px);
                gap: 12px; align-items: center; justify-items: center;
            }
            .touch-utility-side {
                position: absolute; top: 16px; right: 16px; pointer-events: auto;
                display: flex; gap: 8px;
            }
            .v-btn {
                background: rgba(13,13,15,0.45); backdrop-filter: blur(6px);
                border: 1px solid rgba(255,255,255,0.12); color: #fff;
                display: flex; align-items: center; justify-content: center;
                font-weight: bold; border-radius: 50%;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                transition: transform 0.05s, border-color 0.1s, box-shadow 0.1s;
                cursor: pointer; touch-action: manipulation;
                text-shadow: 0 0 5px rgba(0,0,0,0.5);
            }
            .v-btn-dpad { width: 56px; height: 56px; font-size: 20px; }
            .v-btn-small-action { width: 56px; height: 56px; font-size: 11px; text-transform: uppercase; border-radius: 50%; letter-spacing: 0.5px; }
            .v-btn-large-action { width: 76px; height: 76px; font-size: 12px; text-transform: uppercase; border-radius: 50%; letter-spacing: 0.5px; }
            .v-btn-utility { height: 38px; padding: 0 16px; font-size: 11px; text-transform: uppercase; border-radius: 8px; letter-spacing: 0.5px; }
            .v-btn:active, .v-btn.active { transform: scale(0.92); background: rgba(13,13,15,0.65); box-shadow: 0 0 15px currentColor; }
        `;
        document.head.appendChild(style);
    }

    // ─── TOGGLE BUTTON ───
    createToggleButton() {
        if (document.getElementById('btn-toggle-touch')) return;
        const btn = document.createElement('div');
        btn.id = 'btn-toggle-touch';
        btn.className = 'touch-toggle-btn';
        btn.style.display = 'flex';
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:24px;">sports_esports</span>`;
        btn.title = "Toggle Touch Controls";
        btn.onclick = () => this.toggleControls();
        document.body.appendChild(btn);
        this.toggleBtn = btn;
    }

    // ─── OVERLAY ───
    createControlsOverlay() {
        if (document.getElementById('touch-controls-container')) return;

        const overlay = document.createElement('div');
        overlay.id = 'touch-controls-container';
        overlay.className = 'touch-controls-overlay';
        overlay.style.display = 'none';

        // LEFT - DPAD
        const leftSide = document.createElement('div');
        leftSide.className = 'touch-left-side';
        leftSide.appendChild(this.makeButton('WA', 'v-btn-dpad', { gridColumn: '1', gridRow: '1' }));
        leftSide.appendChild(this.makeButton('W', 'v-btn-dpad', { gridColumn: '2', gridRow: '1' }));
        leftSide.appendChild(this.makeButton('WD', 'v-btn-dpad', { gridColumn: '3', gridRow: '1' }));
        leftSide.appendChild(this.makeButton('A', 'v-btn-dpad', { gridColumn: '1', gridRow: '2' }));
        leftSide.appendChild(this.makeButton('S', 'v-btn-dpad', { gridColumn: '2', gridRow: '2' }));
        leftSide.appendChild(this.makeButton('D', 'v-btn-dpad', { gridColumn: '3', gridRow: '2' }));

        // RIGHT - ACTIONS
        const rightSide = document.createElement('div');
        rightSide.className = 'touch-right-side';
        rightSide.appendChild(this.makeButton('M', 'v-btn-small-action', { gridColumn: '1', gridRow: '1' }));
        rightSide.appendChild(this.makeButton('COMMA', 'v-btn-small-action', { gridColumn: '2', gridRow: '1' }));
        rightSide.appendChild(this.makeButton('SLASH', 'v-btn-small-action', { gridColumn: '3', gridRow: '1' }));

        // Big button - Attack/Interact
        this._bigButton = this.makeBigButton();
        this._bigButton.style.gridColumn = '2 / span 2';
        this._bigButton.style.gridRow = '2';
        this._bigButton.style.zIndex = '10';
        rightSide.appendChild(this._bigButton);

        // UTILITY - TOP RIGHT
        const utilitySide = document.createElement('div');
        utilitySide.className = 'touch-utility-side';
        utilitySide.appendChild(this.makeButton('BACKTICK', 'v-btn-utility'));
        utilitySide.appendChild(this.makeButton('C', 'v-btn-utility'));
        utilitySide.appendChild(this.makeButton('P', 'v-btn-utility'));

        overlay.appendChild(leftSide);
        overlay.appendChild(rightSide);
        overlay.appendChild(utilitySide);
        document.body.appendChild(overlay);
        this.container = overlay;
    }

    // ─── BIG BUTTON (Attack/Interact) ───
    makeBigButton() {
        const btn = document.createElement('div');
        btn.className = 'v-btn v-btn-large-action';
        btn.innerText = 'ATTACK';
        btn.style.color = '#ff4444';

        const press = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('active');
            const conf = this.bigButtonConfig;
            this.activeKeys[conf.char] = true;

            // Directly poke the Phaser key object
            const g = window.game;
            if (g && g.scene) {
                const scene = g.scene.scenes[0];
                if (scene && scene.player && scene.player.inputManager) {
                    const keys = scene.player.inputManager.keys;
                    if (this._interactMode && keys.interact) {
                        // Poke interact key
                        keys.interact.isDown = true;
                        keys.interact.isUp = false;
                        keys.interact._justDown = true;
                    } else if (!this._interactMode && keys.attack) {
                        // Poke attack key
                        keys.attack.isDown = true;
                        keys.attack.isUp = false;
                        keys.attack._justDown = true;
                    }
                }
            }

            // Also fire DOM event as backup
            this.simulateKeyEvent('keydown', conf);
        };

        const release = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.remove('active');
            const conf = this.bigButtonConfig;
            delete this.activeKeys[conf.char];

            // Release the Phaser key object
            const g = window.game;
            if (g && g.scene) {
                const scene = g.scene.scenes[0];
                if (scene && scene.player && scene.player.inputManager) {
                    const keys = scene.player.inputManager.keys;
                    if (this._interactMode && keys.interact) {
                        keys.interact.isDown = false;
                        keys.interact.isUp = true;
                    } else if (!this._interactMode && keys.attack) {
                        keys.attack.isDown = false;
                        keys.attack.isUp = true;
                    }
                }
            }

            this.simulateKeyEvent('keyup', conf);
        };

        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);

        return btn;
    }

    // ─── REGULAR BUTTON ───
    makeButton(keyConfigId, baseClass, customStyles = {}) {
        const conf = this.keyConfigs[keyConfigId];
        const btn = document.createElement('div');
        btn.className = `v-btn ${baseClass}`;
        btn.innerText = conf.label;
        btn.style.color = conf.color;
        Object.keys(customStyles).forEach(k => { btn.style[k] = customStyles[k]; });

        const press = (e) => {
            e.preventDefault();
            this.setKeyState(conf, true, btn);
        };
        const release = (e) => {
            e.preventDefault();
            this.setKeyState(conf, false, btn);
        };

        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
        return btn;
    }

    setKeyState(config, isDown, btnElement) {
        // Composite keys (diagonals)
        if (config.keys) {
            config.keys.forEach(k => this.setKeyState(this.keyConfigs[k], isDown, btnElement));
            if (isDown) btnElement.classList.add('active');
            else btnElement.classList.remove('active');
            return;
        }

        const char = config.char;
        if (isDown) {
            if (!this.activeKeys[char]) {
                this.activeKeys[char] = true;
                btnElement.classList.add('active');
                this.pokePhaser(config, true);
                this.simulateKeyEvent('keydown', config);
            }
        } else {
            if (this.activeKeys[char]) {
                delete this.activeKeys[char];
                btnElement.classList.remove('active');
                this.pokePhaser(config, false);
                this.simulateKeyEvent('keyup', config);
            }
        }
    }

    // ─── Direct Phaser Key Object Manipulation ───
    pokePhaser(config, isDown) {
        const g = window.game;
        if (!g || !g.scene) return;
        const scene = g.scene.scenes[0];
        if (!scene || !scene.player || !scene.player.inputManager) return;

        const keys = scene.player.inputManager.keys;
        const map = {
            'KeyW': 'up', 'KeyA': 'left', 'KeyS': 'down', 'KeyD': 'right',
            'KeyM': 'summonSpell', 'Comma': 'superSpell', 'Slash': 'megaSpell',
            'Period': 'attack', 'KeyF': 'interact', 'KeyP': 'spawnParty'
        };

        const prop = map[config.code];
        if (prop && keys[prop]) {
            const k = keys[prop];
            if (isDown) {
                k.isDown = true;
                k.isUp = false;
                k._justDown = true;
                k.timeDown = Date.now();
            } else {
                k.isDown = false;
                k.isUp = true;
                k._justUp = true;
                k.timeUp = Date.now();
            }
        }
    }

    simulateKeyEvent(type, config) {
        window.dispatchEvent(new KeyboardEvent(type, {
            key: config.char, code: config.code,
            keyCode: config.keyCode, which: config.keyCode,
            bubbles: true, cancelable: true
        }));
    }

    toggleControls() {
        this.visible = !this.visible;
        if (this.container) this.container.style.display = this.visible ? 'block' : 'none';
        if (this.toggleBtn) {
            this.toggleBtn.style.borderColor = this.visible ? '#2ddbde' : 'rgba(45,219,222,0.3)';
            this.toggleBtn.style.color = this.visible ? '#fff' : '#2ddbde';
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.touchControls = new TouchControls();
    });
}
