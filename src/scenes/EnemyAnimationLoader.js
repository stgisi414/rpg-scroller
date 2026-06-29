// EnemyAnimationLoader.js - Shared helper to register all enemy and boss animations
class EnemyAnimationLoader {
    static sliceCustomTextures(scene) {
        // Temporarily store the original textures so the debug panel can access them
        if (scene.textures.exists('house_inside_tiles')) {
            scene.registry.set('debug_tex_house_tiles', scene.textures.get('house_inside_tiles').getSourceImage());
        }

        // Production-hardcoded slice data (rows) — tuned via Sprite Debugger
        // Only NPC skins and house tiles are used at runtime; enemy sprites use PixelLab frames
        const PRODUCTION_SLICE_DATA = {
            "npc_male_skin1":[{"y":0,"h":75},{"y":73,"h":69},{"y":142,"h":58},{"y":202,"h":56},{"y":258,"h":62},{"y":318,"h":80},{"y":398,"h":69}],
            "npc_female_skin1":[{"y":0,"h":77},{"y":76,"h":63},{"y":139,"h":60},{"y":200,"h":55},{"y":255,"h":64},{"y":320,"h":76},{"y":395,"h":74}],
            "house_inside_tiles":[{"y":0,"h":32},{"y":32,"h":32},{"y":64,"h":32},{"y":96,"h":32},{"y":128,"h":32},{"y":160,"h":32},{"y":192,"h":32},{"y":224,"h":32},{"y":256,"h":32},{"y":288,"h":32},{"y":320,"h":32},{"y":352,"h":32},{"y":384,"h":32}]
        };

        // Production-hardcoded column slice data — tuned via Sprite Debugger
        const PRODUCTION_SLICE_COLDATA = {
            "npc_male_skin1":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82},{"x":320,"w":83},{"x":404,"w":70},{"x":475,"w":83},{"x":557,"w":71},{"x":628,"w":71},{"x":699,"w":76}],
            "npc_female_skin1":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":53},{"x":378,"w":92},{"x":469,"w":89},{"x":557,"w":69},{"x":626,"w":69},{"x":695,"w":77}],
            "npc_male_skin1_r0":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82},{"x":320,"w":83}],
            "npc_male_skin1_r1":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82},{"x":320,"w":83},{"x":404,"w":70},{"x":475,"w":83},{"x":557,"w":71}],
            "npc_male_skin1_r2":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82},{"x":320,"w":83},{"x":404,"w":70},{"x":475,"w":83},{"x":557,"w":71}],
            "npc_male_skin1_r3":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82}],
            "npc_male_skin1_r4":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82}],
            "npc_male_skin1_r5":[{"x":0,"w":78},{"x":79,"w":78},{"x":157,"w":83},{"x":239,"w":82},{"x":320,"w":80},{"x":400,"w":74}],
            "house_inside_tiles":[{"x":0,"w":32},{"x":32,"w":32},{"x":64,"w":32},{"x":96,"w":32},{"x":128,"w":32},{"x":160,"w":32},{"x":192,"w":32},{"x":224,"w":32},{"x":256,"w":32},{"x":288,"w":32},{"x":320,"w":32},{"x":352,"w":32},{"x":384,"w":32},{"x":416,"w":32}],
            "npc_female_skin1_r0":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":86}],
            "npc_female_skin1_r1":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":86},{"x":405,"w":65},{"x":469,"w":89},{"x":557,"w":69}],
            "npc_female_skin1_r2":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":86},{"x":405,"w":65},{"x":469,"w":89},{"x":557,"w":69}],
            "npc_female_skin1_r3":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79}],
            "npc_female_skin1_r4":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79}],
            "npc_female_skin1_r5":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":81},{"x":400,"w":70}],
            "npc_female_skin1_r6":[{"x":0,"w":82},{"x":81,"w":81},{"x":162,"w":78},{"x":240,"w":79},{"x":319,"w":86},{"x":405,"w":65},{"x":469,"w":89},{"x":557,"w":69},{"x":626,"w":69},{"x":695,"w":77}]
        };

        // Use localStorage overrides in dev mode, fall back to hardcoded production values
        try {
            const savedData = localStorage.getItem('sprite_slice_data');
            window.sliceData = savedData ? JSON.parse(savedData) : JSON.parse(JSON.stringify(PRODUCTION_SLICE_DATA));
        } catch (e) {
            window.sliceData = JSON.parse(JSON.stringify(PRODUCTION_SLICE_DATA));
        }

        // Load saved column slice data (localStorage overrides production defaults)
        if (!window.sliceColData) {
            try {
                const saved = localStorage.getItem('sprite_slice_coldata');
                window.sliceColData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(PRODUCTION_SLICE_COLDATA));
            } catch(e) { window.sliceColData = JSON.parse(JSON.stringify(PRODUCTION_SLICE_COLDATA)); }
        }

        // Re-slice textures that have user-defined slice data
        [].forEach(key => {
            const tex = scene.textures.get(key);
            if (!tex) return;

            // Check if we already sliced it (avoid destroying frames and breaking animation references)
            if (tex.customSliced) {
                return;
            }

            const rows = window.sliceData[key];
            if (!rows) return;

            const rowCount = rows.length;
            let defaultColW = 102.4;

            const colData = window.sliceColData[key];
            let numCols = colData ? colData.length : 10;
            const frameHMax = 128;

            // Remove old frames if they exist (to allow re-slicing)
            for (let r = 0; r < rowCount; r++) {
                for (let c = 0; c < numCols; c++) {
                    const index = (r * numCols + c);
                    const fName1 = index.toString();
                    const fName2 = `${key}_${index}`;
                    if (tex.has(fName1)) tex.remove(fName1);
                    if (tex.has(fName2)) tex.remove(fName2);
                }
            }
            
            for (let r = 0; r < rowCount; r++) {
                for (let c = 0; c < numCols; c++) {
                    const cutX = colData ? colData[c].x : Math.floor(c * defaultColW);
                    const cutW = colData ? colData[c].w : Math.floor(defaultColW);
                    const index = r * numCols + c;
                    const fName = `${key}_${index}`;
                    const frame = tex.add(fName, 0, cutX, rows[r].y, cutW, rows[r].h);
                    if (frame) frame.setTrim(cutW, frameHMax, 0, frameHMax - rows[r].h, cutW, rows[r].h);
                    // Also add numeric frame so Phaser's default sprite creation works
                    const numFrame = tex.add(index.toString(), 0, cutX, rows[r].y, cutW, rows[r].h);
                    if (numFrame) numFrame.setTrim(cutW, frameHMax, 0, frameHMax - rows[r].h, cutW, rows[r].h);
                }
            }
            tex.customSliced = true;
        });
    }

    static registerAll(scene) {
        if (scene.anims.exists('slime-idle')) {
            return; // Already registered
        }

        const getFrames = (key, s, e) => {
            const colData = window.sliceColData ? window.sliceColData[key] : null;
            const defaultCols = (key === 'lich_lord') ? 8 : 10;
            const numCols = colData ? colData.length : defaultCols;
            let f = [];
            for (let i = s; i <= e; i++) {
                const row = Math.floor(i / defaultCols);
                const col = i % defaultCols;
                if (col < numCols) {
                    const newIndex = row * numCols + col;
                    f.push({ key: key, frame: `${key}_${newIndex}` });
                }
            }
            return f;
        };

        // Slime: 32x32, 8 cols. Row 0 move/idle. Row 1 hit. Row 2 die.
        scene.anims.create({ key: 'slime-idle', frames: scene.anims.generateFrameNumbers('slime', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        scene.anims.create({ key: 'slime-move', frames: scene.anims.generateFrameNumbers('slime', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        scene.anims.create({ key: 'slime-hit',  frames: scene.anims.generateFrameNumbers('slime', { start: 8, end: 11 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'slime-die',  frames: scene.anims.generateFrameNumbers('slime', { start: 16, end: 20 }), frameRate: 8, repeat: 0 });

        // Goblin: 84x64, 6 cols.
        scene.anims.create({ key: 'goblin-idle', frames: scene.anims.generateFrameNumbers('goblin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        scene.anims.create({ key: 'goblin-move', frames: scene.anims.generateFrameNumbers('goblin', { start: 6, end: 9 }), frameRate: 12, repeat: -1 });
        scene.anims.create({ key: 'goblin-hit',  frames: scene.anims.generateFrameNumbers('goblin', { start: 18, end: 19 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'goblin-die',  frames: scene.anims.generateFrameNumbers('goblin', { start: 24, end: 27 }), frameRate: 8, repeat: 0 });
        scene.anims.create({ key: 'goblin-attack', frames: scene.anims.generateFrameNumbers('goblin', { start: 12, end: 17 }), frameRate: 10, repeat: 0 });

        // Bat: 64x64, 6 cols.
        scene.anims.create({ key: 'bat-idle', frames: scene.anims.generateFrameNumbers('bat', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        scene.anims.create({ key: 'bat-move', frames: scene.anims.generateFrameNumbers('bat', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
        scene.anims.create({ key: 'bat-hit',  frames: scene.anims.generateFrameNumbers('bat', { start: 6, end: 7 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'bat-die',  frames: scene.anims.generateFrameNumbers('bat', { start: 12, end: 15 }), frameRate: 8, repeat: 0 });

        // Mushroom: 64x64, 6 cols.
        scene.anims.create({ key: 'mushroom-idle', frames: scene.anims.generateFrameNumbers('mushroom', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        scene.anims.create({ key: 'mushroom-move', frames: scene.anims.generateFrameNumbers('mushroom', { start: 6, end: 9 }), frameRate: 8, repeat: -1 });
        scene.anims.create({ key: 'mushroom-hit',  frames: scene.anims.generateFrameNumbers('mushroom', { start: 12, end: 13 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'mushroom-die',  frames: scene.anims.generateFrameNumbers('mushroom', { start: 18, end: 21 }), frameRate: 8, repeat: 0 });

        // Orc: 64x64, 8 cols.
        scene.anims.create({ key: 'orc-idle', frames: scene.anims.generateFrameNumbers('orc', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        scene.anims.create({ key: 'orc-move', frames: scene.anims.generateFrameNumbers('orc', { start: 8, end: 11 }), frameRate: 10, repeat: -1 });
        scene.anims.create({ key: 'orc-hit',  frames: scene.anims.generateFrameNumbers('orc', { start: 24, end: 25 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'orc-die',  frames: scene.anims.generateFrameNumbers('orc', { start: 24, end: 27 }), frameRate: 8, repeat: 0 });
        scene.anims.create({ key: 'orc-attack', frames: scene.anims.generateFrameNumbers('orc', { start: 16, end: 19 }), frameRate: 10, repeat: 0 });

        // Spider Boss: 192x96, 8 cols.
        scene.anims.create({ key: 'spider-idle', frames: scene.anims.generateFrameNumbers('spider', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
        scene.anims.create({ key: 'spider-move', frames: scene.anims.generateFrameNumbers('spider', { start: 8, end: 15 }), frameRate: 15, repeat: -1 });
        scene.anims.create({ key: 'spider-attack', frames: scene.anims.generateFrameNumbers('spider', { start: 16, end: 29 }), frameRate: 15, repeat: 0 });
        scene.anims.create({ key: 'spider-hit',  frames: scene.anims.generateFrameNumbers('spider', { start: 32, end: 37 }), frameRate: 15, repeat: 0 });
        scene.anims.create({ key: 'spider-die',  frames: scene.anims.generateFrameNumbers('spider', { start: 40, end: 44 }), frameRate: 10, repeat: 0 });

        scene.anims.create({ key: 'projectile_blue_anim', frames: scene.anims.generateFrameNumbers('projectile_blue', { start: 0, end: 5 }), frameRate: 15, repeat: -1 });
        scene.anims.create({ key: 'witch_spear_fly', frames: scene.anims.generateFrameNumbers('witch_spear', { start: 0, end: 4 }), frameRate: 15, repeat: -1 });
        scene.anims.create({ key: 'witch_spear_explode', frames: scene.anims.generateFrameNumbers('witch_spear', { start: 5, end: 9 }), frameRate: 15, repeat: 0 });
        if (scene.textures.exists('heal_animation') && !scene.anims.exists('heal_animation_anim')) {
            scene.anims.create({ key: 'heal_animation_anim', frames: scene.anims.generateFrameNumbers('heal_animation', { start: 0, end: 15 }), frameRate: 16, repeat: 0 });
        }
        if (scene.textures.exists('witch_debuff') && !scene.anims.exists('witch_debuff_anim')) {
            scene.anims.create({ key: 'witch_debuff_anim', frames: scene.anims.generateFrameNumbers('witch_debuff', { start: 0, end: 15 }), frameRate: 15, repeat: -1 });
        }
        if (scene.textures.exists('witch_3_charge') && !scene.anims.exists('witch_3_charge_fly')) {
            scene.anims.create({ key: 'witch_3_charge_fly', frames: scene.anims.generateFrameNumbers('witch_3_charge', { start: 0, end: 4 }), frameRate: 15, repeat: -1 });
            scene.anims.create({ key: 'witch_3_charge_explode', frames: scene.anims.generateFrameNumbers('witch_3_charge', { start: 5, end: 8 }), frameRate: 15, repeat: 0 });
        }
        if (scene.textures.exists('mind_control_debuff') && !scene.anims.exists('mind_control_debuff_anim')) {
            scene.anims.create({ key: 'mind_control_debuff_anim', frames: scene.anims.generateFrameNumbers('mind_control_debuff', { start: 0, end: 15 }), frameRate: 15, repeat: -1 });
        }
        if (scene.textures.exists('elven_queen_buff') && !scene.anims.exists('elven_queen_buff_anim')) {
            scene.anims.create({ key: 'elven_queen_buff_anim', frames: scene.anims.generateFrameNumbers('elven_queen_buff', { start: 0, end: 15 }), frameRate: 16, repeat: 0 });
        }
        if (scene.textures.exists('human_queen_buff') && !scene.anims.exists('human_queen_buff_anim')) {
            scene.anims.create({ key: 'human_queen_buff_anim', frames: scene.anims.generateFrameNumbers('human_queen_buff', { start: 0, end: 15 }), frameRate: 16, repeat: 0 });
        }
        if (scene.textures.exists('pyromancer_1_charge') && !scene.anims.exists('pyromancer_1_charge_fly')) {
            scene.anims.create({ key: 'pyromancer_1_charge_fly', frames: scene.anims.generateFrameNumbers('pyromancer_1_charge', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
            scene.anims.create({ key: 'pyromancer_1_charge_explode', frames: scene.anims.generateFrameNumbers('pyromancer_1_charge', { start: 4, end: 5 }), frameRate: 15, repeat: 0 });
        }

        // Lich Lord custom magic casting animation aliases
        if (scene.textures.exists('lich_lord')) {
            if (!scene.anims.exists('lich_lord-shoot')) {
                scene.anims.create({ key: 'lich_lord-shoot', frames: scene.anims.generateFrameNumbers('lich_lord', { start: 27, end: 35 }), frameRate: 12, repeat: 0 });
            }
            if (!scene.anims.exists('lich_lord-summon')) {
                scene.anims.create({ key: 'lich_lord-summon', frames: scene.anims.generateFrameNumbers('lich_lord', { start: 50, end: 58 }), frameRate: 10, repeat: 0 });
            }
        }

        // Skeleton summon-in animation (being summoned by lich lord)
        if (scene.textures.exists('skeleton')) {
            if (!scene.anims.exists('skeleton-summon_in')) {
                scene.anims.create({ key: 'skeleton-summon_in', frames: scene.anims.generateFrameNumbers('skeleton', { start: 50, end: 58 }), frameRate: 10, repeat: 0 });
            }
        }

        // Hellhound enemy animations (10 cols x 5 rows, 128x128)
        const hellhoundVariants = [
            { key: 'hellhound_1', idle: [0,5], walk: [10,18], attack: [20,24], hit: [30,33], die: [40,45] },
            { key: 'hellhound_2', idle: [0,5], walk: [10,18], attack: [20,25], hit: [30,32], die: [40,45] },
            { key: 'hellhound_3', idle: [0,5], walk: [10,18], attack: [20,25], hit: [30,32], die: [40,44] }
        ];
        hellhoundVariants.forEach(h => {
            if (scene.textures.exists(h.key)) {
                if (!scene.anims.exists(`${h.key}-idle`)) {
                    scene.anims.create({ key: `${h.key}-idle`, frames: scene.anims.generateFrameNumbers(h.key, { start: h.idle[0], end: h.idle[1] }), frameRate: 8, repeat: -1 });
                    scene.anims.create({ key: `${h.key}-move`, frames: scene.anims.generateFrameNumbers(h.key, { start: h.walk[0], end: h.walk[1] }), frameRate: 12, repeat: -1 });
                    scene.anims.create({ key: `${h.key}-attack`, frames: scene.anims.generateFrameNumbers(h.key, { start: h.attack[0], end: h.attack[1] }), frameRate: 10, repeat: 0 });
                    scene.anims.create({ key: `${h.key}-hit`, frames: scene.anims.generateFrameNumbers(h.key, { start: h.hit[0], end: h.hit[1] }), frameRate: 10, repeat: 0 });
                    scene.anims.create({ key: `${h.key}-die`, frames: scene.anims.generateFrameNumbers(h.key, { start: h.die[0], end: h.die[1] }), frameRate: 8, repeat: 0 });
                }
            }
        });

        // Mummy animations
        scene.anims.create({ key: 'mummy-idle', frames: scene.anims.generateFrameNumbers('mummy', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        scene.anims.create({ key: 'mummy-move', frames: scene.anims.generateFrameNumbers('mummy', { start: 9, end: 14 }), frameRate: 8, repeat: -1 });
        scene.anims.create({ key: 'mummy-attack', frames: scene.anims.generateFrameNumbers('mummy', { start: 18, end: 23 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'mummy-hit', frames: scene.anims.generateFrameNumbers('mummy', { start: 27, end: 28 }), frameRate: 8, repeat: 0 });
        scene.anims.create({ key: 'mummy-die', frames: scene.anims.generateFrameNumbers('mummy', { start: 27, end: 32 }), frameRate: 8, repeat: 0 });

        // Scarab Beetle animations
        scene.anims.create({ key: 'scarab_beetle-idle', frames: scene.anims.generateFrameNumbers('scarab_beetle', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        scene.anims.create({ key: 'scarab_beetle-move', frames: scene.anims.generateFrameNumbers('scarab_beetle', { start: 5, end: 8 }), frameRate: 12, repeat: -1 });
        scene.anims.create({ key: 'scarab_beetle-attack', frames: scene.anims.generateFrameNumbers('scarab_beetle', { start: 10, end: 13 }), frameRate: 12, repeat: 0 });
        scene.anims.create({ key: 'scarab_beetle-hit', frames: scene.anims.generateFrameNumbers('scarab_beetle', { start: 15, end: 16 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'scarab_beetle-die', frames: scene.anims.generateFrameNumbers('scarab_beetle', { start: 15, end: 19 }), frameRate: 10, repeat: 0 });

        // Zombie Animations
        const zombieVariants = ['zombie', 'zombie_v2', 'zombie_v3', 'zombie_v1'];
        for (const zType of zombieVariants) {
            if (!scene.textures.exists(zType)) continue;
            scene.anims.create({ key: zType + '-idle', frames: scene.anims.generateFrameNumbers(zType, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: zType + '-move', frames: scene.anims.generateFrameNumbers(zType, { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
            scene.anims.create({ key: zType + '-attack', frames: scene.anims.generateFrameNumbers(zType, { start: 10, end: 17 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: zType + '-attack2', frames: scene.anims.generateFrameNumbers(zType, { start: 20, end: 27 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: zType + '-hit', frames: scene.anims.generateFrameNumbers(zType, { start: 30, end: 37 }), frameRate: 14, repeat: 0 });
            scene.anims.create({ key: zType + '-die', frames: scene.anims.generateFrameNumbers(zType, { start: 40, end: 47 }), frameRate: 8, repeat: 0 });
            scene.anims.create({ key: zType + '-transform', frames: scene.anims.generateFrameNumbers(zType, { start: 50, end: 57 }), frameRate: 8, repeat: 0 });
            scene.anims.create({ key: zType + '-crawl-attack', frames: scene.anims.generateFrameNumbers(zType, { start: 60, end: 67 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: zType + '-final-die', frames: scene.anims.generateFrameNumbers(zType, { start: 70, end: 77 }), frameRate: 8, repeat: 0 });
            scene.anims.create({ key: zType + '-crawl-idle', frames: scene.anims.generateFrameNumbers(zType, { start: 57, end: 57 }), frameRate: 1, repeat: -1 });
            scene.anims.create({ key: zType + '-crawl-move', frames: scene.anims.generateFrameNumbers(zType, { start: 54, end: 57 }), frameRate: 8, repeat: -1 });
        }

        // Build generic demon/damned animations
        const damnedStandard = ['old_demon', 'male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'burning_skull_blue', 'imp', 'cheeky_devil', 'bloated_damned'];
        for (const type of damnedStandard) {
            if (scene.textures.exists(type)) {
                const tex = scene.textures.get(type).getSourceImage();
                let fw = 64;
                if (type === 'old_demon') fw = 80;
                let cols = Math.floor(tex.width / fw);
                let rows = Math.floor(tex.height / fw);
                if (type === 'old_demon' || type === 'plague_flies') rows = Math.floor(tex.height / 64);
                
                if (rows === 1) {
                    scene.anims.create({ key: type + '-idle', frames: scene.anims.generateFrameNumbers(type, { start: 0, end: Math.min(3, cols-1) }), frameRate: 6, repeat: -1 });
                    scene.anims.create({ key: type + '-move', frames: scene.anims.generateFrameNumbers(type, { start: 0, end: Math.min(3, cols-1) }), frameRate: 10, repeat: -1 });
                    scene.anims.create({ key: type + '-hit',  frames: scene.anims.generateFrameNumbers(type, { start: Math.min(4, cols-1), end: Math.min(4, cols-1) }), frameRate: 10, repeat: 0 });
                    scene.anims.create({ key: type + '-die',  frames: scene.anims.generateFrameNumbers(type, { start: Math.min(5, cols-1), end: cols-1 }), frameRate: 8, repeat: 0 });
                } else if (rows === 2) {
                    const clamp = (val) => Math.min(val, (cols * rows) - 1);
                    scene.anims.create({ key: type + '-idle', frames: scene.anims.generateFrameNumbers(type, { start: 0, end: clamp(3) }), frameRate: 6, repeat: -1 });
                    scene.anims.create({ key: type + '-move', frames: scene.anims.generateFrameNumbers(type, { start: 0, end: clamp(3) }), frameRate: 10, repeat: -1 });
                    scene.anims.create({ key: type + '-hit',  frames: scene.anims.generateFrameNumbers(type, { start: 0, end: 0 }), frameRate: 10, repeat: 0 });
                    scene.anims.create({ key: type + '-die',  frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols), end: clamp(cols + 3) }), frameRate: 8, repeat: 0 });
                } else {
                    const clamp = (val) => Math.min(val, (cols * rows) - 1);
                    scene.anims.create({ key: type + '-idle', frames: scene.anims.generateFrameNumbers(type, { start: 0, end: clamp(3) }), frameRate: 6, repeat: -1 });
                    scene.anims.create({ key: type + '-move', frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols), end: clamp(cols + 3) }), frameRate: 10, repeat: -1 });
                    scene.anims.create({ key: type + '-hit',  frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols*2), end: clamp(cols*2 + 1) }), frameRate: 10, repeat: 0 });
                    if (rows > 3) {
                        scene.anims.create({ key: type + '-die',  frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols*3), end: clamp(cols*3 + 3) }), frameRate: 8, repeat: 0 });
                        scene.anims.create({ key: type + '-attack', frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols*2), end: clamp(cols*2 + 5) }), frameRate: 10, repeat: 0 });
                    } else {
                        scene.anims.create({ key: type + '-die',  frames: scene.anims.generateFrameNumbers(type, { start: clamp(cols*2 + 2), end: clamp(cols*2 + 3) }), frameRate: 8, repeat: 0 });
                    }
                }
            }
        }

        if (scene.textures.exists('plague_flies')) {
            scene.anims.create({ key: 'plague_flies-idle', frames: scene.anims.generateFrameNumbers('plague_flies', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'plague_flies-move', frames: scene.anims.generateFrameNumbers('plague_flies', { start: 0, end: 2 }), frameRate: 15, repeat: -1 });
            scene.anims.create({ key: 'plague_flies-hit',  frames: scene.anims.generateFrameNumbers('plague_flies', { start: 3, end: 3 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'plague_flies-die',  frames: scene.anims.generateFrameNumbers('plague_flies', { start: 4, end: 4 }), frameRate: 8, repeat: 0 });
        }

        // Wolfen & Coyle
        if (scene.textures.exists('wolfen') && !scene.anims.exists('wolfen-idle')) {
            scene.anims.create({ key: 'wolfen-idle',    frames: scene.anims.generateFrameNumbers('wolfen', { start: 0, end: 8 }),   frameRate: 8, repeat: -1 });
            scene.anims.create({ key: 'wolfen-move',    frames: scene.anims.generateFrameNumbers('wolfen', { start: 9, end: 17 }),  frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'wolfen-attack',  frames: scene.anims.generateFrameNumbers('wolfen', { start: 18, end: 26 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'wolfen-attack2', frames: scene.anims.generateFrameNumbers('wolfen', { start: 27, end: 35 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'wolfen-hit',     frames: scene.anims.generateFrameNumbers('wolfen', { start: 36, end: 40 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'wolfen-die',     frames: scene.anims.generateFrameNumbers('wolfen', { start: 41, end: 49 }), frameRate: 10, repeat: 0 });
        }
        if (scene.textures.exists('coyle') && !scene.anims.exists('coyle-idle')) {
            scene.anims.create({ key: 'coyle-idle',    frames: scene.anims.generateFrameNumbers('coyle', { start: 0, end: 8 }),   frameRate: 8, repeat: -1 });
            scene.anims.create({ key: 'coyle-move',    frames: scene.anims.generateFrameNumbers('coyle', { start: 9, end: 17 }),  frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'coyle-attack',  frames: scene.anims.generateFrameNumbers('coyle', { start: 18, end: 26 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'coyle-attack2', frames: scene.anims.generateFrameNumbers('coyle', { start: 27, end: 35 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'coyle-hit',     frames: scene.anims.generateFrameNumbers('coyle', { start: 36, end: 40 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'coyle-die',     frames: scene.anims.generateFrameNumbers('coyle', { start: 41, end: 49 }), frameRate: 10, repeat: 0 });
        }

        // Heavenly & Regular PixelLab Entities
        const pixelLabTypes = [
            'heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub',
            'ogre', 'giant', 'troll',
            'lich_lord', 'skeleton', 'frost_giant', 'bandit'
        ];
        pixelLabTypes.forEach(hKey => {
            if (scene.textures.exists(hKey) && !scene.anims.exists(`${hKey}-idle`)) {
                scene.anims.create({ key: `${hKey}-idle`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 0, end: 8 }),   frameRate: 8, repeat: -1 });
                scene.anims.create({ key: `${hKey}-move`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 9, end: 17 }),  frameRate: 10, repeat: -1 });
                scene.anims.create({ key: `${hKey}-attack`,  frames: scene.anims.generateFrameNumbers(hKey, { start: 18, end: 26 }), frameRate: 12, repeat: 0 });
                scene.anims.create({ key: `${hKey}-attack2`, frames: scene.anims.generateFrameNumbers(hKey, { start: 27, end: 35 }), frameRate: 12, repeat: 0 });
                scene.anims.create({ key: `${hKey}-hit`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 36, end: 40 }), frameRate: 10, repeat: 0 });
                scene.anims.create({ key: `${hKey}-die`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 41, end: 49 }), frameRate: 10, repeat: 0 });
            }
        });

        // Stitched 12-column 5-row Enemies (Dark Elves, Mimics, Gorgons, Golems)
        const stitchedTypes = [
            'dark_elf_guard', 'dark_elf_guard_rival',
            'dark_elf_spellblade', 'dark_elf_spellblade_rival',
            'dark_elf_longbowman', 'dark_elf_longbowman_rival',
            'mimic_1', 'mimic_1_rival', 'mimic_2', 'mimic_2_rival', 'mimic_3', 'mimic_3_rival',
            'gorgon_1', 'gorgon_1_rival', 'gorgon_2', 'gorgon_2_rival', 'gorgon_3', 'gorgon_3_rival',
            'stone_golem', 'stone_golem_rival',
            'lava_golem', 'lava_golem_rival',
            'copper_golem', 'copper_golem_rival'
        ];
        stitchedTypes.forEach(hKey => {
            if (scene.textures.exists(hKey) && !scene.anims.exists(`${hKey}-idle`)) {
                // Mimic Idle should lock to frame 0 (chest closed) so it looks like a treasure chest!
                const isMimic = hKey.startsWith('mimic');
                const idleEnd = isMimic ? 0 : 5;
                
                let attackEnd = 29;
                if (hKey.startsWith('stone_golem') || hKey.startsWith('lava_golem')) {
                    attackEnd = 28; // only 5 frames for Stone and Lava Golem attacks to prevent blinking
                }
                
                scene.anims.create({ key: `${hKey}-idle`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 0, end: idleEnd }),   frameRate: isMimic ? 1 : 8, repeat: -1 });
                scene.anims.create({ key: `${hKey}-move`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 12, end: 17 }),  frameRate: 10, repeat: -1 });
                scene.anims.create({ key: `${hKey}-attack`,  frames: scene.anims.generateFrameNumbers(hKey, { start: 24, end: attackEnd }), frameRate: 12, repeat: 0 });
                scene.anims.create({ key: `${hKey}-attack2`, frames: scene.anims.generateFrameNumbers(hKey, { start: 24, end: attackEnd }), frameRate: 12, repeat: 0 });
                scene.anims.create({ key: `${hKey}-hit`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 36, end: 39 }), frameRate: 10, repeat: 0 });
                scene.anims.create({ key: `${hKey}-die`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 48, end: 53 }), frameRate: 10, repeat: 0 });
            }
        });

        // Dark Elf Queen custom animations (9-row extended sheet)
        const queenKeys = ['dark_elf_queen', 'dark_elf_queen_rival'];
        queenKeys.forEach(hKey => {
            if (scene.textures.exists(hKey) && !scene.anims.exists(`${hKey}-idle`)) {
                scene.anims.create({ key: `${hKey}-idle`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 0, end: 5 }),    frameRate: 8, repeat: -1 });
                scene.anims.create({ key: `${hKey}-move`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 12, end: 17 }),  frameRate: 10, repeat: -1 });
                scene.anims.create({ key: `${hKey}-attack`,  frames: scene.anims.generateFrameNumbers(hKey, { start: 24, end: 29 }),  frameRate: 12, repeat: 0 }); // Blade 1
                scene.anims.create({ key: `${hKey}-attack2`, frames: scene.anims.generateFrameNumbers(hKey, { start: 36, end: 39 }),  frameRate: 12, repeat: 0 }); // Blade 2
                scene.anims.create({ key: `${hKey}-attack3`, frames: scene.anims.generateFrameNumbers(hKey, { start: 48, end: 51 }),  frameRate: 12, repeat: 0 }); // Blade 3
                scene.anims.create({ key: `${hKey}-dash`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 60, end: 65 }),  frameRate: 12, repeat: 0 }); // Step Back
                scene.anims.create({ key: `${hKey}-summon`,  frames: scene.anims.generateFrameNumbers(hKey, { start: 72, end: 81 }),  frameRate: 10, repeat: 0 }); // Summoning
                scene.anims.create({ key: `${hKey}-hit`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 84, end: 87 }),  frameRate: 10, repeat: 0 }); // Hurt
                scene.anims.create({ key: `${hKey}-die`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 96, end: 101 }), frameRate: 10, repeat: 0 }); // Dead
            }
        });

        // Dark Elf Minion custom animations (6-row extended sheet)
        const minionKeys = ['dark_elf_minion', 'dark_elf_minion_rival'];
        minionKeys.forEach(hKey => {
            if (scene.textures.exists(hKey) && !scene.anims.exists(`${hKey}-idle`)) {
                scene.anims.create({ key: `${hKey}-idle`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 0, end: 5 }),   frameRate: 8, repeat: -1 });
                scene.anims.create({ key: `${hKey}-move`,    frames: scene.anims.generateFrameNumbers(hKey, { start: 12, end: 17 }),  frameRate: 10, repeat: -1 });
                scene.anims.create({ key: `${hKey}-attack`,  frames: scene.anims.generateFrameNumbers(hKey, { start: 24, end: 29 }),  frameRate: 12, repeat: 0 });
                scene.anims.create({ key: `${hKey}-hit`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 36, end: 39 }),  frameRate: 10, repeat: 0 });
                scene.anims.create({ key: `${hKey}-die`,     frames: scene.anims.generateFrameNumbers(hKey, { start: 48, end: 53 }),  frameRate: 10, repeat: 0 });
                scene.anims.create({ key: `${hKey}-spawn`,   frames: scene.anims.generateFrameNumbers(hKey, { start: 60, end: 71 }),  frameRate: 12, repeat: 0 }); // Summonally
            }
        });

        // The Devil (boss) - Custom flight animations and higher frame rate for wings
        if (scene.textures.exists('the_devil') && !scene.anims.exists('the_devil-idle')) {
            scene.anims.create({ key: 'the_devil-idle',    frames: scene.anims.generateFrameNumbers('the_devil', { start: 0, end: 8 }),   frameRate: 16, repeat: -1 });
            scene.anims.create({ key: 'the_devil-move',    frames: scene.anims.generateFrameNumbers('the_devil', { start: 9, end: 17 }),  frameRate: 12, repeat: -1 }); // Grounded walking animation
            scene.anims.create({ key: 'the_devil-fly',     frames: scene.anims.generateFrameNumbers('the_devil', { start: 0, end: 8 }),   frameRate: 16, repeat: -1 }); // Airborne flying/hovering animation (fast wings flapping)
            scene.anims.create({ key: 'the_devil-attack',  frames: scene.anims.generateFrameNumbers('the_devil', { start: 18, end: 26 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'the_devil-attack2', frames: scene.anims.generateFrameNumbers('the_devil', { start: 27, end: 35 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'the_devil-hit',     frames: scene.anims.generateFrameNumbers('the_devil', { start: 36, end: 40 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'the_devil-die',     frames: scene.anims.generateFrameNumbers('the_devil', { start: 41, end: 49 }), frameRate: 10, repeat: 0 });
        }

        // Dragon
        if (scene.textures.exists('dragon') && !scene.anims.exists('dragon-idle')) {
            scene.anims.create({ key: 'dragon-idle',    frames: scene.anims.generateFrameNumbers('dragon', { start: 27, end: 35 }),  frameRate: 8, repeat: -1 });
            scene.anims.create({ key: 'dragon-move',    frames: scene.anims.generateFrameNumbers('dragon', { start: 9, end: 17 }),   frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'dragon-attack',  frames: scene.anims.generateFrameNumbers('dragon', { start: 18, end: 26 }),  frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'dragon-attack2', frames: scene.anims.generateFrameNumbers('dragon', { start: 0, end: 8 }),    frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'dragon-hit',     frames: scene.anims.generateFrameNumbers('dragon', { start: 36, end: 40 }),  frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'dragon-die',     frames: scene.anims.generateFrameNumbers('dragon', { start: 41, end: 49 }),  frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'dragon-fly',     frames: scene.anims.generateFrameNumbers('dragon', { start: 50, end: 58 }),  frameRate: 8, repeat: -1 });
        }

        // Willowisp
        if (scene.textures.exists('willowisp') && !scene.anims.exists('willowisp-idle')) {
            scene.anims.create({ key: 'willowisp-idle',    frames: scene.anims.generateFrameNumbers('willowisp', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
            scene.anims.create({ key: 'willowisp-move',    frames: scene.anims.generateFrameNumbers('willowisp', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'willowisp-attack',  frames: scene.anims.generateFrameNumbers('willowisp', { start: 0, end: 4 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'willowisp-hit',     frames: scene.anims.generateFrameNumbers('willowisp', { start: 0, end: 4 }), frameRate: 10, repeat: 0 });
            scene.anims.create({ key: 'willowisp-die',     frames: scene.anims.generateFrameNumbers('willowisp', { start: 0, end: 4 }), frameRate: 10, repeat: 0 });
        }

        // Caravan Pack Mule
        if (scene.textures.exists('pack_mule') && !scene.anims.exists('pack_mule-idle')) {
            scene.anims.create({ key: 'pack_mule-idle',   frames: scene.anims.generateFrameNumbers('pack_mule', { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'pack_mule-move',   frames: scene.anims.generateFrameNumbers('pack_mule', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'pack_mule-hit',    frames: scene.anims.generateFrameNumbers('pack_mule', { start: 12, end: 17 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'pack_mule-die',    frames: scene.anims.generateFrameNumbers('pack_mule', { start: 18, end: 23 }), frameRate: 8, repeat: 0 });
        }
        
        // Caravan Mule Cart
        if (scene.textures.exists('mule_cart') && !scene.anims.exists('mule_cart-idle')) {
            scene.anims.create({ key: 'mule_cart-idle',   frames: scene.anims.generateFrameNumbers('mule_cart', { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'mule_cart-move',   frames: scene.anims.generateFrameNumbers('mule_cart', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
            scene.anims.create({ key: 'mule_cart-hit',    frames: scene.anims.generateFrameNumbers('mule_cart', { start: 12, end: 17 }), frameRate: 12, repeat: 0 });
            scene.anims.create({ key: 'mule_cart-die',    frames: scene.anims.generateFrameNumbers('mule_cart', { start: 18, end: 23 }), frameRate: 8, repeat: 0 });
        }
    }
}
window.EnemyAnimationLoader = EnemyAnimationLoader;
