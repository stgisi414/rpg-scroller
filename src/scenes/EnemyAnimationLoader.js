// EnemyAnimationLoader.js - Shared helper to register all enemy and boss animations
class EnemyAnimationLoader {
    static sliceCustomTextures(scene) {
        // Temporarily store the original textures so the debug panel can access them
        if (scene.textures.exists('house_inside_tiles')) {
            scene.registry.set('debug_tex_house_tiles', scene.textures.get('house_inside_tiles').getSourceImage());
        }

        // Load custom slice data from localStorage if available, otherwise use defaults
        const defaultSliceData = {};
        try {
            const savedData = localStorage.getItem('sprite_slice_data');
            window.sliceData = savedData ? JSON.parse(savedData) : defaultSliceData;
        } catch (e) {
            window.sliceData = defaultSliceData;
        }

        // Load saved column slice data
        if (!window.sliceColData) {
            try {
                const saved = localStorage.getItem('sprite_slice_coldata');
                window.sliceColData = saved ? JSON.parse(saved) : {};
            } catch(e) { window.sliceColData = {}; }
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

        // Projectile animations
        scene.anims.create({ key: 'projectile_blue_anim', frames: scene.anims.generateFrameNumbers('projectile_blue', { start: 0, end: 5 }), frameRate: 15, repeat: -1 });

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
    }
}
window.EnemyAnimationLoader = EnemyAnimationLoader;
