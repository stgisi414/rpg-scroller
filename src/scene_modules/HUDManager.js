class HUDManager {
    constructor(scene) {
        this.scene = scene;
    }

    createHUD() {
        // Show HTML HUD
        const hudElement = document.getElementById('game-hud');
        if (hudElement) hudElement.style.display = 'flex';
        
        // Cache DOM elements for quick updates
        this.scene.hudElements = {
            nameLevel: document.getElementById('hud-name-level'),
            hpFill: document.getElementById('hud-hp-fill'),
            hpText: document.getElementById('hud-hp-text'),
            mpFill: document.getElementById('hud-mp-fill'),
            mpText: document.getElementById('hud-mp-text'),
            spFill: document.getElementById('hud-sp-fill'),
            gold: document.getElementById('hud-gold'),
            zoneName: document.getElementById('hud-zone-name'),
            zoneType: document.getElementById('hud-zone-type'),
            zoneBiome: document.getElementById('hud-zone-biome'),
            alignment: document.getElementById('alignment-display'),
            xpFill: document.getElementById('hud-xp-fill'),
            xpText: document.getElementById('hud-xp-text')
        };
        
        // Make name panel solid and readable
        if (this.scene.hudElements.nameLevel) {
            this.scene.hudElements.nameLevel.style.background = 'rgba(0,0,0,0.85)';
            this.scene.hudElements.nameLevel.style.color = '#e0e0e0';
            this.scene.hudElements.nameLevel.style.textShadow = 'none';
            this.scene.hudElements.nameLevel.style.padding = '4px 10px';
            this.scene.hudElements.nameLevel.style.borderRadius = '4px';
            this.scene.hudElements.nameLevel.style.border = '1px solid rgba(255,255,255,0.15)';
        }
        // Clean up any stale elements from previous scenes to avoid memory leaks and stale event listener bindings
        const staleSheet = document.getElementById('btn-char-sheet');
        if (staleSheet) staleSheet.remove();
        const staleAP = document.getElementById('btn-auto-play');
        if (staleAP) staleAP.remove();
        const staleAPConfig = document.getElementById('btn-auto-play-config');
        if (staleAPConfig) staleAPConfig.remove();
        const staleModal = document.getElementById('char-sheet-modal');
        if (staleModal) staleModal.remove();

        if (this.scene.hudElements.nameLevel && !document.getElementById('btn-char-sheet')) {
            const btn = document.createElement('button');
            btn.id = 'btn-char-sheet';
            btn.innerText = '⚔️';
            btn.title = 'Character Sheet';
            btn.style.cssText = 'margin-left:8px;background:rgba(80,60,30,0.9);border:1px solid #a0832b;color:#fde68a;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;';
            btn.addEventListener('click', () => this.toggleCharacterSheet());
            this.scene.hudElements.nameLevel.appendChild(btn);
        }
        
        // Add Auto-Play toggle
        if (this.scene.hudElements.nameLevel && !document.getElementById('btn-auto-play')) {
            const btnAP = document.createElement('button');
            btnAP.id = 'btn-auto-play';
            btnAP.innerText = '🤖 Auto-Play';
            btnAP.title = 'Toggle AI Auto-Play';
            btnAP.style.cssText = 'margin-left:8px;background:rgba(30,60,80,0.9);border:1px solid #2b83a0;color:#8ae6fd;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;';
            btnAP.addEventListener('click', () => {
                if (this.scene.player) {
                    this.scene.player.isAI = !this.scene.player.isAI;
                    this.scene.player.aiState = 'party';
                    btnAP.style.background = this.scene.player.isAI ? 'rgba(80,160,30,0.9)' : 'rgba(30,60,80,0.9)';
                    btnAP.innerText = this.scene.player.isAI ? '🛑 Stop AI' : '🤖 Auto-Play';

                    // When stopping AI, immediately halt all movement and clear AI state
                    if (!this.scene.player.isAI) {
                        if (this.scene.player.sprite && this.scene.player.sprite.body) {
                            this.scene.player.sprite.setVelocityX(0);
                        }
                        // Clear all AI input flags
                        const ai = this.scene.player.aiInput;
                        if (ai) { ai.left = false; ai.right = false; ai.up = false; ai.down = false; ai.interact = false; }
                        // Reset AI navigation state
                        const companion = this.scene.player.companionAI;
                        if (companion) {
                            companion._wantsToAdventure = false;
                            companion._wantsToTravel = false;
                            companion._wantsGuildHall = false;
                        }
                    }
                }
            });
            this.scene.hudElements.nameLevel.appendChild(btnAP);
        }

        if (this.scene.hudElements.nameLevel && !document.getElementById('btn-auto-play-config')) {
            const btnAPConfig = document.createElement('button');
            btnAPConfig.id = 'btn-auto-play-config';
            btnAPConfig.innerText = '⚙️';
            btnAPConfig.title = 'Configure AI Auto-Play';
            btnAPConfig.style.cssText = 'margin-left:4px;background:rgba(80,80,80,0.9);border:1px solid #777;color:#fff;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;';
            btnAPConfig.addEventListener('click', () => this.toggleAutoplayConfig());
            this.scene.hudElements.nameLevel.appendChild(btnAPConfig);
        }
        
        // Show/hide MP and SP bars based on class
        const classId = window.saveData ? window.saveData.classId : 'knight';
        const mpBar = this.scene.hudElements.mpFill ? this.scene.hudElements.mpFill.closest('.relative') : null;
        const spBar = this.scene.hudElements.spFill ? this.scene.hudElements.spFill.closest('.relative') : null;
        
        if (classId === 'wizard' || classId === 'elven_spellblade' || classId === 'elven_spellblade_rival') {
            // Magic/Spellblade classes: show MP, hide SP
            if (mpBar) mpBar.style.display = '';
            if (spBar) spBar.style.display = 'none';
        } else {
            // Melee classes: show SP, hide MP
            if (mpBar) mpBar.style.display = 'none';
            if (spBar) spBar.style.display = '';
        }
        
        // Build character sheet modal (hidden)
        this._createCharacterSheetModal();
        
        this.scene.renderRoomTracker();
        try { this.updateHUD(); } catch(e) { console.error('updateHUD error:', e); }

        if (window.saveData && window.saveData.skillPoints > 0) {
            this.showUnspentSkillPointsBanner();
        }
    }

    _createCharacterSheetModal() {
        if (document.getElementById('char-sheet-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'char-sheet-modal';
        modal.className = 'fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-4 backdrop-blur-md pointer-events-auto transition-opacity duration-300';
        modal.style.display = 'none';
        
        // Use inline SVG for a subtle noise texture to give a parchment/stone feel
        const noiseSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='a'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23a)' opacity='0.05'/></svg>`;
        
        modal.innerHTML = `
            <div class="bg-surface-container/95 border-2 border-outline-variant rounded p-8 max-w-5xl w-full shadow-[0_0_50px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col" style="background-image: url('data:image/svg+xml;base64,${btoa(noiseSvg)}'); border-color: #a0832b;">
                
                <!-- Decorative Corner Ornaments -->
                <div class="absolute top-0 left-0 opacity-50" style="width:64px;height:64px;border-top:4px solid #a0832b;border-left:4px solid #a0832b;border-top-left-radius:4px;"></div>
                <div class="absolute top-0 right-0 opacity-50" style="width:64px;height:64px;border-top:4px solid #a0832b;border-right:4px solid #a0832b;border-top-right-radius:4px;"></div>
                <div class="absolute bottom-0 left-0 opacity-50" style="width:64px;height:64px;border-bottom:4px solid #a0832b;border-left:4px solid #a0832b;border-bottom-left-radius:4px;"></div>
                <div class="absolute bottom-0 right-0 opacity-50" style="width:64px;height:64px;border-bottom:4px solid #a0832b;border-right:4px solid #a0832b;border-bottom-right-radius:4px;"></div>

                <button id="cs-close" class="text-on-surface-variant hover:text-error transition-colors uppercase font-label-caps tracking-widest text-[14px] font-bold" style="position:absolute; top:24px; right:24px; z-index:50;">Close (ESC)</button>

                <!-- Header Panel -->
                <div class="flex items-center gap-6 mb-4 border-b border-outline-variant pb-4 relative z-10">
                    <div id="cs-sprite-container" class="w-24 h-24 bg-surface-container-lowest border-2 border-primary rounded-lg flex items-center justify-center shadow-inner relative overflow-hidden" style="image-rendering: pixelated;">
                        <div id="cs-sprite-img" style="transform: scale(3);"></div>
                    </div>
                    <div class="flex-grow">
                        <h2 id="cs-name" class="font-headline-lg text-[40px] text-primary uppercase tracking-widest mb-1" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-family: 'Space Grotesk', sans-serif;">Hero Name</h2>
                        <p id="cs-subtitle" class="font-body-lg text-secondary uppercase tracking-widest text-[16px] font-bold">Level 1 Adventurer</p>
                        <div class="flex flex-wrap gap-4 mt-3 font-label-caps text-[14px] text-on-surface-variant font-bold">
                            <span id="cs-alignment" class="bg-surface-container-highest px-3 py-1 rounded border border-outline-variant shadow">Neutral (0)</span>
                            <span id="cs-gold" class="bg-surface-container-highest px-3 py-1 rounded border border-tertiary text-tertiary shadow">0 Gold</span>
                            <span id="cs-xp" class="bg-surface-container-highest px-3 py-1 rounded border border-info text-info shadow">0/100 XP</span>
                            <span id="cs-hpmp" class="bg-surface-container-highest px-3 py-1 rounded border border-error text-error shadow">HP: 100/100</span>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation Bar -->
                <div class="flex gap-4 border-b border-outline-variant mb-6 relative z-10">
                    <button id="cs-tab-stats" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-primary text-primary transition-colors cursor-pointer focus:outline-none">Attributes & Gear</button>
                    <button id="cs-tab-skills" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none">Passive Skills</button>
                </div>

                <!-- Tab 1 Panel: Attributes & Gear -->
                <div id="cs-panel-stats" class="grid grid-cols-1 lg:grid-cols-3 gap-8 font-body-md text-on-surface relative z-10 overflow-y-auto pr-2" style="max-height: 50vh;">
                    
                    <!-- Left Col: Core Stats & Exploration -->
                    <div class="space-y-8">
                        <div>
                            <h3 class="font-headline-sm text-secondary uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">psychology</span> Core Attributes</h3>
                            <div id="cs-core-stats" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                        <div>
                            <h3 class="font-headline-sm text-info uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">explore</span> Exploration</h3>
                            <div id="cs-exploration-stats" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                        <div>
                            <h3 class="font-headline-sm text-tertiary uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">military_tech</span> Arena Status</h3>
                            <div id="cs-arena-stats" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                        <div>
                            <h3 class="font-headline-sm uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]" style="color: #4fc3f7;"><span class="material-symbols-outlined text-[22px]">inventory_2</span> Caravan Cargo Hold</h3>
                            <div id="cs-cargo" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                    </div>

                    <!-- Middle Col: Combat Math -->
                    <div class="space-y-8">
                        <div>
                            <h3 class="font-headline-sm text-primary uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">swords</span> Combat Prowess</h3>
                            <div id="cs-combat-stats" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                        <div>
                            <h3 class="font-headline-sm text-error uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">warning</span> Status Effects</h3>
                            <div id="cs-status-effects" class="space-y-2 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner text-[14px]">
                                <!-- Injected -->
                            </div>
                        </div>
                    </div>

                    <!-- Right Col: Equipment -->
                    <div class="space-y-8">
                        <div>
                            <h3 class="font-headline-sm text-tertiary uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">backpack</span> Active Equipment</h3>
                            <div id="cs-equipment" class="space-y-4">
                                <!-- Injected -->
                            </div>
                        </div>
                        <div>
                            <h3 class="font-headline-sm text-success uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">group</span> Party Members</h3>
                            <div id="cs-party" class="space-y-2 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
                                <!-- Injected -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab 2 Panel: Passive Skills -->
                <div id="cs-panel-skills" style="display: none; max-height: 50vh;" class="flex flex-col gap-4 relative z-10 overflow-y-auto pr-2">
                    <div class="flex justify-between items-center bg-surface-container-highest/60 p-4 rounded border border-outline-variant/60 shadow shrink-0">
                        <div>
                            <h4 class="font-headline-sm text-secondary uppercase text-[15px] font-bold tracking-widest">Available Skill Points</h4>
                            <p class="font-body-sm text-[11px] text-on-surface-variant mt-1">Spend points to unlock or upgrade passive skills matching your class archetype.</p>
                        </div>
                        <div id="cs-unspent-points-display" class="bg-primary text-background font-bold text-[28px] px-6 py-2 rounded-lg border-2 border-primary shadow-[0_0_15px_rgba(45,219,222,0.4)]">0</div>
                    </div>
                    
                    <div id="cs-skills-list-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                        <!-- Javascript will inject passive skills cards here -->
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(modal);

        // Tab Switching Event Bindings
        const tabStats = document.getElementById('cs-tab-stats');
        const tabSkills = document.getElementById('cs-tab-skills');
        const panelStats = document.getElementById('cs-panel-stats');
        const panelSkills = document.getElementById('cs-panel-skills');

        if (tabStats && tabSkills) {
            tabStats.addEventListener('click', () => {
                tabStats.classList.add('border-primary', 'text-primary');
                tabStats.classList.remove('border-transparent', 'text-on-surface-variant');
                tabSkills.classList.remove('border-primary', 'text-primary');
                tabSkills.classList.add('border-transparent', 'text-on-surface-variant');
                panelStats.style.display = 'grid';
                panelSkills.style.display = 'none';
            });
            tabSkills.addEventListener('click', () => {
                tabSkills.classList.add('border-primary', 'text-primary');
                tabSkills.classList.remove('border-transparent', 'text-on-surface-variant');
                tabStats.classList.remove('border-primary', 'text-primary');
                tabStats.classList.add('border-transparent', 'text-on-surface-variant');
                panelStats.style.display = 'none';
                panelSkills.style.display = 'flex';
                this._renderPassiveSkillsTab();
            });
        }

        document.getElementById('cs-close').addEventListener('click', () => {
            modal.style.display = 'none';
            const hud = document.getElementById('game-hud');
            if (hud) hud.style.display = 'flex';
            if (document.activeElement) document.activeElement.blur();
        });
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) {
                modal.style.display = 'none';
                const hud = document.getElementById('game-hud');
                if (hud) hud.style.display = 'flex';
                if (document.activeElement) document.activeElement.blur();
            }
        });
        this.scene._csEscListener = (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                modal.style.display = 'none';
                const hud = document.getElementById('game-hud');
                if (hud) hud.style.display = 'flex';
                if (document.activeElement) document.activeElement.blur();
            }
        };
        window.addEventListener('keydown', this.scene._csEscListener);
    }

    toggleCharacterSheet(initialTab = 'stats') {
        const modal = document.getElementById('char-sheet-modal');
        const hud = document.getElementById('game-hud');
        if (!modal) return;
        if (modal.style.display === 'none') {
            this._updateCharacterSheet();
            modal.style.display = '';
            if (hud) hud.style.display = 'none';
            if (initialTab === 'skills') {
                const tabSkills = document.getElementById('cs-tab-skills');
                if (tabSkills) tabSkills.click();
            } else {
                const tabStats = document.getElementById('cs-tab-stats');
                if (tabStats) tabStats.click();
            }
        } else {
            modal.style.display = 'none';
            if (hud) hud.style.display = 'flex';
            if (document.activeElement) document.activeElement.blur();
        }
    }

    toggleAutoplayConfig() {
        const panel = document.getElementById('ui-autoplay-config');
        if (!panel) return;
        
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
            panel.classList.remove('open');
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            setTimeout(() => panel.classList.add('open'), 10);
            this._syncAutoplayUI();
            this._setupAutoplayListeners();
        }
    }

    _syncAutoplayUI() {
        const config = window.autoplayConfig || {};
        const preset = config.preset || 'custom';
        document.querySelectorAll('.preset-btn').forEach(btn => {
            if (btn.dataset.preset === preset) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const zoneInput = document.getElementById('ap-target-zone');
        if (zoneInput) zoneInput.value = config.targetZone !== undefined ? config.targetZone : 0;

        const sliders = [
            { id: 'ap-town-focus', valId: 'val-ap-town-focus', prop: 'townFocus', suffix: '%' },
            { id: 'ap-quest-focus', valId: 'val-ap-quest-focus', prop: 'questFocus', suffix: '%' },
            { id: 'ap-party-build', valId: 'val-ap-party-build', prop: 'partyBuildFocus', suffix: '%' },
            { id: 'ap-self-potion', valId: 'val-ap-self-potion', prop: 'selfPotionPct', suffix: '%' },
            { id: 'ap-party-potion', valId: 'val-ap-party-potion', prop: 'partyPotionPct', suffix: '%' },
            { id: 'ap-spell-rate', valId: 'val-ap-spell-rate', prop: 'spellRate', suffix: '%' },
            { id: 'ap-dash-freq', valId: 'val-ap-dash-freq', prop: 'dashFreq', suffix: '%' },
            { id: 'ap-block-rate', valId: 'val-ap-block-rate', prop: 'blockRate', suffix: '%' }
        ];

        sliders.forEach(s => {
            const input = document.getElementById(s.id);
            const display = document.getElementById(s.valId);
            const val = config[s.prop] !== undefined ? config[s.prop] : 50;
            if (input) input.value = val;
            if (display) display.innerText = val + s.suffix;
        });

        const pTextarea = document.getElementById('ap-hero-personality');
        if (pTextarea) pTextarea.value = config.heroPersonality || '';

        const coliseumGrindCheckbox = document.getElementById('ap-coliseum-grind');
        if (coliseumGrindCheckbox) coliseumGrindCheckbox.checked = config.coliseumGrind || false;
    }

    _saveAutoplayConfig() {
        if (window.autoplayConfig) {
            if (window.saveData) {
                window.saveData.autoplayConfig = JSON.parse(JSON.stringify(window.autoplayConfig));
                // Call player._persistToLocalStorage() to write it to local storage slot
                if (this.scene && this.scene.player && typeof this.scene.player._persistToLocalStorage === 'function') {
                    this.scene.player._persistToLocalStorage();
                } else {
                    // Fallback direct write to local storage if player is not fully initialized yet
                    try {
                        const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                        const idx = saves.findIndex(s => s.id === window.saveData.id);
                        if (idx > -1) {
                            saves[idx] = window.saveData;
                            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
                        }
                    } catch(e) {
                        console.error("Failed to write autoplay config to save slot:", e);
                    }
                }
            }
        }
    }

    _setupAutoplayListeners() {
        if (this._autoplayListenersBound) return;
        this._autoplayListenersBound = true;

        const closeBtn = document.getElementById('btn-close-ap-config');
        if (closeBtn) {
            closeBtn.onclick = () => this.toggleAutoplayConfig();
        }

        const presetValues = {
            aggressive: { selfPotionPct: 25, partyPotionPct: 20, spellRate: 90, dashFreq: 60, blockRate: 10, townFocus: 20, partyBuildFocus: 40, questFocus: 50, heroPersonality: "An aggressive warrior focusing on standard combat, high spell usage, and active dashes." },
            speedrunner: { selfPotionPct: 30, partyPotionPct: 20, spellRate: 30, dashFreq: 95, blockRate: 15, townFocus: 0, partyBuildFocus: 20, questFocus: 0, heroPersonality: "Focuses on speedrunning the game, ignoring towns and quests, and constant dashes." },
            potion_saver: { selfPotionPct: 14, partyPotionPct: 14, spellRate: 40, dashFreq: 20, blockRate: 80, townFocus: 40, partyBuildFocus: 30, questFocus: 60, heroPersonality: "A defensive, potion-saving build with extremely high block rates and cautious combat." },
            loot_goblin: { selfPotionPct: 40, partyPotionPct: 40, spellRate: 50, dashFreq: 40, blockRate: 30, townFocus: 80, partyBuildFocus: 90, questFocus: 90, heroPersonality: "Obsessed with gold, gear, hiring maximum party members, and clearing every quest." },
            pacifist: { selfPotionPct: 50, partyPotionPct: 70, spellRate: 20, dashFreq: 40, blockRate: 90, townFocus: 60, partyBuildFocus: 70, questFocus: 80, heroPersonality: "A passive traveler focusing on block defense and healing party members rather than fighting." },
            merchant_trader: { selfPotionPct: 40, partyPotionPct: 40, spellRate: 40, dashFreq: 30, blockRate: 50, townFocus: 95, partyBuildFocus: 80, questFocus: 10, heroPersonality: "A profit-minded merchant trader. Values gold above glory, seeks out trade cargo in towns, and is obsessed with market arbitrage." },
            caravan_bodyguard: { selfPotionPct: 50, partyPotionPct: 85, spellRate: 80, dashFreq: 50, blockRate: 70, townFocus: 30, partyBuildFocus: 90, questFocus: 90, heroPersonality: "A stout caravan bodyguard. Sworn to defend the pack mules and party from wilderness threats. Prioritizes healing allies and blocking enemy attacks." },
            faction_politician: { selfPotionPct: 35, partyPotionPct: 35, spellRate: 60, dashFreq: 40, blockRate: 40, townFocus: 70, partyBuildFocus: 40, questFocus: 95, heroPersonality: "A diplomat and faction politician. Highly immersed in the local lore. Focuses on completing court contracts and espionage missions." },
            high_roller: { selfPotionPct: 45, partyPotionPct: 40, spellRate: 50, dashFreq: 80, blockRate: 30, townFocus: 80, partyBuildFocus: 50, questFocus: 20, heroPersonality: "A wealthy traveler. Disdains long, muddy roads; prefers fast traveling using town portal networks and pays transit taxes without batting an eye." }
        };

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.onclick = () => {
                const config = window.autoplayConfig || {};
                const presetName = btn.dataset.preset;
                config.preset = presetName;
                if (presetName !== 'custom') {
                    const vals = presetValues[presetName];
                    Object.keys(vals).forEach(k => {
                        config[k] = vals[k];
                    });
                }
                this._syncAutoplayUI();
                this._saveAutoplayConfig();
            };
        });

        const zoneInput = document.getElementById('ap-target-zone');
        if (zoneInput) {
            zoneInput.oninput = () => {
                const config = window.autoplayConfig || {};
                config.targetZone = parseInt(zoneInput.value) || 0;
                this._saveAutoplayConfig();
            };
            zoneInput.onfocus = () => {
                if (this.scene.inputManager) this.scene.inputManager.disableForInput();
            };
            zoneInput.onblur = () => {
                if (this.scene.inputManager) this.scene.inputManager.enableForInput();
            };
        }

        const coliseumGrindCheckbox = document.getElementById('ap-coliseum-grind');
        if (coliseumGrindCheckbox) {
            coliseumGrindCheckbox.onchange = () => {
                const config = window.autoplayConfig || {};
                config.coliseumGrind = coliseumGrindCheckbox.checked;
                this._saveAutoplayConfig();
            };
        }

        const sliderMappings = [
            { id: 'ap-town-focus', valId: 'val-ap-town-focus', prop: 'townFocus', suffix: '%' },
            { id: 'ap-quest-focus', valId: 'val-ap-quest-focus', prop: 'questFocus', suffix: '%' },
            { id: 'ap-party-build', valId: 'val-ap-party-build', prop: 'partyBuildFocus', suffix: '%' },
            { id: 'ap-self-potion', valId: 'val-ap-self-potion', prop: 'selfPotionPct', suffix: '%' },
            { id: 'ap-party-potion', valId: 'val-ap-party-potion', prop: 'partyPotionPct', suffix: '%' },
            { id: 'ap-spell-rate', valId: 'val-ap-spell-rate', prop: 'spellRate', suffix: '%' },
            { id: 'ap-dash-freq', valId: 'val-ap-dash-freq', prop: 'dashFreq', suffix: '%' },
            { id: 'ap-block-rate', valId: 'val-ap-block-rate', prop: 'blockRate', suffix: '%' }
        ];

        sliderMappings.forEach(s => {
            const input = document.getElementById(s.id);
            const display = document.getElementById(s.valId);
            if (input) {
                input.oninput = () => {
                    const config = window.autoplayConfig || {};
                    const val = parseInt(input.value) || 0;
                    config[s.prop] = val;
                    config.preset = 'custom';
                    if (display) display.innerText = val + s.suffix;
                    
                    document.querySelectorAll('.preset-btn').forEach(btn => {
                        if (btn.dataset.preset === 'custom') btn.classList.add('active');
                        else btn.classList.remove('active');
                    });
                    this._saveAutoplayConfig();
                };
            }
        });

        const pTextarea = document.getElementById('ap-hero-personality');
        if (pTextarea) {
            const improveBtn = document.getElementById('btn-ap-improve-personality');
            if (improveBtn) {
                improveBtn.onclick = async () => {
                    const config = window.autoplayConfig || {};
                    const currentVal = pTextarea.value.trim();
                    
                    improveBtn.innerText = "⏳ Generating...";
                    improveBtn.disabled = true;

                    const p = this.scene.player;
                    const wm = this.scene.worldManager;
                    const state = {
                        zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, biome: wm.currentZoneData.biome } : null,
                        player: {
                            level: window.saveData ? (window.saveData.level || 1) : 1,
                            class: p.classData ? p.classData.id : "adventurer",
                            alignment: p.alignment || 0,
                            quests: p.quests || []
                        }
                    };

                    try {
                        const response = await this.scene.geminiService.improveHeroPersonality(currentVal, state);
                        if (response && response.personality) {
                            config.heroPersonality = response.personality;
                            pTextarea.value = response.personality;
                            this._saveAutoplayConfig();
                        }
                    } catch(e) {
                        console.error("Failed to improve hero personality:", e);
                    } finally {
                        improveBtn.innerText = "🪄 Auto-Generate/Improve";
                        improveBtn.disabled = false;
                    }
                };
            }

            pTextarea.oninput = () => {
                const config = window.autoplayConfig || {};
                config.heroPersonality = pTextarea.value;
                this._saveAutoplayConfig();
            };
            pTextarea.onfocus = () => {
                if (this.scene.inputManager) this.scene.inputManager.disableForInput();
            };
            pTextarea.onblur = () => {
                if (this.scene.inputManager) this.scene.inputManager.enableForInput();
            };
        }

        // Global Economy Guide Modal Triggers
        const guideOpenBtn = document.getElementById('btn-open-economy-guide');
        const guideCloseBtn = document.getElementById('btn-close-economy-guide');
        const guideModal = document.getElementById('ui-economy-guide');
        
        if (guideOpenBtn && guideModal) {
            guideOpenBtn.onclick = () => {
                guideModal.style.display = 'flex';
                // Populate the dynamic economy guide table
                const tbody = document.getElementById('economy-guide-table-body');
                if (tbody && window.WORLD_KINGDOMS) {
                    tbody.innerHTML = '';
                    
                    const renderRow = (kId, k) => {
                        const exportNames = (k.exportGoods || []).map(itemId => {
                            const item = window.TRADE_GOODS ? window.TRADE_GOODS[itemId] : null;
                            return item ? `${item.name} (${item.basePrice}g)` : itemId;
                        }).join(', ');
                        const importNames = (k.importGoods || []).map(itemId => {
                            const item = window.TRADE_GOODS ? window.TRADE_GOODS[itemId] : null;
                            return item ? item.name : itemId;
                        }).join(', ');
                        
                        const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(k) : 'src/assets/emblems/emblem_unknown_2.png';
                        
                        const emblemImgHtml = `<img src="${emblemSrc}" style="width:20px; height:20px; vertical-align:middle; image-rendering:pixelated; margin-right:8px; display:inline-block; border:1px solid rgba(45,219,222,0.2); padding:1px; background:rgba(0,0,0,0.3); border-radius:2px;" />`;

                        const tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid #222';
                        tr.style.transition = 'background 0.15s';
                        tr.onmouseover = () => { tr.style.background = 'rgba(255,255,255,0.02)'; };
                        tr.onmouseout = () => { tr.style.background = 'transparent'; };
                        tr.innerHTML = `
                            <td style="padding:10px 12px; font-weight:bold; color:#fff; border-bottom:1px solid #222; display:flex; align-items:center;">
                                ${emblemImgHtml}
                                <span>${k.name}</span>
                            </td>
                            <td style="padding:10px 12px; text-align:center; color:#2ddbde; font-weight:bold; border-bottom:1px solid #222; vertical-align:middle;">Zone ${k.capital}</td>
                            <td style="padding:10px 12px; color:#4ade80; border-bottom:1px solid #222; vertical-align:middle;">${exportNames}</td>
                            <td style="padding:10px 12px; color:#eab308; border-bottom:1px solid #222; vertical-align:middle;">${importNames}</td>
                        `;
                        tbody.appendChild(tr);
                    };

                    for (const kId in window.WORLD_KINGDOMS) {
                        renderRow(kId, window.WORLD_KINGDOMS[kId]);
                    }
                    if (window.saveData && window.saveData.discoveredKingdoms) {
                        for (const kId in window.saveData.discoveredKingdoms) {
                            renderRow(kId, window.saveData.discoveredKingdoms[kId]);
                        }
                    }
                }
            };
        }
        if (guideCloseBtn && guideModal) {
            guideCloseBtn.onclick = () => {
                guideModal.style.display = 'none';
            };
        }

        // Faction Lore Bible
        const loreOpenBtn = document.getElementById('btn-open-lore-bible');
        const loreCloseBtn = document.getElementById('btn-close-lore-bible');
        const loreModal = document.getElementById('ui-lore-bible');
        if (loreOpenBtn && loreModal) {
            loreOpenBtn.onclick = () => {
                loreModal.style.display = 'flex';
                const loreContainer = document.getElementById('lore-bible-content');
                if (loreContainer) {
                    loreContainer.innerHTML = '';
                    
                    const loreData = {
                        willowbrook: {
                            title: "Kingdom of Willowbrook",
                            ruling: "The Crown of Willowbrook",
                            desc: "Nestled within the lush, ancient Whisperwood Forest, Willowbrook is the oldest agricultural and timber hub of the Known World. Its people live in harmony with nature under the benevolent rule of King Aldric. Safe exits and fertile plains protect the town, though dark whispers stir in the neighboring wilderness zones."
                        },
                        embercrown: {
                            title: "Kingdom of Embercrown",
                            ruling: "The Embercrown Dominion",
                            desc: "Forged in the heart of the Obsidian Crags, Embercrown is a mighty subterranean industrial empire ruled by the hellfire guild. They mine deep obsidian and master the forge, creating unmatched steel armaments. Their hot-tempered royalty guards their capital fiercely, looking down on the agrarian valleys below."
                        },
                        duskveil: {
                            title: "Kingdom of Duskveil",
                            ruling: "The Shadow Covenant",
                            desc: "Shrouded in a perpetual purple twilight and cold gothic mist, Duskveil is the home of spellswords, rogues, and moon worshippers. Under the shadowy rule of Princess Seraphina, the city acts as the gateway to the unseen dimensions. Many fear their dark arts, but their markets trade in rare crescent relics."
                        },
                        ashenmoor: {
                            title: "Kingdom of Ashenmoor",
                            ruling: "The Mages' Council",
                            desc: "Sprawled across the vast yellow sands of the Ashen Wasteland, Ashenmoor is a sanctuary of magic, alchemy, and lost secrets. Great floating towers house the Council of Archmages who study the cosmos. Their exports of magical scrolls feed the wizard guilds across all realms."
                        },
                        frosthold: {
                            title: "Kingdom of Frosthold",
                            ruling: "The Northern Alliance",
                            desc: "A harsh, frozen fortress kingdom carved into the glacial peaks of the Wyrmtooth Range. Frosthold is inhabited by battle-hardened rangers and high-born knights who have sworn to protect the frontier from wild winter beasts. Their iron axes and cold resistance are legendary."
                        },
                        tidereach: {
                            title: "Kingdom of Tidereach",
                            ruling: "The Merchant League",
                            desc: "Perched on the coastal bays of the Emerald Sea, Tidereach is the trading capital of the world. Great wooden galleons bring trade goods and exotic spices from distant pocket realms. The Merchant League governs the docks, keeping pricing fair and taxes high."
                        },
                        heaven: {
                            title: "Pocket Realm of Heaven",
                            ruling: "The Seraphim Order",
                            desc: "A celestial dimension hovering high above the clouds, accessible only to adventurers of pure alignment. Glowing halos and white golden wings light up the sky. It is a place of peace, divine spells, and sacred artifacts, guarded by holy guardians."
                        },
                        hell: {
                            title: "Pocket Realm of Hell",
                            ruling: "The Demon Horde",
                            desc: "A fiery abyss of torment and hellfire, populated by horned beasts and pentagram sigils. Adventurers of dark alignment are damnably cast here to face challenges or escape. The intense heat tests all armor, and only the strong survive."
                        }
                    };

                    for (const kId in loreData) {
                        const entry = loreData[kId];
                        const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kId) : `src/assets/emblems/emblem_${kId}.png`;
                        
                        const itemHtml = `
                            <div style="background:#131316; border:1px solid #333; border-radius:6px; padding:16px; display:flex; gap:16px; align-items:flex-start;">
                                <img src="${emblemSrc}" style="width:48px; height:48px; image-rendering:pixelated; border:1px solid rgba(246,190,59,0.3); padding:3px; background:rgba(0,0,0,0.4); border-radius:4px; flex-shrink:0;" />
                                <div>
                                    <h4 style="color:#f6be3b; margin:0 0 4px; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; line-height:1.2;">${entry.title}</h4>
                                    <div style="font-size:10px; color:#aaa; margin-bottom:8px; text-transform:uppercase;">Ruling Faction: <span style="color:#fff; font-weight:bold;">${entry.ruling}</span></div>
                                    <p style="color:#ccc; font-size:11px; line-height:1.6; margin:0; font-family:sans-serif;">${entry.desc}</p>
                                </div>
                            </div>
                        `;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = itemHtml;
                        loreContainer.appendChild(tempDiv.firstElementChild);
                    }
                    
                    // Add dynamically discovered frontier kingdoms if any exist
                    if (window.saveData && window.saveData.discoveredKingdoms) {
                        const keys = Object.keys(window.saveData.discoveredKingdoms);
                        keys.forEach((kId, idx) => {
                            const k = window.saveData.discoveredKingdoms[kId];
                            const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kId) : 'src/assets/emblems/emblem_unknown_1.png';
                            
                            const itemHtml = `
                                <div style="background:#131316; border:1px solid #333; border-radius:6px; padding:16px; display:flex; gap:16px; align-items:flex-start;">
                                    <img src="${emblemSrc}" style="width:48px; height:48px; image-rendering:pixelated; border:1px solid rgba(246,190,59,0.3); padding:3px; background:rgba(0,0,0,0.4); border-radius:4px; flex-shrink:0;" />
                                    <div>
                                        <h4 style="color:#a0832b; margin:0 0 4px; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; line-height:1.2;">${k.name} (Frontier Realm)</h4>
                                        <div style="font-size:10px; color:#aaa; margin-bottom:8px; text-transform:uppercase;">Ruling Faction: <span style="color:#fff; font-weight:bold;">${k.factionName || k.rulingFaction || 'Local Council'}</span></div>
                                        <div style="font-size:10px; color:#aaa; margin-bottom:8px; text-transform:uppercase;">Capital: <span style="color:#2ddbde; font-weight:bold;">Zone ${k.capital}</span></div>
                                        <p style="color:#ccc; font-size:11px; line-height:1.6; margin:0; font-family:sans-serif;">${k.desc || 'An uncharted territory in the frontier, ruled by local factions.'}</p>
                                    </div>
                                </div>
                            `;
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = itemHtml;
                            loreContainer.appendChild(tempDiv.firstElementChild);
                        });
                    }
                }
            };
        }
        if (loreCloseBtn && loreModal) {
            loreCloseBtn.onclick = () => {
                loreModal.style.display = 'none';
            };
        }
    }

    _updateCharacterSheet() {
        const p = this.scene.player;
        if (!p) return;
        
        const stats = p.classData.stats;
        const cd = p.classData;
        const level = window.saveData ? window.saveData.level : 1;
        const name = window.saveData ? window.saveData.name : 'Unknown';
        const xp = window.saveData ? window.saveData.xp : 0;
        const nextXp = level * 100;
        const gold = window.saveData ? window.saveData.gold : 0;
        const align = window.saveData ? window.saveData.alignment : 0;
        
        // --- Header Panel ---
        document.getElementById('cs-name').innerText = name;
        document.getElementById('cs-subtitle').innerText = `Level ${level} ${cd.id.charAt(0).toUpperCase() + cd.id.slice(1)}`;
        
        let alignText = "Neutral";
        let alignColor = "#a0832b";
        if (align > 20) { alignText = "Righteous"; alignColor = "#4ade80"; }
        if (align < -20) { alignText = "Demonic"; alignColor = "#ff6b6b"; }
        const alignEl = document.getElementById('cs-alignment');
        alignEl.innerText = `${alignText} (${align})`;
        alignEl.style.borderColor = alignColor;
        alignEl.style.color = alignColor;
        
        document.getElementById('cs-gold').innerText = `${gold} Gold`;
        document.getElementById('cs-xp').innerText = `${xp} / ${nextXp} XP`;
        document.getElementById('cs-hpmp').innerText = `HP: ${Math.floor(p.hp)}/${p.maxHp} | MP: ${Math.floor(p.mp)}/${p.maxMp}`;

        // Sprite
        const spriteImg = document.getElementById('cs-sprite-img');
        const frameW = cd.frameWidth || 64;
        const frameH = cd.frameHeight || 64;
        spriteImg.style.width = `${frameW}px`;
        spriteImg.style.height = `${frameH}px`;
        
        let spritePath = '';
        if (cd.id === 'knight') spritePath = 'GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png';
        else if (cd.id === 'wizard') spritePath = 'GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png';
        else if (cd.id === 'samurai') spritePath = 'GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png';
        else if (cd.id === 'ranger') spritePath = 'GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png';
        
        spriteImg.style.backgroundImage = `url('src/assets/${spritePath}')`;
        spriteImg.style.backgroundPosition = `-${cd.idleRow === undefined ? 0 : cd.idleRow * frameW}px 0px`;
        spriteImg.style.backgroundRepeat = 'no-repeat';
        
        // --- Core Stats ---
        const statColors = { vit: '#ff6b6b', str: '#ff9f43', dex: '#54a0ff', int: '#c471ed', luck: '#ffd700' };
        document.getElementById('cs-core-stats').innerHTML = `
            <div class="flex justify-between items-center"><span style="color:${statColors.vit}" class="font-bold tracking-wider">❤ VITALITY</span><span class="font-bold text-[18px]">${stats.vit}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-2">Increases Max HP.</div>
            <div class="flex justify-between items-center"><span style="color:${statColors.str}" class="font-bold tracking-wider">⚔ STRENGTH</span><span class="font-bold text-[18px]">${stats.str}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-2">Increases Melee Damage & Jump Height.</div>
            <div class="flex justify-between items-center"><span style="color:${statColors.dex}" class="font-bold tracking-wider">💨 DEXTERITY</span><span class="font-bold text-[18px]">${stats.dex}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-2">Increases Speed, Crit Chance & Dash.</div>
            <div class="flex justify-between items-center"><span style="color:${statColors.int}" class="font-bold tracking-wider">✨ INTELLIGENCE</span><span class="font-bold text-[18px]">${stats.int}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-2">Increases Max MP & Magic Damage.</div>
            <div class="flex justify-between items-center"><span style="color:${statColors.luck}" class="font-bold tracking-wider">🍀 LUCK</span><span class="font-bold text-[18px]">${p.luck || 10}</span></div>
            <div class="text-[12px] text-on-surface-variant">Improves chest loot & NPC reaction chances.</div>
        `;
        
        // --- Combat Math ---
        const weaponObj = p.inventory && p.inventory.weapon ? p.inventory.weapon : null;
        const weaponBonusRaw = weaponObj ? weaponObj.damageBonus : 0;
        const weaponBonus = typeof weaponBonusRaw === 'number' && !isNaN(weaponBonusRaw) ? weaponBonusRaw : 0;
        
        let baseDmgStr = "";
        let baseDmg = 0;
        if (cd.id === 'wizard') { baseDmg = (stats.int * 2); baseDmgStr = `(INT×2)`; }
        else if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') { baseDmg = Math.floor(stats.str * 3.5) + Math.floor(stats.int * 1.5); baseDmgStr = `(STR×3.5 + INT×1.5)`; }
        else if (cd.id === 'samurai') { baseDmg = Math.floor(stats.dex * 2.5) + Math.floor(stats.str * 0.5); baseDmgStr = `(DEX×2.5 + STR×0.5)`; }
        else if (cd.id === 'ranger') { baseDmg = (stats.dex * 2) + stats.str; baseDmgStr = `(DEX×2 + STR)`; }
        else { baseDmg = (stats.str * 3); baseDmgStr = `(STR×3)`; }
        
        const rawDmg = baseDmg + weaponBonus;
        const dmgMult = typeof p.getDamageMultiplier === 'function' ? p.getDamageMultiplier() : 1.0;
        const finalDmg = Math.floor(rawDmg * dmgMult);

        const drMult = typeof p.getDamageReduction === 'function' ? p.getDamageReduction() : 0.0;
        const lifesteal = typeof p.getLifesteal === 'function' ? p.getLifesteal() : 0.0;

        document.getElementById('cs-combat-stats').innerHTML = `
            <div class="flex justify-between items-center mb-1"><span class="font-bold text-on-surface-variant">Max Output Damage</span><span class="font-bold text-primary text-[20px]">~${finalDmg}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-3 border-l-2 border-outline-variant pl-2 font-mono">
                Base ${baseDmgStr}: <span class="text-on-surface">${baseDmg}</span><br>
                Weapon Bonus: <span class="text-tertiary">+${weaponBonus}</span><br>
                Multipliers: <span class="text-info">x${dmgMult.toFixed(2)}</span>
            </div>
            
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Critical Hit Chance</span><span class="font-bold text-secondary text-[16px]">${(p.critChance || 0).toFixed(1)}%</span></div>
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Damage Reduction</span><span class="font-bold text-info text-[16px]">${(drMult * 100).toFixed(0)}%</span></div>
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Lifesteal</span><span class="font-bold text-error text-[16px]">${(lifesteal * 100).toFixed(0)}%</span></div>
        `;

        // --- Exploration ---
        document.getElementById('cs-exploration-stats').innerHTML = `
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Movement Speed</span><span class="font-bold text-[16px]">${p.speed} px/s</span></div>
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Dash Power</span><span class="font-bold text-[16px]">${p.dashSpeed} px/s</span></div>
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Jump Power</span><span class="font-bold text-[16px]">${Math.abs(p.jumpVelocity)} px/s</span></div>
        `;

        // --- Arena Status ---
        const highestWave = p.coliseumHighestWave || 0;
        const colRep = p.coliseumReputation || 0;
        document.getElementById('cs-arena-stats').innerHTML = `
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Coliseum Reputation</span><span class="font-bold text-[16px]">${colRep}</span></div>
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Highest Wave Cleared</span><span class="font-bold text-[16px]">Wave ${highestWave}</span></div>
        `;

        // --- Equipment ---
        let equipHtml = "";
        if (weaponObj) {
            equipHtml += `
                <div class="bg-surface-container border border-tertiary rounded p-3 flex gap-4 items-center shadow">
                    <div class="w-12 h-12 bg-surface-container-highest rounded border border-outline-variant flex items-center justify-center" style="background-image: url('${weaponObj.iconSrc || weaponObj.imageSrc || ''}'); background-size: contain; background-repeat: no-repeat; background-position: center; image-rendering: pixelated;"></div>
                    <div>
                        <div class="font-bold text-tertiary uppercase tracking-wider text-[14px]">${weaponObj.name}</div>
                        <div class="text-[12px] text-on-surface-variant">${weaponObj.desc}</div>
                    </div>
                </div>
            `;
        } else {
            equipHtml += `<div class="text-on-surface-variant italic text-[14px]">No Weapon Equipped</div>`;
        }
        
        let artObj = null;
        if (p.inventory && p.inventory.artifacts && p.inventory.equippedArtifact >= 0) {
            const artifactKey = p.inventory.artifacts[p.inventory.equippedArtifact];
            artObj = window.ARTIFACTS_DATA[artifactKey];
        }
        
        if (artObj) {
            equipHtml += `
                <div class="bg-surface-container border border-secondary rounded p-3 flex gap-4 items-center shadow mt-2">
                    <div class="w-12 h-12 bg-surface-container-highest rounded border border-outline-variant flex items-center justify-center" style="background-image: url('${artObj.iconSrc}'); background-size: cover; image-rendering: pixelated;"></div>
                    <div>
                        <div class="font-bold text-secondary uppercase tracking-wider text-[14px]">${artObj.name}</div>
                        <div class="text-[12px] text-on-surface-variant">${artObj.desc}</div>
                    </div>
                </div>
            `;
        } else {
            equipHtml += `<div class="text-on-surface-variant italic text-[14px] mt-2">No Artifact Equipped</div>`;
        }
        document.getElementById('cs-equipment').innerHTML = equipHtml;

        // --- Status Effects ---
        let statusHtml = "";
        
        // Permanent Artifact Aura
        if (artObj && artObj.statBoosts) {
            statusHtml += `
                <div class="flex justify-between items-center bg-surface border border-secondary rounded px-3 py-2 mb-2">
                    <span style="color:#fbc531" class="font-bold uppercase flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">stars</span> Artifact Aura</span>
                    <span class="text-on-surface-variant text-[12px]">${artObj.desc} (Permanent)</span>
                </div>
            `;
        }
        
        if (p.statusEffects && p.statusEffects.length > 0) {
            p.statusEffects.forEach(effect => {
                if (!effect) return; // Safety check for undefined effects
                let color = "#ff6b6b";
                let icon = "warning";
                if (['heal', 'buff', 'regen', 'blessing'].includes(effect.type)) { color = "#4ade80"; icon = "verified"; }
                statusHtml += `
                    <div class="flex justify-between items-center bg-surface border border-outline-variant rounded px-3 py-2 mb-2">
                        <span style="color:${color}" class="font-bold uppercase flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">${icon}</span> ${effect.type}</span>
                        <span class="text-on-surface-variant">${Math.ceil(effect.duration/1000)}s remaining</span>
                    </div>
                `;
            });
        }
        
        if (statusHtml === "") {
            statusHtml = `<div class="text-on-surface-variant italic text-center py-2">No active effects</div>`;
        }
        document.getElementById('cs-status-effects').innerHTML = statusHtml;

        // --- Party ---
        let partyHtml = "";
        if (this.scene.partyMembers && this.scene.partyMembers.length > 0) {
            partyHtml = this.scene.partyMembers.map((member, idx) => {
                const memberMult = typeof member.getDamageMultiplier === 'function' ? member.getDamageMultiplier() : 1.0;
                const isMagic = member.classData.id === 'wizard' || (member.classData.id && member.classData.id.startsWith('custom_npc_') && member.classData.weaponType === 'magic');
                let mBaseDmg;
                if (member.classData.id === 'elven_spellblade' || member.classData.id === 'elven_spellblade_rival') {
                    mBaseDmg = Math.floor(member.classData.stats.str * 3.5) + Math.floor(member.classData.stats.int * 1.5);
                } else if (member.classData.id === 'samurai' || member.classData.id === 'samurai_rival') {
                    mBaseDmg = Math.floor(member.classData.stats.dex * 2.5) + Math.floor(member.classData.stats.str * 0.5);
                } else if (member.classData.id === 'ranger' || member.classData.id === 'ranger_rival') {
                    mBaseDmg = (member.classData.stats.dex * 2) + member.classData.stats.str;
                } else {
                    mBaseDmg = isMagic ? (member.classData.stats.int*2) : (member.classData.stats.str*3);
                }
                const mFinalDmg = Math.floor(mBaseDmg * memberMult);
                const mBuffStr = memberMult > 1.0 ? ` <span style="color:#f6be3b">(+${Math.round((memberMult-1)*100)}%)</span>` : '';
                
                const isCustom = member.classData.id && member.classData.id.startsWith('custom_npc_');
                const classLabel = isCustom ? `Companion (${member.classData.weaponType || 'sword'})` : member.classData.id;
                
                // Fetch kingdom emblem for the member's faction
                const factionId = member.faction;
                let kingdomId = null;
                if (factionId) {
                    if (window.WORLD_FACTIONS && window.WORLD_FACTIONS[factionId]) {
                        kingdomId = window.WORLD_FACTIONS[factionId].kingdom;
                    } else if (window.saveData && window.saveData.discoveredKingdoms) {
                        for (const kId in window.saveData.discoveredKingdoms) {
                            if (window.saveData.discoveredKingdoms[kId].rulingFaction === factionId) {
                                kingdomId = kId;
                                break;
                            }
                        }
                    }
                }
                const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kingdomId) : null;
                const emblemImgHtml = emblemSrc ? `<img src="${emblemSrc}" style="width:16px; height:16px; vertical-align:middle; image-rendering:pixelated; border:1px solid rgba(45,219,222,0.2); padding:1px; background:rgba(0,0,0,0.3); border-radius:2px; margin-right:6px;" />` : '';

                return `
                <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;border:1px solid #3a3020;box-shadow:inset 0 0 10px rgba(0,0,0,0.5); position:relative;">
                    <button onclick="window._gameScene.dismissPartyMember(${idx})" style="position:absolute; top:8px; right:8px; background:rgba(255,50,50,0.3); border:1px solid #ff6b6b; color:#fff; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:10px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,50,50,0.6)'" onmouseout="this.style.background='rgba(255,50,50,0.3)'">Dismiss</button>
                    <div style="display:flex; align-items:center; margin-bottom:4px;">
                        ${emblemImgHtml}
                        <div style="color:#a0832b;font-weight:bold;text-transform:capitalize;font-size:16px;line-height:1;">${member.npcName ? member.npcName : (member.classData.id === 'knight' ? 'Warrior' : member.classData.id)}</div>
                    </div>
                    <div style="color:#888;font-size:11px;margin-bottom:8px;text-transform:uppercase;">${classLabel}</div>
                    <div style="color:#ff6b6b;font-size:14px;margin-bottom:4px;">❤ HP: ${Math.round(member.hp)}/${member.maxHp}</div>
                    <div style="color:#bbb;font-size:13px;margin-bottom:4px;">⚔️ Dmg: ~${mFinalDmg}${mBuffStr}</div>
                    <div style="color:#f6be3b;font-size:13px;margin-bottom:12px;">🤝 Camaraderie: ${member.camaraderie || 0}</div>
                    <button onclick="window._gameScene.startPartyChat(${idx})" style="width:100%; background:rgba(45,219,222,0.2); border:1px solid #2ddbde; color:#fff; border-radius:4px; padding:4px 0; cursor:pointer; font-size:12px; transition: background 0.2s;" onmouseover="this.style.background='rgba(45,219,222,0.5)'" onmouseout="this.style.background='rgba(45,219,222,0.2)'">💬 Chat</button>
                </div>
                `;
            }).join('');
        }
        if (partyHtml === "") {
            partyHtml = `<div class="text-on-surface-variant italic">No active party members</div>`;
        }
        document.getElementById('cs-party').innerHTML = partyHtml;

        // --- Caravan Cargo Hold ---
        const cargoHold = window.saveData && window.saveData.cargo ? window.saveData.cargo : {};
        const totalCargoVal = Object.values(cargoHold).reduce((a, b) => a + b, 0);
        let cargoHtml = `<div class="flex justify-between items-center mb-2"><span class="font-bold text-[#4fc3f7] uppercase tracking-wider">Total Cargo</span><span class="font-bold text-[16px] text-[#4fc3f7]">${totalCargoVal} / 10 units</span></div>`;
        
        let cargoItemsHtml = "";
        for (const itemId in cargoHold) {
            const qty = cargoHold[itemId] || 0;
            if (qty > 0) {
                const itemData = window.TRADE_GOODS && window.TRADE_GOODS[itemId] ? window.TRADE_GOODS[itemId] : { name: itemId, desc: '', basePrice: 0 };
                cargoItemsHtml += `
                    <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); margin-bottom:6px; display:flex; justify-content:between; align-items:center;">
                        <div style="flex-grow:1;">
                            <div style="font-weight:bold; color:#fff; text-transform:uppercase; font-size:12px; margin-bottom:2px;">📦 ${itemData.name}</div>
                            <div style="color:#888; font-size:10px; line-height:1.2;">${itemData.desc || ''}</div>
                        </div>
                        <div style="text-align:right; margin-left:12px; min-w-[70px];">
                            <div style="font-weight:bold; color:#4fc3f7; font-size:14px;">Qty: ${qty}</div>
                            <div style="color:#a0832b; font-size:10px; font-family:monospace; margin-top:2px;">Value: ~${itemData.basePrice * qty}g</div>
                        </div>
                    </div>
                `;
            }
        }
        
        if (cargoItemsHtml === "") {
            cargoItemsHtml = `<div class="text-on-surface-variant italic text-center py-2" style="color:#888; font-size:12px;">No trade cargo currently in your caravan hold.</div>`;
        }
        
        const cargoDiv = document.getElementById('cs-cargo');
        if (cargoDiv) {
            cargoDiv.innerHTML = cargoHtml + `<div style="margin-top:8px;">${cargoItemsHtml}</div>`;
        }
    }

    dismissPartyMember(index) {
        if (!this.scene.partyMembers || index < 0 || index >= this.scene.partyMembers.length) return;
        const member = this.scene.partyMembers[index];
        if (member && member.sprite && member.sprite.active) {
            member.die();
            if (this.scene.player && this.scene.player.sprite) {
                this.scene.showFloatingText(this.scene.player.sprite.x, this.scene.player.sprite.y - 30, "Companion Dismissed", 0xffaa00);
            }
            this._updateCharacterSheet();
            if (this.scene.player && this.scene.player.saveGame) {
                this.scene.player.saveGame();
            }
        }
    }

    startPartyChat(index) {
        if (!this.scene.partyMembers || index < 0 || index >= this.scene.partyMembers.length) return;
        
        // Prevent opening party chat if there's already an active chat or shop open
        const chatUI = document.getElementById('chat-ui');
        const shopUI = document.getElementById('ui-shop');
        const isChatOpen = chatUI && window.getComputedStyle(chatUI).display !== 'none';
        const isShopOpen = shopUI && window.getComputedStyle(shopUI).display !== 'none';
        if (isChatOpen || isShopOpen) return;

        const member = this.scene.partyMembers[index];
        
        // Hide character sheet and restore HUD
        const uiCS = document.getElementById('ui-character-sheet');
        if (uiCS) uiCS.style.display = 'none';
        const modal = document.getElementById('char-sheet-modal');
        if (modal) modal.style.display = 'none';
        
        const hud = document.getElementById('game-hud');
        if (hud) hud.style.display = 'flex';
        
        this.scene.isCharacterSheetOpen = false;
        
        if (member && member.openChat) {
            member.openChat();
        }
    }

    updateHUD() {
        if (!this.scene.hudElements) return;
        
        const saveName = window.saveData ? window.saveData.name : 'Unknown Hero';
        const saveLevel = window.saveData ? window.saveData.level : 1;
        const saveGold = window.saveData ? window.saveData.gold : 0;
        const saveXp = window.saveData ? (window.saveData.xp || 0) : 0;
        const xpToNextLevel = saveLevel * 100;
        const xpPercent = Math.min((saveXp / xpToNextLevel) * 100, 100);
        
        if (this.scene.hudElements.nameLevel) {
            // Update text but preserve the character sheet button
            const btn = document.getElementById('btn-char-sheet');
            this.scene.hudElements.nameLevel.childNodes[0].textContent = `${saveName} (Lv.${saveLevel}) `;
        }
        if (this.scene.hudElements.gold) this.scene.hudElements.gold.innerText = `Gold: ${saveGold ?? 0}`;
        
        // Update Cargo HUD Indicator
        const currentCargoHold = window.saveData && window.saveData.cargo ? window.saveData.cargo : {};
        const totalCargoCount = Object.values(currentCargoHold).reduce((a, b) => a + b, 0);
        const cargoHUDText = document.getElementById('hud-cargo');
        if (cargoHUDText) {
            cargoHUDText.innerText = `Cargo: ${totalCargoCount}/10`;
        }

        // XP bar
        if (this.scene.hudElements.xpFill) this.scene.hudElements.xpFill.style.width = `${xpPercent}%`;
        if (this.scene.hudElements.xpText) this.scene.hudElements.xpText.innerText = `${saveXp}/${xpToNextLevel}`;
        
        // HP updates
        if (this.scene.player && this.scene.hudElements.hpText && this.scene.hudElements.hpFill) {
            this.scene.hudElements.hpText.innerText = `${Math.max(0, Math.floor(this.scene.player.hp))}/${this.scene.player.maxHp}`;
            const hpPercent = (Math.max(0, this.scene.player.hp) / this.scene.player.maxHp) * 100;
            this.scene.hudElements.hpFill.style.width = `${hpPercent}%`;
        }
        
        // MP bar
        if (this.scene.player && this.scene.hudElements.mpFill) {
            const mpPercent = (Math.max(0, this.scene.player.mp) / (this.scene.player.maxMp || 1)) * 100;
            this.scene.hudElements.mpFill.style.width = `${mpPercent}%`;
        }
        if (this.scene.player && this.scene.hudElements.mpText) {
            this.scene.hudElements.mpText.innerText = `${Math.floor(this.scene.player.mp)}/${this.scene.player.maxMp}`;
        }
        
        // SP bar
        if (this.scene.player && this.scene.hudElements.spFill) {
            const spPercent = (Math.max(0, this.scene.player.sp) / (this.scene.player.maxSp || 1)) * 100;
            this.scene.hudElements.spFill.style.width = `${spPercent}%`;
            if (window.debugSP) console.log(`SP: ${this.scene.player.sp}, Percent: ${spPercent}%, Width set to: ${this.scene.hudElements.spFill.style.width}`);
        }

        // Room Tracker
        this.scene.renderRoomTracker();
    }

    _updateDebugHUD(time, delta) {
        const el = document.getElementById('debug-content');
        if (!el) return;

        const zoneData = this.scene.worldManager ? this.scene.worldManager.currentZoneData : null;
        const zoneIdx = window.saveData ? window.saveData.currentZone : '?';
        const biome = zoneData ? (zoneData.biome || 'unknown') : '?';
        const zoneType = zoneData ? (zoneData.type || '?') : '?';
        const zoneName = zoneData ? (zoneData.name || '?') : '?';
        const decorCount = zoneData && zoneData.decorLayout ? zoneData.decorLayout.length : 0;

        const px = this.scene.player && this.scene.player.sprite ? Math.round(this.scene.player.sprite.x) : '?';
        const py = this.scene.player && this.scene.player.sprite ? Math.round(this.scene.player.sprite.y) : '?';
        const hp = this.scene.player ? `${this.scene.player.hp}/${this.scene.player.maxHp}` : '?';
        const mp = this.scene.player ? `${this.scene.player.mp || 0}/${this.scene.player.maxMp || 0}` : '?';
        const sp = this.scene.player ? `${this.scene.player.sp || 0}/${this.scene.player.maxSp || 0}` : '?';
        const alignment = this.scene.player ? this.scene.player.alignment : 0;
        const gold = window.saveData ? window.saveData.gold : 0;
        const level = window.saveData ? window.saveData.level : '?';
        const classId = this.scene.player && this.scene.player.classData ? this.scene.player.classData.id : '?';

        const fps = Math.round(this.scene.game.loop.actualFps);
        const enemyCount = this.scene.enemies ? this.scene.enemies.getChildren().filter(e => e.active).length : 0;
        const npcCount = this.scene.npcs ? this.scene.npcs.length : 0;
        const partyCount = this.scene.partyMembers ? this.scene.partyMembers.length : 0;

        // Enemy type breakdown
        let enemyTypes = {};
        let rivalDebug = '';
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(e => {
                if (e.active && e.controller) {
                    const t = e.controller.type || (e.controller.isAI ? 'rival_hero' : 'unknown');
                    enemyTypes[t] = (enemyTypes[t] || 0) + 1;
                    
                    if (e.controller.isAI) {
                        rivalDebug = ` | Rival Pos: ${Math.round(e.x)}, ${Math.round(e.y)}`;
                    }
                }
            });
        }
        const enemyBreakdown = (Object.entries(enemyTypes).map(([k, v]) => `${k}×${v}`).join(', ') || 'none') + rivalDebug;

        // Inventory summary
        const inv = this.scene.player ? this.scene.player.inventory : {};
        const potions = inv ? (inv.potions || 0) : 0;
        const mpPotions = inv ? (inv.mpPotions || 0) : 0;
        const spPotions = inv ? (inv.spPotions || 0) : 0;
        const weapon = inv && inv.weapon ? inv.weapon.name : 'none';

        // Decor asset types
        let decorTypes = {};
        if (zoneData && zoneData.decorLayout) {
            zoneData.decorLayout.forEach(d => {
                const base = d.asset ? d.asset.replace(/_\d+$/, '') : 'unknown';
                decorTypes[base] = (decorTypes[base] || 0) + 1;
            });
        }
        const decorBreakdown = Object.entries(decorTypes).map(([k, v]) => `${k}×${v}`).join(', ') || 'none';

        const c = (label, val, color = '#0f0') => `<span style="color:#888">${label}:</span> <span style="color:${color}">${val}</span>`;

        // Party member debug info
        let partyDebug = '';
        if (this.scene.partyMembers && this.scene.partyMembers.length > 0) {
            partyDebug = this.scene.partyMembers.map((m, i) => {
                const s = m.sprite;
                const cd = m.classData;
                const texKey = s ? s.texture.key : '?';
                const pos = s ? `${Math.round(s.x)},${Math.round(s.y)}` : '?';
                const vis = s ? `vis=${s.visible} α=${s.alpha.toFixed(2)} act=${s.active}` : '?';
                const sc = s ? `sc=${s.scaleX.toFixed(1)},${s.scaleY.toFixed(1)}` : '?';
                const sz = s && s.body ? `body=${Math.round(s.body.width)}x${Math.round(s.body.height)}` : 'no body';
                const frame = s ? `frame=${s.frame.name}` : '?';
                const anim = s && s.anims && s.anims.currentAnim ? s.anims.currentAnim.key : 'none';
                return `<span style="color:#af0">Party[${i}]</span> ${c('cls', cd ? cd.id : '?', '#da0')} ${c('tex', texKey, '#8af')} ${c('pos', pos, '#0f0')} ${c('frame', frame, '#ff0')}<br>&nbsp;&nbsp;${vis} ${sc} ${sz} anim=${anim} fw=${cd?cd.frameWidth:'?'} fh=${cd?cd.frameHeight:'?'}`;
            }).join('<br>');
        }

        // Enemy debug info
        let enemyDebug = '';
        if (this.scene.enemies && this.scene.enemies.getChildren().length > 0) {
            enemyDebug = this.scene.enemies.getChildren().map((e, i) => {
                if (!e.active) return '';
                const type = e.controller ? e.controller.type : '?';
                const hpStr = e.controller ? `${e.controller.hp}/${e.controller.maxHp}` : '?';
                const texKey = e.texture ? e.texture.key : '?';
                const pos = `${Math.round(e.x)},${Math.round(e.y)}`;
                const vis = `vis=${e.visible} α=${e.alpha.toFixed(2)} act=${e.active}`;
                const sc = `sc=${e.scaleX.toFixed(1)},${e.scaleY.toFixed(1)}`;
                const sz = e.body ? `body=${Math.round(e.body.width)}x${Math.round(e.body.height)}` : 'no body';
                const frame = e.frame ? `frame=${e.frame.name}` : '?';
                const anim = e.anims && e.anims.currentAnim ? e.anims.currentAnim.key : 'none';
                return `<span style="color:#f88">Enemy[${i}]</span> ${c('type', type, '#da0')} ${c('hp', hpStr, '#f44')} ${c('tex', texKey, '#8af')} ${c('pos', pos, '#0f0')}<br>&nbsp;&nbsp;${vis} ${sc} ${sz} frame=${frame} anim=${anim}`;
            }).filter(s => s !== '').join('<br>');
        }

        // ALL NPC debug info — both standard and custom for comparison
        let allNpcDebug = '';
        if (this.scene.npcs && this.scene.npcs.length > 0) {
            // Platform/world context
            const platChildren = this.scene.platforms ? this.scene.platforms.getChildren() : [];
            const platCount = platChildren.length;
            const floorBlocks = platChildren.filter(p => p.y >= 680 && p.y <= 720);
            const floorY = floorBlocks.length > 0 ? Math.round(floorBlocks[0].y) : '?';
            const floorBodyTop = floorBlocks.length > 0 && floorBlocks[0].body ? Math.round(floorBlocks[0].body.top) : '?';
            const floorBodyH = floorBlocks.length > 0 && floorBlocks[0].body ? Math.round(floorBlocks[0].body.height) : '?';
            const floorBodyEnabled = floorBlocks.length > 0 && floorBlocks[0].body ? floorBlocks[0].body.enable : '?';
            const floorPhysType = floorBlocks.length > 0 && floorBlocks[0].body ? floorBlocks[0].body.physicsType : '?';
            const wb = this.scene.physics.world.bounds;
            const worldBounds = `${Math.round(wb.x)},${Math.round(wb.y)} ${Math.round(wb.width)}x${Math.round(wb.height)}`;

            // Physics world collider scan
            const allColliders = this.scene.physics.world.colliders ? this.scene.physics.world.colliders.getActive() : [];
            const totalColliders = allColliders.length;

            // Platform group info
            const platGroupType = this.scene.platforms ? this.scene.platforms.classType?.name || typeof this.scene.platforms : '?';
            const platGroupActive = this.scene.platforms && this.scene.platforms.active;

            allNpcDebug = '<span style="color:#0ff;font-weight:bold">── ALL NPCs (std+custom) ──</span><br>' +
            `&nbsp;&nbsp;${c('platforms', platCount, '#da0')} ${c('floorBlocks', floorBlocks.length, '#da0')} ${c('floor.y', floorY, '#ff0')} ${c('floor.bodyTop', floorBodyTop, '#fa0')}<br>` +
            `&nbsp;&nbsp;${c('floor.bodyH', floorBodyH, '#fa0')} ${c('floor.bodyEnabled', floorBodyEnabled, floorBodyEnabled === true ? '#0f0' : '#f44')} ${c('floor.physType', floorPhysType, '#da0')}<br>` +
            `&nbsp;&nbsp;${c('worldBounds', worldBounds, '#888')}<br>` +
            `&nbsp;&nbsp;${c('totalWorldColliders', totalColliders, '#ff0')} ${c('platGroupActive', platGroupActive, platGroupActive ? '#0f0' : '#f44')} ${c('platGroupType', platGroupType, '#888')}<br>` +
            this.scene.npcs.map((n, i) => {
                const s = n.sprite;
                const isCustom = n.isCustom;
                const tag = isCustom ? '<span style="color:#f0f;font-weight:bold">CUSTOM</span>' : '<span style="color:#8f8">STD</span>';
                if (!s) return `<span style="color:#0ff">NPC[${i}]</span> ${tag} <span style="color:#f44">NO SPRITE</span>`;
                const b = s.body;
                const fr = s.frame;

                // Sprite basics
                const pos = `${Math.round(s.x)},${Math.round(s.y)}`;
                const origin = `${s.originX.toFixed(2)},${s.originY.toFixed(2)}`;
                const scale = `${s.scaleX.toFixed(1)},${s.scaleY.toFixed(1)}`;
                const sprActive = s.active;
                const sprVisible = s.visible;
                const depth = s.depth;
                const texKey = s.texture ? s.texture.key : '?';

                // Frame info
                const frameName = fr ? fr.name : '?';
                const frameDims = fr ? `${fr.width}x${fr.height}` : '?';
                const anim = s.anims && s.anims.currentAnim ? s.anims.currentAnim.key : 'none';
                const animFrameCount = s.anims && s.anims.currentAnim ? s.anims.currentAnim.frames.length : 0;

                if (!b) return `<span style="color:#0ff">NPC[${i}]</span> ${tag} ${c('name', n.npcName, '#fff')} <span style="color:#f44">NO BODY</span> pos=${pos}`;

                // Body core
                const bodyPos = `${Math.round(b.position.x)},${Math.round(b.position.y)}`;
                const bodyBot = Math.round(b.bottom);
                const bodyTop = Math.round(b.top);
                const bodyOff = `${b.offset.x.toFixed(1)},${b.offset.y.toFixed(1)}`;
                const bodySrc = `${b.sourceWidth}x${b.sourceHeight}`;
                const bodyScaled = `${Math.round(b.width)}x${Math.round(b.height)}`;
                const vel = `${Math.round(b.velocity.x)},${Math.round(b.velocity.y)}`;

                // Body flags
                const bEnable = b.enable;
                const bMoves = b.moves;
                const bImmovable = b.immovable;
                const bGrav = b.allowGravity;
                const bCWB = b.collideWorldBounds;
                const bEmbedded = b.embedded;
                const bPhysType = b.physicsType; // 0=DYNAMIC, 1=STATIC
                const bCustomSepX = b.customSeparateX;
                const bCustomSepY = b.customSeparateY;
                const bMaxVelY = b.maxVelocity ? Math.round(b.maxVelocity.y) : '?';
                const bOverlapX = b.overlapX;
                const bOverlapY = b.overlapY;
                const bGameObjMatch = b.gameObject === s;
                const bInWorld = b.world ? true : false;

                // Prev position (body._prev or prev)
                const prevY = b.prev ? Math.round(b.prev.y) : '?';
                const deltaY = b.prev ? Math.round(b.position.y - b.prev.y) : '?';

                // Collision state
                const blocked = `U:${b.blocked.up} D:${b.blocked.down} L:${b.blocked.left} R:${b.blocked.right}`;
                const touching = `U:${b.touching.up} D:${b.touching.down} L:${b.touching.left} R:${b.touching.right}`;
                const checkColl = b.checkCollision ? `U:${b.checkCollision.up} D:${b.checkCollision.down} L:${b.checkCollision.left} R:${b.checkCollision.right}` : '?';

                // Collider scan: find colliders involving this sprite
                let colliderInfo = 'NONE';
                let colliderCount = 0;
                if (allColliders.length > 0) {
                    const matching = allColliders.filter(col => {
                        return col.object1 === s || col.object2 === s ||
                               (col.object1 && col.object1.getChildren && col.object1.getChildren().includes(s)) ||
                               (col.object2 && col.object2.getChildren && col.object2.getChildren().includes(s));
                    });
                    colliderCount = matching.length;
                    if (matching.length > 0) {
                        colliderInfo = matching.map(col => {
                            const other = col.object1 === s ? col.object2 : col.object1;
                            const otherType = other === this.scene.platforms ? 'PLATFORMS' :
                                              (other && other.getChildren ? `Group(${other.getChildren().length})` :
                                              (other && other.texture ? other.texture.key : typeof other));
                            return `${col.active ? 'ACT' : 'INACT'}|overlap=${col.overlapOnly}|other=${otherType}`;
                        }).join('; ');
                    }
                }

                // Foot data (only for custom)
                let footInfo = '';
                if (isCustom) {
                    const fd = window.npcFootData && window.npcFootData[n.spriteKey];
                    const idx = fr ? ((typeof fr.name === 'number') ? fr.name : parseInt(fr.name, 10)) : -1;
                    const curFootY = fd && !isNaN(idx) && fd[idx] != null ? fd[idx] : 'null';
                    const footArr = fd ? fd.slice(0, 16).map((v, fi) => fi === idx ? `[${v}]` : v).join(',') : 'none';
                    footInfo = `<br>&nbsp;&nbsp;${c('curFootY', curFootY, '#f0f')} <span style="color:#888;font-size:10px">feet: ${footArr}</span>`;
                }

                // Floor status
                const onFloor = b.blocked.down || b.touching.down;
                const floorStatus = onFloor ?
                    (bodyBot > 750 ? '<span style="color:#fa0;font-weight:bold">ON_WORLDBOUNDS</span>' : '<span style="color:#0f0;font-weight:bold">ON_FLOOR</span>') :
                    (bodyBot > 750 ? '<span style="color:#f00;font-weight:bold">FELL THROUGH</span>' :
                     bodyBot > 700 ? '<span style="color:#fa0;font-weight:bold">SINKING</span>' :
                     `<span style="color:#ff0">FALLING vel.y=${Math.round(b.velocity.y)}</span>`);

                const factInfo = n.faction ? ` [Faction: ${n.faction} | ${n.politicalTitle || 'Commoner'} (${n.factionRank})]` : '';
                return `<span style="color:#0ff;font-weight:bold">NPC[${i}]</span> ${tag} ${c('key', n.spriteKey.substring(0,20), '#8af')} ${c('name', n.npcName + factInfo, '#fff')} ${floorStatus}<br>` +
                    `&nbsp;&nbsp;${c('spr.pos', pos, '#0f0')} ${c('origin', origin, '#da0')} ${c('scale', scale, '#da0')} ${c('tex', texKey.substring(0,20), '#888')}<br>` +
                    `&nbsp;&nbsp;${c('active', sprActive, sprActive ? '#0f0' : '#f44')} ${c('visible', sprVisible, sprVisible ? '#0f0' : '#f44')} ${c('depth', depth, '#888')}<br>` +
                    `&nbsp;&nbsp;${c('body.pos', bodyPos, '#ff0')} ${c('body.top', bodyTop, '#fa0')} ${c('body.bot', bodyBot, bodyBot > 700 ? '#f44' : '#0f0')}<br>` +
                    `&nbsp;&nbsp;${c('offset', bodyOff, '#fa0')} ${c('bodySrc', bodySrc, '#8af')} ${c('bodyScaled', bodyScaled, '#8af')}<br>` +
                    `&nbsp;&nbsp;${c('vel', vel, '#af0')} ${c('prevY', prevY, '#888')} ${c('deltaY', deltaY, '#888')}<br>` +
                    `&nbsp;&nbsp;${c('enable', bEnable, bEnable ? '#0f0' : '#f44')} ${c('moves', bMoves, bMoves ? '#0f0' : '#f44')} ${c('grav', bGrav, bGrav ? '#0f0' : '#f44')} ${c('immov', bImmovable, '#da0')} ${c('cwb', bCWB, '#da0')}<br>` +
                    `&nbsp;&nbsp;${c('physType', bPhysType, '#da0')} ${c('inWorld', bInWorld, bInWorld ? '#0f0' : '#f44')} ${c('gameObjMatch', bGameObjMatch, bGameObjMatch ? '#0f0' : '#f44')} ${c('embedded', bEmbedded, bEmbedded ? '#f44' : '#0f0')}<br>` +
                    `&nbsp;&nbsp;${c('customSep', `X:${bCustomSepX} Y:${bCustomSepY}`, '#da0')} ${c('maxVelY', bMaxVelY, '#da0')} ${c('overlapXY', `${bOverlapX},${bOverlapY}`, '#da0')}<br>` +
                    `&nbsp;&nbsp;${c('blocked', blocked, '#ff0')}<br>` +
                    `&nbsp;&nbsp;${c('touching', touching, '#ff0')}<br>` +
                    `&nbsp;&nbsp;${c('checkColl', checkColl, '#da0')}<br>` +
                    `&nbsp;&nbsp;${c('frame', frameName, '#ff0')} ${c('dims', frameDims, '#da0')} ${c('animFr', animFrameCount, '#8af')} ${c('anim', anim, '#8af')}<br>` +
                    `&nbsp;&nbsp;${c('COLLIDERS', colliderCount, colliderCount > 0 ? '#0f0' : '#f00')} <span style="color:#888;font-size:10px">${colliderInfo}</span>` +
                    footInfo;
            }).join('<br>');
        }

        const isCapital = window.isCapitalCity ? window.isCapitalCity(zoneIdx) : false;
        const subType = zoneType === 'Safe' ? (isCapital ? 'Capital City' : 'Town') : 'Wilderness';

        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIdx) : null;
        const faction = window.getFactionForZone ? window.getFactionForZone(zoneIdx) : null;
        const rep = faction ? (window.getFactionReputation ? window.getFactionReputation(faction.id) : 0) : 0;
        
        const polInfo = kingdom ? 
            (c('Kingdom', kingdom.name, '#da0') + ' │ ' + c('Faction', faction ? faction.name : 'none', '#8af') + ` (${rep} Rep)`) : 
            '<span style="color:#aaa">Kingdom: None (Frontier)</span>';

        el.innerHTML = [
            c('Zone', `${zoneIdx}`, '#ff0') + ' │ ' + c('Biome', biome, '#0ff') + ' │ ' + c('Type', subType, zoneType === 'Safe' ? '#0f0' : '#f88'),
            polInfo,
            c('Name', zoneName, '#fff'),
            c('FPS', fps, fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00') + ' │ ' + c('Class', classId, '#da0') + ' │ ' + c('Lv', level, '#ff0'),
            c('Pos', `${px}, ${py}`) + ' │ ' + c('HP', hp, '#f44') + ' │ ' + c('MP', mp, '#48f') + ' │ ' + c('SP', sp, '#4f4'),
            c('Gold', gold, '#fd0') + ' │ ' + c('Align', alignment, alignment > 0 ? '#0f0' : alignment < 0 ? '#f44' : '#888'),
            c('Enemies', `${enemyCount}`, '#f88') + ' │ ' + c('NPCs', npcCount, '#8af') + ' │ ' + c('Party', `${partyCount}/2`, '#af0'),
            c('Enemy Types', enemyBreakdown, '#fa8'),
            c('Weapon', weapon, '#da0') + ' │ ' + c('Pot', `${potions}HP ${mpPotions}MP ${spPotions}SP`, '#8f8'),
            c('Decor', `${decorCount} items`, '#aaa'),
            `<span style="color:#666;font-size:10px">${decorBreakdown}</span>`,
            partyDebug,
            enemyDebug,
            allNpcDebug
        ].filter(s => s !== '').join('<br>');
    }

    _renderPassiveSkillsTab() {
        const grid = document.getElementById('cs-skills-list-grid');
        const pointsDisplay = document.getElementById('cs-unspent-points-display');
        if (!grid || !window.PASSIVE_SKILLS_DATA || !window.saveData) return;

        const classId = window.saveData.classId || 'knight';
        const unspentPoints = window.saveData.skillPoints || 0;
        if (pointsDisplay) pointsDisplay.innerText = unspentPoints;

        // Filter skills for this class
        const classSkills = window.PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
        
        // Render each skill card
        grid.innerHTML = classSkills.map(skill => {
            const currentRank = (window.saveData.passiveSkills && window.saveData.passiveSkills[skill.id]) || 0;
            const maxRank = skill.maxRank || 5;
            const isMax = currentRank >= maxRank;
            
            // Build indicators for rank
            let rankDots = '';
            for (let r = 1; r <= maxRank; r++) {
                const filled = r <= currentRank;
                rankDots += `<span class="inline-block w-2.5 h-2.5 rounded-full border border-primary/40 mr-1" style="background-color: ${filled ? '#2ddbde' : 'transparent'}; box-shadow: ${filled ? '0 0 6px #2ddbde' : 'none'};"></span>`;
            }

            const buttonHtml = isMax
                ? `<span class="px-3 py-1 bg-outline-variant/30 text-outline-variant font-bold text-[11px] uppercase tracking-wider rounded border border-outline-variant/30">MAX RANK</span>`
                : (unspentPoints > 0 
                    ? `<button data-skill-id="${skill.id}" class="btn-upgrade-skill px-4 py-1.5 bg-primary text-background font-bold text-[11px] uppercase tracking-wider rounded hover:bg-primary/80 transition-all cursor-pointer">Upgrade</button>`
                    : `<button class="px-4 py-1.5 bg-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider rounded cursor-not-allowed" disabled>Locked</button>`
                  );

            const iconUrl = `src/assets/skills/${skill.id}.png`;
            const iconHtml = `<div class="w-12 h-12 bg-surface-container-lowest rounded border border-outline-variant flex items-center justify-center overflow-hidden shrink-0"><img src="${iconUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMxMCAxMCAxMCAxMCAxMC0xMCAxMC0xMFMyIDEyIDEyIDJ6Ii8+PC9zdmc+'" style="width:100%; height:100%; image-rendering:pixelated;" /></div>`;

            return `
                <div class="bg-surface-container-highest/40 p-4 rounded border border-outline-variant/40 flex flex-col justify-between gap-3 shadow hover:border-primary/40 transition-colors">
                    <div class="flex gap-3">
                        ${iconHtml}
                        <div class="flex-grow min-w-0">
                            <div class="flex justify-between items-start gap-1">
                                <h4 class="font-bold text-[14px] text-on-surface truncate">${skill.name}</h4>
                                <span class="bg-surface-container px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold text-secondary border border-outline-variant">${skill.aspect || skill.type}</span>
                            </div>
                            <p class="text-[11px] text-on-surface-variant leading-snug mt-1">${skill.description}</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center border-t border-outline-variant/30 pt-3 mt-1">
                        <div class="flex items-center">
                            ${rankDots}
                        </div>
                        <div>
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Register upgrade button click listeners
        grid.querySelectorAll('.btn-upgrade-skill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skillId = e.currentTarget.dataset.skillId;
                this._upgradeSkill(skillId);
            });
        });
    }

    _upgradeSkill(skillId) {
        if (!window.saveData || (window.saveData.skillPoints || 0) <= 0) return;
        
        window.saveData.passiveSkills = window.saveData.passiveSkills || {};
        const skill = window.PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
        if (!skill) return;

        const currentRank = window.saveData.passiveSkills[skillId] || 0;
        const maxRank = skill.maxRank || 5;
        if (currentRank >= maxRank) return;

        // Spend point
        window.saveData.skillPoints--;
        window.saveData.passiveSkills[skillId] = currentRank + 1;

        // Recalculate stats immediately
        if (this.scene.player) {
            if (typeof this.scene.player.recalculateStats === 'function') {
                this.scene.player.recalculateStats();
            } else if (this.scene.player.statsManager) {
                this.scene.player.statsManager.recalculateStats();
            }
        }
        
        // Save game state
        if (this.scene.player && typeof this.scene.player.saveGame === 'function') {
            this.scene.player.saveGame();
        }

        // Refresh UI tabs
        this._updateCharacterSheet();
        this._renderPassiveSkillsTab();
    }

    showUnspentSkillPointsBanner() {
        if (document.getElementById('skill-points-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'skill-points-banner';
        // Beautiful and highly polished M3 layout styling
        banner.style.cssText = 'position:fixed; top:72px; left:50%; transform:translateX(-50%); z-index:90; background-color:rgba(18,18,18,0.95); border:2px solid #2ddbde; border-radius:8px; padding:16px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(45,219,222,0.25); width:320px; pointer-events:auto; display:flex; flex-direction:column; gap:8px; align-items:center; font-family: "Space Grotesk", sans-serif; color:#e0e0e0;';

        banner.innerHTML = `
            <h4 style="color:#2ddbde; margin:0; text-transform:uppercase; font-size:14px; font-weight:bold; letter-spacing:1.5px;">Unspent Skill Points!</h4>
            <p style="margin:0; font-size:11px; line-height:1.4; color:#aaa;">A new passive skills system is active! You have <span style="color:#f6be3b; font-weight:bold;">${window.saveData.skillPoints}</span> unallocated skill points.</p>
            <div style="display:flex; gap:8px; width:100%; margin-top:8px; justify-content:center;">
                <button id="btn-banner-open-skills" style="padding:6px 16px; background-color:#2ddbde; color:#121212; border:none; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; border-radius:4px; cursor:pointer;">Allocate</button>
                <button id="btn-banner-close-skills" style="padding:6px 16px; background-color:#333; color:#ccc; border:none; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; border-radius:4px; cursor:pointer;">Dismiss</button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('btn-banner-open-skills').addEventListener('click', () => {
            banner.remove();
            this.toggleCharacterSheet('skills');
        });

        document.getElementById('btn-banner-close-skills').addEventListener('click', () => {
            banner.remove();
        });
    }
}

