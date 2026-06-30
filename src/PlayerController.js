// PlayerController.js - Base class for the player character

class PlayerController {
    constructor(scene, x, y, inputManager, options = {}) {
        this.scene = scene;
        this.inputManager = inputManager;

        this.statsManager = new StatsManager(this);
        this.inventoryManager = new InventoryManager(this);
        this.shopManager = new ShopManager(this);
        this.combatController = new CombatController(this);
        this.companionAI = new CompanionAI(this);
        this.questManager = new QuestAlignmentManager(this);
        this.chatManager = new ChatManager(this);

        const autoplayActive = (window.autoplayConfig && window.autoplayConfig.isActive) || (options.isAI);
        this.isAI = autoplayActive || false;
        if (this.isAI) {
            this.aiState = 'party';
        } else {
            this.aiState = options.aiState || 'idle';
        }
        this.npcName = options.npcName || null;
        this.persona = options.persona || null;
        this.camaraderie = options.camaraderie || 0;
        this.classId = options.classId || 'knight';
        this.weaponType = options.weaponType || 'sword';
        this.faction = options.faction || null;
        this.factionRank = options.factionRank || null;
        this.politicalTitle = options.politicalTitle || null;
        this.aiInput = { left: false, right: false, up: false, attack: false, dashLeft: false, dashRight: false, superSpell: false, megaSpell: false, summonSpell: false };
        this.isCargoCarrier = options.isCargoCarrier || false;
        this.lastAITick = 0;
        this.currentAnimKey = null;
        this.tempStats = { vit: 0, str: 0, dex: 0, int: 0 };

        const isFighterScene = this.scene && this.scene.sys && this.scene.sys.settings && this.scene.sys.settings.key === 'FighterScene';
        const isCustomNpc = options.classId && options.classId.startsWith('custom_npc_');

        // Get the selected class from options (if AI, in FighterScene, or a custom NPC) or window object
        const rawClassData = (this.isAI || isFighterScene || isCustomNpc) 
            ? this._getAIClassData(options.classId || 'knight', options.weaponType) 
            : (window.selectedClass || { id: 'knight', stats: { vit: 10, str: 10, dex: 10, int: 10 }, frameWidth: 80, frameHeight: 64, isSheet: true, idleRow: 0, idleFrames: 5 });
        this.classData = JSON.parse(JSON.stringify(rawClassData));
        
        this.classId = this.classData.id;
        
        // Restore persisted stats from saveData (fixes stats resetting on reload)
        if (!this.isAI && !isFighterScene && saveData && saveData.stats) {
            this.classData.stats = { ...saveData.stats };
        }
        const classData = this.classData;

        // Create the physics sprite using the selected class ID
        const animPrefix = this.classId;
        let texKey = this.classId;
        if (!this.scene.textures.exists(texKey)) {
            texKey = this.classData.id;
            if (!this.scene.textures.exists(texKey)) texKey = 'player';
        }
        
        this.sprite = this.scene.physics.add.sprite(x, y, texKey);
        if (this.classData.flipX) this.sprite.setFlipX(true);
        this.sprite.controller = this;
        
        if (this.classData.isSheet && !this.classData.id.startsWith('custom_npc_')) {
            const sceneAnimKey = 'anims_created_' + animPrefix;
            const hasTextures = this.scene.textures && typeof this.scene.textures.get === 'function';
            if (hasTextures && (!this.scene[sceneAnimKey] || !this.scene.anims.exists(animPrefix + '_idle'))) {
                this.scene[sceneAnimKey] = true;
                const animKeys = [
                    animPrefix + '_idle',
                    animPrefix + '_walk',
                    animPrefix + '_attack',
                    animPrefix + '_attack2',
                    animPrefix + '_duck',
                    animPrefix + '_jump',
                    animPrefix + '_fall',
                    animPrefix + '_hit',
                    animPrefix + '_die',
                    animPrefix + '_combo',
                    animPrefix + '_dash'
                ];
                animKeys.forEach(k => {
                    if (this.scene.anims.exists && this.scene.anims.exists(k)) {
                        if (typeof this.scene.anims.remove === 'function') {
                            this.scene.anims.remove(k);
                        }
                    }
                });

                const tex = this.scene.textures.get(texKey).getSourceImage();
                const cols = Math.floor(tex.width / classData.frameWidth);
                const rows = Math.floor(tex.height / classData.frameHeight);
                const maxFrame = Math.max(0, (cols * rows) - 1);
                const af = classData.animFrames || {};

                const safeFrames = (config) => {
                    if (config.frames) {
                        return {
                            frames: config.frames.map(f => Math.min(f, maxFrame))
                        };
                    }
                    return {
                        start: Math.min(config.start !== undefined ? config.start : 0, maxFrame),
                        end: Math.min(config.end !== undefined ? config.end : 0, maxFrame)
                    };
                };

                // Row 0: Idle
                this.scene.anims.create({ key: animPrefix + '_idle',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.idle || { start: classData.idleRow * cols, end: classData.idleRow * cols + classData.idleFrames - 1 })),
                    frameRate: 8, repeat: -1 });

                // Row idleRow+1: Walk/Run
                const walkRow = classData.walkRow !== undefined ? classData.walkRow : classData.idleRow + 1;
                this.scene.anims.create({ key: animPrefix + '_walk',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.walk || { start: walkRow * cols, end: walkRow * cols + Math.min(7, cols - 1) })),
                    frameRate: 12, repeat: -1 });

                // Attack row 14 = first combat row
                const attackRow = classData.attackRow !== undefined ? classData.attackRow : Math.min(14, Math.floor(tex.height / classData.frameHeight) - 1);
                let attackEndOffset = Math.min(5, cols - 1);
                if (animPrefix.startsWith('stone_golem') || animPrefix.startsWith('lava_golem')) {
                    attackEndOffset = 4; // Only 5 frames (columns 0 to 4) to prevent blinking
                }
                this.scene.anims.create({ key: animPrefix + '_attack',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.attack || { start: attackRow * cols, end: attackRow * cols + attackEndOffset })),
                    frameRate: 16, repeat: 0 });

                // Attack2 animation (alternating attacks)
                if (classData.attack2Frames) {
                    this.scene.anims.create({ key: animPrefix + '_attack2',
                        frames: this.scene.anims.generateFrameNumbers(texKey, safeFrames(classData.attack2Frames)),
                        frameRate: 16, repeat: 0 });
                }

                // Duck row: default row 3, configurable per class
                const duckRow = classData.duckRow !== undefined ? classData.duckRow : Math.min(3, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: animPrefix + '_duck',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.duck || { start: duckRow * cols, end: duckRow * cols + Math.min(3, cols - 1) })),
                    frameRate: 8, repeat: -1 });

                // Jump/Leap animation: row 4
                const jumpRow = classData.jumpRow !== undefined ? classData.jumpRow : Math.min(4, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: animPrefix + '_jump',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.jump || { start: jumpRow * cols, end: jumpRow * cols + Math.min(cols - 1, cols - 1) })),
                    frameRate: 10, repeat: 0 });

                // Fall animation: row 5
                const fallRow = classData.fallRow !== undefined ? classData.fallRow : Math.min(5, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: animPrefix + '_fall',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.fall || { start: fallRow * cols, end: fallRow * cols + Math.min(5, cols - 1) })),
                    frameRate: 10, repeat: -1 });

                if (af.hit) this.scene.anims.create({ key: animPrefix + '_hit', frames: this.scene.anims.generateFrameNumbers(texKey, safeFrames(af.hit)), frameRate: 10, repeat: 0 });
                if (af.die) this.scene.anims.create({ key: animPrefix + '_die', frames: this.scene.anims.generateFrameNumbers(texKey, safeFrames(af.die)), frameRate: 8, repeat: 0 });

                // Combo animation
                if (af.combo) {
                    this.scene.anims.create({ key: animPrefix + '_combo',
                        frames: this.scene.anims.generateFrameNumbers(texKey, safeFrames(af.combo)),
                        frameRate: 12, repeat: 0 });
                } else if (classData.comboStartFrame !== undefined && classData.comboEndFrame !== undefined) {
                    this.scene.anims.create({ key: animPrefix + '_combo',
                        frames: this.scene.anims.generateFrameNumbers(texKey,
                            safeFrames({ start: classData.comboStartFrame, end: classData.comboEndFrame })),
                        frameRate: 12, repeat: 0 });
                }

                // Dash animation
                if (classData.dashRow !== undefined || af.dash) {
                    this.scene.anims.create({ key: animPrefix + '_dash',
                        frames: this.scene.anims.generateFrameNumbers(texKey,
                            safeFrames(af.dash || { start: classData.dashRow * cols, end: classData.dashRow * cols + Math.min(5, cols - 1) })),
                        frameRate: 15, repeat: -1 });
                }
            }

            this._playAnim();
            this.wasDucking = false;
        }

        if (classData && classData.isSheet) {
            this.setScaleWithPhysics(classData.spriteScale || 1.5);
            
            // Register animation aliases for PixelLab monster textures if they exist
            if (this.scene.anims) {
                const baseKey = this.classId;
                const suffixes = [
                    { from: '-idle', to: '_idle' },
                    { from: '-move', to: '_walk' },
                    { from: '-attack', to: '_attack' },
                    { from: '-attack2', to: '_combo' },
                    { from: '-attack3', to: '_mega' },
                    { from: '-hit', to: '_hit' },
                    { from: '-die', to: '_die' }
                ];
                suffixes.forEach(pair => {
                    const fKey = baseKey + pair.from;
                    const tKey = baseKey + pair.to;
                    if (this.scene.anims.exists(fKey) && !this.scene.anims.exists(tKey)) {
                        const anim = this.scene.anims.get(fKey);
                        if (anim && anim.frames) {
                            this.scene.anims.create({
                                key: tKey,
                                frames: anim.frames.map(f => ({ key: f.textureKey || baseKey, frame: f.textureFrame })),
                                frameRate: anim.frameRate,
                                repeat: anim.repeat
                            });
                        }
                    }
                });
            }
            
            // Physics body — use per-class overrides if provided, otherwise generic
            if (classData.bodyWidth !== undefined) {
                let w = classData.bodyWidth;
                let h = classData.bodyHeight;
                let ox = classData.bodyOffsetX || 0;
                let oy = classData.bodyOffsetY || 0;
                if (h > 48) {
                    const bottomY = oy + h;
                    h = 48;
                    oy = bottomY - h;
                }
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, oy);
            } else if (classData.id && classData.id.startsWith('custom_npc_')) {
                const bodyW = 24;
                const bodyH = 40;
                let footY = 56; // Fallback
                const fd = window.npcFootData && window.npcFootData[classData.id];
                if (fd && fd[0] != null) {
                    footY = fd[0] + 1;
                }
                this.sprite.body.setSize(bodyW, bodyH);
                this.sprite.body.setOffset(
                    (this.sprite.frame.width - bodyW) / 2,
                    footY - bodyH
                );
            } else if (classData.id === 'knight' || classData.id === 'warrior') {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(28, 16);
            } else if (classData.id === 'elven_spellblade' || classData.id === 'elven_spellblade_rival') {
                this.sprite.body.setSize(31, 48);
                this.sprite.body.setOffset(48, 46);
            } else if (classData.id === 'heavenly_archangel') {
                this.sprite.body.setSize(40, 48);
                this.sprite.body.setOffset(44, 47);
            } else if (classData.id === 'heavenly_valkyrie') {
                this.sprite.body.setSize(40, 48);
                this.sprite.body.setOffset(44, 47);
            } else if (classData.id === 'heavenly_seraph') {
                this.sprite.body.setSize(50, 48);
                this.sprite.body.setOffset(39, 47);
            } else if (classData.id === 'heavenly_cherub') {
                this.sprite.body.setSize(30, 40);
                this.sprite.body.setOffset(49, 40);
            } else if (classData.id === 'pack_mule') {
                this.sprite.body.setSize(56, 48);
                this.sprite.body.setOffset(31, 38);
            } else if (classData.id === 'mule_cart') {
                this.sprite.body.setSize(80, 40);
                this.sprite.body.setOffset(8, 24);
            } else if (['male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'].includes(classData.id)) {
                const w = classData.id === 'old_demon' ? 50 : 40;
                let h = 64;
                let oy = 0;
                if (h > 48) {
                    const bottomY = oy + h;
                    h = 48;
                    oy = bottomY - h;
                }
                const ox = classData.id === 'old_demon' ? 15 : 12;
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, oy);
            } else {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(20, 16);
            }
        } else {
            this.sprite.setScale(classData ? (classData.spriteScale || 1.5) : 1.5);
        }
        
        if (this.sprite.refreshBody) {
            this.sprite.refreshBody();
        }
        
        // Save base settings for scaling later
        this.baseScale = classData && classData.spriteScale ? classData.spriteScale : 1.5;
        this.baseBodySize = { w: this.sprite.body.width / this.baseScale, h: this.sprite.body.height / this.baseScale };
        this.baseOffset = { x: this.sprite.body.offset.x / this.baseScale, y: this.sprite.body.offset.y / this.baseScale };

        this.sprite.setCollideWorldBounds(true);

        if (!window.npcFootData) window.npcFootData = {};
        if (!window.npcFootData['troll']) {
            window.npcFootData['troll'] = [
                91, 91, 91, 91, 91, 91, 91, 91, 91, // idle (0..8)
                91, 91, 90, 91, 94, 94, 93, 92, 92, // walk (9..17)
                91, 91, 91, 91, 91, 91, 91, 92, 91, // attack (18..26)
                91, 91, 91, 91, 91, 91, 91, 91, 91, // attack2 (27..35)
                91, 91, 91, 91, 91,                 // hit (36..40)
                91, 91, 93, 93, 94, 94, 94, 94, 94  // die (41..49)
            ];
        }

        if (this.classId && (this.classId.startsWith('custom_npc_') || this.classId === 'troll' || (window.npcFootData && window.npcFootData[this.classId]))) {
            const originalSetFrame = this.sprite.setFrame;
            const self = this;
            this.sprite.setFrame = function(frame, updateSize, updateArea) {
                const oldFrame = this.frame;
                const oldH = oldFrame ? oldFrame.height : 64;
                const oldIdx = oldFrame ? ((typeof oldFrame.name === 'number') ? oldFrame.name : parseInt(oldFrame.name, 10)) : 0;
                
                const res = originalSetFrame.call(this, frame, updateSize, updateArea);
                
                const newFrame = this.frame;
                if (newFrame && newFrame !== oldFrame) {
                    const newIdx = (typeof newFrame.name === 'number') ? newFrame.name : parseInt(newFrame.name, 10);
                    self._anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx);
                }
                return res;
            };

            // Also hook the animation system's setCurrentFrame to handle animation-driven changes
            if (this.sprite.anims) {
                const originalSetCurrentFrame = this.sprite.anims.setCurrentFrame;
                this.sprite.anims.setCurrentFrame = function(parentFrame) {
                    const oldFrame = self.sprite.frame;
                    const oldH = oldFrame ? oldFrame.height : 64;
                    const oldIdx = oldFrame ? ((typeof oldFrame.name === 'number') ? oldFrame.name : parseInt(oldFrame.name, 10)) : 0;
                    
                    const res = originalSetCurrentFrame.call(this, parentFrame);
                    
                    const newFrame = self.sprite.frame;
                    if (newFrame && newFrame !== oldFrame) {
                        const newIdx = (typeof newFrame.name === 'number') ? newFrame.name : parseInt(newFrame.name, 10);
                        self._anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx);
                    }
                    return res;
                };
            }

            // Sync initial frame immediately
            const initFrame = this.sprite.frame;
            if (initFrame) {
                const initIdx = (typeof initFrame.name === 'number') ? initFrame.name : parseInt(initFrame.name, 10);
                this._anchorBodyOnFrameChange(initFrame.height, initIdx, initFrame, initIdx);
            }
        }

        // --- NaN INTERCEPTOR ---
        const originalSetVelocityX = this.sprite.setVelocityX.bind(this.sprite);
        this.sprite.setVelocityX = (v) => {
            if (isNaN(v)) {
                console.warn(`[Physics Interceptor] setVelocityX passed NaN!`);
                console.trace();
                return originalSetVelocityX(0); // Fallback to 0 to prevent total corruption
            }
            return originalSetVelocityX(v);
        };
        const originalSetVelocityY = this.sprite.setVelocityY.bind(this.sprite);
        this.sprite.setVelocityY = (v) => {
            if (isNaN(v)) {
                console.warn(`[Physics Interceptor] setVelocityY passed NaN!`);
                console.trace();
                return originalSetVelocityY(0);
            }
            return originalSetVelocityY(v);
        };
        const originalSetPosition = this.sprite.setPosition.bind(this.sprite);
        this.sprite.setPosition = (x, y) => {
            if (isNaN(x) || isNaN(y)) {
                console.warn(`[Physics Interceptor] setPosition passed NaN! x:${x}, y:${y}`);
                console.trace();
                return;
            }
            return originalSetPosition(x, y);
        };
        const originalSetSize = this.sprite.body.setSize.bind(this.sprite.body);
        this.sprite.body.setSize = (w, h, c) => {
            if (isNaN(w) || isNaN(h)) {
                console.error(`[Physics Interceptor] setSize passed NaN! w:${w}, h:${h}`);
                console.trace();
                return originalSetSize(10, 10, c);
            }
            return originalSetSize(w, h, c);
        };
        const originalSetOffset = this.sprite.body.setOffset.bind(this.sprite.body);
        this.sprite.body.setOffset = (x, y) => {
            if (isNaN(x) || isNaN(y)) {
                console.error(`[Physics Interceptor] setOffset passed NaN! x:${x}, y:${y}`);
                console.trace();
                return originalSetOffset(0, 0);
            }
            return originalSetOffset(x, y);
        };
        // -----------------------
        
        // Physics stats influenced by Class Stats
        this.hp = this.classData.stats.vit * 10;
        this.maxHp = this.hp;
        // mp and sp are initialized by recalculateStats() via StatsManager
        this.statusEffects = []; // Array of active status effects // ms
        this.jumps = 0;
        this._aiUpWasPressed = false;
        this.quests = [];
        
        this.isAttacking = false;
        this.attackDuration = this.classData.attackDuration || 300; // ms
        this.dashDuration = 300; // ms
        this.facingDirection = 1; // 1 for right, -1 for left
        
        // Let's add an aiming reticle placeholder
        this.reticle = this.scene.add.graphics();
        this.reticle.fillStyle(0xffff00, 1);
        this.reticle.fillRect(-2, -2, 4, 4);

        // RPG Elements
        this.alignment = saveData && saveData.alignment !== undefined ? saveData.alignment : 0;
        this.isTalking = false;
        
        // Track play time
        this.sessionStartTime = Date.now();
        
        this.alignmentDisplay = document.getElementById('alignment-display');
        this.updateAlignment(0);

        // Inventory System (only for real player outside FighterScene)
        if (!this.isAI && !isFighterScene) {
            this.inventory = saveData && saveData.inventory ? JSON.parse(JSON.stringify(saveData.inventory)) : {
                weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 0, desc: 'A basic stick.' },
                potions: 5,
                scrolls: 2,
                artifacts: [],
                equippedArtifact: -1
            };
            if (!this.inventory.artifacts) this.inventory.artifacts = [];
            if (this.inventory.equippedArtifact === undefined) this.inventory.equippedArtifact = -1;
            
            this.inventory.weapons = this.inventory.weapons || [];
             
            if (this.inventory.weapon) {
                if (!this.inventory.weapon.iconSrc || this.inventory.weapon.iconSrc.includes('Stick.png')) {
                    this.inventory.weapon.iconSrc = 'src/assets/wooden_staff.png';
                }
                if (!this.inventory.weapons.some(w => w.key === this.inventory.weapon.key)) {
                    this.inventory.weapons.push(this.inventory.weapon);
                }
            }
            
            this.recalculateStats(); // Ensure stats are fully initialized BEFORE first update loop!
            this.updateInventoryUI();

            this.quests = (saveData && saveData.quests) ? JSON.parse(JSON.stringify(saveData.quests)) : [];
            this.coliseumReputation = saveData && saveData.coliseumReputation ? saveData.coliseumReputation : 0;
            this.coliseumHighestWave = saveData && saveData.coliseumHighestWave ? saveData.coliseumHighestWave : 0;
            this.renderQuests();
        } else {
            // For AI or when inside FighterScene (prevents carrying over items/potions from adventure mode)
            this.inventory = { 
                weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 5, desc: 'A basic stick.' }, 
                potions: 2,
                scrolls: 0,
                artifacts: [],
                equippedArtifact: -1
            };
            if (window.autoAllocateNPCSkills) {
                window.autoAllocateNPCSkills(this);
            }
            this.recalculateStats(); // Ensure stats are fully initialized for AI/Fighter scene too!
        }

        if (isFighterScene) {
            this.setScaleWithPhysics(this.baseScale * (2.5 / 1.5));
        }
    }

    _getAIClassData(classId, weaponType = 'sword') {
        return window.getAIClassPresetData(classId, weaponType);
    }

    recalculateStats() {
        this.statsManager.recalculateStats();
    }

    clearTempStats() {
        this.statsManager.clearTempStats();
    }

    applyStatusEffect(type, duration, strength = 0) {
        this.combatController.applyStatusEffect(type, duration, strength);
    }

    updateStatusEffects(delta) {
        this.combatController.updateStatusEffects(delta);
    }

    getDamageMultiplier() {
        return PlayerController_Helper.getDamageMultiplier.call(this);
    }

    saveGame() {
        return PlayerController_Helper.saveGame.call(this);
    }

    _persistToLocalStorage() {
        try {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(saveData));
            if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        } catch (e) {
            console.error('Failed to persist save data:', e);
        }
    }

    destroy() {
        if (this.chatSubmitBtn && this.chatSubmitHandler) {
            this.chatSubmitBtn.removeEventListener('click', this.chatSubmitHandler);
        }
        if (this.chatInput && this.chatKeyHandler) {
            this.chatInput.removeEventListener('keypress', this.chatKeyHandler);
        }
        if (this.reticle) {
            this.reticle.destroy();
            this.reticle = null;
        }
        this._destroyBlockDome();
        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    updateInventoryUI() {
        this.inventoryManager.updateInventoryUI();
    }

    setupInventoryPopups() {
        this.inventoryManager.setupInventoryPopups();
    }

    cycleArtifact(dir) {
        this.inventoryManager.cycleArtifact(dir);
    }

    usePotion() {
        return this.inventoryManager.usePotion();
    }

    useMpPotion() {
        return this.inventoryManager.useMpPotion();
    }

    useSpPotion() {
        return this.inventoryManager.useSpPotion();
    }

    useMeat() {
        return this.inventoryManager.useMeat();
    }

    _givePotionToParty(itemKey, range) {
        return this.inventoryManager._givePotionToParty(itemKey, range);
    }

    openShopUI(shopType, npcName) {
        this.shopManager.openShopUI(shopType, npcName);
    }

    buyItem(itemKey) {
        this.shopManager.buyItem(itemKey);
    }

    updateAlignment(shift) {
        this.questManager.updateAlignment(shift);
    }

    addQuest(quest) {
        this.questManager.addQuest(quest);
    }

    progressQuest(enemyType) {
        this.questManager.progressQuest(enemyType);
    }

    getNextWeaponUpgrade() {
        return this.shopManager.getNextWeaponUpgrade();
    }

    rollChestLoot(x, y) {
        this.shopManager.rollChestLoot(x, y);
    }

    renderQuests() {
        this.questManager.renderQuests();
    }
    isLeftDown()  { if (this.isAI) return this.aiInput.left;    if (this.inputManager.blocked) return false; return this.inputManager.keys.left.isDown; }
    isRightDown() { if (this.isAI) return this.aiInput.right;   if (this.inputManager.blocked) return false; return this.inputManager.keys.right.isDown; }
    isUpDown()    { 
        if (this.isCargoCarrier) return false;
        if (this.isAI) return this.aiInput.up;      
        if (this.inputManager.blocked) return false; 
        return this.inputManager.keys.up.isDown || (this.inputManager.keys.space ? this.inputManager.keys.space.isDown : false); 
    }
    isDownDown()  { if (this.isAI) return this.aiInput.down;    if (this.inputManager.blocked) return false; return this.inputManager.keys.down.isDown; }
    isInteractDown() { if (this.isAI) return this.aiInput.interact; if (this.inputManager.blocked) return false; return this.inputManager.keys.interact.isDown; }
    consumeDashLeft() { 
        if (this.isCargoCarrier) return false;
        if (this.isAI) {
            if (this.aiInput.dashLeft) { this.aiInput.dashLeft = false; return true; }
            return false;
        }
        if (this.inputManager.blocked) return false;
        return this.inputManager.consumeDashLeft(); 
    }
    consumeDashRight() { 
        if (this.isCargoCarrier) return false;
        if (this.isAI) {
            if (this.aiInput.dashRight) { this.aiInput.dashRight = false; return true; }
            return false;
        }
        if (this.inputManager.blocked) return false;
        return this.inputManager.consumeDashRight(); 
    }
    consumeAttack() {
        if (this.isAI) {
            if (this.aiInput.attack) { this.aiInput.attack = false; return true; }
            return false;
        }
        if (this.inputManager.blocked) return false;
        return Phaser.Input.Keyboard.JustDown(this.inputManager.keys.attack);
    }
    consumeSuperSpell() {
        if (this.inputManager.blocked && !this.isAI) return false;
        return this.isAI ? this.aiInput.superSpell : (this.inputManager.keys.superSpell && Phaser.Input.Keyboard.JustDown(this.inputManager.keys.superSpell));
    }
    consumeMegaSpell() {
        if (this.inputManager.blocked && !this.isAI) return false;
        return this.isAI ? this.aiInput.megaSpell : (this.inputManager.keys.megaSpell && Phaser.Input.Keyboard.JustDown(this.inputManager.keys.megaSpell));
    }
    consumeSummonSpell() {
        if (this.inputManager.blocked && !this.isAI) return false;
        return this.isAI ? this.aiInput.summonSpell : (this.inputManager.keys.summonSpell && Phaser.Input.Keyboard.JustDown(this.inputManager.keys.summonSpell));
    }
    updateAI(time, delta) {
        this.companionAI.updateAI(time, delta);
    }

    setScaleWithPhysics(scale) {
        if (this.classData && this.classData.id === 'pack_mule') {
            this.sprite.setScale(scale * 1.5, scale * 1.0);
        } else {
            this.sprite.setScale(scale);
        }
        if (this.classData && this.classData.isSheet) {
            if (this.classData.bodyWidth !== undefined) {
                let w = this.classData.bodyWidth;
                let h = this.classData.bodyHeight;
                let ox = this.classData.bodyOffsetX || 0;
                let oy = this.classData.bodyOffsetY || 0;
                if (h > 48) {
                    const bottomY = oy + h;
                    h = 48;
                    oy = bottomY - h;
                }
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, oy);
            } else if (this.classData.id && this.classData.id.startsWith('custom_npc_')) {
                const bodyW = 36;
                const bodyH = 48;
                let footY = 56; // Fallback
                const fd = window.npcFootData && window.npcFootData[this.classData.id];
                if (fd && fd[0] != null) {
                    footY = fd[0] + 1;
                }
                this.sprite.body.setSize(bodyW, bodyH);
                this.sprite.body.setOffset(
                    (this.sprite.frame.width - bodyW) / 2,
                    footY - bodyH
                );
            } else if (this.classData.id === 'knight' || this.classData.id === 'warrior') {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(28, 16);
            } else if (this.classData.id === 'elven_spellblade' || this.classData.id === 'elven_spellblade_rival') {
                this.sprite.body.setSize(31, 48);
                this.sprite.body.setOffset(48, 46);
            } else if (this.classData.id === 'heavenly_archangel') {
                this.sprite.body.setSize(40, 48);
                this.sprite.body.setOffset(44, 47);
            } else if (this.classData.id === 'heavenly_valkyrie') {
                this.sprite.body.setSize(40, 48);
                this.sprite.body.setOffset(44, 47);
            } else if (this.classData.id === 'heavenly_seraph') {
                this.sprite.body.setSize(50, 48);
                this.sprite.body.setOffset(39, 47);
            } else if (this.classData.id === 'heavenly_cherub') {
                this.sprite.body.setSize(30, 40);
                this.sprite.body.setOffset(49, 40);
            } else if (this.classData.id === 'pack_mule') {
                this.sprite.body.setSize(56, 48);
                this.sprite.body.setOffset(31, 38);
            } else if (this.classData.id === 'mule_cart') {
                this.sprite.body.setSize(80, 40);
                this.sprite.body.setOffset(8, 24);
            } else if (['male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'].includes(this.classData.id)) {
                const w = this.classData.id === 'old_demon' ? 50 : 40;
                let h = 64;
                let oy = 0;
                if (h > 48) {
                    const bottomY = oy + h;
                    h = 48;
                    oy = bottomY - h;
                }
                const ox = this.classData.id === 'old_demon' ? 15 : 12;
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, oy);
            } else {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(20, 16);
            }
        }
        if (this.sprite.refreshBody) {
            this.sprite.refreshBody();
        }
    }

    _anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx) {
        const body = this.sprite.body;
        if (!body) return;
        
        const scale = this.sprite.scaleY || 1.5;
        const bodyW = body.width / (this.sprite.scaleX || 1);
        const bodyH = body.height / (this.sprite.scaleY || 1);
        const fw = newFrame.width;
        const fh = newFrame.height;
        
        const isOldJumpFall = (oldIdx >= 30 && oldIdx <= 39);
        const isNewJumpFall = (newIdx >= 30 && newIdx <= 39);
        
        // Get old footY
        let oldFootY = oldH;
        const fd = window.npcFootData && window.npcFootData[this.classId];
        if (fd) {
            if (isOldJumpFall) {
                oldFootY = 63 + 1; // Default floor baseline
            } else if (!isNaN(oldIdx) && fd[oldIdx] != null) {
                oldFootY = fd[oldIdx] + 1;
            }
        }
        const oldOffset = oldFootY - bodyH;
        
        // Get new footY
        let newFootY = fh;
        if (fd) {
            if (isNewJumpFall) {
                newFootY = 63 + 1; // Default floor baseline
            } else if (!isNaN(newIdx) && fd[newIdx] != null) {
                newFootY = fd[newIdx] + 1;
            }
        }
        const newOffset = newFootY - bodyH;
        
        // Adjust sprite Y immediately to prevent body.position.y from jumping in preUpdate
        this.sprite.y += scale * (0.5 * (fh - oldH) - (newOffset - oldOffset));
        
        // Update body offset
        body.setOffset(fw / 2 - bodyW / 2, newOffset);
    }

    // ── Magic Dome (Wizard Block Shield) ──────────────────────────────
    _createBlockDome() {
        this._destroyBlockDome(); // Clean up any stale dome

        const gfx = this.scene.add.graphics();
        gfx.setDepth((this.sprite.depth || 0) + 1);

        // Dome anchored at the wizard's feet, arcing up over the head.
        // gfx is positioned at sprite.x, sprite.y (sprite center).
        // Feet are roughly +32px below sprite center (64px frame * 1.5 scale / 2 ≈ 48, but body offset trims it).
        const feetY = 80;      // Y offset from sprite center to ground
        const domeRadius = 100; // Radius of dome — covers full body head to toe

        // Outer dome glow fill (semicircle)
        gfx.fillStyle(0x4488ff, 0.07);
        gfx.beginPath();
        gfx.arc(0, feetY, domeRadius, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Inner dome fill (slightly smaller)
        gfx.fillStyle(0x6644cc, 0.09);
        gfx.beginPath();
        gfx.arc(0, feetY, domeRadius - 10, Math.PI, 0, false);
        gfx.closePath();
        gfx.fillPath();

        // Dome outline arc
        gfx.lineStyle(1.5, 0x66aaff, 0.5);
        gfx.beginPath();
        gfx.arc(0, feetY, domeRadius, Math.PI, 0, false);
        gfx.closePath();
        gfx.strokePath();

        // Ground-level arcane ring (flat ellipse at feet)
        gfx.lineStyle(1.5, 0xaa66ff, 0.45);
        gfx.strokeEllipse(0, feetY, domeRadius * 2, 16);

        // Small highlight arc at the very top of dome
        gfx.lineStyle(1, 0x88ccff, 0.35);
        gfx.beginPath();
        gfx.arc(0, feetY, domeRadius - 4, Math.PI + 1.1, -1.1, false);
        gfx.strokePath();

        gfx.setPosition(this.sprite.x, this.sprite.y);
        this._blockDome = gfx;

        // Pulse tween — breathe effect
        this.scene.tweens.add({
            targets: gfx,
            alpha: { from: 0.7, to: 1.0 },
            scaleX: { from: 0.97, to: 1.03 },
            scaleY: { from: 0.97, to: 1.03 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    _destroyBlockDome() {
        if (this._blockDome) {
            this.scene.tweens.killTweensOf(this._blockDome);
            this._blockDome.destroy();
            this._blockDome = null;
        }
    }

    _playAnim(key) {
        if (!this.classData || !this.classData.isSheet || !this.sprite || !this.sprite.active) return;
        
        let targetKey = key;
        const animPrefix = this.classId || this.classData.id;
        if (!targetKey) {
            if (this.hp <= 0) targetKey = animPrefix + '_die';
            else if (this.isAttacking) {
                if (this.currentAnimKey && (
                    this.currentAnimKey.endsWith('_attack') || 
                    this.currentAnimKey.endsWith('_attack2') || 
                    this.currentAnimKey.endsWith('_combo') || 
                    this.currentAnimKey.endsWith('_mega') ||
                    this.currentAnimKey.endsWith('_summon')
                )) {
                    targetKey = this.currentAnimKey;
                } else {
                    targetKey = animPrefix + '_attack';
                }
            }
            else if (this.isDashing) targetKey = animPrefix + '_dash';
            else if (this.wasDucking) targetKey = animPrefix + '_duck';
            else if (this.isHit) targetKey = animPrefix + '_hit';
            else if (this.sprite.body && !this.sprite.body.onFloor() && this.sprite.body.velocity.y < -10) targetKey = animPrefix + '_jump';
            else if (this.sprite.body && !this.sprite.body.onFloor() && this.sprite.body.velocity.y > 10) targetKey = animPrefix + '_fall';
            else if (this.sprite.body && Math.abs(this.sprite.body.velocity.x) > 10) targetKey = animPrefix + '_walk';
            else targetKey = animPrefix + '_idle';
        }

        // Fallback to idle if animation doesn't exist
        if (!this.scene.anims.exists(targetKey)) {
            targetKey = animPrefix + '_idle';
            if (!this.scene.anims.exists(targetKey)) {
                targetKey = this.classData.id + '_idle';
                if (!this.scene.anims.exists(targetKey)) return; // Emergency abort
            }
        }

        if (this.currentAnimKey === targetKey) return;
        this.currentAnimKey = targetKey;
        try {
            this.sprite.play(targetKey, true);
        } catch (e) {
            console.error(`Failed to play animation ${targetKey}:`, e);
            this.currentAnimKey = null;
        }
    }

    update(time, delta) {
        return PlayerController_Helper.update.call(this, time, delta);
    }

    attack() {
        this.combatController.attack();
    }

    fireArrow() {
        this.combatController.fireArrow();
    }

    fireProjectile() {
        this.combatController.fireProjectile();
    }

    superComboSpell() {
        this.combatController.superComboSpell();
    }
    megaComboSpell() {
        this.combatController.megaComboSpell();
    }
    summonComboSpell() {
        this.combatController.summonComboSpell();
    }

    startDash(directionMultiplier) {
        this.combatController.startDash(directionMultiplier);
    }

    updateAiming() {
        // Draw a line or just move a dot to show aim
        const angle = this.inputManager.getAimAngle(this.sprite.x, this.sprite.y);
        
        // Distance for the reticle from the player
        const distance = 50; 
        
        this.reticle.x = this.sprite.x + Math.cos(angle) * distance;
        this.reticle.y = this.sprite.y + Math.sin(angle) * distance;
    }

    takeDamage(amount, knockbackDirection) {
        this.combatController.takeDamage(amount, knockbackDirection);
    }

    applyLifesteal(damageDealt) {
        this.combatController.applyLifesteal(damageDealt);
    }

    die() {
        this.combatController.die();
    }

    // ==========================================
    // Ally Chat Integration
    // ==========================================

    openChat(isIntro = false) {
        this.chatManager.openChat(isIntro);
    }

    closeChat() {
        this.chatManager.closeChat();
    }

    addMessageToUI(sender, text, id = null) {
        this.chatManager.addMessageToUI(sender, text, id);
    }

    handlePlayerMessage() {
        this.chatManager.handlePlayerMessage();
    }

    triggerHiddenPrompt(hiddenPrompt, displayName) {
        this.chatManager.triggerHiddenPrompt(hiddenPrompt, displayName);
    }
}
