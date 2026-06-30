/**
 * HUDCharacterSheet.js - Modular character sheet UI & skill points system.
 * Extracted from HUDManager.js to keep file size under 1000 lines.
 */
window.HUDCharacterSheet = {
    createCharacterSheetModal(hudManager) {
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
                <div class="flex gap-4 border-b border-outline-variant mb-6 relative z-10 overflow-x-auto no-scrollbar">
                    <button id="cs-tab-stats" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-primary text-primary transition-colors cursor-pointer focus:outline-none whitespace-nowrap">Attributes & Gear</button>
                    <button id="cs-tab-skills" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none whitespace-nowrap">Passive Skills</button>
                    <button id="cs-tab-political" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none whitespace-nowrap">Political Standing</button>
                    <button id="cs-tab-party" class="px-6 py-2 text-[14px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none whitespace-nowrap">Party Management</button>
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
                            <h3 class="font-headline-sm text-info uppercase border-b border-outline-variant pb-2 mb-4 flex items-center gap-2 text-[18px]"><span class="material-symbols-outlined text-[22px]">explore</span> Exploration</h3>
                            <div id="cs-exploration-stats" class="space-y-3 bg-surface-container-highest/50 p-4 rounded border border-outline-variant/50 shadow-inner">
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

                <!-- Tab 3 Panel: Political Standing -->
                <div id="cs-panel-political" style="display: none; max-height: 50vh;" class="relative z-10 overflow-y-auto pr-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <section class="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40 flex flex-col">
                            <h2 class="font-headline-md text-[20px] text-on-surface mb-8 flex items-center gap-3">
                                <span class="material-symbols-outlined text-secondary">public</span> Overall Social Standing
                            </h2>
                            <div class="flex-1 flex flex-col items-center justify-center mb-8">
                                <div class="relative w-48 h-48 flex items-center justify-center">
                                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                        <circle class="text-surface-variant" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" stroke-width="10"></circle>
                                        <circle id="cs-renown-gauge" class="text-secondary drop-shadow-[0_0_8px_rgba(246,190,59,0.5)]" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" stroke-dasharray="314.15" stroke-dashoffset="314.15" stroke-width="10" style="transition: stroke-dashoffset 1s ease-in-out;"></circle>
                                    </svg>
                                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span id="cs-renown-percent" class="font-headline-lg text-[32px] font-bold text-secondary mb-1">0%</span>
                                        <span class="font-label-caps text-on-surface-variant uppercase tracking-widest text-[10px]">Renown</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-surface-container p-4 border border-outline-variant/60 rounded flex items-center justify-between mt-auto">
                                <div>
                                    <p class="font-label-caps text-on-surface-variant mb-1 uppercase tracking-widest">Gladiator Rank</p>
                                    <p id="cs-political-arena-rank" class="font-headline-md text-xl text-on-surface font-bold text-[18px]">None</p>
                                </div>
                                <span class="material-symbols-outlined text-[36px] text-secondary/80">swords</span>
                            </div>
                        </section>
                        <section class="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40">
                            <h2 class="font-headline-md text-[20px] text-on-surface mb-8 flex items-center gap-3">
                                <span class="material-symbols-outlined text-tertiary">groups</span> Faction Reputations
                            </h2>
                            <div id="cs-factions-list" class="space-y-6">
                            </div>
                        </section>
                    </div>
                </div>

                <!-- Tab 4 Panel: Party Management -->
                <div id="cs-panel-party" style="display: none; max-height: 50vh;" class="relative z-10 overflow-y-auto pr-2 flex flex-col">
                    <div class="flex justify-between items-center mb-4 px-2 shrink-0 border-b border-outline-variant pb-2">
                        <h3 class="font-headline-md text-[20px] text-secondary flex items-center gap-2">
                            <span class="material-symbols-outlined">group</span> Active Companions
                        </h3>
                        <div class="flex gap-4 font-body-sm text-[12px] text-on-surface-variant">
                            <span id="cs-party-size-summary">Party Size: <span class="text-on-surface">0 / 6</span></span>
                        </div>
                    </div>
                    <div id="cs-party-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(modal);

        // Tab Switching Event Bindings
        const tabs = [
            { btn: document.getElementById('cs-tab-stats'), panel: document.getElementById('cs-panel-stats') },
            { btn: document.getElementById('cs-tab-skills'), panel: document.getElementById('cs-panel-skills') },
            { btn: document.getElementById('cs-tab-political'), panel: document.getElementById('cs-panel-political') },
            { btn: document.getElementById('cs-tab-party'), panel: document.getElementById('cs-panel-party') }
        ];

        tabs.forEach(tab => {
            if (!tab.btn) return;
            tab.btn.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.btn.classList.remove('border-primary', 'text-primary');
                    t.btn.classList.add('border-transparent', 'text-on-surface-variant');
                    t.panel.style.display = 'none';
                });
                tab.btn.classList.add('border-primary', 'text-primary');
                tab.btn.classList.remove('border-transparent', 'text-on-surface-variant');
                tab.panel.style.display = tab.panel === document.getElementById('cs-panel-stats') ? 'grid' : 'flex';
                if (tab.btn.id === 'cs-tab-skills') this.renderPassiveSkillsTab(hudManager);
            });
        });

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
        hudManager.scene._csEscListener = (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                modal.style.display = 'none';
                const hud = document.getElementById('game-hud');
                if (hud) hud.style.display = 'flex';
                if (document.activeElement) document.activeElement.blur();
            }
        };
        window.addEventListener('keydown', hudManager.scene._csEscListener);
    },

    updateCharacterSheet(hudManager) {
        const p = hudManager.scene.player;
        if (!p) return;
        
        const stats = p.classData.stats;
        const cd = p.classData;
        const level = saveData ? saveData.level : 1;
        const name = saveData ? saveData.name : 'Unknown';
        const xp = saveData ? saveData.xp : 0;
        const nextXp = level * 100;
        const gold = saveData ? saveData.gold : 0;
        const align = saveData ? saveData.alignment : 0;
        
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
        spriteImg.style.backgroundPosition = `0px -${cd.idleRow === undefined ? 0 : cd.idleRow * frameH}px`;
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

        let drMult = typeof p.getDamageReduction === 'function' ? p.getDamageReduction() : 0.0;
        let lifesteal = typeof p.getLifesteal === 'function' ? p.getLifesteal() : 0.0;
        let dynamicCrit = p.critChance || 0;
        
        if (p.combatController && typeof p.combatController.getPlayerCritChance === 'function') {
            dynamicCrit = p.combatController.getPlayerCritChance();
        }
        
        // Calculate explicit DR from status effects / active modifiers for UI if getDamageReduction doesn't have it
        if (p.statsManager) {
            const activeModifiers = {};
            if (p.passiveSkills) {
                p.passiveSkills.forEach(ps => {
                    const skillDef = window.SKILLS_DATA ? window.SKILLS_DATA[ps.id] : null;
                    if (skillDef && skillDef.effects) {
                        for (let statKey in skillDef.effects) {
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + skillDef.effects[statKey] * ps.rank;
                        }
                    }
                });
            }
            drMult = (activeModifiers.damage_reduction || 0) + (activeModifiers.damageReduction || 0);
        }
        if (p.inventory && p.inventory.artifacts && p.inventory.equippedArtifact >= 0) {
            const artifactKey = p.inventory.artifacts[p.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageReduction) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = p.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) drMult += artifactDef.statBoosts.damageReduction;
            }
        }
        if (p.statusEffects) {
            const blessEffect = p.statusEffects.find(e => e.type === 'bless');
            if (blessEffect) drMult += (blessEffect.strength / 100);
        }

        let hitChanceBase = 100;
        if (p.statusEffects) {
            const blessEffect = p.statusEffects.find(e => e.type === 'bless');
            if (blessEffect) hitChanceBase += blessEffect.strength;
        }

        document.getElementById('cs-combat-stats').innerHTML = `
            <div class="flex justify-between items-center mb-1"><span class="font-bold text-on-surface-variant">Max Output Damage</span><span class="font-bold text-primary text-[20px]">~${finalDmg}</span></div>
            <div class="text-[12px] text-on-surface-variant mb-3 border-l-2 border-outline-variant pl-2 font-mono">
                Base ${baseDmgStr}: <span class="text-on-surface">${baseDmg}</span><br>
                Weapon Bonus: <span class="text-tertiary">+${weaponBonus}</span><br>
                Multipliers: <span class="text-info">x${dmgMult.toFixed(2)}</span>
            </div>
            
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Hit / Accuracy</span><span class="font-bold text-success text-[16px]">${hitChanceBase}%</span></div>
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Critical Hit Chance</span><span class="font-bold text-secondary text-[16px]">${dynamicCrit.toFixed(1)}%</span></div>
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Damage Reduction</span><span class="font-bold text-info text-[16px]">${(drMult * 100).toFixed(0)}%</span></div>
            <div class="flex justify-between items-center mb-1 mt-2"><span class="font-bold text-on-surface-variant">Lifesteal</span><span class="font-bold text-error text-[16px]">${(lifesteal * 100).toFixed(0)}%</span></div>
        `;

        // --- Exploration ---
        document.getElementById('cs-exploration-stats').innerHTML = `
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Movement Speed</span><span class="font-bold text-[16px]">${p.speed} px/s</span></div>
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Dash Power</span><span class="font-bold text-[16px]">${p.dashSpeed} px/s</span></div>
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-on-surface-variant">Jump Power</span><span class="font-bold text-[16px]">${Math.abs(p.jumpVelocity)} px/s</span></div>
        `;

        // --- Political Status & Arena ---
        const highestWave = p.coliseumHighestWave || 0;
        const colRep = p.coliseumReputation || 0;
        let rankStr = "Unranked";
        if (colRep > 1000) rankStr = "Champion";
        else if (colRep > 500) rankStr = "Centurion";
        else if (colRep > 200) rankStr = "Gladiator";
        else if (colRep > 50) rankStr = "Pit Fighter";
        document.getElementById('cs-political-arena-rank').innerText = rankStr;

        // Calculate overall renown (alignment + overall fame)
        const famePct = Math.min(100, Math.max(0, 50 + (align * 0.5) + (colRep * 0.05)));
        document.getElementById('cs-renown-percent').innerText = `${Math.round(famePct)}%`;
        const renownGauge = document.getElementById('cs-renown-gauge');
        if (renownGauge) {
            // Circle is 314.15 circumference, offset = 314.15 - (pct * 314.15)
            renownGauge.style.strokeDashoffset = 314.15 - ((famePct / 100) * 314.15);
        }

        let factionsHtml = "";
        const playerReputations = saveData && saveData.factionReputation ? saveData.factionReputation : {};
        if (window.WORLD_FACTIONS) {
            for (const factionId in window.WORLD_FACTIONS) {
                const f = window.WORLD_FACTIONS[factionId];
                if (!f.hidden) {
                    const rep = playerReputations[factionId] || 0;
                    let statusLabel = "NEUTRAL";
                    let textColor = "#e3beb8"; // on-surface-variant
                    let barColor = "#e3beb8";
                    let pct = 50 + (rep / 2); // -100 to 100 maps to 0 to 100
                    pct = Math.max(0, Math.min(100, pct));
                    
                    if (rep >= 50) { statusLabel = "EXALTED"; textColor = "#5af8fb"; barColor = "#5af8fb"; }
                    else if (rep >= 20) { statusLabel = "HONORED"; textColor = "#4ade80"; barColor = "#4ade80"; }
                    else if (rep <= -50) { statusLabel = "NEMESIS"; textColor = "#ffb4ab"; barColor = "#ffb4ab"; }
                    else if (rep <= -20) { statusLabel = "UNFRIENDLY"; textColor = "#ff9800"; barColor = "#ff9800"; }
                    else if (rep <= -10) { statusLabel = "DISTRUSTED"; textColor = "#e8a09b"; barColor = "#e8a09b"; }

                    factionsHtml += `
                    <div class="mb-4">
                        <div class="flex justify-between items-end mb-1 gap-2">
                            <h3 class="font-headline-md text-[14px] text-on-surface truncate flex-1" title="${f.name}">${f.name}</h3>
                            <span class="font-label-caps tracking-widest shrink-0 text-right" style="color: ${textColor}">${statusLabel} (${Math.round(pct)}%)</span>
                        </div>
                        <div class="h-2 w-full bg-surface-variant rounded-full overflow-hidden border border-outline-variant/30">
                            <div class="h-full transition-all duration-1000" style="width: ${pct}%; background-color: ${barColor}; box-shadow: 0 0 5px ${barColor}80;"></div>
                        </div>
                    </div>`;
                }
            }
        }
        if (factionsHtml === "") factionsHtml = `<div class="text-on-surface-variant italic text-[14px]">No known factions.</div>`;
        document.getElementById('cs-factions-list').innerHTML = factionsHtml;

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
        let partySize = 0;
        if (hudManager.scene.partyMembers && hudManager.scene.partyMembers.length > 0) {
            partySize = hudManager.scene.partyMembers.length;
            partyHtml = hudManager.scene.partyMembers.map((member, idx) => {
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
                
                const isCustom = member.classData.id && member.classData.id.startsWith('custom_npc_');
                const classLabel = isCustom ? (member.classData.weaponType || 'sword') : member.classData.id;
                const displayName = member.npcName ? member.npcName : (member.classData.id === 'knight' ? 'Warrior' : member.classData.id);

                const hpPct = Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100));
                let hpColor = "bg-emerald-500/80";
                if (hpPct < 30) hpColor = "bg-error";
                else if (hpPct < 60) hpColor = "bg-secondary";

                let mainStatName = "STR";
                let mainStatVal = member.classData.stats.str;
                let mainStatColor = "text-secondary";
                if (isMagic) { mainStatName = "INT"; mainStatVal = member.classData.stats.int; mainStatColor = "text-tertiary-fixed"; }
                else if (member.classData.id === 'ranger' || member.classData.id === 'samurai') { mainStatName = "DEX"; mainStatVal = member.classData.stats.dex; mainStatColor = "text-[#ff9800]"; }

                const spriteSrc = member.classData.image || `src/assets/${member.classData.id}.png`;
                const frameW = member.classData.frameWidth || 64;
                const frameH = member.classData.frameHeight || 64;
                const idleRow = member.classData.idleRow || 0;
                
                return `
                <div class="bg-surface-container-highest/60 border border-outline-variant/60 p-4 rounded-lg flex flex-col gap-4 hover:border-primary/50 transition-all group">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-surface-lowest border border-outline-variant/40 rounded flex items-center justify-center overflow-hidden">
                                <div style="width: ${frameW}px; height: ${frameH}px; background-image: url('${spriteSrc}'); background-position: 0px -${idleRow * frameH}px; background-repeat: no-repeat; transform: scale(1.5); image-rendering: pixelated;"></div>
                            </div>
                            <div>
                                <div class="font-headline-md text-[18px] text-on-surface uppercase leading-tight">${displayName}</div>
                                <div class="font-body-sm text-[12px] text-outline capitalize">${classLabel}</div>
                            </div>
                        </div>
                        <button onclick="window._gameScene.startPartyChat(${idx})" class="material-symbols-outlined text-outline-variant hover:text-primary cursor-pointer transition-colors" title="Chat with Companion">chat</button>
                    </div>
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between font-label-caps text-[10px]">
                            <span class="text-outline">HP</span>
                            <span class="text-on-surface">${Math.round(member.hp)}/${member.maxHp}</span>
                        </div>
                        <div class="h-1.5 bg-surface-variant w-full rounded-full overflow-hidden">
                            <div class="h-full ${hpColor}" style="width:${hpPct}%"></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 font-body-sm text-[12px]">
                        <div class="bg-surface p-1 border border-outline-variant/30 rounded flex justify-between px-2">
                            <span class="text-outline">${mainStatName}</span>
                            <span class="${mainStatColor} font-bold">${mainStatVal}</span>
                        </div>
                        <div class="bg-surface p-1 border border-outline-variant/30 rounded flex justify-between px-2">
                            <span class="text-outline">ATK</span>
                            <span class="text-primary font-bold">${mFinalDmg}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-auto">
                        <button onclick="window._gameScene.dismissPartyMember(${idx})" class="bg-surface-lowest hover:bg-error/20 border border-outline-variant/50 hover:border-error/50 rounded font-label-caps text-[11px] py-2 text-error transition-colors uppercase tracking-widest flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">person_remove</span> Dismiss
                        </button>
                        <button class="bg-surface-lowest hover:bg-surface-variant border border-outline-variant/50 hover:border-outline-variant rounded font-label-caps text-[11px] py-2 text-on-surface transition-colors uppercase tracking-widest opacity-50 cursor-not-allowed">
                            Inspect
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
        
        // Add empty recruit slots
        for (let i = partySize; i < 6; i++) {
            partyHtml += `
            <div class="bg-surface/30 border border-dashed border-outline-variant/50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-variant/30 transition-colors opacity-50 min-h-[200px]">
                <span class="material-symbols-outlined text-outline-variant text-4xl">person_add</span>
                <span class="font-label-caps text-[10px] text-outline uppercase tracking-widest">Empty Slot</span>
            </div>
            `;
        }
        
        document.getElementById('cs-party-size-summary').innerHTML = `Party Size: <span class="text-on-surface">${partySize} / 6</span>`;
        document.getElementById('cs-party-grid').innerHTML = partyHtml;

        // --- Caravan Cargo Hold ---
        const cargoHold = saveData && saveData.cargo ? saveData.cargo : {};
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
    },

    toggleCharacterSheet(hudManager, initialTab = 'stats') {
        const modal = document.getElementById('char-sheet-modal');
        const hud = document.getElementById('game-hud');
        if (!modal) return;
        if (modal.style.display === 'none') {
            this.updateCharacterSheet(hudManager);
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
    },

    renderPassiveSkillsTab(hudManager) {
        const grid = document.getElementById('cs-skills-list-grid');
        const pointsDisplay = document.getElementById('cs-unspent-points-display');
        if (!grid || !PASSIVE_SKILLS_DATA || !saveData) return;

        const classId = saveData.classId || 'knight';
        const unspentPoints = saveData.skillPoints || 0;
        if (pointsDisplay) pointsDisplay.innerText = unspentPoints;

        // Filter skills for this class
        const classSkills = PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
        
        // Render each skill card
        grid.innerHTML = classSkills.map(skill => {
            const currentRank = (saveData.passiveSkills && saveData.passiveSkills[skill.id]) || 0;
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
            const iconHtml = `<div class="w-12 h-12 bg-surface-container-lowest rounded border border-outline-variant flex items-center justify-center overflow-hidden shrink-0"><img src="${iconUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMxMCAxMCAxMCAxMCAxMCAxMCAxMC0xMCAxMC0xMFMyIDEyIDEyIDJ6Ii8+PC9zdmc+'" style="width:100%; height:100%; image-rendering:pixelated;" /></div>`;

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
                this.upgradeSkill(hudManager, skillId);
            });
        });
    },

    upgradeSkill(hudManager, skillId) {
        if (!saveData || (saveData.skillPoints || 0) <= 0) return;
        
        saveData.passiveSkills = saveData.passiveSkills || {};
        const skill = PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
        if (!skill) return;

        const currentRank = saveData.passiveSkills[skillId] || 0;
        const maxRank = skill.maxRank || 5;
        if (currentRank >= maxRank) return;

        // Spend point
        saveData.skillPoints--;
        saveData.passiveSkills[skillId] = currentRank + 1;

        // Recalculate stats immediately
        if (hudManager.scene.player) {
            if (typeof hudManager.scene.player.recalculateStats === 'function') {
                hudManager.scene.player.recalculateStats();
            } else if (hudManager.scene.player.statsManager) {
                hudManager.scene.player.statsManager.recalculateStats();
            }
        }
        
        // Save game state
        if (hudManager.scene.player && typeof hudManager.scene.player.saveGame === 'function') {
            hudManager.scene.player.saveGame();
        }

        // Refresh UI tabs
        this.updateCharacterSheet(hudManager);
        this.renderPassiveSkillsTab(hudManager);
    },

    showUnspentSkillPointsBanner(hudManager) {
        if (document.getElementById('skill-points-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'skill-points-banner';
        // Beautiful and highly polished M3 layout styling
        banner.style.cssText = 'position:fixed; top:72px; left:50%; transform:translateX(-50%); z-index:90; background-color:rgba(18,18,18,0.95); border:2px solid #2ddbde; border-radius:8px; padding:16px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(45,219,222,0.25); width:320px; pointer-events:auto; display:flex; flex-direction:column; gap:8px; align-items:center; font-family: "Space Grotesk", sans-serif; color:#e0e0e0;';

        banner.innerHTML = `
            <h4 style="color:#2ddbde; margin:0; text-transform:uppercase; font-size:14px; font-weight:bold; letter-spacing:1.5px;">Unspent Skill Points!</h4>
            <p style="margin:0; font-size:11px; line-height:1.4; color:#aaa;">A new passive skills system is active! You have <span style="color:#f6be3b; font-weight:bold;">${saveData.skillPoints}</span> unallocated skill points.</p>
            <div style="display:flex; gap:8px; width:100%; margin-top:8px; justify-content:center;">
                <button id="btn-banner-open-skills" style="padding:6px 16px; background-color:#2ddbde; color:#121212; border:none; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; border-radius:4px; cursor:pointer;">Allocate</button>
                <button id="btn-banner-close-skills" style="padding:6px 16px; background-color:#333; color:#ccc; border:none; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; border-radius:4px; cursor:pointer;">Dismiss</button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('btn-banner-open-skills').addEventListener('click', () => {
            banner.remove();
            this.toggleCharacterSheet(hudManager, 'skills');
        });

        document.getElementById('btn-banner-close-skills').addEventListener('click', () => {
            banner.remove();
        });
    }
};
