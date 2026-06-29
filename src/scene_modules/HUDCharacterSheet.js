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
                this.renderPassiveSkillsTab(hudManager);
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
        if (hudManager.scene.partyMembers && hudManager.scene.partyMembers.length > 0) {
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
            <p style="margin:0; font-size:11px; line-height:1.4; color:#aaa;">A new passive skills system is active! You have <span style="color:#f6be3b; font-weight:bold;">${window.saveData.skillPoints}</span> unallocated skill points.</p>
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
