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

        // Slice custom static enemy/boss textures
        EnemyAnimationLoader.sliceCustomTextures(this);

        // Only register animations once — they're global in Phaser and persist across scene restarts.
        // Without this guard, every zone transition produces 100+ 'key already exists' warnings.
        if (!this.anims.exists('slime-idle')) {
            EnemyAnimationLoader.registerAll(this);
        }

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
                const dmg = projectile.damage != null ? projectile.damage : 15;
                if (heroSprite === this.player.sprite) {
                    this.player.takeDamage(dmg, knockbackDir);
                    if (projectile.texture.key === 'burning_skull' && this.player.applyStatusEffect) {
                        this.player.applyStatusEffect('burn', 3000, 10);
                    }
                } else {
                    const member = this.partyMembers.find(m => m.sprite === heroSprite);
                    if (member && typeof member.takeDamage === 'function') {
                        member.takeDamage(dmg, knockbackDir);
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
        const startZone = saveData && saveData.currentZone !== undefined ? saveData.currentZone : 0;
        
        // Initialize Player — spawn near ground level
        this.player = new PlayerController(this, 100, 620, this.inputManager);
        if (window.autoplayEnabled) {
            this.player.isAI = true;
            this.player.aiState = 'party';
        }
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
        this.isCutscene = false;
        
        // Build HUD (must be before loadZone so zone name element exists)
        this.createHUD();
        
        // Load Initial Zone
        this.worldManager.loadZone(startZone, 'center').then(() => {
            if (this.isSceneDestroyed) return;
            // Spawn cargo mules AFTER platforms are loaded
            this.spawnCargoCompanion();
            // Trigger New Game Intro Cutscene
            if (saveData && saveData.isNewGame) {
                saveData.isNewGame = false;
                
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
        if (saveData && typeof saveData.x === 'number' && !isNaN(saveData.x)) {
            safeSpawnX = saveData.x;
        }
        if (saveData && typeof saveData.y === 'number' && !isNaN(saveData.y)) {
            safeSpawnY = saveData.y;
        }
        this.player.sprite.setPosition(safeSpawnX, safeSpawnY);
        
        // Set camera bounds (Width 3840, height 4000 to allow falling into deep pits)
        this.cameras.main.setBounds(0, -2000, 3840, 4000);
        
        // Snap camera Y to player initially
        this.cameras.main.scrollY = Phaser.Math.Clamp(this.player.sprite.y - this.cameras.main.height * 0.72, 50, 350);
        
        // Start following player (lerpY is 0.0 to handle follow-down manually in update)
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.0);
        
        // Restore saved party members
         if (saveData && saveData.party && saveData.party.length > 0) {
             // Cleanup any corrupted pack mules in the save data (Phase 12)
             saveData.party = saveData.party.filter(member => member.classId !== 'pack_mule' && (!member.npcName || !member.npcName.startsWith('Pack Mule')));
             
             const mapWidth = this.physics.world.bounds.width || 1280;
             saveData.party.forEach((memberData, i) => {
                 const spawnX = Phaser.Math.Clamp(this.player.sprite.x + 60 + (i * 60), 50, mapWidth - 50);
                 let classId = memberData.classId;
                 const isStandard = ['knight', 'wizard', 'ranger', 'samurai', 'warrior'].includes(classId);
                 const isValidRegistered = window.classesData && window.classesData[classId.replace('_rival', '')];
                 if (!isStandard && !isValidRegistered) {
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

        // Setup caravan rope graphics
        this.caravanRopeGraphics = this.add.graphics();

        // Caravan companion (mule/cart) is spawned inside loadZone().then() above
        
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
            // Do not toggle if the user is typing in any text field
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            // Do not toggle if the party builder is open
            if (document.getElementById('ui-party-builder')?.style.display === 'flex') return;
            this.toggleCharacterSheet();
        });
        
        // Spawn Party Member via Party Builder UI (P)
        this.input.keyboard.on('keydown-P', (event) => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            if (!this.partyMembers) this.partyMembers = [];
            if (this.partyMembers.length >= 6) {
                this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 40, 'Party Full! (Max 6)', 0xff4444);
                return;
            }
            this._openPartyBuilder();
        });

        this._lastDebugUpdate = 0;
    }
    
    _openPartyBuilder() {
        const modal = document.getElementById('ui-party-builder');
        if (!modal) return;
        modal.style.display = 'flex';
        
        // Pause player input
        if (this.inputManager) this.inputManager.disableForInput();
        
        let selectedClass = 'knight';
        let selectedGender = 'any'; // Default: random
        
        // ESC closes the party builder
        const escHandler = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', escHandler);
        // Pre-fill name with a random generated name if CharacterComposer is available
        const nameInput = document.getElementById('party-builder-name');
        if (nameInput && window.CharacterComposer) {
            nameInput.value = window.CharacterComposer.generateRandomName(selectedClass);
        }
        
        // Handle class card selection
        const cards = document.querySelectorAll('.pb-class-card');
        const selectCard = (cls) => {
            selectedClass = cls;
            cards.forEach(c => {
                const isSelected = c.dataset.class === cls;
                c.style.borderColor = isSelected ? '#b8860b' : '#444';
                c.style.background = isSelected ? 'rgba(184,134,11,0.15)' : 'transparent';
            });
            if (nameInput && window.CharacterComposer) {
                nameInput.value = window.CharacterComposer.generateRandomName(cls);
            }
        };
        selectCard('knight'); // Default selection
        cards.forEach(c => c.onclick = () => selectCard(c.dataset.class));

        // Handle gender button selection
        const genderBtns = document.querySelectorAll('.pb-gender-btn');
        const selectGender = (g) => {
            selectedGender = g;
            genderBtns.forEach(btn => {
                const isSelected = btn.dataset.gender === g;
                btn.style.borderColor = isSelected ? '#b8860b' : '#444';
                btn.style.background = isSelected ? 'rgba(184,134,11,0.15)' : 'transparent';
                btn.style.color = isSelected ? '#b8860b' : '#aaa';
            });
        };
        selectGender('any'); // Default: any
        genderBtns.forEach(btn => btn.onclick = () => selectGender(btn.dataset.gender));
        
        const close = () => {
            modal.style.display = 'none';
            if (this.inputManager) this.inputManager.enableForInput();
            window.removeEventListener('keydown', escHandler);
        };
        
        document.getElementById('party-builder-cancel').onclick = close;
        
        document.getElementById('party-builder-confirm').onclick = () => {
            const name = (nameInput && nameInput.value.trim()) || 'Unknown';
            const personaInput = document.getElementById('party-builder-persona');
            const persona = (personaInput && personaInput.value.trim()) || 'A loyal companion ready to fight.';
            
            const px = this.player.sprite.x + 40;
            const py = this.player.sprite.y - 10;
            
            if (selectedClass === 'custom') {
                // Generate a random custom modular NPC, passing the chosen gender
                const gender = selectedGender === 'any' ? null : selectedGender;
                if (window.CharacterComposer) {
                    const npcData = window.CharacterComposer.generateRandomNPC(this, gender);
                    this.spawnHeroAI(npcData.spriteKey, px, py, 'party', name, persona, 0, npcData.weaponType);
                } else {
                    this.spawnHeroAI('knight', px, py, 'party', name, persona);
                }
            } else {
                this.spawnHeroAI(selectedClass, px, py, 'party', name, persona);
            }
            close();
        };
    }


    _autoSave() {
        if (!this.player || !this.player.saveGame) return;
        this.player.saveGame();
        if (saveData) {
            const saves = window.getSaves();
            const idx = saves.findIndex(s => s.id === saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(saveData));
            if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
            window.saveSaves(saves);
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
    return GameScene_Helper.transitionZone.call(this, direction);
}

    triggerWrathVisuals(dimension) {
        // Camera shake
        this.cameras.main.shake(1200, 0.025);

        // Flash screen
        if (dimension === 'Heaven') {
            this.cameras.main.flash(1000, 255, 245, 210); // Golden white flash
        } else {
            this.cameras.main.flash(1000, 220, 10, 10); // Blood red flash
        }

        // Add a giant dramatic banner text at the center of the screen
        const bannerText = dimension === 'Heaven' ? 'THE BLESSINGS OF THE HEAVENS!' : 'THE DAMNATION OF HELL!';
        const bannerColor = dimension === 'Heaven' ? '#ffeb88' : '#ff4444';
        
        const text = this.add.text(640, 260, bannerText, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '46px',
            fill: bannerColor,
            stroke: '#000000',
            strokeThickness: 8,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setScale(0);

        const subTextStr = dimension === 'Heaven' 
            ? 'Your saintly deeds pull you into the celestial realm...' 
            : 'Your demonic sins drag you into the fiery depths...';
            
        const subText = this.add.text(640, 320, subTextStr, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '20px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);

        // Scale up banner
        this.tweens.add({
            targets: text,
            scale: 1.0,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (this.isSceneDestroyed) return;
                // Fade in subtext
                this.tweens.add({
                    targets: subText,
                    alpha: 1,
                    duration: 300
                });

                // Hold for 1.8 seconds, then fade both out and destroy
                this.time.delayedCall(1800, () => {
                    if (this.isSceneDestroyed) return;
                    this.tweens.add({
                        targets: [text, subText],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            text.destroy();
                            subText.destroy();
                        }
                    });
                });
            }
        });
    }

    setBiomeVisuals(biome, zoneType = 'Hostile') {
        this.zoneBiome = biome;
        
        // Build floor and background layers
        this.levelGenerator.setBiomeVisuals(biome, zoneType);

        // Hide GM AI weather overlay when loading visuals for a new zone
        if (this._weatherOverlay) {
            this._weatherOverlay.setVisible(false);
        }

        // Set basic sky color
        let bgColor = '#87CEEB'; // default sky
        if (biome === 'Desert') bgColor = '#f4a460';
        if (biome === 'Winter') bgColor = '#a9a9a9';
        if (biome === 'Heaven') bgColor = '#fff9e6'; // pearlescent golden sky
        if (biome === 'Cave' || biome === 'Dungeon' || biome === 'Deadwoods' || biome === 'Hell') bgColor = '#1a1a1a';
        this.cameras.main.setBackgroundColor(bgColor);

        // Hide clouds in underground / dark biomes — no sky visible underground
        const cloudlessBiomes = ['Dungeon', 'Cave', 'Hell'];
        const showClouds = !cloudlessBiomes.includes(biome);
        if (this.clouds && this.clouds.length > 0) {
            this.clouds.forEach(cloud => {
                cloud.setVisible(showClouds);
                if (biome === 'Heaven') {
                    cloud.setTint(0xfff8d0); // Light warm golden tint
                } else {
                    cloud.clearTint();
                }
            });
        }

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
        
        // cull entities falling into the deep abyss (below y > 800)
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.y > 800) {
                enemy.destroy();
            }
        });
        
        if (this.player && this.player.sprite && this.player.sprite.y > 800 && this.player.hp > 0) {
            console.error(`%c[DIAGNOSTIC] GameScene detected player below abyss! Y: ${this.player.sprite.y}. HP: ${this.player.hp}. Platforms count: ${this.platforms.getLength()}`, "color: #ff3333; font-weight: bold;");
            this.player.takeDamage(this.player.hp);
        }
        
        // Dynamically adjust camera bounds so it doesn't show underground unless falling
        if (this.player && this.player.sprite && this.player.sprite.active) {
            const widthTiles = this.worldManager && this.worldManager.currentZoneData && this.worldManager.currentZoneData.type === 'Safe' ? 40 : 84;
            const targetHeight = 3200;
            
            if (typeof this.currentCameraHeight === 'undefined') {
                this.currentCameraHeight = targetHeight;
            } else {
                const factor = Math.min(1, 0.05 * (delta / 16.666));
                this.currentCameraHeight = this.currentCameraHeight + (targetHeight - this.currentCameraHeight) * factor;
            }
            
            this.cameras.main.setBounds(0, -2000, widthTiles * 46, this.currentCameraHeight);

            // Manual camera vertical follow: only follow player down when in the air, but follow both ways when grounded.
            if (!this.isIndoors) {
                const playerSprite = this.player.sprite;
                const cam = this.cameras.main;
                const targetScrollY = playerSprite.y - cam.height * 0.72;
                const onGround = playerSprite.body.touching.down || playerSprite.body.blocked.down;
                
                if (onGround) {
                    const lerpY = 0.1 * (delta / 16.666);
                    cam.scrollY = cam.scrollY + (targetScrollY - cam.scrollY) * Math.min(1, lerpY);
                } else {
                    // Only follow down (scrollY can only increase/descend)
                    if (targetScrollY > cam.scrollY) {
                        const lerpY = 0.1 * (delta / 16.666);
                        cam.scrollY = cam.scrollY + (targetScrollY - cam.scrollY) * Math.min(1, lerpY);
                    }
                }

                // Tight vertical camera limits to prevent showing empty sky or empty void below platforms
                cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 50, 350);
            }
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
                        if (!saveData) saveData = {};
                        saveData.gold = (saveData.gold || 0) + 500;
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
            // Compute boundaries dynamically from the actual map width (accounts for capital cities being wider)
            const mapWidth = this.physics.world.bounds.width || 1840;
            const rightBoundary = mapWidth - 120;
            const leftBoundary = 60;

            // Anti-bounce cooldown: prevent transitions within 2 seconds of the last one
            const now = Date.now();
            const lastTransition = this._lastTransitionTime || 0;
            if (now - lastTransition < 2000) {
                // Clamp player to safe area instead of transitioning
                if (this.player.sprite.x < leftBoundary) this.player.sprite.x = leftBoundary + 20;
                if (this.player.sprite.x > rightBoundary) this.player.sprite.x = rightBoundary - 20;
            } else {
                if (this.player.sprite.x > rightBoundary) {
                    this._lastTransitionTime = now;
                    this.transitionZone(1); // Move Right
                } else if (this.player.sprite.x < leftBoundary && !this.isIndoors) {
                    this._lastTransitionTime = now;
                    this.transitionZone(-1); // Move Left
                }
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
            const interactDistance = 100; // Increased from 60 to 100 to allow smooth interaction with vertical offsets
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
            const dist = Math.abs(this.player.sprite.x - this.angelStatue.x);
            
            if (this.player.isAI && (!this._lastStatueLogTime || time - this._lastStatueLogTime > 1000)) {
                this._lastStatueLogTime = time;
                let npcInfo = "";
                if (this.npcs) {
                    this.npcs.forEach(npc => {
                        if (npc && npc.sprite && npc.sprite.active) {
                            const distToNpc = Math.abs(this.player.sprite.x - npc.sprite.x);
                            npcInfo += `${npc.npcName || npc.name || 'NPC'}(X:${npc.sprite.x.toFixed(1)}, D:${distToNpc.toFixed(1)}, <80&<dist:${distToNpc < 80 && distToNpc < dist}) `;
                        }
                    });
                }
                console.log(`[DIAGNOSTIC STATUE] Player X: ${this.player.sprite.x.toFixed(1)}, Y: ${this.player.sprite.y.toFixed(1)} | Statue X: ${this.angelStatue.x}, Y: ${this.angelStatue.y} | Dist: ${dist.toFixed(1)} | NPCs: ${npcInfo} | InteractDown: ${this.player.isInteractDown()}`);
            }

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
                            const npcHorizontalDist = Math.abs(this.player.sprite.x - npc.sprite.x);
                            const statueHorizontalDist = Math.abs(this.player.sprite.x - this.angelStatue.x);
                            if (npcHorizontalDist < 80 && npcHorizontalDist < statueHorizontalDist && statueHorizontalDist >= 20) {
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

        // Draw caravan attachment ropes/chains
        if (this.caravanRopeGraphics) {
            this.caravanRopeGraphics.clear();
            const carriers = this.partyMembers.filter(m => m.isCargoCarrier && m.sprite && m.sprite.active);
            
            if (carriers.length > 0) {
                // Build a chain: player → mule1 → mule2 → ...
                let prevSprite = this.player.sprite;
                carriers.forEach(carrier => {
                    if (prevSprite && prevSprite.active && carrier.sprite && carrier.sprite.active) {
                        const pX = prevSprite.x;
                        const pY = prevSprite.y;
                        const cX = carrier.sprite.x;
                        const cY = carrier.sprite.y;
                        
                        // Only draw rope if they're reasonably close (< 400px)
                        const dist = Math.abs(pX - cX);
                        if (dist < 400) {
                            // Draw connecting rope
                            this.caravanRopeGraphics.lineStyle(3, 0x5c4033, 0.8);
                            this.caravanRopeGraphics.lineBetween(pX, pY + 10, cX, cY + 10);
                            
                            // Draw attachment knots/rings
                            this.caravanRopeGraphics.fillStyle(0x3e2723, 1);
                            this.caravanRopeGraphics.fillCircle(pX, pY + 10, 4);
                            this.caravanRopeGraphics.fillCircle(cX, cY + 10, 4);
                        }
                    }
                    prevSprite = carrier.sprite;
                });
            }
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

spawnHeroAI(spriteKey, x, y, aiState, npcName = null, persona = null, camaraderie = 0, weaponType = null, faction = null) {
    return GameScene_Helper.spawnHeroAI.call(this, spriteKey, x, y, aiState, npcName, persona, camaraderie, weaponType, faction);
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
    return GameScene_Helper.showFloatingText.call(this, x, y, message, color);
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

clearHellZone() {
    return GameScene_Helper.clearHellZone.call(this);
}

cleanupScene() {
    return GameScene_Helper.cleanupScene.call(this);
}

    cleanupDynamicTextures(deleteAll = false) {
        if (!this.textures) return;
        const keepKeys = new Set();
        if (!deleteAll) {
            if (this.player && this.player.sprite && this.player.sprite.texture) {
                keepKeys.add(this.player.sprite.texture.key);
            }
            if (this.partyMembers) {
                this.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.texture) {
                        keepKeys.add(member.sprite.texture.key);
                    }
                });
            }
        }

        const textureKeys = this.textures.getTextureKeys();
        for (const key of textureKeys) {
            if (key.startsWith('custom_npc_') || key.startsWith('special_enemy_') || key.startsWith('rescuee_')) {
                if (!keepKeys.has(key)) {
                    this.textures.remove(key);
                }
            }
        }
    }

    spawnCargoCompanion() {
        if (!this.player || !this.player.sprite || !this.partyMembers) return;

        // Count total cargo
        if (!saveData.cargo) saveData.cargo = {};
        const totalCargo = Object.values(saveData.cargo).reduce((a, b) => a + b, 0);

        // Find existing cargo carriers
        const existingCarriers = this.partyMembers.filter(m => m.isCargoCarrier);

        // Hide caravan if indoors or if no cargo is carried
        const isActuallyIndoor = this.currentIndoorLocation || this.isIndoors || (saveData && saveData.currentZoneType === 'Safe_Indoor');
        
        if (totalCargo === 0 || isActuallyIndoor) {
            existingCarriers.forEach(carrier => {
                const idx = this.partyMembers.indexOf(carrier);
                if (idx > -1) this.partyMembers.splice(idx, 1);
                if (this.heroGroup) this.heroGroup.remove(carrier.sprite);
                carrier.destroy();
            });
            return;
        }

        // Determine targets: 1 pack mule per every 2 units of cargo (up to 5 mules)
        const targetClasses = [];
        const numMules = Math.min(5, Math.ceil(totalCargo / 2));
        for (let i = 0; i < numMules; i++) {
            targetClasses.push('pack_mule');
        }

        const currentClasses = existingCarriers.map(m => m.classData.id);
        const matches = currentClasses.length === targetClasses.length;

        if (matches) {
            // Keep active and updated
            return;
        }

        // Destroy mismatches
        existingCarriers.forEach(carrier => {
            const idx = this.partyMembers.indexOf(carrier);
            if (idx > -1) this.partyMembers.splice(idx, 1);
            if (this.heroGroup) this.heroGroup.remove(carrier.sprite);
            carrier.destroy();
        });

        // Spawn caravan units
        const playerX = this.player.sprite.x;
        const mapWidth = this.physics.world.bounds.width || 1280;
        const mapCenter = mapWidth / 2;
        // Spawn mules toward the center of the map so they don't fall off either edge
        const direction = playerX > mapCenter ? -1 : 1;
        targetClasses.forEach((classId, index) => {
            const spawnX = Phaser.Math.Clamp(playerX + direction * (40 + index * 50), 80, mapWidth - 80);
            // Use a safe ground Y — capped so they spawn on ground, not in the void
            const spawnY = Math.min(this.player.sprite.y, 500);
            const carrier = new PlayerController(this, spawnX, spawnY, this.inputManager, {
                isAI: true,
                aiState: 'party',
                classId: classId,
                npcName: `Pack Mule ${index + 1}`,
                isCargoCarrier: true
            });
            carrier.isCargoCarrier = true;
            carrier.isCargoWagon = false;
            
            // Set stats and base HP (150 HP for pack mules)
            carrier.maxHp = 150;
            carrier.hp = carrier.maxHp;

            this.partyMembers.push(carrier);
            if (this.heroGroup) this.heroGroup.add(carrier.sprite);
            this.physics.add.collider(carrier.sprite, this.platforms);
            
        });
    }
}
