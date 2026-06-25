// GameScene.js - The main gameplay loop and physics world setup

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.hudManager = new HUDManager(this);
        this.spriteDebugger = new SpriteDebugger(this);
        this.cutsceneController = new CutsceneController(this);
        this.levelGenerator = new LevelGenerator(this);
        this.indoorManager = new IndoorManager(this);
        this.progressionManager = new ProgressionManager(this);
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preload();
    }

    create() {
        window._gameScene = this; // Expose for debug toggle button
        this.isSceneDestroyed = false;
        this.events.on('shutdown', this.cleanupScene, this);
        this.events.on('destroy', this.cleanupScene, this);
        this.assetManager.create();

        // Only register animations once — they're global in Phaser and persist across scene restarts.
        // Without this guard, every zone transition produces 100+ 'key already exists' warnings.
        if (!this.anims.exists('slime-idle')) {
        // Slime Animations (sheet is 256x96, frames 32x32 = 8 per row, 3 rows)
        // Row 0 (frames 0-7): Idle/Bounce (usually 4 frames)
        // Row 1 (frames 8-15): Hit/Jump (usually 4 frames)
        // Slime: 32x32, 8 cols. Row 0 move/idle. Row 1 hit. Row 2 die.
        this.anims.create({ key: 'slime-idle', frames: this.anims.generateFrameNumbers('slime', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'slime-move', frames: this.anims.generateFrameNumbers('slime', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'slime-hit',  frames: this.anims.generateFrameNumbers('slime', { start: 8, end: 11 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'slime-die',  frames: this.anims.generateFrameNumbers('slime', { start: 16, end: 20 }), frameRate: 8, repeat: 0 });

        // Goblin: 84x64, 6 cols.
        this.anims.create({ key: 'goblin-idle', frames: this.anims.generateFrameNumbers('goblin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'goblin-move', frames: this.anims.generateFrameNumbers('goblin', { start: 6, end: 9 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'goblin-hit',  frames: this.anims.generateFrameNumbers('goblin', { start: 18, end: 19 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'goblin-die',  frames: this.anims.generateFrameNumbers('goblin', { start: 24, end: 27 }), frameRate: 8, repeat: 0 });
        this.anims.create({ key: 'goblin-attack', frames: this.anims.generateFrameNumbers('goblin', { start: 12, end: 17 }), frameRate: 10, repeat: 0 });

        // Bat: 64x64, 6 cols.
        this.anims.create({ key: 'bat-idle', frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'bat-move', frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'bat-hit',  frames: this.anims.generateFrameNumbers('bat', { start: 6, end: 7 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'bat-die',  frames: this.anims.generateFrameNumbers('bat', { start: 12, end: 15 }), frameRate: 8, repeat: 0 });

        // Mushroom: 64x64, 6 cols.
        this.anims.create({ key: 'mushroom-idle', frames: this.anims.generateFrameNumbers('mushroom', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'mushroom-move', frames: this.anims.generateFrameNumbers('mushroom', { start: 6, end: 9 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'mushroom-hit',  frames: this.anims.generateFrameNumbers('mushroom', { start: 12, end: 13 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'mushroom-die',  frames: this.anims.generateFrameNumbers('mushroom', { start: 18, end: 21 }), frameRate: 8, repeat: 0 });

        // Orc: 64x64, 8 cols.
        this.anims.create({ key: 'orc-idle', frames: this.anims.generateFrameNumbers('orc', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'orc-move', frames: this.anims.generateFrameNumbers('orc', { start: 8, end: 11 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'orc-hit',  frames: this.anims.generateFrameNumbers('orc', { start: 24, end: 25 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'orc-die',  frames: this.anims.generateFrameNumbers('orc', { start: 24, end: 27 }), frameRate: 8, repeat: 0 });
        this.anims.create({ key: 'orc-attack', frames: this.anims.generateFrameNumbers('orc', { start: 16, end: 19 }), frameRate: 10, repeat: 0 });

        // Spider Boss: 192x96, 8 cols.
        this.anims.create({ key: 'spider-idle', frames: this.anims.generateFrameNumbers('spider', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'spider-move', frames: this.anims.generateFrameNumbers('spider', { start: 8, end: 15 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'spider-attack', frames: this.anims.generateFrameNumbers('spider', { start: 16, end: 29 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'spider-hit',  frames: this.anims.generateFrameNumbers('spider', { start: 32, end: 37 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'spider-die',  frames: this.anims.generateFrameNumbers('spider', { start: 40, end: 44 }), frameRate: 10, repeat: 0 });

        const getFrames = (key, s, e) => {
            // s and e are linear indices assuming the sprite's actual column count
            const colData = window.sliceColData ? window.sliceColData[key] : null;
            const numCols = colData ? colData.length : 10;
            // Convert old 10-col indices to row/col, then back to new indices
            let f = [];
            for (let i = s; i <= e; i++) {
                const row = Math.floor(i / 10);
                const col = i % 10;
                if (col < numCols) {
                    const newIndex = row * numCols + col;
                    f.push({ key: key, frame: `${key}_${newIndex}` });
                }
            }
            return f;
        };



        // Temporarily store the original textures so the debug panel can access them
        this.registry.set('debug_tex_lich', this.textures.get('lich_lord').getSourceImage());
        this.registry.set('debug_tex_skeleton', this.textures.get('skeleton').getSourceImage());
        if (this.textures.exists('the_devil')) {
            this.registry.set('debug_tex_devil', this.textures.get('the_devil').getSourceImage());
        }
        if (this.textures.exists('frost_giant')) {
            this.registry.set('debug_tex_frost_giant', this.textures.get('frost_giant').getSourceImage());
        }
        if (this.textures.exists('house_inside_tiles')) {
            this.registry.set('debug_tex_house_tiles', this.textures.get('house_inside_tiles').getSourceImage());
        }
        if (this.textures.exists('training_dummy')) {
            this.registry.set('debug_tex_training_dummy', this.textures.get('training_dummy').getSourceImage());
        }
        if (this.textures.exists('summon_angel')) {
            this.registry.set('debug_tex_summon_angel', this.textures.get('summon_angel').getSourceImage());
        }

        // Load custom slice data from localStorage if available, otherwise use defaults
        const defaultSliceData = {
            lich_lord: [ { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 }, { y: 340, h: 85 }, { y: 425, h: 87 } ],
            skeleton: [ { y: 0, h: 128 }, { y: 128, h: 128 }, { y: 256, h: 128 }, { y: 384, h: 128 } ],
            frost_giant: [ { y: 0, h: 128 }, { y: 128, h: 128 }, { y: 256, h: 128 }, { y: 384, h: 128 } ]
        };
        try {
            const savedData = localStorage.getItem('sprite_slice_data');
            window.sliceData = savedData ? JSON.parse(savedData) : defaultSliceData;
            // Force reset skeleton if it has wrong row count or old 85px row heights
            if (window.sliceData.skeleton && (
                window.sliceData.skeleton.length !== 4 ||
                window.sliceData.skeleton[0].h < 100  // Old 85px rows — need 128px
            )) {
                window.sliceData.skeleton = defaultSliceData.skeleton;
            }
            // Ensure defaults exist
            if (!window.sliceData.lich_lord) window.sliceData.lich_lord = defaultSliceData.lich_lord;
            if (!window.sliceData.skeleton) window.sliceData.skeleton = defaultSliceData.skeleton;
            if (!window.sliceData.frost_giant) window.sliceData.frost_giant = defaultSliceData.frost_giant;
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
        ['lich_lord', 'skeleton', 'the_devil', 'frost_giant'].forEach(key => {
            const tex = this.textures.get(key);
            const rows = window.sliceData[key];
            if (!tex || !rows) return;

            const rowCount = rows.length;
            let defaultColW = 102.4;
            if (key === 'the_devil') defaultColW = 102;
            else if (key === 'lich_lord') defaultColW = 128;

            const colData = window.sliceColData[key];
            let numCols = colData ? colData.length : 10;
            if (!colData && key === 'lich_lord') numCols = 8;
            const frameHMax = key === 'the_devil' ? 92 : 128;

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
        });

        this.createDebugPanel();

        // The Devil animations (created after slicing so frames are correct)
        this.anims.create({ key: 'the_devil-idle', frames: getFrames('the_devil', 0, 4), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'the_devil-move', frames: getFrames('the_devil', 10, 17), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'the_devil-attack', frames: getFrames('the_devil', 50, 58), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'the_devil-attack2', frames: getFrames('the_devil', 60, 65), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'the_devil-hit', frames: getFrames('the_devil', 40, 42), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'the_devil-die', frames: getFrames('the_devil', 43, 49), frameRate: 8, repeat: 0 });

        // Lich Lord animations
        this.anims.create({ key: 'lich_lord-idle', frames: getFrames('lich_lord', 0, 7), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'lich_lord-move', frames: getFrames('lich_lord', 8, 15), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'lich_lord-shoot', frames: getFrames('lich_lord', 16, 23), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'lich_lord-attack', frames: getFrames('lich_lord', 24, 31), frameRate: 12, repeat: 0 }); // AOE
        this.anims.create({ key: 'lich_lord-summon', frames: getFrames('lich_lord', 32, 39), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'lich_lord-hit', frames: getFrames('lich_lord', 40, 41), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'lich_lord-die', frames: getFrames('lich_lord', 40, 47), frameRate: 8, repeat: 0 });

        // Projectile animations
        this.anims.create({ key: 'projectile_blue_anim', frames: this.anims.generateFrameNumbers('projectile_blue', { start: 0, end: 5 }), frameRate: 15, repeat: -1 });
        
        // Skeleton animations (1024x512 sheet, 4 rows of 128px, 10 cols of ~102px)
        // Row 0: Idle (5 frames), Row 1: Walk (10 frames), Row 2: Run (8 frames)
        // Row 3: Attack/Hit/Die (10 frames — sword swings + slash effects + hit)
        this.anims.create({ key: 'skeleton-idle', frames: getFrames('skeleton', 0, 4), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'skeleton-move', frames: getFrames('skeleton', 10, 17), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'skeleton-attack', frames: getFrames('skeleton', 30, 35), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'skeleton-hit', frames: getFrames('skeleton', 36, 37), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'skeleton-die', frames: getFrames('skeleton', 36, 39), frameRate: 8, repeat: 0 });

        // Bandit animations
        this.anims.create({ key: 'bandit-idle', frames: this.anims.generateFrameNumbers('bandit', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'bandit-move', frames: this.anims.generateFrameNumbers('bandit', { start: 10, end: 17 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'bandit-attack', frames: this.anims.generateFrameNumbers('bandit', { start: 30, end: 39 }), frameRate: 15, repeat: 0 });

        // Frost Giant animations
        this.anims.create({ key: 'frost_giant-idle', frames: getFrames('frost_giant', 0, 4), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'frost_giant-move', frames: getFrames('frost_giant', 10, 17), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'frost_giant-attack', frames: getFrames('frost_giant', 30, 39), frameRate: 15, repeat: 0 });

        // Mummy animations (9 cols)
        this.anims.create({ key: 'mummy-idle', frames: this.anims.generateFrameNumbers('mummy', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'mummy-move', frames: this.anims.generateFrameNumbers('mummy', { start: 9, end: 14 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'mummy-attack', frames: this.anims.generateFrameNumbers('mummy', { start: 18, end: 23 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'mummy-hit', frames: this.anims.generateFrameNumbers('mummy', { start: 27, end: 28 }), frameRate: 8, repeat: 0 });
        this.anims.create({ key: 'mummy-die', frames: this.anims.generateFrameNumbers('mummy', { start: 27, end: 32 }), frameRate: 8, repeat: 0 });

        // Scarab Beetle animations (5 cols)
        this.anims.create({ key: 'scarab_beetle-idle', frames: this.anims.generateFrameNumbers('scarab_beetle', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'scarab_beetle-move', frames: this.anims.generateFrameNumbers('scarab_beetle', { start: 5, end: 8 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'scarab_beetle-attack', frames: this.anims.generateFrameNumbers('scarab_beetle', { start: 10, end: 13 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'scarab_beetle-hit', frames: this.anims.generateFrameNumbers('scarab_beetle', { start: 15, end: 16 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'scarab_beetle-die', frames: this.anims.generateFrameNumbers('scarab_beetle', { start: 15, end: 19 }), frameRate: 10, repeat: 0 });

        // Zombie Animations (80x64, 8 cols x 8 rows, 4 color variants)
        // Row 0: Walk, Row 1: Regular Attack, Row 2: Bite Attack,
        // Row 3: Quick Attack + Hit (auto-counter), Row 4: First Defeat,
        // Row 5: Transform to Crawler, Row 6: Crawl Bite, Row 7: Final Death
        const zombieVariants = ['zombie', 'zombie_v2', 'zombie_v3', 'zombie_v1'];
        for (const zType of zombieVariants) {
            if (!this.textures.exists(zType)) continue;
            // Row 0: Walk (frames 0-7) — also used as idle
            this.anims.create({ key: zType + '-idle', frames: this.anims.generateFrameNumbers(zType, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
            this.anims.create({ key: zType + '-move', frames: this.anims.generateFrameNumbers(zType, { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
            // Row 1: Regular Attack (frames 8-15)
            this.anims.create({ key: zType + '-attack', frames: this.anims.generateFrameNumbers(zType, { start: 8, end: 15 }), frameRate: 12, repeat: 0 });
            // Row 2: Bite Attack (frames 16-23)
            this.anims.create({ key: zType + '-attack2', frames: this.anims.generateFrameNumbers(zType, { start: 16, end: 23 }), frameRate: 12, repeat: 0 });
            // Row 3: Quick Attack / Hit reaction — auto-counter (frames 24-31)
            this.anims.create({ key: zType + '-hit', frames: this.anims.generateFrameNumbers(zType, { start: 24, end: 31 }), frameRate: 14, repeat: 0 });
            // Row 4: First Defeat — standing to laying (frames 32-39)
            this.anims.create({ key: zType + '-die', frames: this.anims.generateFrameNumbers(zType, { start: 32, end: 39 }), frameRate: 8, repeat: 0 });
            // Row 5: Transform — laying to crawling (frames 40-47)
            this.anims.create({ key: zType + '-transform', frames: this.anims.generateFrameNumbers(zType, { start: 40, end: 47 }), frameRate: 8, repeat: 0 });
            // Row 6: Crawl Bite (frames 48-55)
            this.anims.create({ key: zType + '-crawl-attack', frames: this.anims.generateFrameNumbers(zType, { start: 48, end: 55 }), frameRate: 10, repeat: 0 });
            // Row 7: Final Death (frames 56-63)
            this.anims.create({ key: zType + '-final-die', frames: this.anims.generateFrameNumbers(zType, { start: 56, end: 63 }), frameRate: 8, repeat: 0 });
            // Crawl idle — just use the last frame of transform as a static pose
            this.anims.create({ key: zType + '-crawl-idle', frames: this.anims.generateFrameNumbers(zType, { start: 47, end: 47 }), frameRate: 1, repeat: -1 });
            // Crawl move — use transform row reversed as crawling motion
            this.anims.create({ key: zType + '-crawl-move', frames: this.anims.generateFrameNumbers(zType, { start: 44, end: 47 }), frameRate: 8, repeat: -1 });
        }

        // Build generic demon/damned animations from standard format
        const damnedStandard = ['old_demon', 'male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'burning_skull_blue', 'imp', 'cheeky_devil', 'bloated_damned'];
        for (const type of damnedStandard) {
            if (this.textures.exists(type)) {
                const tex = this.textures.get(type).getSourceImage();
                // Estimate cols based on assumed frame sizes. The Devil is 112x112, others mostly 64x64 except Old Demon 80x64
                let fw = 64;
                if (type === 'old_demon') fw = 80;
                let cols = Math.floor(tex.width / fw);
                let rows = Math.floor(tex.height / fw);
                if (type === 'old_demon' || type === 'plague_flies') rows = Math.floor(tex.height / 64);
                
                // If only 1 row, use first frames for everything
                if (rows === 1) {
                    this.anims.create({ key: type + '-idle', frames: this.anims.generateFrameNumbers(type, { start: 0, end: Math.min(3, cols-1) }), frameRate: 6, repeat: -1 });
                    this.anims.create({ key: type + '-move', frames: this.anims.generateFrameNumbers(type, { start: 0, end: Math.min(3, cols-1) }), frameRate: 10, repeat: -1 });
                    this.anims.create({ key: type + '-hit',  frames: this.anims.generateFrameNumbers(type, { start: Math.min(4, cols-1), end: Math.min(4, cols-1) }), frameRate: 10, repeat: 0 });
                    this.anims.create({ key: type + '-die',  frames: this.anims.generateFrameNumbers(type, { start: Math.min(5, cols-1), end: cols-1 }), frameRate: 8, repeat: 0 });
                } else {
                    const clamp = (val) => Math.min(val, (cols * rows) - 1);
                    this.anims.create({ key: type + '-idle', frames: this.anims.generateFrameNumbers(type, { start: 0, end: clamp(3) }), frameRate: 6, repeat: -1 });
                    this.anims.create({ key: type + '-move', frames: this.anims.generateFrameNumbers(type, { start: clamp(cols), end: clamp(cols + 3) }), frameRate: 10, repeat: -1 });
                    this.anims.create({ key: type + '-hit',  frames: this.anims.generateFrameNumbers(type, { start: clamp(cols*2), end: clamp(cols*2 + 1) }), frameRate: 10, repeat: 0 });
                    if (rows > 3) {
                        this.anims.create({ key: type + '-die',  frames: this.anims.generateFrameNumbers(type, { start: clamp(cols*3), end: clamp(cols*3 + 3) }), frameRate: 8, repeat: 0 });
                    } else {
                        // If no die row, reuse hit row
                        this.anims.create({ key: type + '-die',  frames: this.anims.generateFrameNumbers(type, { start: clamp(cols*2 + 2), end: clamp(cols*2 + 3) }), frameRate: 8, repeat: 0 });
                    }
                }
            }
        }
        if (this.textures.exists('plague_flies')) {
            this.anims.create({ key: 'plague_flies-idle', frames: this.anims.generateFrameNumbers('plague_flies', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'plague_flies-move', frames: this.anims.generateFrameNumbers('plague_flies', { start: 0, end: 2 }), frameRate: 15, repeat: -1 });
            this.anims.create({ key: 'plague_flies-hit',  frames: this.anims.generateFrameNumbers('plague_flies', { start: 3, end: 3 }), frameRate: 10, repeat: 0 });
            this.anims.create({ key: 'plague_flies-die',  frames: this.anims.generateFrameNumbers('plague_flies', { start: 4, end: 4 }), frameRate: 8, repeat: 0 });
        }

        } // End of animation registration guard

        // Loot Chest Animation (13 frames: 0 to 12)
        if (this.textures.exists('loot_chest') && !this.anims.exists('loot_chest_open')) {
            this.anims.create({ key: 'loot_chest_open', frames: this.anims.generateFrameNumbers('loot_chest', { start: 0, end: 12 }), frameRate: 12, repeat: 0 });
        }

        // Setup world bounds (allowing vertical exploration and wider zones)
        this.physics.world.setBounds(0, -2000, 3840, 4000);

        // --- Groups & Physics ---
        this.enemyProjectiles = this.physics.add.group({
            allowGravity: false
        });

        this.heroGroup = this.physics.add.group();

        this.physics.add.overlap(this.heroGroup, this.enemyProjectiles, (heroSprite, projectile) => {
            if (projectile.active) {
                const knockbackDir = projectile.x > heroSprite.x ? -1 : 1;
                if (heroSprite === this.player.sprite) {
                    this.player.takeDamage(15, knockbackDir);
                    if (projectile.texture.key === 'burning_skull' && this.player.applyStatusEffect) {
                        this.player.applyStatusEffect('burn', 3000, 10);
                    }
                } else {
                    const member = this.partyMembers.find(m => m.sprite === heroSprite);
                    if (member && typeof member.takeDamage === 'function') {
                        member.takeDamage(15, knockbackDir);
                        if (projectile.texture.key === 'burning_skull' && member.applyStatusEffect) {
                            member.applyStatusEffect('burn', 3000, 10);
                        }
                    }
                }
                projectile.destroy();
            }
        });

        this.playerAttacks = this.physics.add.group({
            allowGravity: false
        });

        // Create Platforms Group
        this.platforms = this.physics.add.staticGroup();

        // Background and Platforms will be built dynamically per biome
        this.bgLayers = [];
        this.clouds = [];
        // Clouds can stay persistent and float across biomes
        const cloudTypes = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6'];
        for(let i = 0; i < 12; i++) {
            let cx = Math.random() * 1400 - 100;
            // Place clouds higher up so they don't cover the horizon.
            let cy = -150 + Math.random() * 350;
            let cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
            let cloud = this.add.image(cx, cy, cloudType).setScrollFactor(0, 1).setDepth(-3);
            cloud.setScale(0.5 + Math.random() * 1.0);
            cloud.setAlpha(0.6 + (Math.random() * 0.4));
            cloud.floatSpeed = 0.1 + Math.random() * 0.3;
            this.clouds.push(cloud);
        }
        
        // No floating platforms — Bob and NPCs need clear ground space
        // Platforms can be added per-zone via WorldManager later

        // Initialize Gemini AI Service
        this.geminiService = new GeminiService();
        this.geminiService.init();

        // Initialize Input Manager
        this.inputManager = new InputManager(this);
        this.worldManager = new WorldManager(this);
        this.arenaManager = new ArenaManager(this);
        this.weatherManager = new WeatherManager(this);
        
        // Set initial zone index from save or 0
        const startZone = window.saveData && window.saveData.currentZone !== undefined ? window.saveData.currentZone : 0;
        
        // Initialize Player — spawn near ground level
        this.player = new PlayerController(this, 100, 620, this.inputManager);
        if (this.heroGroup) this.heroGroup.add(this.player.sprite);

        // Initialize Enemies Group
        this.enemies = this.add.group();

        // Initialize NPC list (tracked for updates)
        this.npcs = [];
        this.partyMembers = [];
        this.lootChests = [];
        this.activeRescuee = null; // Rescuee NPC for rescue quests

        // Initialize World Manager
        this.worldManager = new WorldManager(this, this.geminiService);

        // Add Collisions
        this.playerCollider = this.physics.add.collider(this.heroGroup || this.player.sprite, this.platforms);
        this.enemiesCollider = this.physics.add.collider(this.enemies, this.platforms);

        // Loading Overlay Text
        this.loadingText = this.add.text(640, 360, "Loading...", {
            fontFamily: '"Space Grotesk", monospace', fontSize: '32px', fill: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

        // Transition State Flag
        this.isTransitioning = false;
        
        // Build HUD (must be before loadZone so zone name element exists)
        this.createHUD();
        
        // Load Initial Zone
        this.worldManager.loadZone(startZone, 'center').then(() => {
            if (this.isSceneDestroyed) return;
            // Trigger New Game Intro Cutscene
            if (window.saveData && window.saveData.isNewGame) {
                window.saveData.isNewGame = false;
                
                // Wait briefly for physics to settle and sprites to spawn
                this.time.delayedCall(500, () => {
                    const sage = this.npcs.find(n => n.npcName === "Elara the Sage");
                    if (sage) {
                        this.player.sprite.x = sage.sprite.x - 60;
                        sage.openChat(true); // true = isIntro
                    } else {
                        // Fallback if Sage is missing
                        if (this.npcs.length > 0) {
                            this.player.sprite.x = this.npcs[0].sprite.x - 60;
                            this.npcs[0].openChat(true);
                        }
                    }
                });
            }
        }).catch(err => {
            alert("loadZone rejected! " + err);
        });
        
        // Spawn coordinates fallback
        let safeSpawnX = 100;
        let safeSpawnY = 620;
        if (window.saveData && typeof window.saveData.x === 'number' && !isNaN(window.saveData.x)) {
            safeSpawnX = window.saveData.x;
        }
        if (window.saveData && typeof window.saveData.y === 'number' && !isNaN(window.saveData.y)) {
            safeSpawnY = window.saveData.y;
        }
        this.player.sprite.setPosition(safeSpawnX, safeSpawnY);
        
        // Set camera bounds (Width 3840, height 4000 to allow falling into deep pits)
        this.cameras.main.setBounds(0, -2000, 3840, 4000);
        
        // Start following player
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        
        // Restore saved party members
         if (window.saveData && window.saveData.party && window.saveData.party.length > 0) {
             window.saveData.party.forEach((memberData, i) => {
                 const spawnX = this.player.sprite.x + 60 + (i * 60);
                 let classId = memberData.classId;
                 if (!['knight', 'wizard', 'ranger', 'samurai', 'warrior'].includes(classId)) {
                     if (classId && classId.startsWith('custom_npc_')) {
                         if (this.textures.exists(classId)) {
                             // Keep custom texture key if it still exists in memory
                         } else if (memberData.customConfig && memberData.customConfig.layers) {
                             // Recreate custom dynamic texture from saved config layers recipe
                             window.CharacterComposer.recreateNPC(this, classId, memberData.customConfig.layers, memberData.customConfig.weaponType);
                         } else {
                             classId = 'knight'; // Default fallback if config is missing
                         }
                     } else {
                         classId = 'knight'; // Default corrupted/bad saves or missing dynamic textures to knight
                     }
                 }
                 const hero = new PlayerController(this, spawnX, 400, this.inputManager, { 
                     isAI: true, 
                     aiState: 'party', 
                     classId: classId,
                     npcName: memberData.npcName,
                     persona: memberData.persona,
                     camaraderie: memberData.camaraderie || 0,
                     weaponType: memberData.weaponType || 'sword'
                 });
                hero.hp = memberData.hp || hero.maxHp;
                this.partyMembers.push(hero);
                if (this.heroGroup) this.heroGroup.add(hero.sprite);
                this.physics.add.collider(hero.sprite, this.platforms);
            });
        }
        
        // Auto-save every 30 seconds
        this.time.addEvent({
            delay: 30000,
            callback: () => this._autoSave(),
            loop: true
        });
        
        // Save on page close/refresh
        this._beforeUnloadListener = () => this._autoSave();
        window.addEventListener('beforeunload', this._beforeUnloadListener);

        // Debug HUD Toggle (F3)
        this.debugHudVisible = false;
        this.input.keyboard.on('keydown-F3', (event) => {
            event.preventDefault();
            this.debugHudVisible = !this.debugHudVisible;
            const el = document.getElementById('debug-hud');
            if (el) el.style.display = this.debugHudVisible ? 'block' : 'none';
            const btn = document.getElementById('debug-toggle-btn');
            if (btn) btn.style.opacity = this.debugHudVisible ? '1' : '0.4';
        });

        // Character Sheet Toggle (C)
        this.input.keyboard.on('keydown-C', (event) => {
            // Do not toggle if the user is typing in a chat input or other text field
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            this.toggleCharacterSheet();
        });
        
        // Spawn Party Member Cheat (P)
        this.input.keyboard.on('keydown-P', (event) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            if (!this.partyMembers) this.partyMembers = [];
            if (this.partyMembers.length >= 6) return;
            
            // Random class
            const classes = ['knight', 'wizard', 'samurai', 'ranger'];
            const randomClass = classes[Math.floor(Math.random() * classes.length)];
            
            this.spawnHeroAI(randomClass, this.player.sprite.x + 30, this.player.sprite.y - 10, 'party');
        });

        this._lastDebugUpdate = 0;
    }
    
    _autoSave() {
        if (!this.player || !this.player.saveGame) return;
        this.player.saveGame();
        if (window.saveData) {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === window.saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(window.saveData));
            if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }
    }

    _updateDebugHUD(time, delta) {
        this.hudManager._updateDebugHUD(time, delta);
    }

    createHUD() {
        this.hudManager.createHUD();
    }
    
       renderRoomTracker() {
        // Placeholder for future tracker logic
    }
    
    _createCharacterSheetModal() {
        this.hudManager._createCharacterSheetModal();
    }
    
    toggleCharacterSheet() {
        this.hudManager.toggleCharacterSheet();
    }
    
    _updateCharacterSheet() {
        this.hudManager._updateCharacterSheet();
    }
    
    dismissPartyMember(index) {
        this.hudManager.dismissPartyMember(index);
    }

    startPartyChat(index) {
        this.hudManager.startPartyChat(index);
    }
    
    updateHUD() {
        this.hudManager.updateHUD();
    }

    showLoading(isVisible) {
        this.loadingText.setVisible(isVisible);
    }

    openTownDirectory() {
        this.indoorManager.openTownDirectory();
    }

    closeTownDirectory() {
        this.indoorManager.closeTownDirectory();
    }

    enterIndoorLocation(locationKey) {
        this.indoorManager.enterIndoorLocation(locationKey);
    }

    exitIndoorLocation() {
        this.indoorManager.exitIndoorLocation();
    }

    transitionZone(direction) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // STOP player immediately so they don't walk off the cliff during fade
        if (this.player && this.player.sprite && this.player.sprite.body) {
            this.player.sprite.setVelocity(0, 0);
            this.player.sprite.body.setAllowGravity(false);
        }
        if (this.partyMembers) {
            this.partyMembers.forEach(hero => {
                if (hero.sprite && hero.sprite.body) {
                    hero.sprite.setVelocity(0, 0);
                    hero.sprite.body.setAllowGravity(false);
                }
            });
        }
        
        const currentZone = (window.saveData && window.saveData.currentZone !== undefined) ? window.saveData.currentZone : 0;
        const nextZoneIndex = currentZone + direction;
        const spawnSide = direction === 1 ? 'left' : 'right'; // If moving right, spawn left.
        
        // Save active zone state (enemies) before transition
        if (this.worldManager) {
            this.worldManager.saveZoneState();
        }
        
        // Auto-Save all stats, inventory, quests, and alignment
        if (this.player && this.player.saveGame) {
            this.player.saveGame();
        }
        
        // Write to localStorage to persist
        if (window.saveData) {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const saveIndex = saves.findIndex(s => s.id === window.saveData.id);
            if (saveIndex > -1) {
                saves[saveIndex] = JSON.parse(JSON.stringify(window.saveData));
            } else {
                saves.push(JSON.parse(JSON.stringify(window.saveData)));
            }
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }

        // Cancel any active cutscenes so they don't bleed into the next zone
        this.cancelCutscene();

        // Fade out
        this.cameras.main.fadeOut(500, 0, 0, 0);
        // Safety timeout: if camerafadeoutcomplete never fires, force-complete after 5s
        this._transitionSafetyTimer = this.time.delayedCall(5000, () => {
            if (this.isTransitioning) {
                console.warn('Zone transition safety timeout triggered — forcing completion.');
                this.isTransitioning = false;
                this.cameras.main.fadeIn(500, 0, 0, 0);
            }
        });
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Cancel safety timer since fade completed normally
            if (this._transitionSafetyTimer) this._transitionSafetyTimer.destroy();
            // Restart Scene and pass data (or just reload via save data)
            // Since WorldManager is persistent within GameScene, we can just clear groups
            this.enemies.clear(true, true);
            
            // Save rescuee state before clearing (if following)
            if (this.activeRescuee && this.activeRescuee.state === 'following') {
                window.saveData.activeRescuee = this.activeRescuee.getSaveData();
                this.activeRescuee.destroy();
                this.activeRescuee = null;
            } else if (this.activeRescuee) {
                this.activeRescuee.destroy();
                this.activeRescuee = null;
            }
            
            // clear NPCs too if we had a group
            if (this.npcs) {
                [...this.npcs].forEach(npc => {
                    if (npc && typeof npc.destroy === 'function') npc.destroy();
                });
                this.npcs = [];
            }

            // Clean up chests
            if (this.lootChests) {
                this.lootChests.forEach(chest => {
                    if (chest.sprite) chest.sprite.destroy();
                    if (chest.promptText) chest.promptText.destroy();
                });
                this.lootChests = [];
            }

            // Clean up angel statue prompt text
            if (this.angelPromptText) {
                this.angelPromptText.destroy();
                this.angelPromptText = null;
            }
            if (this.angelStatueZone) {
                this.angelStatueZone.destroy();
                this.angelStatueZone = null;
            }
            this.angelStatue = null;
            
            // Reload
            this.worldManager.loadZone(nextZoneIndex, spawnSide).then(() => {
                if (this.isSceneDestroyed) return;
                this.isTransitioning = false;
                this.cameras.main.fadeIn(500, 0, 0, 0);
            }).catch(err => {
                if (this.isSceneDestroyed) return;
                console.error("CRITICAL: Error during loadZone transition!", err);
                // Recover from freeze by ending the transition
                this.isTransitioning = false;
                this.cameras.main.fadeIn(500, 0, 0, 0);
            });
        });
    }

    setBiomeVisuals(biome, zoneType = 'Hostile') {
        // Build floor and background layers
        this.levelGenerator.setBiomeVisuals(biome, zoneType);

        // Set basic sky color
        let bgColor = '#87CEEB'; // default sky
        if (biome === 'Desert') bgColor = '#f4a460';
        if (biome === 'Winter') bgColor = '#a9a9a9';
        if (biome === 'Cave' || biome === 'Dungeon' || biome === 'Deadwoods' || biome === 'Hell') bgColor = '#1a1a1a';
        this.cameras.main.setBackgroundColor(bgColor);

        // Determine weather intelligently based on biome
        if (this.weatherManager) {
            let weather = 'clear';
            const roll = Math.random();
            
            if (biome === 'Winter') {
                weather = 'snow'; // Always snows in winter
            } else if (biome === 'Forest' || biome === 'Plains') {
                if (roll < 0.3) weather = 'rain'; // 30% chance of rain
            } else if (biome === 'Coastal') {
                if (roll < 0.4) weather = 'rain'; // 40% chance of rain near coast
            } else if (biome === 'Deadwoods') {
                if (roll < 0.5) weather = 'rain'; // 50% chance of rain in spooky woods
            }
            
            this.weatherManager.setWeather(weather);
        }
    }

    createDebugPanel() {
        this.spriteDebugger.createDebugPanel();
    }

    update(time, delta) {
        if (this.isTransitioning) return;

        // Clouds are now animated in the manual parallax section at the bottom of update()
        
        // Animate Water Layers
        if (this.waterLayers && this.waterLayers.length > 0) {
            this.waterLayers.forEach(water => {
                water.tilePositionX += water.animSpeed * (delta / 16);
            });
        }

        this.inputManager.update();
        if (this.player) this.player.update(time, delta);
        if (this.arenaManager) this.arenaManager.update();
        if (this.weatherManager) this.weatherManager.update(time, delta);
        
        // cull entities falling into the deep abyss (below y > 1400)
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.y > 1400) {
                enemy.destroy();
            }
        });
        
        if (this.player && this.player.sprite && this.player.sprite.y > 1400) {
            this.player.hp = 0; // The abyss claims them!
        }
        
        // Dynamically adjust camera bounds so it doesn't show underground unless falling
        if (this.player && this.player.sprite && this.player.sprite.active) {
            const widthTiles = this.worldManager && this.worldManager.currentZoneData && this.worldManager.currentZoneData.type === 'Safe' ? 40 : 84;
            const targetHeight = (this.player.sprite.y < 700) ? 2720 : 4000;
            
            if (typeof this.currentCameraHeight === 'undefined') {
                this.currentCameraHeight = targetHeight;
            } else {
                const factor = Math.min(1, 0.05 * (delta / 16.666));
                this.currentCameraHeight = this.currentCameraHeight + (targetHeight - this.currentCameraHeight) * factor;
            }
            
            this.cameras.main.setBounds(0, -2000, widthTiles * 46, this.currentCameraHeight);
        }

        // --- GM AI LOGIC ---
        if (!this.lastGmPollTime) this.lastGmPollTime = time;
        if (time - this.lastGmPollTime > 20000 && this.geminiService && this.geminiService.isReady && !this.isIndoors && !this.isCutscene && this.worldManager && this.worldManager.currentZoneData && this.worldManager.currentZoneData.type === 'Dangerous') {
            this.lastGmPollTime = time;
            let activeEnemies = 0;
            this.enemies.children.iterate(e => { if (e && e.active) activeEnemies++; });
            const gameState = {
                player: { level: this.player.level, hp: this.player.hp, maxHp: this.player.maxHp },
                zone: { name: this.worldManager.currentZoneData.name, biome: this.worldManager.currentZoneData.biome },
                activeEnemies: activeEnemies
            };
            this.geminiService.getGameMasterDecision(gameState).then(res => {
                if (this.isSceneDestroyed) return;
                // Re-check zone type — the async call may resolve after player transitioned to a safe zone
                if (!this.worldManager || !this.worldManager.currentZoneData || this.worldManager.currentZoneData.type !== 'Dangerous') return;
                if (res && res.action !== 'NONE') {
                    if (this.showFloatingText) this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 100, `GM: ${res.announcement}`, 0xff00ff);
                    
                    if (res.action === 'AMBUSH') {
                        // Cap: don't spawn if there are already 2+ hostile hero AIs
                        const activeHostiles = (this.partyMembers || []).filter(m => m && m.aiState === 'hostile' && m.hp > 0).length;
                        const now = this.time.now;
                        if (activeHostiles < 2 && (!this._lastAmbushTime || now - this._lastAmbushTime > 60000)) {
                            this._lastAmbushTime = now;
                            const rivalTypes = ['knight_rival', 'wizard_rival', 'samurai_rival', 'ranger_rival'];
                            const randomRival = rivalTypes[Math.floor(Math.random() * rivalTypes.length)];
                            this.spawnHeroAI(randomRival, this.player.sprite.x + (Math.random() > 0.5 ? 250 : -250), 600, 'hostile');
                        }
                    } else if (res.action === 'HEAL') {
                        this.player.hp = this.player.maxHp;
                        if (this.updateHUD) this.updateHUD();
                    } else if (res.action === 'GOLD_RUSH') {
                        if (!window.saveData) window.saveData = {};
                        window.saveData.gold = (window.saveData.gold || 0) + 500;
                        if (this.updateHUD) this.updateHUD();
                    } else if (res.action === 'WEATHER_RAIN') {
                        // Just as an example, this requires an environment manager but we don't have one globally.
                        // For now we will just log it or apply a global tint
                        if (!this._weatherOverlay) {
                            this._weatherOverlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width * 3, this.cameras.main.height * 3, 0x000000, 0.2);
                            this._weatherOverlay.setScrollFactor(0);
                            this._weatherOverlay.setDepth(999);
                        } else {
                            this._weatherOverlay.setFillStyle(0x000000, 0.2);
                            this._weatherOverlay.setVisible(true);
                        }
                    } else if (res.action === 'WEATHER_FOG') {
                        if (!this._weatherOverlay) {
                            this._weatherOverlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width * 3, this.cameras.main.height * 3, 0xaaddff, 0.15);
                            this._weatherOverlay.setScrollFactor(0);
                            this._weatherOverlay.setDepth(999);
                        } else {
                            this._weatherOverlay.setFillStyle(0xaaddff, 0.15);
                            this._weatherOverlay.setVisible(true);
                        }
                    }
                }
            });
        }
        // --- END GM AI LOGIC ---
        
        // Handle Zone Transitions (disabled if indoors)
        if (!this.isTransitioning && !this.isIndoors) {
            const isTown = this.worldManager && this.worldManager.currentZoneData && this.worldManager.currentZoneData.type === 'Safe';
            const rightBoundary = isTown ? 1800 : 3800;
            if (this.player.sprite.x > rightBoundary) {
                this.transitionZone(1); // Move Right
            } else if (this.player.sprite.x < 60 && !this.isIndoors) {
                this.transitionZone(-1); // Move Left
            }
        }
        
        // Horizontal float animation and manual parallax for clouds
        const camX = this.cameras.main.scrollX;
        const lastCamX = this.lastCamX || camX;
        this.lastCamX = camX;
        const deltaCamX = camX - lastCamX;

        if (this.clouds && this.clouds.length > 0) {
            this.clouds.forEach(cloud => {
                // Noticeable drift speed
                if (cloud.floatSpeed === undefined) cloud.floatSpeed = 0.5 + Math.random() * 0.5;
                
                // Float drift
                cloud.x -= cloud.floatSpeed * delta * 0.06;
                
                // Manual parallax (since scrollFactorX is 0, cloud.x is a screen coordinate)
                cloud.x -= deltaCamX * 0.05;

                // Screen wrapping
                if (cloud.x < -300) cloud.x = 1500;
                if (cloud.x > 1500) cloud.x = -300;
            });
        }

        this.enemies.getChildren().forEach(enemy => {
            if (enemy.controller && enemy.controller.update) {
                enemy.controller.update(time, delta);
            }
        });

        // Update Party Members
        this.partyMembers.forEach(hero => {
            if (hero.update) hero.update(time, delta);
        });

        // Update NPCs (proximity detection, text tracking)
        this.npcs.forEach(npc => npc.update(time, delta));

        // Update Active Rescuee NPC
        if (this.activeRescuee && this.activeRescuee.update) {
            this.activeRescuee.update(time, delta);
        }

        // Update Loot Chests
        if (this.lootChests && this.lootChests.length > 0) {
            const interactDistance = this.isIndoors ? 90 : 60;
            const px = this.player.sprite.x;
            const py = this.player.sprite.y;

            for (let i = this.lootChests.length - 1; i >= 0; i--) {
                const chest = this.lootChests[i];
                if (chest.isOpen) continue;

                // Track chest position dynamically with smooth hover animation
                if (chest.promptText && chest.sprite) {
                    const promptYOffset = this.isIndoors ? -90 : -50;
                    chest.promptText.setPosition(chest.sprite.x, chest.sprite.y + promptYOffset + Math.sin(time / 150) * 3);
                }

                const dist = Phaser.Math.Distance.Between(px, py, chest.sprite.x, chest.sprite.y);
                
                // Show prompt if close
                if (dist < interactDistance) {
                    if (!chest.promptText.visible) chest.promptText.setVisible(true);
                    
                    // Interact
                    if (this.player.isInteractDown() && time - (this._lastChestInteractTime || 0) > 500) {
                        this._lastChestInteractTime = time;
                        chest.isOpen = true;
                        if (chest.promptText) chest.promptText.destroy();
                        
                        // Play open animation if it exists
                        if (this.anims.exists('loot_chest_open')) {
                            chest.sprite.play('loot_chest_open');
                        }
                        
                        // Roll chest loot immediately for instant feedback
                        if (this.player && this.player.rollChestLoot) {
                            this.player.rollChestLoot(chest.sprite.x, chest.sprite.y);
                        }
                        
                        // Sparkle effect
                        if (this.textures.exists('loot_sparkle')) {
                            const emitter = this.add.particles(chest.sprite.x, chest.sprite.y, 'loot_sparkle', {
                                speed: { min: -100, max: 100 },
                                angle: { min: 0, max: 360 },
                                scale: { start: 1, end: 0 },
                                blendMode: 'ADD',
                                lifespan: 600,
                                quantity: 15
                            });
                            setTimeout(() => { if(emitter && emitter.active) emitter.destroy(); }, 1000);
                        }

                        // Fade out chest after showing the open animation state briefly
                        this.tweens.add({
                            targets: chest.sprite,
                            alpha: 0,
                            duration: 1000,
                            delay: 500,
                            onComplete: () => {
                                if (chest.sprite) chest.sprite.destroy();
                            }
                        });
                        
                        // Remove from active array so we don't process it anymore
                        this.lootChests.splice(i, 1);
                    }
                } else {
                    if (chest.promptText.visible) chest.promptText.setVisible(false);
                }
            }
        }

        // Update Angel Statue interaction
        if (this.angelStatue && this.angelStatue.active && this.angelStatueZone && !this.isIndoors) {
            const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.angelStatue.x, this.angelStatue.y);
            if (dist < 100) {
                // Check if any NPC is closer and within interact range
                let npcCloser = false;
                const chatUi = document.getElementById('chat-ui');
                const shopUi = document.getElementById('ui-shop');
                const isChatOpen = chatUi && window.getComputedStyle(chatUi).display !== 'none';
                const isShopOpen = shopUi && window.getComputedStyle(shopUi).display !== 'none';
                
                if (this.npcs && !isChatOpen && !isShopOpen) {
                    this.npcs.forEach(npc => {
                        if (npc && npc.sprite && npc.sprite.active) {
                            const distToNpc = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, npc.sprite.x, npc.sprite.y);
                            if (distToNpc < 80 && distToNpc < dist) {
                                npcCloser = true;
                            }
                        }
                    });
                }

                if (!npcCloser && !isChatOpen && !isShopOpen) {
                    if (!this.angelPromptText) {
                        this.angelPromptText = this.add.text(this.angelStatue.x, this.angelStatue.y - 120, 'Press F - Town Directory', {
                            fontFamily: '"Courier Prime", Courier, monospace',
                            fontSize: '14px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
                        }).setOrigin(0.5).setDepth(100);
                    } else {
                        this.angelPromptText.setVisible(true);
                    }

                    if (this.player.isInteractDown() && time - (this._lastStatueInteractTime || 0) > 500) {
                        this._lastStatueInteractTime = time;
                        if (this.openTownDirectory) this.openTownDirectory();
                    }
                } else if (this.angelPromptText) {
                    this.angelPromptText.setVisible(false);
                }
            } else if (this.angelPromptText) {
                this.angelPromptText.setVisible(false);
            }
        } else if (this.angelPromptText) {
            this.angelPromptText.setVisible(false);
        }

        // HUD Update (throttled to 4x/sec to avoid DOM thrashing)
        if (!this._lastHudUpdate || time - this._lastHudUpdate > 250) {
            this._lastHudUpdate = time;
            this.updateHUD();
        }

        // Debug HUD Update (throttled to 4x/sec)
        if (this.debugHudVisible && time - this._lastDebugUpdate > 250) {
            this._lastDebugUpdate = time;
            this._updateDebugHUD(time, delta);
        }
    }

    spawnHeroAI(spriteKey, x, y, aiState, npcName = null, persona = null, camaraderie = 0, weaponType = null) {
        if (!this.partyMembers) this.partyMembers = [];
        
        const isParty = (aiState === 'party');
        if (isParty && this.partyMembers.length >= 6) {
            this.showFloatingText(x, y - 20, "Party Full!", 0xff0000);
            return;
        }

        const spawnY = Math.min(y, 400); // Cap Y so tall sprites don't clip through the floor
        if (isNaN(x) || isNaN(spawnY)) {
            console.error(`[GameScene] spawnHeroAI received NaN! x: ${x}, y: ${y}`);
            console.trace();
            x = 400; // Fallback
        }
        const hero = new PlayerController(this, x, spawnY, this.inputManager, { isAI: true, aiState: aiState, classId: spriteKey, npcName: npcName, persona: persona, camaraderie: camaraderie, weaponType: weaponType });
        
        if (this.isIndoors) {
            if (typeof hero.setScaleWithPhysics === 'function') {
                hero.setScaleWithPhysics(2.5);
            } else {
                hero.sprite.setScale(2.5);
            }
        }
        
        if (isParty) {
            this.partyMembers.push(hero);
            if (this.heroGroup) this.heroGroup.add(hero.sprite);
            this.showFloatingText(x, y, "Joined Party!", 0x00ff00);
            if (this.isIndoors && this.indoorFloor) {
                this.physics.add.collider(hero.sprite, this.indoorFloor);
            } else {
                this.physics.add.collider(hero.sprite, this.platforms);
            }
        } else {
            // Hostile
            this.enemies.add(hero.sprite);
            hero.sprite.controller = hero; // So takeDamage works
            if (this.isIndoors && this.indoorFloor) {
                this.physics.add.collider(hero.sprite, this.indoorFloor);
            } else {
                this.physics.add.collider(hero.sprite, this.platforms);
            }
            this.showFloatingText(x, y, "HOSTILE!", 0xff0000);
        }
    }

    spawnLootChest(x, y) {
        if (!this.textures.exists('loot_chest')) return;
        
        const sprite = this.add.sprite(x, y, 'loot_chest', 0);
        sprite.setScale(this.isIndoors ? 3 : 2);
        sprite.setOrigin(0.5, 1); // anchor at bottom
        
        // Ensure it sits on ground
        this.physics.add.existing(sprite);
        sprite.body.setAllowGravity(true);
        if (this.isIndoors && this.indoorFloor) {
            this.physics.add.collider(sprite, this.indoorFloor);
        } else {
            this.physics.add.collider(sprite, this.platforms);
        }

        // Hover text
        const promptYOffset = this.isIndoors ? -90 : -50;
        const promptText = this.add.text(x, y + promptYOffset, '[F] Open', {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '16px',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        this.lootChests.push({
            sprite: sprite,
            promptText: promptText,
            isOpen: false
        });
    }

    showFloatingText(x, y, message, color) {
        // Convert hex color to CSS string
        let colorStr = '#ffffff';
        if (typeof color === 'number') {
            colorStr = '#' + color.toString(16).padStart(6, '0');
        } else if (typeof color === 'string') {
            colorStr = color;
        }

        // Slight random X offset to prevent stacking
        const offsetX = (Math.random() - 0.5) * 30;
        
        const text = this.add.text(x + offsetX, y, String(message), {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '22px',
            fill: colorStr,
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        text.setScale(0.5);
        text.setDepth(1000); // Ensure text always renders on top of particles and sprites

        // Pop-in scale then float up and fade
        this.tweens.add({
            targets: text,
            scale: 1.2,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    y: y - 50,
                    scale: 0.8,
                    alpha: 0,
                    duration: 900,
                    ease: 'Power2',
                    onComplete: () => text.destroy()
                });
            }
        });
    }

    cancelCutscene() {
        this.cutsceneController.cancelCutscene();
    }

    playCutscene(lines, onComplete) {
        this.cutsceneController.playCutscene(lines, onComplete);
    }

    grantRewards(xpEarned, goldEarned) {
        this.progressionManager.grantRewards(xpEarned, goldEarned);
    }

    cleanupScene() {
        // 1. Destroy player
        if (this.player && typeof this.player.destroy === 'function') {
            this.player.destroy();
        }
        // 2. Destroy NPCs
        if (this.npcs) {
            [...this.npcs].forEach(npc => {
                if (npc && typeof npc.destroy === 'function') {
                    npc.destroy();
                }
            });
        }
        // 3. Destroy party members
        if (this.partyMembers) {
            [...this.partyMembers].forEach(member => {
                if (member && typeof member.destroy === 'function') {
                    member.destroy();
                }
            });
        }

        // 4. Remove window / document event listeners
        if (this._beforeUnloadListener) {
            window.removeEventListener('beforeunload', this._beforeUnloadListener);
            this._beforeUnloadListener = null;
        }
        if (this._csEscListener) {
            window.removeEventListener('keydown', this._csEscListener);
            this._csEscListener = null;
        }
        if (this._dirEscListener) {
            window.removeEventListener('keydown', this._dirEscListener);
            this._dirEscListener = null;
        }
        if (this._debugMouseUpListener) {
            window.removeEventListener('mouseup', this._debugMouseUpListener);
            this._debugMouseUpListener = null;
        }
        if (this._debugKeyDownListener) {
            document.removeEventListener('keydown', this._debugKeyDownListener);
            this._debugKeyDownListener = null;
        }
        window._debugKeyBound = false;

        // 5. Remove modals and panels from DOM
        const csModal = document.getElementById('char-sheet-modal');
        if (csModal) csModal.remove();
        
        const charBtn = document.getElementById('btn-char-sheet');
        if (charBtn) charBtn.remove();
        
        const apBtn = document.getElementById('btn-auto-play');
        if (apBtn) apBtn.remove();
        
        const dbPanel = document.getElementById('debug-panel');
        if (dbPanel) dbPanel.remove();
        
        if (this.indoorLeaveBtn) {
            this.indoorLeaveBtn.remove();
            this.indoorLeaveBtn = null;
        }

        this.indoorBlackBg = null;
        this.indoorBg = null;
        this.indoorWallBgGroup = null;
        this.indoorFloor = null;
        this.indoorLeftWall = null;
        this.indoorRightWall = null;
        
        if (this.worldManager && this.worldManager.loreTimeout) {
            clearTimeout(this.worldManager.loreTimeout);
        }
        this.decorGroup = null;
        this.isSceneDestroyed = true;
    }
}
