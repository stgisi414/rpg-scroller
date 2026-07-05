/**
 * AI Class Presets & Subclass Templates data configurations.
 * Extracted from PlayerController.js to keep file size under 1000 lines.
 */
window.getAIClassPresetData = function(classId, weaponType = 'sword') {
    if (classId && classId.startsWith('custom_npc_')) {
        // Stats configuration based on weaponType
        let stats = { vit: 12, str: 12, dex: 12, int: 12 };
        if (weaponType === 'magic') {
            stats = { vit: 10, str: 8, dex: 11, int: 15 };
        } else if (weaponType === 'axe' || weaponType === 'pickaxe') {
            stats = { vit: 14, str: 15, dex: 8, int: 6 };
        } else if (weaponType === 'hoe') {
            stats = { vit: 13, str: 11, dex: 10, int: 8 };
        } else { // sword / default
            stats = { vit: 12, str: 13, dex: 12, int: 8 };
        }
        
        // Auto-scale AI stats based on player's level
        const playerLvl = saveData ? (saveData.level || 1) : 1;
        stats.vit += (playerLvl - 1) * 2;
        stats.str += (playerLvl - 1) * 2;
        stats.dex += (playerLvl - 1) * 1;
        stats.int += (playerLvl - 1) * (weaponType === 'magic' ? 2 : 0);

        return {
            id: classId,
            stats: stats,
            isSheet: true,
            frameWidth: 100,
            frameHeight: 64,
            flipX: true,
            idleRow: 0,
            idleFrames: 4,
            walkRow: 1,
            attackRow: 5,
            jumpRow: 3,
            fallRow: 3,
            duckRow: 1,
            dashRow: 1,
            spriteScale: 1.5,
            weaponType: weaponType,
            attackDuration: 400
        };
    }

    if (classId === 'knight_rival' || classId === 'megaboss_rival' || classId === 'heavy_knight') {
        let stats;
        let spriteScale;
        if (classId === 'megaboss_rival') {
            stats = { vit: 150, str: 50, dex: 20, int: 20 };
            spriteScale = 2.2;
        } else if (classId === 'knight_rival') {
            stats = { vit: 30, str: 25, dex: 15, int: 8 };
            spriteScale = 1.5;
        } else { // heavy_knight
            stats = { vit: 15, str: 14, dex: 9, int: 8 };
            spriteScale = 1.5;
        }
        return {
            id: classId,
            stats: stats,
            isSheet: true,
            frameWidth: 91,
            frameHeight: 64,
            flipX: true,
            idleRow: 0,
            idleFrames: 5,
            walkRow: 1,
            attackRow: 2,
            jumpRow: 1,
            fallRow: 1,
            dashRow: 1,
            spriteScale: spriteScale,
            animFrames: {
                hit: { start: 27, end: 30 },
                die: { start: 45, end: 54 },
                duck: { start: 27, end: 36 }
            },
            comboStartFrame: 37,
            comboEndFrame: 44
        };
    }

    const pixelLabMonsters = [
        'heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub',
        'flame_elemental',
        'male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'
    ];
    if (pixelLabMonsters.includes(classId)) {
        let scale = 1.5;
        if (classId === 'heavenly_cherub') scale = 0.6;
        else if (classId === 'heavenly_seraph') scale = 1.0;
        else if (classId === 'heavenly_valkyrie') scale = 1.0;
        else if (classId === 'heavenly_archangel') scale = 1.2;
        else if (classId === 'flame_elemental') scale = 0.6;
        else if (classId === 'old_demon') scale = 1.8 * 1.5;
        else scale = 1.8 * 1.5;
        
        const fw = (classId === 'old_demon') ? 80 : (classId === 'flame_elemental' ? 124 : (classId.startsWith('heavenly_') ? 128 : 64));
        const fh = (classId === 'flame_elemental' ? 124 : (classId.startsWith('heavenly_') ? 128 : 64));
        
        const monsterStats = {
            heavenly_archangel: { vit: 30, str: 20, dex: 15, int: 15 },
            heavenly_valkyrie: { vit: 25, str: 18, dex: 16, int: 10 },
            heavenly_seraph: { vit: 20, str: 15, dex: 18, int: 18 },
            heavenly_cherub: { vit: 12, str: 8, dex: 12, int: 12 },
            flame_elemental: { vit: 200, str: 20, dex: 15, int: 25 },
            male_damned: { vit: 15, str: 14, dex: 10, int: 5 },
            female_damned: { vit: 14, str: 12, dex: 12, int: 8 },
            twisted_damned: { vit: 18, str: 16, dex: 8, int: 6 },
            burning_damned: { vit: 16, str: 15, dex: 10, int: 10 },
            imp: { vit: 10, str: 10, dex: 14, int: 12 },
            old_demon: { vit: 22, str: 18, dex: 12, int: 10 }
        };
        const mStats = monsterStats[classId] || { vit: 15, str: 12, dex: 12, int: 10 };
        if (classId === 'flame_elemental') {
            const playerLvl = window.saveData ? (window.saveData.level || 1) : 1;
            mStats.vit += (playerLvl - 1) * 5;
            mStats.str += (playerLvl - 1) * 2;
            mStats.dex += (playerLvl - 1) * 1;
            mStats.int += (playerLvl - 1) * 3;
        }
        
        const anims = (classId === 'flame_elemental') ? {
            idle: { start: 0, end: 8 },
            walk: { start: 9, end: 17 },
            attack: { start: 18, end: 26 },
            combo: { start: 27, end: 35 },
            hit: { start: 36, end: 40 },
            die: { start: 41, end: 49 },
            jump: { start: 9, end: 17 },
            fall: { start: 9, end: 17 },
            duck: { start: 0, end: 8 },
            dash: { start: 9, end: 17 }
        } : {
            idle: { start: 0, end: classId.startsWith('heavenly_') ? 8 : 3 },
            walk: { start: 9, end: 17 },
            attack: { start: 18, end: 26 },
            combo: { start: 27, end: 35 },
            hit: { start: 36, end: 40 },
            die: { start: 41, end: 49 },
            jump: { start: 9, end: 17 },
            fall: { start: 9, end: 17 },
            duck: { start: 0, end: classId.startsWith('heavenly_') ? 8 : 3 },
            dash: { start: 9, end: 17 }
        };
        
        const extraProps = (classId === 'flame_elemental') ? {
            bodyWidth: 40,
            bodyHeight: 90,
            bodyOffsetX: 42,
            bodyOffsetY: 1
        } : {};
        
        return {
            id: classId,
            stats: mStats,
            isSheet: true,
            frameWidth: fw,
            frameHeight: fh,
            spriteScale: scale,
            animFrames: anims,
            ...extraProps
        };
    }

    if (classId === 'pack_mule' || classId === 'mule_cart') {
        const isCart = classId === 'mule_cart';
        return {
            id: classId,
            stats: { vit: isCart ? 25 : 15, str: 0, dex: 0, int: 0 },
            isSheet: true,
            frameWidth: isCart ? 96 : 120,
            frameHeight: 120,
            spriteScale: 1.5,
            flipX: false,
            idleRow: 0,
            idleFrames: 6,
            walkRow: 1,
            attackRow: 1,
            jumpRow: 1,
            fallRow: 1,
            duckRow: 0,
            dashRow: 1,
            animFrames: {
                idle: { start: 0, end: 5 },
                walk: { start: 6, end: 11 },
                hit: { start: 12, end: 17 },
                die: { start: 18, end: 23 }
            }
        };
    }

    const originalClassId = classId;
    const baseClassId = classId.replace('_rival', '');
    classId = baseClassId;

    let baseClass = null;
    if (window.classesData) {
        if (window.classesData[originalClassId]) {
            baseClass = window.classesData[originalClassId];
        } else if (window.classesData[baseClassId]) {
            baseClass = window.classesData[baseClassId];
        }
    }
    if (baseClass) {
        const playerLvl = saveData ? (saveData.level || 1) : 1;
        const growthTable = {
            knight:   { vit: 2, str: 2, dex: 1, int: 0 },
            wizard:   { vit: 1, str: 0, dex: 1, int: 3 },
            samurai: { vit: 1, str: 1, dex: 3, int: 0 },
            ranger:   { vit: 1, str: 1, dex: 2, int: 1 },
            elven_spellblade: { vit: 1, str: 2, dex: 1, int: 2 },
            elven_longbowman: { vit: 1, str: 1, dex: 2, int: 1 },
            dwarf_warrior: { vit: 2, str: 2, dex: 1, int: 0 }
        };
        const growth = growthTable[baseClassId] || { vit: 1, str: 1, dex: 1, int: 1 };
        
        const stats = {
            vit: (baseClass.stats?.vit || 12) + (growth.vit * (playerLvl - 1)),
            str: (baseClass.stats?.str || 12) + (growth.str * (playerLvl - 1)),
            dex: (baseClass.stats?.dex || 12) + (growth.dex * (playerLvl - 1)),
            int: (baseClass.stats?.int || 12) + (growth.int * (playerLvl - 1))
        };
        
        return {
            id: originalClassId,
            stats: stats,
            isSheet: true,
            frameWidth: baseClass.frameWidth || 64,
            frameHeight: baseClass.frameHeight || 64,
            spriteScale: baseClass.spriteScale || 1.5,
            flipX: baseClass.flipX,
            idleFrames: baseClass.idleFrames || 5,
            idleRow: baseClass.idleRow !== undefined ? baseClass.idleRow : 0,
            walkRow: baseClass.walkRow !== undefined ? baseClass.walkRow : 1,
            attackRow: baseClass.attackRow !== undefined ? baseClass.attackRow : 2,
            jumpRow: baseClass.jumpRow !== undefined ? baseClass.jumpRow : 3,
            fallRow: baseClass.fallRow !== undefined ? baseClass.fallRow : 3,
            duckRow: baseClass.duckRow !== undefined ? baseClass.duckRow : 1,
            dashRow: baseClass.dashRow,
            animFrames: baseClass.animFrames || {},
            attack2Frames: baseClass.attack2Frames,
            sheetCols: baseClass.sheetCols,
            attackDuration: baseClass.attackDuration,
            comboStartFrame: baseClass.comboStartFrame,
            comboEndFrame: baseClass.comboEndFrame,
            bodyWidth: baseClass.bodyWidth,
            bodyHeight: baseClass.bodyHeight,
            bodyOffsetX: baseClass.bodyOffsetX,
            bodyOffsetY: baseClass.bodyOffsetY
        };
    }

    const classStats = {
        knight:   { vit: 15, str: 14, dex: 9,  int: 8  },
        wizard:   { vit: 8,  str: 6,  dex: 10, int: 18 },
        samurai: { vit: 10, str: 10, dex: 16, int: 10 },
        ranger:   { vit: 11, str: 12, dex: 15, int: 9  },
        elven_spellblade: { vit: 12, str: 13, dex: 11, int: 14 },
        warrior:  { vit: 14, str: 16, dex: 8,  int: 6  }
    };
    const baseStats = classStats[classId] || { vit: 12, str: 12, dex: 12, int: 12 };
    
    const playerLvl = saveData ? (saveData.level || 1) : 1;
    const stats = window.calculateStatsForLevel ? window.calculateStatsForLevel(classId, playerLvl) : {
        vit: baseStats.vit + (playerLvl - 1),
        str: baseStats.str + (playerLvl - 1),
        dex: baseStats.dex + (playerLvl - 1),
        int: baseStats.int + (playerLvl - 1),
        luck: 10
    };
    
    let meta = { id: originalClassId, stats, isSheet: true };
    
    if (classId === 'knight' || classId === 'warrior') {
        meta = { ...meta, frameWidth: 80, frameHeight: 64, idleFrames: 5, idleRow: 0, flipX: true, attackRow: 14, dashRow: 5,
            animFrames: {
                jump: { start: 40, end: 43 },
                fall: { start: 50, end: 53 },
                hit: { start: 160, end: 164 },
                die: { start: 150, end: 157 },
                duck: { frames: [100] }
            }
        };
        if (originalClassId === 'warrior') {
            meta.id = 'knight'; 
        }
    } else if (classId === 'wizard') {
        meta = { ...meta, frameWidth: 64, frameHeight: 64, idleFrames: 6, idleRow: 1, walkRow: 0, attackRow: 2, jumpRow: 3, fallRow: 3, comboStartFrame: 24, comboEndFrame: 41,
            animFrames: {
                hit: { start: 54, end: 54 },
                die: { start: 60, end: 64 },
                duck: { frames: [14] }
            }
        };
    } else if (classId === 'samurai') {
        meta = { ...meta, frameWidth: 96, frameHeight: 64, idleFrames: 5, idleRow: 0, flipX: true,
            animFrames: {
                idle: { start: 0, end: 4 },
                walk: { start: 16, end: 23 },
                attack: { start: 24, end: 31 },
                duck: { start: 96, end: 99 },
                jump: { start: 0, end: 0 },
                fall: { start: 40, end: 43 },
                hit: { start: 112, end: 116 },
                die: { start: 128, end: 136 }
            },
            comboStartFrame: 32,
            comboEndFrame: 47,
            dashRow: 13
        };
    } else if (classId === 'ranger') {
        meta = { ...meta, frameWidth: 64, frameHeight: 64, idleFrames: 5, idleRow: 0, attackRow: 14,
            animFrames: {
                idle: { start: 0, end: 4 },
                attack: { start: 11, end: 21 },
                walk: { start: 22, end: 29 },
                hit: { start: 33, end: 36 },
                die: { start: 44, end: 50 },
                duck: { frames: [15] },
                jump: { frames: [0] },
                fall: { frames: [0] }
            }
        };
    } else if (classId === 'elven_spellblade') {
        meta = { ...meta, frameWidth: 128, frameHeight: 128, spriteScale: 1.15, idleFrames: 9, idleRow: 0, attackDuration: 560,
            animFrames: {
                idle: { start: 0, end: 8 },
                walk: { start: 9, end: 17 },
                attack: { start: 18, end: 26 },
                combo: { start: 27, end: 35 },
                hit: { start: 36, end: 40 },
                die: { start: 41, end: 49 },
                duck: { start: 53, end: 53 },
                jump: { frames: [0] },
                fall: { frames: [0] }
            }
        };
    } else if (classId === 'spider') {
        meta = { ...meta, frameWidth: 96, frameHeight: 96, isSheet: true };
    } else {
        meta = { ...meta, frameWidth: 80, frameHeight: 64, idleFrames: 5, idleRow: 0 };
    }
    
    return meta;
};
