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
        window.HUDCharacterSheet.createCharacterSheetModal(this);
    }

    toggleCharacterSheet(initialTab = 'stats') {
        window.HUDCharacterSheet.toggleCharacterSheet(this, initialTab);
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
        window.HUDCharacterSheet.updateCharacterSheet(this);
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
        window.HUDCharacterSheet.renderPassiveSkillsTab(this);
    }

    _upgradeSkill(skillId) {
        window.HUDCharacterSheet.upgradeSkill(this, skillId);
    }

    showUnspentSkillPointsBanner() {
        window.HUDCharacterSheet.showUnspentSkillPointsBanner(this);
    }
}
