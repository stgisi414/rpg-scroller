class StatsManager {
    constructor(player) {
        this.player = player;
    }

    recalculateStats() {
        const player = this.player;
        const baseStats = player.classData.stats || { vit: 10, str: 10, dex: 10, int: 10, luck: 10 };
        // Sanitize stats against NaN corruption from older saves
        if (typeof baseStats.dex !== 'number' || isNaN(baseStats.dex)) baseStats.dex = 10;
        if (typeof baseStats.str !== 'number' || isNaN(baseStats.str)) baseStats.str = 10;
        if (typeof baseStats.vit !== 'number' || isNaN(baseStats.vit)) baseStats.vit = 10;
        if (typeof baseStats.int !== 'number' || isNaN(baseStats.int)) baseStats.int = 10;
        if (typeof baseStats.luck !== 'number' || isNaN(baseStats.luck)) baseStats.luck = 10;

        const temp = player.tempStats || { vit: 0, str: 0, dex: 0, int: 0, luck: 0 };
        const stats = {
            vit: baseStats.vit + (temp.vit || 0),
            str: baseStats.str + (temp.str || 0),
            dex: baseStats.dex + (temp.dex || 0),
            int: baseStats.int + (temp.int || 0),
            luck: baseStats.luck + (temp.luck || 0)
        };

        // --- Apply Passive Skills Modifiers ---
        const passives = player.passiveSkills || ( (!player.isAI && window.saveData) ? (window.saveData.passiveSkills || {}) : {} );
        const activeModifiers = {};
        for (const skillId in passives) {
            const rank = passives[skillId] || 0;
            if (rank > 0 && window.PASSIVE_SKILLS_DATA) {
                const skillDef = window.PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
                if (skillDef && skillDef.statsModifiers) {
                    for (const statKey in skillDef.statsModifiers) {
                        const val = skillDef.statsModifiers[statKey];
                        if (statKey.toLowerCase().includes('multiplier')) {
                            // Multipliers (like 1.15 or 0.9) represent (1 + delta).
                            // We aggregate the delta: (val - 1) * rank.
                            const delta = val - 1;
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + delta * rank;
                        } else {
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + val * rank;
                        }
                    }
                }
            }
        }

        // Apply attribute bonuses from skills
        stats.vit += (activeModifiers.vit || 0);
        stats.str += (activeModifiers.str || 0);
        stats.dex += (activeModifiers.dex || 0);
        stats.int += (activeModifiers.int || 0);
        stats.luck += (activeModifiers.luck || 0);

        player.luck = stats.luck;

        // Apply base calculations
        player.speed = 200 + (stats.dex * 5);          // DEX → movement speed
        player.jumpVelocity = -400 - (stats.str * 10);  // STR → jump height
        player.dashSpeed = 400 + (stats.dex * 15);       // DEX → dash speed & distance
        player.maxHp = stats.vit * 10;                   // VIT → max HP
        player.critChance = stats.dex * 0.5;             // DEX → crit %

        // Apply percentage multipliers from skills
        if (activeModifiers.move_speed_multiplier) player.speed *= (1 + activeModifiers.move_speed_multiplier);
        if (activeModifiers.speedMultiplier) player.speed *= (1 + activeModifiers.speedMultiplier);
        if (activeModifiers.max_hp_multiplier) player.maxHp = Math.floor(player.maxHp * (1 + activeModifiers.max_hp_multiplier));
        if (activeModifiers.crit_chance) player.critChance += (activeModifiers.crit_chance * 100);

        // MP system (wizard primary, others get small pool)
        const classId = player.classData.id;
        if (classId === 'wizard') {
            player.maxMp = 50 + (stats.int * 5);
        } else {
            player.maxMp = 20 + (stats.int * 2);
        }
        if (activeModifiers.max_mp_multiplier) player.maxMp = Math.floor(player.maxMp * (1 + activeModifiers.max_mp_multiplier));
        
        // SP (Stamina) system - used for dashing
        player.maxSp = 50 + (stats.dex * 3);
        if (activeModifiers.max_sp_multiplier) player.maxSp = Math.floor(player.maxSp * (1 + activeModifiers.max_sp_multiplier));

        // --- Apply Artifact Boosts ---
        let partyBoosts = { maxHp: 0, maxMp: 0, maxSp: 0, speedMultiplier: 1.0 };

        // Check if ANY party member has Commander's Horn
        if (player.scene && player.scene.player) {
            const checkCommander = (p) => {
                if (p && p.inventory && p.inventory.artifacts && p.inventory.equippedArtifact >= 0) {
                    const artKey = p.inventory.artifacts[p.inventory.equippedArtifact];
                    const artData = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artKey] : null;
                    if (artData && artData.special === 'party-boost') return true;
                }
                return false;
            };
            
            let hasCommander = checkCommander(player.scene.player);
            if (!hasCommander && player.scene.partyMembers) {
                hasCommander = player.scene.partyMembers.some(checkCommander);
            }
            if (hasCommander) {
                player.maxHp = Math.floor(player.maxHp * 1.5);
                player.maxMp = Math.floor(player.maxMp * 1.5);
                player.maxSp = Math.floor(player.maxSp * 1.5);
                player.speed *= 1.5;
            }
        }

        // Apply personal artifact boosts
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef) {
                // Check alignment if required
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) {
                        alignmentValid = false;
                    }
                }
                
                if (alignmentValid && artifactDef.statBoosts) {
                    if (artifactDef.statBoosts.maxHp) player.maxHp += artifactDef.statBoosts.maxHp;
                    if (artifactDef.statBoosts.maxMp) player.maxMp += artifactDef.statBoosts.maxMp;
                    if (artifactDef.statBoosts.maxSp) player.maxSp += artifactDef.statBoosts.maxSp;
                    if (artifactDef.statBoosts.speedMultiplier) player.speed *= artifactDef.statBoosts.speedMultiplier;
                    if (artifactDef.statBoosts.luck) {
                        player.luck += artifactDef.statBoosts.luck;
                    }
                }
            }
        }

        if (player.mp === undefined) player.mp = player.maxMp;
        if (player.sp === undefined) player.sp = player.maxSp;

        // Restore HP from save or fully heal
        if (!player.isAI && window.saveData && window.saveData.hp !== undefined && window.saveData.hp > 0) {
            player.hp = window.saveData.hp;
        } else {
            player.hp = player.maxHp;
        }
        // Restore MP/SP from save (stricter guard against NaN/null from old saves)
        if (!player.isAI && window.saveData) {
            if (typeof window.saveData.mp === 'number' && !isNaN(window.saveData.mp)) {
                player.mp = Math.min(window.saveData.mp, player.maxMp);
            } else {
                player.mp = player.maxMp;
            }
            if (typeof window.saveData.sp === 'number' && !isNaN(window.saveData.sp)) {
                player.sp = Math.min(window.saveData.sp, player.maxSp);
            } else {
                player.sp = player.maxSp;
            }
        }
        
        // Final safety: if STILL somehow NaN, reset to max/defaults
        if (typeof player.speed !== 'number' || isNaN(player.speed)) player.speed = 200;
        if (typeof player.jumpVelocity !== 'number' || isNaN(player.jumpVelocity)) player.jumpVelocity = -400;
        if (typeof player.dashSpeed !== 'number' || isNaN(player.dashSpeed)) player.dashSpeed = 500;
        if (typeof player.mp !== 'number' || isNaN(player.mp)) player.mp = player.maxMp;
        if (typeof player.sp !== 'number' || isNaN(player.sp)) player.sp = player.maxSp;

        // Update HUD to reflect new stats
        if (!player.isAI && player.inventory && player.scene && player.scene.updateHUD) {
            player.scene.updateHUD();
        }
    }

    clearTempStats() {
        const player = this.player;
        player.tempStats = { vit: 0, str: 0, dex: 0, int: 0 };
        player.recalculateStats();
        if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
    }
}

if (typeof window !== 'undefined') {
    window.StatsManager = StatsManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsManager;
}
