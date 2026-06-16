// GameScene.js - The main gameplay loop and physics world setup

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preload();
    }

    create() {
        window._gameScene = this; // Expose for debug toggle button
        this.assetManager.create();

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

        // Load custom slice data from localStorage if available, otherwise use defaults
        const defaultSliceData = {
            lich_lord: [ { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 }, { y: 340, h: 85 }, { y: 425, h: 87 } ],
            skeleton: [ { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 } ],
            frost_giant: [ { y: 0, h: 128 }, { y: 128, h: 128 }, { y: 256, h: 128 }, { y: 384, h: 128 } ]
        };
        try {
            const savedData = localStorage.getItem('sprite_slice_data');
            window.sliceData = savedData ? JSON.parse(savedData) : defaultSliceData;
            // Force reset skeleton if it incorrectly has 6 rows from an old save
            if (window.sliceData.skeleton && window.sliceData.skeleton.length !== 4) {
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
            const defaultColW = key === 'the_devil' ? 102 : 102.4;
            const colData = window.sliceColData[key];
            const numCols = colData ? colData.length : 10;
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
        this.anims.create({ key: 'lich_lord-idle', frames: getFrames('lich_lord', 0, 4), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'lich_lord-move', frames: getFrames('lich_lord', 10, 15), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'lich_lord-shoot', frames: getFrames('lich_lord', 20, 25), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'lich_lord-attack', frames: getFrames('lich_lord', 30, 38), frameRate: 12, repeat: 0 }); // AOE
        this.anims.create({ key: 'lich_lord-summon', frames: getFrames('lich_lord', 40, 49), frameRate: 10, repeat: 0 });
        
        // Skeleton animations
        this.anims.create({ key: 'skeleton-idle', frames: getFrames('skeleton', 0, 4), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'skeleton-move', frames: getFrames('skeleton', 10, 17), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'skeleton-attack', frames: getFrames('skeleton', 30, 39), frameRate: 15, repeat: 0 });

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

        // Loot Chest Animation (13 frames: 0 to 12)
        if (this.textures.exists('loot_chest')) {
            this.anims.create({ key: 'loot_chest_open', frames: this.anims.generateFrameNumbers('loot_chest', { start: 0, end: 12 }), frameRate: 12, repeat: 0 });
        }

        // Setup world bounds
        this.physics.world.setBounds(0, 0, 1280, 720);

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
            let cy = 20 + (Math.random() * 200);
            let cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
            let cloud = this.add.image(cx, cy, cloudType).setScrollFactor(0).setDepth(-3);
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
        
        // Set camera bounds
        this.cameras.main.setBounds(0, 0, 1280, 720);
        
        // Restore saved party members
        if (window.saveData && window.saveData.party && window.saveData.party.length > 0) {
            window.saveData.party.forEach((memberData, i) => {
                const spawnX = this.player.sprite.x + 60 + (i * 60);
                let classId = memberData.classId;
                if (!['knight', 'wizard', 'ranger', 'samurai', 'warrior'].includes(classId)) {
                    classId = 'knight'; // Default corrupted/bad saves to knight (warrior)
                }
                const hero = new PlayerController(this, spawnX, 400, this.inputManager, { 
                    isAI: true, 
                    aiState: 'party', 
                    classId: classId,
                    npcName: memberData.npcName,
                    persona: memberData.persona,
                    camaraderie: memberData.camaraderie || 0
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
        window.addEventListener('beforeunload', () => this._autoSave());

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
        this._lastDebugUpdate = 0;
    }
    
    _autoSave() {
        if (!this.player || !this.player.saveGame) return;
        this.player.saveGame();
        if (window.saveData) {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === window.saveData.id);
            if (idx > -1) saves[idx] = window.saveData; else saves.push(window.saveData);
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }
    }

    _updateDebugHUD(time, delta) {
        const el = document.getElementById('debug-content');
        if (!el) return;

        const zoneData = this.worldManager ? this.worldManager.currentZoneData : null;
        const zoneIdx = window.saveData ? window.saveData.currentZone : '?';
        const biome = zoneData ? (zoneData.biome || 'unknown') : '?';
        const zoneType = zoneData ? (zoneData.type || '?') : '?';
        const zoneName = zoneData ? (zoneData.name || '?') : '?';
        const decorCount = zoneData && zoneData.decorLayout ? zoneData.decorLayout.length : 0;

        const px = this.player && this.player.sprite ? Math.round(this.player.sprite.x) : '?';
        const py = this.player && this.player.sprite ? Math.round(this.player.sprite.y) : '?';
        const hp = this.player ? `${this.player.hp}/${this.player.maxHp}` : '?';
        const mp = this.player ? `${this.player.mp || 0}/${this.player.maxMp || 0}` : '?';
        const sp = this.player ? `${this.player.sp || 0}/${this.player.maxSp || 0}` : '?';
        const alignment = this.player ? this.player.alignment : 0;
        const gold = window.saveData ? window.saveData.gold : 0;
        const level = window.saveData ? window.saveData.level : '?';
        const classId = this.player && this.player.classData ? this.player.classData.id : '?';

        const fps = Math.round(this.game.loop.actualFps);
        const enemyCount = this.enemies ? this.enemies.getChildren().filter(e => e.active).length : 0;
        const npcCount = this.npcs ? this.npcs.length : 0;
        const partyCount = this.partyMembers ? this.partyMembers.length : 0;

        // Enemy type breakdown
        let enemyTypes = {};
        let rivalDebug = '';
        if (this.enemies) {
            this.enemies.getChildren().forEach(e => {
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
        const inv = this.player ? this.player.inventory : {};
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
        if (this.partyMembers && this.partyMembers.length > 0) {
            partyDebug = this.partyMembers.map((m, i) => {
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
        if (this.enemies && this.enemies.getChildren().length > 0) {
            enemyDebug = this.enemies.getChildren().map((e, i) => {
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

        el.innerHTML = [
            c('Zone', `${zoneIdx}`, '#ff0') + ' │ ' + c('Biome', biome, '#0ff') + ' │ ' + c('Type', zoneType, zoneType === 'Safe' ? '#0f0' : '#f88'),
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
            enemyDebug
        ].filter(s => s !== '').join('<br>');
    }

    createHUD() {
        // Show HTML HUD
        const hudElement = document.getElementById('game-hud');
        if (hudElement) hudElement.style.display = 'flex';
        
        // Cache DOM elements for quick updates
        this.hudElements = {
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
        if (this.hudElements.nameLevel) {
            this.hudElements.nameLevel.style.background = 'rgba(0,0,0,0.85)';
            this.hudElements.nameLevel.style.color = '#e0e0e0';
            this.hudElements.nameLevel.style.textShadow = 'none';
            this.hudElements.nameLevel.style.padding = '4px 10px';
            this.hudElements.nameLevel.style.borderRadius = '4px';
            this.hudElements.nameLevel.style.border = '1px solid rgba(255,255,255,0.15)';
        }
        
        // Add character sheet button next to name
        if (this.hudElements.nameLevel && !document.getElementById('btn-char-sheet')) {
            const btn = document.createElement('button');
            btn.id = 'btn-char-sheet';
            btn.innerText = '⚔️';
            btn.title = 'Character Sheet';
            btn.style.cssText = 'margin-left:8px;background:rgba(80,60,30,0.9);border:1px solid #a0832b;color:#fde68a;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:14px;pointer-events:auto;';
            btn.addEventListener('click', () => this.toggleCharacterSheet());
            this.hudElements.nameLevel.appendChild(btn);
        }
        
        // Show/hide MP and SP bars based on class
        const classId = window.saveData ? window.saveData.classId : 'knight';
        const mpBar = this.hudElements.mpFill ? this.hudElements.mpFill.closest('.relative') : null;
        const spBar = this.hudElements.spFill ? this.hudElements.spFill.closest('.relative') : null;
        
        if (classId === 'wizard') {
            // Wizard: show MP, hide SP
            if (mpBar) mpBar.style.display = '';
            if (spBar) spBar.style.display = 'none';
        } else {
            // Melee classes: show SP, hide MP
            if (mpBar) mpBar.style.display = 'none';
            if (spBar) spBar.style.display = '';
        }
        
        // Build character sheet modal (hidden)
        this._createCharacterSheetModal();
        
        this.renderRoomTracker();
        try { this.updateHUD(); } catch(e) { console.error('updateHUD error:', e); }
    }
    
    renderRoomTracker() {
    }
    
    _createCharacterSheetModal() {
        if (document.getElementById('char-sheet-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'char-sheet-modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.8);pointer-events:auto;';
        modal.innerHTML = `
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#1a1410,#2a2018);border:2px solid #a0832b;border-radius:12px;padding:32px 40px;width:600px;max-height:80vh;overflow-y:auto;color:#e0d8c8;font-family:'Space Grotesk',sans-serif;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h2 id="cs-title" style="margin:0;font-size:24px;color:#fde68a;">Character Sheet</h2>
                    <button id="cs-close" style="background:none;border:none;color:#aaa;font-size:26px;cursor:pointer;">&times;</button>
                </div>
                <div id="cs-class" style="font-size:14px;color:#a0832b;margin-bottom:16px;text-transform:uppercase;letter-spacing:2px;"></div>
                <hr style="border-color:#3a3020;margin:12px 0 20px;">
                <div id="cs-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:12px 32px;font-size:16px;"></div>
                <hr style="border-color:#3a3020;margin:20px 0 16px;">
                <div id="cs-derived" style="font-size:14px;color:#bbb;line-height:2;"></div>
                <hr style="border-color:#3a3020;margin:20px 0 16px;">
                <h3 style="margin:0 0 16px 0;font-size:18px;color:#fde68a;">Party Members</h3>
                <div id="cs-party" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:16px;font-size:14px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cs-close').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }
    
    toggleCharacterSheet() {
        const modal = document.getElementById('char-sheet-modal');
        if (!modal) return;
        if (modal.style.display === 'none') {
            this._updateCharacterSheet();
            modal.style.display = '';
        } else {
            modal.style.display = 'none';
        }
    }
    
    _updateCharacterSheet() {
        const p = this.player;
        if (!p) return;
        const stats = p.classData.stats;
        const cd = p.classData;
        const level = window.saveData ? window.saveData.level : 1;
        const name = window.saveData ? window.saveData.name : 'Unknown';
        
        document.getElementById('cs-title').innerText = `${name} — Lv.${level}`;
        document.getElementById('cs-class').innerText = cd.id.charAt(0).toUpperCase() + cd.id.slice(1);
        
        const statColors = { vit: '#ff6b6b', str: '#ff9f43', dex: '#54a0ff', int: '#c471ed' };
        document.getElementById('cs-stats').innerHTML = `
            <div><span style="color:${statColors.vit}">❤ VIT</span></div><div style="text-align:right;font-weight:bold;">${stats.vit}</div>
            <div><span style="color:${statColors.str}">⚔ STR</span></div><div style="text-align:right;font-weight:bold;">${stats.str}</div>
            <div><span style="color:${statColors.dex}">💨 DEX</span></div><div style="text-align:right;font-weight:bold;">${stats.dex}</div>
            <div><span style="color:${statColors.int}">✨ INT</span></div><div style="text-align:right;font-weight:bold;">${stats.int}</div>
        `;
        
        // Derived stats
        const weaponBonusRaw = p.inventory && p.inventory.weapon ? p.inventory.weapon.damageBonus : 0;
        const weaponBonus = typeof weaponBonusRaw === 'number' && !isNaN(weaponBonusRaw) ? weaponBonusRaw : 0;
        let baseDmg = 0;
        if (cd.id === 'wizard') baseDmg = (stats.int * 2) + weaponBonus;
        else if (cd.id === 'samurai') baseDmg = Math.floor(stats.dex * 2.5) + Math.floor(stats.str * 0.5) + weaponBonus;
        else if (cd.id === 'ranger') baseDmg = (stats.dex * 2) + stats.str + weaponBonus;
        else baseDmg = (stats.str * 3) + weaponBonus;
        
        const mult = typeof p.getDamageMultiplier === 'function' ? p.getDamageMultiplier() : 1.0;
        let dmgFormula = `${Math.floor(baseDmg * mult)}`;
        if (mult > 1.0) dmgFormula += ` <span style="color:#f6be3b" title="Camaraderie Buff">(+${Math.round((mult-1)*100)}%)</span>`;
        
        document.getElementById('cs-derived').innerHTML = `
            <div>Max HP: <b style="color:#ff6b6b">${p.maxHp}</b> &nbsp;|&nbsp; Max MP: <b style="color:#60a5fa">${p.maxMp}</b> &nbsp;|&nbsp; Max SP: <b style="color:#4ade80">${p.maxSp}</b></div>
            <div>Damage: <b>~${dmgFormula}</b> &nbsp;|&nbsp; Crit: <b>${(p.critChance || 0).toFixed(1)}%</b></div>
            <div>Speed: <b>${p.speed}</b> &nbsp;|&nbsp; Dash: <b>${p.dashSpeed}</b></div>
        `;
        
        const partyContainer = document.getElementById('cs-party');
        if (this.partyMembers && this.partyMembers.length > 0) {
            partyContainer.innerHTML = this.partyMembers.map((member, idx) => {
                const memberMult = typeof member.getDamageMultiplier === 'function' ? member.getDamageMultiplier() : 1.0;
                const mBaseDmg = member.classData.id === 'wizard' ? (member.classData.stats.int*2) : (member.classData.stats.str*3);
                const mFinalDmg = Math.floor(mBaseDmg * memberMult);
                const mBuffStr = memberMult > 1.0 ? ` <span style="color:#f6be3b">(+${Math.round((memberMult-1)*100)}%)</span>` : '';
                
                return `
                <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;border:1px solid #3a3020;box-shadow:inset 0 0 10px rgba(0,0,0,0.5); position:relative;">
                    <button onclick="window._gameScene.dismissPartyMember(${idx})" style="position:absolute; top:8px; right:8px; background:rgba(255,50,50,0.3); border:1px solid #ff6b6b; color:#fff; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:10px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,50,50,0.6)'" onmouseout="this.style.background='rgba(255,50,50,0.3)'">Dismiss</button>
                    <div style="color:#a0832b;font-weight:bold;margin-bottom:4px;text-transform:capitalize;font-size:16px;">${member.npcName ? member.npcName : (member.classData.id === 'knight' ? 'Warrior' : member.classData.id)}</div>
                    <div style="color:#888;font-size:11px;margin-bottom:8px;text-transform:uppercase;">${member.classData.id}</div>
                    <div style="color:#ff6b6b;font-size:14px;margin-bottom:4px;">❤ HP: ${Math.round(member.hp)}/${member.maxHp}</div>
                    <div style="color:#bbb;font-size:13px;margin-bottom:4px;">⚔️ Dmg: ~${mFinalDmg}${mBuffStr}</div>
                    <div style="color:#f6be3b;font-size:13px;margin-bottom:12px;">🤝 Camaraderie: ${member.camaraderie || 0}</div>
                    <button onclick="window._gameScene.startPartyChat(${idx})" style="width:100%; background:rgba(45,219,222,0.2); border:1px solid #2ddbde; color:#fff; border-radius:4px; padding:4px 0; cursor:pointer; font-size:12px; transition: background 0.2s;" onmouseover="this.style.background='rgba(45,219,222,0.5)'" onmouseout="this.style.background='rgba(45,219,222,0.2)'">💬 Chat</button>
                </div>
            `}).join('');
        } else {
            partyContainer.innerHTML = '<div style="color:#666;font-style:italic;">No party members currently.</div>';
        }
    }
    
    dismissPartyMember(index) {
        if (!this.partyMembers || index < 0 || index >= this.partyMembers.length) return;
        const member = this.partyMembers[index];
        if (member && member.sprite && member.sprite.active) {
            member.die();
            if (this.player && this.player.sprite) {
                this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 30, "Companion Dismissed", 0xffaa00);
            }
            this._updateCharacterSheet();
            if (this.player && this.player.saveGame) {
                this.player.saveGame();
            }
        }
    }

    startPartyChat(index) {
        if (!this.partyMembers || index < 0 || index >= this.partyMembers.length) return;
        const member = this.partyMembers[index];
        
        // Hide character sheet
        document.getElementById('ui-character-sheet').style.display = 'none';
        this.isCharacterSheetOpen = false;
        
        if (member && member.openChat) {
            member.openChat();
        }
    }
    
    updateHUD() {
        if (!this.hudElements) return;
        
        const saveName = window.saveData ? window.saveData.name : 'Unknown Hero';
        const saveLevel = window.saveData ? window.saveData.level : 1;
        const saveGold = window.saveData ? window.saveData.gold : 0;
        const saveXp = window.saveData ? (window.saveData.xp || 0) : 0;
        const xpToNextLevel = saveLevel * 100;
        const xpPercent = Math.min((saveXp / xpToNextLevel) * 100, 100);
        
        if (this.hudElements.nameLevel) {
            // Update text but preserve the character sheet button
            const btn = document.getElementById('btn-char-sheet');
            this.hudElements.nameLevel.childNodes[0].textContent = `${saveName} (Lv.${saveLevel}) `;
        }
        if (this.hudElements.gold) this.hudElements.gold.innerText = `Gold: ${saveGold ?? 0}`;

        // XP bar
        if (this.hudElements.xpFill) this.hudElements.xpFill.style.width = `${xpPercent}%`;
        if (this.hudElements.xpText) this.hudElements.xpText.innerText = `${saveXp}/${xpToNextLevel}`;
        
        // HP updates
        if (this.player && this.hudElements.hpText && this.hudElements.hpFill) {
            this.hudElements.hpText.innerText = `${Math.max(0, Math.floor(this.player.hp))}/${this.player.maxHp}`;
            const hpPercent = (Math.max(0, this.player.hp) / this.player.maxHp) * 100;
            this.hudElements.hpFill.style.width = `${hpPercent}%`;
        }
        
        // MP bar
        if (this.player && this.hudElements.mpFill) {
            const mpPercent = (Math.max(0, this.player.mp) / (this.player.maxMp || 1)) * 100;
            this.hudElements.mpFill.style.width = `${mpPercent}%`;
        }
        if (this.player && this.hudElements.mpText) {
            this.hudElements.mpText.innerText = `${Math.floor(this.player.mp)}/${this.player.maxMp}`;
        }
        
        // SP bar
        if (this.player && this.hudElements.spFill) {
            const spPercent = (Math.max(0, this.player.sp) / (this.player.maxSp || 1)) * 100;
            this.hudElements.spFill.style.width = `${spPercent}%`;
            if (window.debugSP) console.log(`SP: ${this.player.sp}, Percent: ${spPercent}%, Width set to: ${this.hudElements.spFill.style.width}`);
        }

        // Room Tracker
        this.renderRoomTracker();
    }

    showLoading(isVisible) {
        this.loadingText.setVisible(isVisible);
    }

    openTownDirectory() {
        if (!this.player || !this.player.sprite || !this.player.sprite.active) return;
        this.player.sprite.body.moves = false;
        if (this.inputManager) this.inputManager.disableForInput();
        
        const ui = document.getElementById('ui-town-directory');
        if (ui) ui.style.display = 'flex';

        // Add ESC listener
        this._dirEscListener = (e) => {
            if (e.key === 'Escape') this.closeTownDirectory();
        };
        window.addEventListener('keydown', this._dirEscListener);

        const closeBtn = document.getElementById('btn-close-directory');
        if (closeBtn) closeBtn.onclick = () => this.closeTownDirectory();

        const container = document.getElementById('directory-locations-container');
        if (container) {
            container.innerHTML = '';
            Object.keys(window.INDOOR_LOCATIONS).forEach(id => {
                const loc = window.INDOOR_LOCATIONS[id];
                const card = `
                    <div class="bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-3 rounded hover:border-tertiary transition-colors cursor-pointer group" onclick="if(window._gameScene) window._gameScene.enterIndoorLocation('${id}')">
                        <span class="material-symbols-outlined text-4xl text-on-surface group-hover:text-tertiary transition-colors" style="font-variation-settings: 'FILL' 1;">${loc.icon}</span>
                        <div class="font-headline-sm text-[16px] text-tertiary font-bold text-center tracking-wider uppercase">${loc.name}</div>
                        <div class="font-body-sm text-[11px] text-on-surface-variant text-center flex-1">${loc.desc}</div>
                        <button class="w-full mt-2 py-2 bg-surface-container border border-tertiary text-tertiary uppercase text-[10px] font-bold tracking-widest group-hover:bg-tertiary group-hover:text-background transition-colors">Enter</button>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });
        }
    }

    closeTownDirectory() {
        if (this.player && this.player.sprite && this.player.sprite.active) {
            this.player.sprite.body.moves = true;
        }
        if (this.inputManager) this.inputManager.enableForInput();
        const ui = document.getElementById('ui-town-directory');
        if (ui) ui.style.display = 'none';
        if (this._dirEscListener) {
            window.removeEventListener('keydown', this._dirEscListener);
            this._dirEscListener = null;
        }
    }

    enterIndoorLocation(locationId) {
        this.closeTownDirectory();
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const loc = window.INDOOR_LOCATIONS[locationId];
        if (!loc) return;

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.isIndoors = true;
            this.currentIndoorLocation = locationId;

            // Clear town stuff
            if (this.decorGroup) this.decorGroup.clear(true, true);
            this.enemies.clear(true, true);
            if (this.npcs) {
                this.npcs.forEach(npc => {
                    if (npc.sprite && npc.sprite.active) npc.sprite.destroy();
                    if (npc.nameText && npc.nameText.active) npc.nameText.destroy();
                });
                this.npcs = [];
            }
            if (this.lootChests) {
                this.lootChests.forEach(chest => {
                    if (chest.sprite) chest.sprite.destroy();
                    if (chest.promptText) chest.promptText.destroy();
                });
                this.lootChests = [];
            }

            // Hide normal backgrounds and clouds
            this.bgLayers.forEach(bg => { if(bg && bg.active) bg.setVisible(false); });
            if (this.clouds) this.clouds.forEach(c => { if(c && c.active) c.setVisible(false); });

            // Fill the blue sky background with black so the 8px letterbox isn't noticeable
            if (!this.indoorBlackBg) {
                this.indoorBlackBg = this.add.rectangle(640, 360, 1280, 720, 0x000000).setDepth(-12);
            } else {
                this.indoorBlackBg.setVisible(true);
            }

            // Set indoor background
            if (!this.indoorBg) {
                // Anchor bottom-center so the visual floor aligns with the characters
                this.indoorBg = this.add.image(640, 648, loc.bg).setOrigin(0.5, 1).setDepth(-10);
            } else {
                this.indoorBg.setTexture(loc.bg).setVisible(true);
                this.indoorBg.setPosition(640, 648);
            }
            
            // To fit a perfect 64px grid inside the 1280x720 canvas without clipping,
            // the full frame will be 1280x704 (centered with an 8px top/bottom letterbox).
            // This leaves the interior room as exactly 1152x576 (18x9 tiles).
            this.indoorBg.displayWidth = 1152;
            this.indoorBg.displayHeight = 576;
            this.indoorBg.scaleX = this.indoorBg.displayWidth / this.indoorBg.width;
            this.indoorBg.scaleY = this.indoorBg.displayHeight / this.indoorBg.height;

            // Dynamically build the border frame around the room using the 7x7 tile set
            if (!this.indoorWallBgGroup) {
                this.indoorWallBgGroup = this.add.group();
                
                const corners = {
                    tl: 14, tr: 20, bl: 84, br: 90
                };
                
                const edges = {
                    top: [15, 16, 17, 18, 19],
                    bottom: [85, 86, 87, 88, 89],
                    left: [28, 42, 56, 70],
                    right: [34, 48, 62, 76]
                };

                const addTile = (x, y, frame) => {
                    this.indoorWallBgGroup.add(
                        this.add.image(x, y, 'house_inside_tiles', frame)
                            .setOrigin(0, 0)
                            .setDepth(-11)
                            .setScale(2)
                    );
                };

                // Draw Corners perfectly spanning 1280x704 (starting at Y=8 to center vertically)
                addTile(0, 8, corners.tl);
                addTile(1216, 8, corners.tr);
                addTile(0, 648, corners.bl);
                addTile(1216, 648, corners.br);

                // Draw Top and Bottom Edges (18 tiles horizontally)
                for (let x = 64; x < 1216; x += 64) {
                    addTile(x, 8, Phaser.Math.RND.pick(edges.top));
                    addTile(x, 648, Phaser.Math.RND.pick(edges.bottom));
                }

                // Draw Left and Right Edges (9 tiles vertically)
                for (let y = 72; y < 648; y += 64) {
                    addTile(0, y, Phaser.Math.RND.pick(edges.left));
                    addTile(1216, y, Phaser.Math.RND.pick(edges.right));
                }
            } else {
                this.indoorWallBgGroup.getChildren().forEach(img => img.setVisible(true));
            }

            // Tint the floor
            this.platforms.getChildren().forEach(tile => {
                tile.setTint(loc.floorTint);
            });

            // Create an invisible dedicated floor for the interior room
            if (!this.indoorFloor) {
                this.indoorFloor = this.physics.add.staticImage(640, 680, 'pixel');
                this.indoorFloor.setAlpha(0);
                this.indoorFloor.setScale(1280, 50).refreshBody();
                
                // Add colliders for this new floor
                this.physics.add.collider(this.player.sprite, this.indoorFloor);
            } else {
                this.indoorFloor.setActive(true).setVisible(false);
                this.indoorFloor.body.enable = true;
            }

            // Move player to center and scale up, spawned high enough to not clip into floor
            if (this.player && this.player.sprite && this.player.sprite.active) {
                this.player.sprite.setPosition(400, 500);
                this.player.sprite.setVelocity(0, 0);
                if (typeof this.player.setScaleWithPhysics === 'function') {
                    this.player.setScaleWithPhysics(2.5);
                } else {
                    this.player.sprite.setScale(2.5);
                }
                this.player.facingDirection = 1;
            }
            if (this.partyMembers) {
                this.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        member.sprite.setPosition(300, 500);
                        member.sprite.setVelocity(0, 0);
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(2.5);
                        } else {
                            member.sprite.setScale(2.5);
                        }
                        if (this.indoorFloor) {
                            this.physics.add.collider(member.sprite, this.indoorFloor);
                        }
                    }
                });
            }

            // Spawn Location NPC
            const npc = new NPCController(this, 900, 500, this.player, this.geminiService, loc.npcName, loc.npcPersona, loc.npcSprite);
            npc.isIndoorNPC = true;
            npc.indoorAction = loc.action;
            npc.sprite.setScale(2.5); // NPCs aren't using setScaleWithPhysics yet, just standard scale
            if (this.indoorFloor) {
                this.physics.add.collider(npc.sprite, this.indoorFloor);
            }
            this.npcs.push(npc);

            // Add Leave Button to HUD
            this._addIndoorLeaveButton();

            this.isTransitioning = false;
            this.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }

    _addIndoorLeaveButton() {
        if (!this.indoorLeaveBtn) {
            this.indoorLeaveBtn = document.createElement('button');
            this.indoorLeaveBtn.innerText = 'Leave ' + window.INDOOR_LOCATIONS[this.currentIndoorLocation].name;
            this.indoorLeaveBtn.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 50; background: rgba(0,0,0,0.8); border: 2px solid #cc0000; color: #ffcccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: "Courier Prime", monospace; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;';
            this.indoorLeaveBtn.onclick = () => this.exitIndoorLocation();
            this.indoorLeaveBtn.onmouseover = () => this.indoorLeaveBtn.style.background = 'rgba(200,0,0,0.8)';
            this.indoorLeaveBtn.onmouseout = () => this.indoorLeaveBtn.style.background = 'rgba(0,0,0,0.8)';
            document.body.appendChild(this.indoorLeaveBtn);
        } else {
            this.indoorLeaveBtn.innerText = 'Leave ' + window.INDOOR_LOCATIONS[this.currentIndoorLocation].name;
            this.indoorLeaveBtn.style.display = 'block';
        }
    }

    exitIndoorLocation() {
        if (this.isTransitioning || !this.isIndoors) return;
        this.isTransitioning = true;
        
        if (this.indoorLeaveBtn) this.indoorLeaveBtn.style.display = 'none';

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.isIndoors = false;
            this.currentIndoorLocation = null;

            if (this.indoorBlackBg) this.indoorBlackBg.setVisible(false);
            if (this.indoorBg) this.indoorBg.setVisible(false);
            if (this.indoorWallBgGroup) {
                this.indoorWallBgGroup.getChildren().forEach(img => img.setVisible(false));
            }

            // Disable the indoor floor
            if (this.indoorFloor) {
                this.indoorFloor.setActive(false);
                this.indoorFloor.body.enable = false;
            }

            // Destroy indoor NPCs (Weapons Master, shopkeepers, etc.)
            if (this.npcs) {
                this.npcs.forEach(npc => {
                    if (npc.isIndoorNPC) {
                        if (npc.sprite && npc.sprite.active) npc.sprite.destroy();
                        if (npc.nameText && npc.nameText.active) npc.nameText.destroy();
                        if (npc.promptText && npc.promptText.active) npc.promptText.destroy();
                    }
                });
                this.npcs = this.npcs.filter(npc => !npc.isIndoorNPC);
            }

            // Reset player scale back to normal
            if (this.player && this.player.sprite && this.player.sprite.active) {
                if (typeof this.player.setScaleWithPhysics === 'function') {
                    this.player.setScaleWithPhysics(1.5);
                } else {
                    this.player.sprite.setScale(1.5);
                }
            }

            // Reset party member scale back to normal
            if (this.partyMembers) {
                this.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(1.5);
                        } else {
                            member.sprite.setScale(1.5);
                        }
                    }
                });
            }

            // Rebuild the town zone
            const zoneData = this.worldManager.currentZoneData;
            this.worldManager.buildZone(zoneData, 'center');

            this.isTransitioning = false;
            this.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }

    transitionZone(direction) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const nextZoneIndex = window.saveData.currentZone + direction;
        const spawnSide = direction === 1 ? 'left' : 'right'; // If moving right, spawn left.
        
        // Auto-Save all stats, inventory, quests, and alignment
        if (this.player && this.player.saveGame) {
            this.player.saveGame();
        }
        
        // Write to localStorage to persist
        if (window.saveData) {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const saveIndex = saves.findIndex(s => s.id === window.saveData.id);
            if (saveIndex > -1) {
                saves[saveIndex] = window.saveData;
            } else {
                saves.push(window.saveData);
            }
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }

        // Cancel any active cutscenes so they don't bleed into the next zone
        this.cancelCutscene();

        // Fade out
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Restart Scene and pass data (or just reload via save data)
            // Since WorldManager is persistent within GameScene, we can just clear groups
            this.enemies.clear(true, true);
            
            // clear NPCs too if we had a group
            if (this.npcs) {
                this.npcs.forEach(npc => {
                    if (npc.sprite && npc.sprite.active) npc.sprite.destroy();
                    if (npc.nameText && npc.nameText.active) npc.nameText.destroy();
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
            
            // Reload
            this.worldManager.loadZone(nextZoneIndex, spawnSide).then(() => {
                this.isTransitioning = false;
                this.cameras.main.fadeIn(500, 0, 0, 0);
            }).catch(err => {
                console.error("CRITICAL: Error during loadZone transition!", err);
                // Recover from freeze by ending the transition
                this.isTransitioning = false;
                this.cameras.main.fadeIn(500, 0, 0, 0);
            });
        });
    }

    setBiomeVisuals(biome) {
        // Clear old background layers
        if (this.bgLayers) {
            this.bgLayers.forEach(bg => bg.destroy());
        }
        this.bgLayers = [];

        // Clear old platforms
        this.platforms.clear(true, true);

        // Map Biomes to Sky Colors, Floor Tiles, and BG layers
        let skyColor = '#87CEEB'; // Default light blue
        let floorKey = 'floor';
        let floorFrame = undefined;
        let floorTint = 0xffffff; // Default no tint
        let bgConfig = [];

        if (biome === 'Forest' || !biome) {
            skyColor = '#2d4c1e';
            floorKey = 'floor';
            bgConfig = [
                { key: 'bg_forest', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Plains') {
            skyColor = '#87CEEB';
            floorKey = 'floor';
            bgConfig = [
                { key: 'bg_plains', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Desert') {
            skyColor = '#e0a96d';
            floorKey = 'floor_desert';
            bgConfig = [
                { key: 'bg_desert_1', scroll: 0.1, depth: -9 },
                { key: 'bg_desert_2', scroll: 0.2, depth: -8 },
                { key: 'bg_desert_3', scroll: 0.3, depth: -7 },
                { key: 'bg_desert_4', scroll: 0.4, depth: -6 },
                { key: 'bg_desert_5', scroll: 0.5, depth: -5 }
            ];
        } else if (biome === 'Dungeon') {
            skyColor = '#1a1525';
            floorKey = 'floor_hell';
            floorTint = 0x7777aa; // Grey-blue stone
            bgConfig = [
                { key: 'bg_dungeon', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Hell') {
            skyColor = '#1a0b0b';
            floorKey = 'floor_hell';
            bgConfig = [
                { key: 'bg_hell_gemini', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Deadwoods') {
            skyColor = '#2b2a33';
            floorKey = 'floor';
            floorTint = 0x887788;
            bgConfig = [
                { key: 'bg_deadwoods_gemini', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Winter') {
            skyColor = '#1f2937';
            floorKey = 'floor'; // Use the main floor tileset
            floorFrame = 109; // Frame 109 is the snow-capped top-center block
            floorTint = 0xffffff;
            bgConfig = [
                { key: 'bg_winter_mountains', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Coastal') {
            skyColor = '#87CEEB';
            floorKey = 'floor_desert'; // Use sand tile for coast
            floorFrame = 0;
            floorTint = 0xffeedd;
            bgConfig = [];
            
            // Build custom dynamic ocean background
            this.waterLayers = [];
            
            // Create animation if it doesn't exist
            if (!this.anims.exists('coastal_waves')) {
                this.anims.create({
                    key: 'coastal_waves',
                    frames: this.anims.generateFrameNumbers('coastal_anim', { start: 0, end: 12 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
            
            // The GIF is 1280x1280, we want it to cover the screen and scroll slowly
            let bgSprite = this.add.sprite(640, 720, 'coastal_anim')
                .setOrigin(0.5, 1)
                .setScrollFactor(0.1)
                .setDepth(-10);
                
            // Scale to fit height or width, since it's 1280x1280, it easily covers a 1280x720 screen
            const scaleX = 1280 / bgSprite.width;
            const scaleY = 720 / bgSprite.height;
            bgSprite.setScale(Math.max(scaleX, scaleY));
            
            bgSprite.play('coastal_waves');
            this.bgLayers.push(bgSprite);
        }

        this.cameras.main.setBackgroundColor(skyColor);

        // Toggle clouds based on biome
        const showClouds = (biome !== 'Dungeon' && biome !== 'Hell');
        if (this.clouds) {
            this.clouds.forEach(cloud => cloud.setVisible(showClouds));
        }

        // Build Background Layers
        bgConfig.forEach(config => {
            let yPos = 720 + (config.yOffset || 0);
            let bg = this.add.image(640, yPos, config.key).setOrigin(0.5, 1).setScrollFactor(config.scroll).setDepth(config.depth);
            // Scale appropriately based on image dimensions to completely fill the screen
            const scaleX = 1280 / bg.width;
            const scaleY = 720 / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);
            this.bgLayers.push(bg);
        });

        // Build Floor
        for(let i = 0; i < 28; i++) {
            let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
            let block = this.platforms.create(i * 46 + 24, 696, floorKey, frameIdx).setScale(1.5).refreshBody();
            if (floorTint !== 0xffffff) {
                block.setTint(floorTint);
            }
        }

        // Rebuild colliders to link the new platform instances
        if (this.playerCollider) this.physics.world.removeCollider(this.playerCollider);
        if (this.enemiesCollider) this.physics.world.removeCollider(this.enemiesCollider);
        
        this.playerCollider = this.physics.add.collider(this.heroGroup || this.player.sprite, this.platforms);
        this.enemiesCollider = this.physics.add.collider(this.enemies, this.platforms);
    }

    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = 'display: none; position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; width: 400px; height: 90vh; overflow-y: auto; font-family: monospace; font-size: 12px;';
        
        let html = '<div style="display:flex; justify-content:space-between; align-items:center;">';
        html += '<h3 style="margin:0;">Sprite Debugger</h3>';
        html += '<button id="debug-close" style="background:#cc0000; color:white; border:none; padding:2px 6px; cursor:pointer; font-weight:bold;">X</button>';
        html += '</div>';
        html += '<div style="margin-bottom: 10px; font-size: 10px; color: #aaa;">Press ` (backtick) to toggle</div>';
        html += '<select id="debug-sprite" style="width: 100%; margin-bottom: 10px; color: black; background: white;">';
        ['lich_lord', 'skeleton', 'the_devil', 'frost_giant', 'house_inside_tiles'].forEach(key => {
            html += `<option value="${key}">${key}</option>`;
        });
        html += '</select>';
        
        html += '<div style="position: relative; overflow: auto; width: 100%; height: 200px; border: 1px solid #444; margin-bottom: 10px;">';
        html += '<canvas id="debug-canvas" width="1024" height="512"></canvas>';
        html += '<div id="debug-hover-info" style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.8); color: #fff; padding: 3px 6px; font-weight: bold; font-size: 11px; border-radius: 4px; pointer-events: none; display: none;"></div>';
        html += '</div>';

        html += '<div id="debug-controls"></div>';
        
        html += '<button id="debug-apply" style="width: 100%; padding: 5px; margin-top: 10px;">Apply & Restart</button>';
        
        panel.innerHTML = html;
        document.body.appendChild(panel);

        const canvas = document.getElementById('debug-canvas');
        const ctx = canvas.getContext('2d');
        const select = document.getElementById('debug-sprite');
        const controls = document.getElementById('debug-controls');
        
        // Store per-sprite column slice data
        if (!window.sliceColData) {
            try {
                const saved = localStorage.getItem('sprite_slice_coldata');
                window.sliceColData = saved ? JSON.parse(saved) : {};
            } catch(e) { window.sliceColData = {}; }
        }
        // Force reset the cached slices for house_inside_tiles so the 32x32 grid applies
        delete window.sliceColData['house_inside_tiles'];
        if (window.sliceData) delete window.sliceData['house_inside_tiles'];
        // Track which mode the debugger is in
        if (!window.debugMode) window.debugMode = 'rows';

        const getDefaultCols = (key) => {
            if (key === 'house_inside_tiles') {
                const arr = [];
                for (let c = 0; c < 14; c++) arr.push({ x: c * 32, w: 32 });
                return arr;
            }
            const colW = 102;
            const count = 10;
            const arr = [];
            for (let c = 0; c < count; c++) arr.push({ x: c * colW, w: colW });
            return arr;
        };

        const renderControls = () => {
            const key = select.value;
            let rowData = window.sliceData[key];
            if (!rowData) {
                if (key === 'house_inside_tiles') {
                    rowData = window.sliceData[key] = [];
                    for (let r = 0; r < 13; r++) rowData.push({ y: r * 32, h: 32 });
                } else {
                    rowData = window.sliceData[key] = [
                        { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 }, { y: 340, h: 85 }, { y: 425, h: 87 }
                    ];
                }
            }
            let colData = window.sliceColData[key];
            if (!colData) colData = window.sliceColData[key] = getDefaultCols(key);

            const mode = window.debugMode;
            let html = '';

            // Radio buttons
            html += `<div style="margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display:flex; gap:15px; align-items:center;">`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="rows" ${mode === 'rows' ? 'checked' : ''} style="margin-right:4px;">Rows (${rowData.length})</label>`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="cols" ${mode === 'cols' ? 'checked' : ''} style="margin-right:4px;">Columns (${colData.length})</label>`;
            html += `<button id="debug-add" style="margin-left:auto; padding:2px 8px; background:#0077cc; color:white; border:none; cursor:pointer; border-radius:3px; font-size:11px;">+ Add</button>`;
            html += `<button id="debug-remove" style="padding:2px 8px; background:#cc3300; color:white; border:none; cursor:pointer; border-radius:3px; font-size:11px;">− Remove</button>`;
            html += `</div>`;

            if (mode === 'rows') {
                for (let r = 0; r < rowData.length; r++) {
                    html += `<div style="margin-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 5px;">`;
                    html += `<b>Row ${r}</b><br>`;
                    html += `Y: <input type="number" id="debug-${key}-r${r}-y" value="${rowData[r].y}" style="width: 60px; color: black; background: white;"> `;
                    html += `H: <input type="number" id="debug-${key}-r${r}-h" value="${rowData[r].h}" style="width: 60px; color: black; background: white;">`;
                    html += `</div>`;
                }
            } else {
                for (let c = 0; c < colData.length; c++) {
                    html += `<div style="margin-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 5px;">`;
                    html += `<b>Col ${c}</b><br>`;
                    html += `X: <input type="number" id="debug-${key}-c${c}-x" value="${colData[c].x}" style="width: 60px; color: black; background: white;"> `;
                    html += `W: <input type="number" id="debug-${key}-c${c}-w" value="${colData[c].w}" style="width: 60px; color: black; background: white;">`;
                    html += `</div>`;
                }
            }

            html += `<button id="debug-apply" style="margin-top: 10px; width: 100%; padding: 8px; background: #00aa00; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">Apply & Save</button>`;
            controls.innerHTML = html;

            // Radio change handler
            document.querySelectorAll('input[name="debug-mode"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.debugMode = e.target.value;
                    renderControls();
                });
            });

            // Add button
            document.getElementById('debug-add').addEventListener('click', () => {
                if (mode === 'rows') {
                    const last = rowData[rowData.length - 1];
                    rowData.push({ y: last.y + last.h, h: last.h });
                } else {
                    const last = colData[colData.length - 1];
                    colData.push({ x: last.x + last.w, w: last.w });
                }
                renderControls();
            });

            // Remove button
            document.getElementById('debug-remove').addEventListener('click', () => {
                if (mode === 'rows' && rowData.length > 1) rowData.pop();
                else if (mode === 'cols' && colData.length > 1) colData.pop();
                renderControls();
            });

            // Input handlers
            if (mode === 'rows') {
                for (let r = 0; r < rowData.length; r++) {
                    document.getElementById(`debug-${key}-r${r}-y`).addEventListener('input', updateData);
                    document.getElementById(`debug-${key}-r${r}-h`).addEventListener('input', updateData);
                }
            } else {
                for (let c = 0; c < colData.length; c++) {
                    const cx = document.getElementById(`debug-${key}-c${c}-x`);
                    const cw = document.getElementById(`debug-${key}-c${c}-w`);
                    cx.addEventListener('input', () => { colData[c].x = parseInt(cx.value) || 0; drawCanvas(); });
                    cw.addEventListener('input', () => { colData[c].w = parseInt(cw.value) || 0; drawCanvas(); });
                }
            }

            // Apply & Save
            document.getElementById('debug-apply').addEventListener('click', () => {
                localStorage.setItem('sprite_slice_data', JSON.stringify(window.sliceData));
                localStorage.setItem('sprite_slice_coldata', JSON.stringify(window.sliceColData));
                const btn = document.getElementById('debug-apply');
                btn.textContent = '✓ Saved!';
                btn.style.background = '#006600';
                setTimeout(() => { btn.textContent = 'Apply & Save'; btn.style.background = '#00aa00'; }, 1500);
            });

            drawCanvas();
        };

        const updateData = () => {
            const key = select.value;
            const data = window.sliceData[key];
            if (!data) return;
            for (let r = 0; r < data.length; r++) {
                data[r].y = parseInt(document.getElementById(`debug-${key}-r${r}-y`).value) || 0;
                data[r].h = parseInt(document.getElementById(`debug-${key}-r${r}-h`).value) || 0;
            }
            drawCanvas();
        };

        const drawCanvas = () => {
            const key = select.value;
            let img = null;
            if (key === 'lich_lord') img = this.registry.get('debug_tex_lich');
            if (key === 'skeleton') img = this.registry.get('debug_tex_skeleton');
            if (key === 'the_devil') img = this.registry.get('debug_tex_devil');
            if (key === 'frost_giant') img = this.registry.get('debug_tex_frost_giant');
            if (key === 'house_inside_tiles') img = this.registry.get('debug_tex_house_tiles');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (img && img.src) {
                try { ctx.drawImage(img, 0, 0); } catch(e) { console.warn("Failed to draw image to debug canvas", e); }
            }
            
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            const data = window.sliceData[key];
            if (data) {
                for (let r = 0; r < data.length; r++) {
                    const rowY = data[r].y;
                    const rowH = data[r].h;
                    
                    // Highlight the edge if we are hovering or dragging it
                    if (dragState.active && dragState.row === r) {
                        ctx.strokeStyle = 'yellow';
                        ctx.lineWidth = 2;
                    } else {
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 1;
                    }
                    
                    // Draw bounding box for the entire row
                    ctx.strokeRect(0, rowY, 1024, rowH);
                    
                    // Fill the box lightly so it's obvious it's a box
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.fillRect(0, rowY, 1024, rowH);
                    
                    // Label the row
                    ctx.fillStyle = 'white';
                    ctx.font = '16px monospace';
                    ctx.fillText(`ROW ${r}`, 10, rowY + 20);
                    
                    // Draw vertical guides for the columns
                    const colData = window.sliceColData[key];
                    if (colData) {
                        ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)'; // Increased opacity to make them darker/more visible
                        ctx.lineWidth = 1.5;
                        for (let c = 0; c < colData.length; c++) {
                            ctx.strokeRect(colData[c].x, rowY, colData[c].w, rowH);
                        }
                    }
                    ctx.strokeStyle = 'red';
                }
            }
        };

        let dragState = { active: false, axis: null, idx: -1, edge: null, startPos: 0, startVal: 0, startSize: 0 };
        
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            
            const key = select.value;
            const rowData = window.sliceData[key];
            const colData = window.sliceColData[key];
            
            // Check column edges first (left/right)
            if (colData) {
                for (let c = colData.length - 1; c >= 0; c--) {
                    const colX = colData[c].x;
                    const colRight = colData[c].x + colData[c].w;
                    if (Math.abs(mx - colX) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'left', startPos: mx, startVal: colX, startSize: colData[c].w };
                        return;
                    }
                    if (Math.abs(mx - colRight) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'right', startPos: mx, startVal: colX, startSize: colData[c].w };
                        return;
                    }
                }
            }
            
            // Check row edges (top/bottom)
            if (rowData) {
                for (let r = rowData.length - 1; r >= 0; r--) {
                    const rowY = rowData[r].y;
                    const rowBottom = rowData[r].y + rowData[r].h;
                    if (Math.abs(my - rowY) < 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'top', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                    if (Math.abs(my - rowBottom) < 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'bottom', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                }
                // Middle drag for rows
                for (let r = rowData.length - 1; r >= 0; r--) {
                    const rowY = rowData[r].y;
                    const rowBottom = rowData[r].y + rowData[r].h;
                    if (my >= rowY + 10 && my <= rowBottom - 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'middle', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                }
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            
            const key = select.value;
            const rowData = window.sliceData[key];
            const colData = window.sliceColData[key];
            
            if (dragState.active) {
                const i = dragState.idx;
                if (dragState.axis === 'row') {
                    const dy = my - dragState.startPos;
                    if (dragState.edge === 'top') {
                        rowData[i].y = Math.round(dragState.startVal + dy);
                        rowData[i].h = Math.round(dragState.startSize - dy);
                    } else if (dragState.edge === 'bottom') {
                        rowData[i].h = Math.round(dragState.startSize + dy);
                    } else {
                        rowData[i].y = Math.round(dragState.startVal + dy);
                    }
                    const yInput = document.getElementById(`debug-${key}-r${i}-y`);
                    const hInput = document.getElementById(`debug-${key}-r${i}-h`);
                    if (yInput) yInput.value = rowData[i].y;
                    if (hInput) hInput.value = rowData[i].h;
                } else if (dragState.axis === 'col') {
                    const dx = mx - dragState.startPos;
                    if (dragState.edge === 'left') {
                        colData[i].x = Math.round(dragState.startVal + dx);
                        colData[i].w = Math.round(dragState.startSize - dx);
                    } else if (dragState.edge === 'right') {
                        colData[i].w = Math.round(dragState.startSize + dx);
                    }
                    const xInput = document.getElementById(`debug-${key}-c${i}-x`);
                    const wInput = document.getElementById(`debug-${key}-c${i}-w`);
                    if (xInput) xInput.value = colData[i].x;
                    if (wInput) wInput.value = colData[i].w;
                }
                drawCanvas();
            } else {
                // Cursor hints
                let cursor = 'default';
                if (colData) {
                    for (let c = 0; c < colData.length; c++) {
                        if (Math.abs(mx - colData[c].x) < 10 || Math.abs(mx - (colData[c].x + colData[c].w)) < 10) {
                            cursor = 'ew-resize'; break;
                        }
                    }
                }
                if (cursor === 'default' && rowData) {
                    for (let r = 0; r < rowData.length; r++) {
                        if (Math.abs(my - rowData[r].y) < 10 || Math.abs(my - (rowData[r].y + rowData[r].h)) < 10) {
                            cursor = 'ns-resize'; break;
                        }
                    }
                }
                canvas.style.cursor = cursor;

                // Update hover info display
                let hoveredRow = -1;
                let hoveredCol = -1;
                if (rowData) {
                    for (let r = 0; r < rowData.length; r++) {
                        if (my >= rowData[r].y && my <= rowData[r].y + rowData[r].h) {
                            hoveredRow = r; break;
                        }
                    }
                }
                if (colData) {
                    for (let c = 0; c < colData.length; c++) {
                        if (mx >= colData[c].x && mx <= colData[c].x + colData[c].w) {
                            hoveredCol = c; break;
                        }
                    }
                }
                
                const hoverInfo = document.getElementById('debug-hover-info');
                if (hoverInfo) {
                    if (hoveredRow !== -1 && hoveredCol !== -1) {
                        hoverInfo.style.display = 'block';
                        hoverInfo.innerText = `Row ${hoveredRow}, Col ${hoveredCol}`;
                    } else {
                        hoverInfo.style.display = 'none';
                    }
                }
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            const hoverInfo = document.getElementById('debug-hover-info');
            if (hoverInfo) hoverInfo.style.display = 'none';
        });
        
        window.addEventListener('mouseup', () => {
            if (dragState.active) {
                dragState.active = false;
                drawCanvas();
            }
        });

        select.addEventListener('change', () => {
            renderControls();
            updateData();
        });

        document.getElementById('debug-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        if (!window._debugKeyBound) {
            window._debugKeyBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === '`' || e.key === '~') {
                    const p = document.getElementById('debug-panel');
                    if (p) {
                        p.style.display = p.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
        }

        renderControls();
        updateData();
    }

    update(time, delta) {
        if (this.isTransitioning) return;

        // Animate clouds
        if (this.clouds) {
            this.clouds.forEach(cloud => {
                cloud.x += cloud.floatSpeed * (delta / 16); // Normalizes speed to 60fps
                if (cloud.x > 1400) {
                    cloud.x = -200;
                    cloud.y = 20 + Math.random() * 200;
                    cloud.floatSpeed = 0.1 + Math.random() * 0.3;
                    const cloudTypes = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6'];
                    cloud.setTexture(cloudTypes[Math.floor(Math.random() * cloudTypes.length)]);
                }
            });
        }
        
        // Animate Water Layers
        if (this.waterLayers && this.waterLayers.length > 0) {
            this.waterLayers.forEach(water => {
                water.tilePositionX += water.animSpeed * (delta / 16);
            });
        }

        this.inputManager.update();
        if (this.player) this.player.update(time, delta);
        
        // Handle Zone Transitions (disabled if indoors)
        if (!this.isTransitioning && !this.isIndoors) {
            if (this.player.sprite.x > 1200) {
                this.transitionZone(1); // Move Right
            } else if (this.player.sprite.x < 60 && !this.isIndoors) {
                this.transitionZone(-1); // Move Left
            }
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

        // Update Loot Chests
        if (this.lootChests && this.lootChests.length > 0) {
            const interactDistance = 60;
            const px = this.player.sprite.x;
            const py = this.player.sprite.y;

            for (let i = this.lootChests.length - 1; i >= 0; i--) {
                const chest = this.lootChests[i];
                if (chest.isOpen) continue;

                const dist = Phaser.Math.Distance.Between(px, py, chest.sprite.x, chest.sprite.y);
                
                // Show prompt if close
                if (dist < interactDistance) {
                    if (!chest.promptText.visible) chest.promptText.setVisible(true);
                    
                    // Interact
                    if (this.inputManager.keys.interact.isDown && time - (this._lastChestInteractTime || 0) > 500) {
                        this._lastChestInteractTime = time;
                        chest.isOpen = true;
                        chest.promptText.destroy();
                        
                        // Play open animation
                        chest.sprite.play('loot_chest_open');
                        
                        chest.sprite.once('animationcomplete', () => {
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

                            // Fade out chest
                            this.tweens.add({
                                targets: chest.sprite,
                                alpha: 0,
                                duration: 1000,
                                delay: 500,
                                onComplete: () => {
                                    if (chest.sprite) chest.sprite.destroy();
                                }
                            });
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
                if (!this.angelPromptText) {
                    this.angelPromptText = this.add.text(this.angelStatue.x, this.angelStatue.y - 120, 'Press F - Town Directory', {
                        fontFamily: '"Courier Prime", Courier, monospace',
                        fontSize: '14px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
                    }).setOrigin(0.5).setDepth(100);
                } else {
                    this.angelPromptText.setVisible(true);
                }

                if (this.inputManager.keys.interact.isDown && time - (this._lastStatueInteractTime || 0) > 500) {
                    this._lastStatueInteractTime = time;
                    if (this.openTownDirectory) this.openTownDirectory();
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

    spawnHeroAI(spriteKey, x, y, aiState, npcName = null, persona = null, camaraderie = 0) {
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
        const hero = new PlayerController(this, x, spawnY, this.inputManager, { isAI: true, aiState: aiState, classId: spriteKey, npcName: npcName, persona: persona, camaraderie: camaraderie });
        
        if (isParty) {
            this.partyMembers.push(hero);
            if (this.heroGroup) this.heroGroup.add(hero.sprite);
            this.showFloatingText(x, y, "Joined Party!", 0x00ff00);
            this.physics.add.collider(hero.sprite, this.platforms);
        } else {
            // Hostile
            this.enemies.add(hero.sprite);
            hero.sprite.controller = hero; // So takeDamage works
            this.physics.add.collider(hero.sprite, this.platforms);
            this.showFloatingText(x, y, "HOSTILE!", 0xff0000);
        }
    }

    spawnLootChest(x, y) {
        if (!this.textures.exists('loot_chest')) return;
        
        const sprite = this.add.sprite(x, y, 'loot_chest', 0);
        sprite.setScale(2);
        sprite.setOrigin(0.5, 1); // anchor at bottom
        
        // Ensure it sits on ground
        this.physics.add.existing(sprite);
        sprite.body.setAllowGravity(true);
        this.physics.add.collider(sprite, this.platforms);

        // Hover text
        const promptText = this.add.text(x, y - 50, '[F] Open', {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '16px',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        // Floating animation for prompt
        this.tweens.add({
            targets: promptText,
            y: y - 55,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

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
        if (this.cutsceneInterval) clearInterval(this.cutsceneInterval);
        if (this.cutsceneTimeout1) clearTimeout(this.cutsceneTimeout1);
        if (this.cutsceneTimeout2) clearTimeout(this.cutsceneTimeout2);
        this.cutsceneInterval = null;
        this.cutsceneTimeout1 = null;
        this.cutsceneTimeout2 = null;
        
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.isCutscene = false;
        if (this.physics && this.physics.world && this.physics.world.isPaused) {
            this.physics.resume();
        }
    }

    playCutscene(text, onCompleteCallback) {
        this.cancelCutscene(); // Cancel any existing cutscene before starting a new one
        this.isCutscene = true;
        this.physics.pause();
        
        const overlay = document.getElementById('cutscene-overlay');
        const textContainer = document.getElementById('cutscene-text');
        
        if (overlay && textContainer) {
            overlay.style.display = 'flex';
            // Trigger reflow
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            
            textContainer.innerHTML = '';
            let i = 0;
            this.cutsceneInterval = setInterval(() => {
                if (i < text.length) {
                    textContainer.innerHTML += text.charAt(i);
                    i++;
                } else {
                    clearInterval(this.cutsceneInterval);
                    this.cutsceneTimeout1 = setTimeout(() => {
                        overlay.style.opacity = '0';
                        this.cutsceneTimeout2 = setTimeout(() => {
                            overlay.style.display = 'none';
                            this.isCutscene = false;
                            this.physics.resume();
                            if (onCompleteCallback) onCompleteCallback();
                        }, 500);
                    }, 3000); // Read time
                }
            }, 30); // Typing speed
        } else {
            this.cancelCutscene();
            if (onCompleteCallback) onCompleteCallback();
        }
    }

    grantRewards(xp, gold) {
        // Logic to add XP and Gold to player's save data
        if (!window.saveData) return;
        
        window.saveData.xp = (window.saveData.xp || 0) + xp;
        window.saveData.gold = (window.saveData.gold || 0) + gold;
        
        // Show floating text for rewards above player
        this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 40, `+${xp} XP`, 0x00ffff);
        
        setTimeout(() => {
            if (this.player && this.player.sprite) {
                this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 40, `+${gold} Gold`, 0xffff00);
            }
        }, 500);

        // Check for Level Ups
        let currentLevel = window.saveData.level || 1;
        let xpToNextLevel = currentLevel * 100;
        let leveledUp = false;

        // Class-specific stat growth per level
        const growthTable = {
            knight:   { vit: 2, str: 2, dex: 1, int: 0 },
            wizard:   { vit: 1, str: 0, dex: 1, int: 3 },
            samurai: { vit: 1, str: 1, dex: 3, int: 0 },
            ranger:   { vit: 1, str: 1, dex: 2, int: 1 }
        };
        const classId = window.saveData.classId || 'knight';
        const growth = growthTable[classId] || growthTable.knight;

        while (window.saveData.xp >= xpToNextLevel) {
            window.saveData.xp -= xpToNextLevel;
            currentLevel++;
            window.saveData.level = currentLevel;
            
            // Apply class-specific stat growth
            if (window.selectedClass && window.selectedClass.stats) {
                window.selectedClass.stats.vit += growth.vit;
                window.selectedClass.stats.str += growth.str;
                window.selectedClass.stats.dex += growth.dex;
                window.selectedClass.stats.int += growth.int;
            }

            xpToNextLevel = currentLevel * 100;
            leveledUp = true;
        }

        // Persist stats to saveData so they survive reload
        if (window.selectedClass && window.selectedClass.stats) {
            window.saveData.stats = { ...window.selectedClass.stats };
        }

        if (leveledUp) {
            setTimeout(() => {
                if (this.player && this.player.sprite) {
                    this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 60, `LEVEL UP!`, 0x00ff00);
                    // Update Player Controller stats
                    this.player.recalculateStats();
                    // Fully heal on level up
                    this.player.hp = this.player.maxHp;
                    this.player.mp = this.player.maxMp;
                    this.player.sp = this.player.maxSp;
                }
            }, 1000);
        }

        // Add camaraderie for fighting alongside allies
        if (this.partyMembers && this.partyMembers.length > 0) {
            this.partyMembers.forEach(member => {
                // 25% chance to gain 1 camaraderie per kill
                if (Math.random() < 0.25) {
                    member.camaraderie = (member.camaraderie || 0) + 1;
                    if (this.showFloatingText && member.sprite && member.sprite.active) {
                        this.showFloatingText(member.sprite.x, member.sprite.y - 30, "+1 Camaraderie", 0xf6be3b);
                    }
                }
            });
        }

        // Update HUD
        this.updateHUD();
    }
}
