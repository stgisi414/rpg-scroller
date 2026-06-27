// PlayerController.js - Base class for the player character

window.ARTIFACTS_DATA = {
    'artifact-strength': { key: 'artifact-strength', name: 'Ring of Strength', desc: '+20% Damage', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon1.png', type: 'artifact', statBoosts: { damageMultiplier: 1.2 } },
    'artifact-vitality': { key: 'artifact-vitality', name: 'Amulet of Vitality', desc: '+50 Max HP', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon2.png', type: 'artifact', statBoosts: { maxHp: 50 } },
    'artifact-swiftness': { key: 'artifact-swiftness', name: 'Boots of Swiftness', desc: '+20% Speed', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon3.png', type: 'artifact', statBoosts: { speedMultiplier: 1.2 } },
    'artifact-magic': { key: 'artifact-magic', name: 'Crystal of Magic', desc: '+50 Max MP', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon4.png', type: 'artifact', statBoosts: { maxMp: 50 } },
    'artifact-vampire': { key: 'artifact-vampire', name: 'Vampiric Fang', desc: '5% Lifesteal', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon5.png', type: 'artifact', statBoosts: { lifesteal: 0.05 } },
    'artifact-shield': { key: 'artifact-shield', name: 'Shielding Charm', desc: '10% Damage Reduction', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon6.png', type: 'artifact', statBoosts: { damageReduction: 0.10 } },
    'artifact-antidote': { key: 'artifact-antidote', name: 'Antidote Vial', desc: 'Immunity to Poison', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon7.png', type: 'artifact', immunities: ['poison'] },
    'artifact-frostward': { key: 'artifact-frostward', name: 'Frost Ward', desc: 'Immunity to Freeze', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon8.png', type: 'artifact', immunities: ['freeze'] },
    'artifact-fireopal': { key: 'artifact-fireopal', name: 'Fire Opal', desc: 'Immunity to Burn', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon9.png', type: 'artifact', immunities: ['burn'] },
    'artifact-holy': { key: 'artifact-holy', name: 'Holy Symbol', desc: '+30% Dmg/Spd (Align > 50)', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon10.png', type: 'artifact', alignmentReq: { min: 51, max: 100 }, statBoosts: { damageMultiplier: 1.3, speedMultiplier: 1.3 } },
    'artifact-demonic': { key: 'artifact-demonic', name: 'Demonic Sigil', desc: '+50% Dmg, 10% Lifesteal (Align < -50)', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon11.png', type: 'artifact', alignmentReq: { min: -100, max: -51 }, statBoosts: { damageMultiplier: 1.5, lifesteal: 0.10 } },
    'artifact-scales': { key: 'artifact-scales', name: 'Scales of Balance', desc: '+20% All Stats (Align -20 to 20)', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon12.png', type: 'artifact', alignmentReq: { min: -20, max: 20 }, statBoosts: { damageMultiplier: 1.2, speedMultiplier: 1.2, maxHp: 20, maxMp: 20 } },
    'artifact-teleporter': { key: 'artifact-teleporter', name: 'Town Portal Stone', desc: 'Teleport to town at <15% HP', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon13.png', type: 'artifact', special: 'auto-teleport' },
    'artifact-commander': { key: 'artifact-commander', name: 'Commander\'s Horn', desc: 'Party gets +50% Stats', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon14.png', type: 'artifact', special: 'party-boost' },
    'artifact-autopot': { key: 'artifact-autopot', name: 'Elixir of Last Resort', desc: 'Auto-uses HP potion at <30% HP (3s CD)', iconSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon15.png', type: 'artifact', special: 'auto-potion' },
    'artifact-wooden-buckler': { key: 'artifact-wooden-buckler', name: 'Wooden Buckler', desc: '5% Damage Reduction', iconSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_01.png', type: 'artifact', statBoosts: { damageReduction: 0.05 } },
    'artifact-iron-shield': { key: 'artifact-iron-shield', name: 'Iron Kite Shield', desc: '12% Damage Reduction', iconSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_02.png', type: 'artifact', statBoosts: { damageReduction: 0.12 } },
    'artifact-crystal-aegis': { key: 'artifact-crystal-aegis', name: 'Crystal Aegis', desc: '20% Damage Reduction, +30 Max HP', iconSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_03.png', type: 'artifact', statBoosts: { damageReduction: 0.20, maxHp: 30 } }
};
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

        this.isAI = options.isAI || false;
        this.aiState = options.aiState || 'idle'; // 'idle', 'patrol', 'hostile', 'party'
        this.npcName = options.npcName || null;
        this.persona = options.persona || null;
        this.camaraderie = options.camaraderie || 0;
        this.classId = options.classId || 'knight';
        this.weaponType = options.weaponType || 'sword';
        this.aiInput = { left: false, right: false, up: false, attack: false, dashLeft: false, dashRight: false, superSpell: false, megaSpell: false, summonSpell: false };
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
        if (!this.isAI && !isFighterScene && window.saveData && window.saveData.stats) {
            this.classData.stats = { ...window.saveData.stats };
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
                this.scene.anims.create({ key: animPrefix + '_attack',
                    frames: this.scene.anims.generateFrameNumbers(texKey,
                        safeFrames(af.attack || { start: attackRow * cols, end: attackRow * cols + Math.min(5, cols - 1) })),
                    frameRate: 16, repeat: 0 });

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

            // Physics body — use per-class overrides if provided, otherwise generic
            if (classData.bodyWidth !== undefined) {
                this.sprite.body.setSize(classData.bodyWidth, classData.bodyHeight);
                this.sprite.body.setOffset(classData.bodyOffsetX || 0, classData.bodyOffsetY || 0);
            } else {
                this.sprite.body.setSize(classData.frameWidth * 0.38, classData.frameHeight * 0.85);
                this.sprite.body.setOffset(classData.frameWidth * 0.31, classData.frameHeight * 0.15);
            }
            this.wasDucking = false;
        }

        if (classData && classData.isSheet) {
            this.sprite.setScale(classData.spriteScale || 1.5);
            
            // Register animation aliases for PixelLab monster textures if they exist
            if (this.scene.anims) {
                const baseKey = this.classId;
                const suffixes = [
                    { from: '-idle', to: '_idle' },
                    { from: '-move', to: '_walk' },
                    { from: '-attack', to: '_attack' },
                    { from: '-attack2', to: '_combo' },
                    { from: '-hit', to: '_hit' },
                    { from: '-die', to: '_die' }
                ];
                suffixes.forEach(pair => {
                    const fKey = baseKey + pair.from;
                    const tKey = baseKey + pair.to;
                    if (this.scene.anims.exists(fKey) && !this.scene.anims.exists(tKey)) {
                        const anim = this.scene.anims.get(fKey);
                        this.scene.anims.create({
                            key: tKey,
                            frames: anim.frames,
                            frameRate: anim.frameRate,
                            repeat: anim.repeat
                        });
                    }
                });
            }
            
            // Physics body — use per-class overrides if provided, otherwise generic
            if (classData.id && classData.id.startsWith('custom_npc_')) {
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
                this.sprite.body.setSize(31, 63);
                this.sprite.body.setOffset(48, 31);
            } else if (classData.id === 'heavenly_archangel') {
                this.sprite.body.setSize(40, 63);
                this.sprite.body.setOffset(44, 32);
            } else if (classData.id === 'heavenly_valkyrie') {
                this.sprite.body.setSize(40, 70);
                this.sprite.body.setOffset(44, 25);
            } else if (classData.id === 'heavenly_seraph') {
                this.sprite.body.setSize(50, 70);
                this.sprite.body.setOffset(39, 25);
            } else if (classData.id === 'heavenly_cherub') {
                this.sprite.body.setSize(30, 40);
                this.sprite.body.setOffset(49, 40);
            } else if (['male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'].includes(classData.id)) {
                const w = classData.id === 'old_demon' ? 50 : 40;
                const h = 64;
                const ox = classData.id === 'old_demon' ? 15 : 12;
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, 0);
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
        this.alignment = window.saveData && window.saveData.alignment !== undefined ? window.saveData.alignment : 0;
        this.isTalking = false;
        
        // Track play time
        this.sessionStartTime = Date.now();
        
        this.alignmentDisplay = document.getElementById('alignment-display');
        this.updateAlignment(0);

        // Inventory System (only for real player outside FighterScene)
        if (!this.isAI && !isFighterScene) {
            this.inventory = window.saveData && window.saveData.inventory ? JSON.parse(JSON.stringify(window.saveData.inventory)) : {
                weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 0, desc: 'A basic stick.' },
                potions: 5,
                scrolls: 2,
                artifacts: [],
                equippedArtifact: -1
            };
            if (!this.inventory.artifacts) this.inventory.artifacts = [];
            if (this.inventory.equippedArtifact === undefined) this.inventory.equippedArtifact = -1;
            
            if (this.inventory.weapon) {
                if (!this.inventory.weapon.iconSrc || this.inventory.weapon.iconSrc.includes('Stick.png')) {
                    this.inventory.weapon.iconSrc = 'src/assets/wooden_staff.png';
                }
            }
            
            this.recalculateStats(); // Ensure stats are fully initialized BEFORE first update loop!
            this.updateInventoryUI();

            this.quests = (window.saveData && window.saveData.quests) ? JSON.parse(JSON.stringify(window.saveData.quests)) : [];
            this.coliseumReputation = window.saveData && window.saveData.coliseumReputation ? window.saveData.coliseumReputation : 0;
            this.coliseumHighestWave = window.saveData && window.saveData.coliseumHighestWave ? window.saveData.coliseumHighestWave : 0;
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
            this.recalculateStats(); // Ensure stats are fully initialized for AI/Fighter scene too!
        }

        if (isFighterScene) {
            this.setScaleWithPhysics(this.baseScale * (2.5 / 1.5));
        }
    }

    _getAIClassData(classId, weaponType = 'sword') {
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
            const playerLvl = window.saveData ? (window.saveData.level || 1) : 1;
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
                    hit: { start: 30, end: 34 },
                    die: { start: 50, end: 54 },
                    duck: { start: 25, end: 29 }
                }
            };
        }

        const pixelLabMonsters = [
            'heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub',
            'male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'
        ];
        if (pixelLabMonsters.includes(classId)) {
            let scale = 1.5;
            if (classId === 'heavenly_cherub') scale = 0.6;
            else if (classId === 'heavenly_seraph') scale = 1.0;
            else if (classId === 'heavenly_valkyrie') scale = 1.0;
            else if (classId === 'heavenly_archangel') scale = 1.2;
            else if (classId === 'old_demon') scale = 1.8 * 1.5;
            else scale = 1.8 * 1.5;
            
            const fw = (classId === 'old_demon') ? 80 : (classId.startsWith('heavenly_') ? 128 : 64);
            const fh = (classId.startsWith('heavenly_') ? 128 : 64);
            
            const monsterStats = {
                heavenly_archangel: { vit: 30, str: 20, dex: 15, int: 15 },
                heavenly_valkyrie: { vit: 25, str: 18, dex: 16, int: 10 },
                heavenly_seraph: { vit: 20, str: 15, dex: 18, int: 18 },
                heavenly_cherub: { vit: 12, str: 8, dex: 12, int: 12 },
                male_damned: { vit: 15, str: 14, dex: 10, int: 5 },
                female_damned: { vit: 14, str: 12, dex: 12, int: 8 },
                twisted_damned: { vit: 18, str: 16, dex: 8, int: 6 },
                burning_damned: { vit: 16, str: 15, dex: 10, int: 10 },
                imp: { vit: 10, str: 10, dex: 14, int: 12 },
                old_demon: { vit: 22, str: 18, dex: 12, int: 10 }
            };
            const mStats = monsterStats[classId] || { vit: 15, str: 12, dex: 12, int: 10 };
            
            return {
                id: classId,
                stats: mStats,
                isSheet: true,
                frameWidth: fw,
                frameHeight: fh,
                spriteScale: scale,
                animFrames: {
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
                }
            };
        }

        const originalClassId = classId;
        // Strip _rival suffix if present
        const baseClassId = classId.replace('_rival', '');
        classId = baseClassId;

        // AI base metadata matching main.js to fix animation rows, sprite sizes, and flip
        const classStats = {
            knight:   { vit: 15, str: 14, dex: 9,  int: 8  },
            wizard:   { vit: 8,  str: 6,  dex: 10, int: 18 },
            samurai: { vit: 10, str: 10, dex: 16, int: 10 },
            ranger:   { vit: 11, str: 12, dex: 15, int: 9  },
            elven_spellblade: { vit: 12, str: 13, dex: 11, int: 14 },
            warrior:  { vit: 14, str: 16, dex: 8,  int: 6  } // fallback
        };
        const baseStats = classStats[classId] || { vit: 12, str: 12, dex: 12, int: 12 };
        
        // Auto-scale AI stats based on player's level
        const playerLvl = window.saveData ? (window.saveData.level || 1) : 1;
        const growthTable = {
            knight:   { vit: 2, str: 2, dex: 1, int: 0 },
            wizard:   { vit: 1, str: 0, dex: 1, int: 3 },
            samurai: { vit: 1, str: 1, dex: 3, int: 0 },
            ranger:   { vit: 1, str: 1, dex: 2, int: 1 },
            elven_spellblade: { vit: 1, str: 2, dex: 1, int: 2 },
            warrior:  { vit: 2, str: 2, dex: 1, int: 0 }
        };
        const growth = growthTable[classId] || { vit: 1, str: 1, dex: 1, int: 1 };
        
        const stats = {
            vit: baseStats.vit + (growth.vit * (playerLvl - 1)),
            str: baseStats.str + (growth.str * (playerLvl - 1)),
            dex: baseStats.dex + (growth.dex * (playerLvl - 1)),
            int: baseStats.int + (growth.int * (playerLvl - 1))
        };
        
        let meta = { id: classId, stats, isSheet: true };
        
        if (classId === 'knight' || classId === 'warrior') {
            meta = { ...meta, frameWidth: 80, frameHeight: 64, idleFrames: 5, idleRow: 0, flipX: true, attackRow: 14, dashRow: 5,
                animFrames: {
                    jump: { start: 40, end: 43 },
                    fall: { start: 50, end: 53 },
                    hit: { start: 160, end: 164 },
                    die: { start: 150, end: 157 },
                    duck: { frames: [100] } // Row 10 col 0 — sword raised guard stance
                }
            };
            // Make warrior ID map back to knight animations if 'warrior' was specifically requested
            meta.id = 'knight'; 
        } else if (classId === 'wizard') {
            meta = { ...meta, frameWidth: 64, frameHeight: 64, idleFrames: 6, idleRow: 1, walkRow: 0, attackRow: 2, jumpRow: 3, fallRow: 3, comboStartFrame: 24, comboEndFrame: 41,
                animFrames: {
                    hit: { start: 54, end: 54 },
                    die: { start: 60, end: 64 },
                    duck: { frames: [14] } // Casting frame — staff raised as magic block pose
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
                    duck: { frames: [15] }, // Bow drawn — block/ready stance
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
            // Safe fallback
            meta = { ...meta, frameWidth: 80, frameHeight: 64, idleFrames: 5, idleRow: 0 };
        }
        
        return meta;
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
        let mult = 1.0;
        if (this.isAI && this.aiState === 'party' && this.camaraderie) {
            // Ally gets +5% per 10 camaraderie (max +50%)
            mult += Math.min(0.5, Math.floor(this.camaraderie / 10) * 0.05);
        } else if (!this.isAI && this.scene && this.scene.partyMembers) {
            // Player gets +2% per total 10 camaraderie across party
            let totalCamaraderie = 0;
            this.scene.partyMembers.forEach(m => totalCamaraderie += (m.camaraderie || 0));
            mult += Math.min(0.5, Math.floor(totalCamaraderie / 10) * 0.02);
        }

        // Apply Artifact Boosts
        if (this.inventory && this.inventory.artifacts && this.inventory.equippedArtifact >= 0) {
            const artifactKey = this.inventory.artifacts[this.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageMultiplier) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = this.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    mult *= artifactDef.statBoosts.damageMultiplier;
                }
            }
        }
        return mult;
    }

    saveGame() {
        const isFighterScene = this.scene && this.scene.sys && this.scene.sys.settings && this.scene.sys.settings.key === 'FighterScene';
        if (isFighterScene) return;

        if (window.saveData) {
            window.saveData = JSON.parse(JSON.stringify(window.saveData));
        } else {
            window.saveData = {};
        }
        
        if (this.sessionStartTime) {
            const now = Date.now();
            // Accurately track ms so rapid auto-saves don't lose fractional minutes
            window.saveData.playTimeMs = (window.saveData.playTimeMs || (window.saveData.playTime * 60000) || 0) + (now - this.sessionStartTime);
            window.saveData.playTime = Math.floor(window.saveData.playTimeMs / 60000);
            this.sessionStartTime = now;
        }
        
        window.saveData.inventory = JSON.parse(JSON.stringify(this.inventory));
        window.saveData.quests = JSON.parse(JSON.stringify(this.quests));
        window.saveData.coliseumReputation = this.coliseumReputation;
        window.saveData.coliseumHighestWave = this.coliseumHighestWave;
        window.saveData.alignment = this.alignment;
        window.saveData.hp = this.hp;
        window.saveData.mp = this.mp;
        window.saveData.sp = this.sp;
        window.saveData.stats = JSON.parse(JSON.stringify(this.classData.stats));
        
        // Save party members (allies)
        if (!this.isAI && this.scene && this.scene.partyMembers) {
            window.saveData.party = this.scene.partyMembers.map(hero => ({
                classId: hero.classData.id,
                hp: hero.hp,
                npcName: hero.npcName,
                persona: hero.persona,
                camaraderie: hero.camaraderie || 0,
                weaponType: hero.classData.weaponType || hero.weaponType || 'sword',
                customConfig: hero.customConfig || (window.npcLayers && window.npcLayers[hero.classId] ? { layers: window.npcLayers[hero.classId], weaponType: hero.classData.weaponType || hero.weaponType || 'sword' } : null)
            }));
        }
    }

    _persistToLocalStorage() {
        try {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === window.saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(window.saveData));
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
    isUpDown()    { if (this.isAI) return this.aiInput.up;      if (this.inputManager.blocked) return false; return this.inputManager.keys.up.isDown || (this.inputManager.keys.space ? this.inputManager.keys.space.isDown : false); }
    isDownDown()  { if (this.isAI) return this.aiInput.down;    if (this.inputManager.blocked) return false; return this.inputManager.keys.down.isDown; }
    isInteractDown() { if (this.isAI) return this.aiInput.interact; if (this.inputManager.blocked) return false; return this.inputManager.keys.interact.isDown; }
    consumeDashLeft() { 
        if (this.isAI) {
            if (this.aiInput.dashLeft) { this.aiInput.dashLeft = false; return true; }
            return false;
        }
        if (this.inputManager.blocked) return false;
        return this.inputManager.consumeDashLeft(); 
    }
    consumeDashRight() { 
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
        this.sprite.setScale(scale);
        if (this.classData && this.classData.isSheet) {
            if (this.classData.id && this.classData.id.startsWith('custom_npc_')) {
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
                this.sprite.body.setSize(31, 63);
                this.sprite.body.setOffset(48, 31);
            } else if (this.classData.id === 'heavenly_archangel') {
                this.sprite.body.setSize(40, 63);
                this.sprite.body.setOffset(44, 32);
            } else if (this.classData.id === 'heavenly_valkyrie') {
                this.sprite.body.setSize(40, 70);
                this.sprite.body.setOffset(44, 25);
            } else if (this.classData.id === 'heavenly_seraph') {
                this.sprite.body.setSize(50, 70);
                this.sprite.body.setOffset(39, 25);
            } else if (this.classData.id === 'heavenly_cherub') {
                this.sprite.body.setSize(30, 40);
                this.sprite.body.setOffset(49, 40);
            } else if (['male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'].includes(this.classData.id)) {
                const w = this.classData.id === 'old_demon' ? 50 : 40;
                const h = 64;
                const ox = this.classData.id === 'old_demon' ? 15 : 12;
                this.sprite.body.setSize(w, h);
                this.sprite.body.setOffset(ox, 0);
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
            else if (this.isAttacking) targetKey = animPrefix + '_attack';
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
        if (!this.sprite || !this.sprite.active) return;
        
        if (isNaN(this.sprite.x)) {
            if (!this.nanLogged) {
                console.error(`[PlayerController] X is NaN for ${this.classData ? this.classData.id : 'unknown'}. AI: ${this.isAI}`);
                console.trace();
                this.nanLogged = true;
            }
        } else {
            this.lastValidX = this.sprite.x;
        }

        if (this.hp <= 0) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Instant death if falling into the deep abyss
        if (this.sprite.y > 1400) {
            this.takeDamage(this.hp);
            return;
        }

        if (this.scene.isCutscene) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Town Portal (Wizard only)
        if (!this.isAI && this.classData && this.classData.id === 'wizard') {
            if (Phaser.Input.Keyboard.JustDown(this.inputManager.keys.down)) {
                if (time - (this.lastDownPressTime || 0) < 500) {
                    this.downPressCount = (this.downPressCount || 0) + 1;
                } else {
                    this.downPressCount = 1;
                }
                this.lastDownPressTime = time;

                if (this.downPressCount >= 3) {
                    this.downPressCount = 0;
                    if (this.mp >= 80) {
                        let currentZone = this.scene.worldManager.currentZoneIndex || 0;
                        let closestTown = Math.round(currentZone / 4) * 4;
                        if (closestTown === currentZone) {
                            if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Already in a town!", 0xff4444);
                        } else {
                            this.mp -= 80;
                            // (Removed dead updatePlayerUI)
                            if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Town Portal!", 0x4488ff);
                            
                            this.scene.isTransitioning = true;
                            this.scene.cameras.main.fadeOut(500, 255, 255, 255);
                            this.scene.time.delayedCall(500, () => {
                                this.scene.worldManager.loadZone(closestTown, 'center').then(() => {
                                    this.scene.isTransitioning = false;
                                    this.scene.cameras.main.fadeIn(500, 255, 255, 255);
                                }).catch(err => {
                                    console.error("Town Portal failed:", err);
                                    this.scene.isTransitioning = false;
                                    this.scene.cameras.main.fadeIn(500, 255, 255, 255);
                                });
                            });
                        }
                    } else {
                        if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Not enough Mana!", 0xff4444);
                    }
                }
            }
        }

        if (this.isAI) {
            this.updateAI(time, delta);
        }

        if (this.scene.isTransitioning) {
            this.sprite.setVelocity(0, 0);
            this.sprite.body.setAllowGravity(false);
            if (this.classData && this.classData.isSheet) this._playAnim();
            return;
        } else if (this.sprite.body && !this.sprite.body.allowGravity) {
            this.sprite.body.setAllowGravity(true);
        }

        // Apply status effects
        this.updateStatusEffects(delta);
        // If stunned, cannot move
        const isStunned = this.statusEffects.some(e => e.type === 'stun');
        if (isStunned) {
            this.sprite.setVelocityX(0);
            return; // Skip input processing while stunned
        }

        let speedMultiplier = 1.0;
        const freezeEffect = this.statusEffects.find(e => e.type === 'freeze');
        if (freezeEffect) speedMultiplier = 1.0 - (freezeEffect.strength / 100);

        // Cancel dash early if stuck against a wall to prevent transparent lock-up
        if (this.isDashing && Math.abs(this.sprite.body.velocity.x) < 5) {
            this.isDashing = false;
            this.sprite.body.setAllowGravity(true);
            if (!this.invulnerable) this.sprite.setAlpha(1.0);
        }

        if (this.isDashing || this.isAttacking) return;
        
        if (this.isTalking) {
            this.sprite.setVelocityX(0);
            return;
        }
        if (this.isDashing) {
            if (this.classData.isSheet && this.classData.dashRow !== undefined) {
                this._playAnim();
            }
            return;
        }

        const keys = this.inputManager.keys;
        const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
        const cd = this.classData;

        // Dash detection
        if (this.consumeDashLeft()) { this.startDash(-1); return; }
        if (this.consumeDashRight()) { this.startDash(1); return; }

        // Attack
        if (this.consumeAttack() && !this.isAttacking) {
            this.attack();
        }

        // Super Spell
        if (this.consumeSuperSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.superComboSpell();
        }
        // Mega Spell (Wizard AoE)
        if (this.consumeMegaSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.megaComboSpell();
        }
        // Summon Spell (Wizard Angel Heal)
        if (this.consumeSummonSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.summonComboSpell();
        }
        if (this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            return; // Don't process movement during attack
        }

        // Duck / Block (S key, only on ground) — disabled for ranger (infinite ranged attacks, no need to block)
        const isRanger = cd.id === 'ranger';
        const isDucking = !isRanger && this.isDownDown() && onGround;
        if (isDucking) {
            this.sprite.setVelocityX(0);
            const firstFrameOfDuck = !this.wasDucking;
            this.wasDucking = true;
            if (cd.isSheet) this._playAnim();
            // Shrink hitbox
            if (firstFrameOfDuck) {
                if (cd.id && cd.id.startsWith('custom_npc_')) {
                    const bodyW = 24;
                    const bodyH = 20;
                    this.sprite.body.setSize(bodyW, bodyH);
                    const currentFrame = this.sprite.frame;
                    const currentIdx = (typeof currentFrame.name === 'number') ? currentFrame.name : parseInt(currentFrame.name, 10);
                    this._anchorBodyOnFrameChange(currentFrame.height, currentIdx, currentFrame, currentIdx);
                } else if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
                    this.sprite.body.setSize(31, 31);
                    this.sprite.body.setOffset(48, 63);
                } else if (cd.id === 'knight' || cd.id === 'warrior') {
                    this.sprite.body.setSize(24, 24);
                    this.sprite.body.setOffset(28, 40);
                } else {
                    this.sprite.body.setSize(24, 24);
                    this.sprite.body.setOffset(20, 40);
                }

                // Wizard magic dome shield effect
                if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
                    this._createBlockDome();
                }
            }

            // Update dome position while ducking
            if (this._blockDome && this._blockDome.active) {
                this._blockDome.setPosition(this.sprite.x, this.sprite.y);
            }
            return;
        } else {
            // Restore hitbox if was ducking
            if (this.wasDucking) {
                this.setScaleWithPhysics(this.sprite.scaleX);
                this.wasDucking = false;
                if (cd.id && cd.id.startsWith('custom_npc_')) {
                    const currentFrame = this.sprite.frame;
                    const currentIdx = (typeof currentFrame.name === 'number') ? currentFrame.name : parseInt(currentFrame.name, 10);
                    this._anchorBodyOnFrameChange(currentFrame.height, currentIdx, currentFrame, currentIdx);
                }
                // Destroy magic dome
                this._destroyBlockDome();
            }
        }

        // Horizontal movement
        let movingX = false;
        const spd = ((typeof this.speed === 'number' && !isNaN(this.speed)) ? this.speed : 200) * (this.speedMultiplier || 1.0);
        if (this.isLeftDown()) {
            this.sprite.setVelocityX(-spd);
            movingX = true;
        } else if (this.isRightDown()) {
            this.sprite.setVelocityX(spd);
            movingX = true;
        }

        // Set facing direction
        if (this.isAI && this.aiTargetDx !== undefined && this.aiTargetDx !== 0) {
            // AI always faces its target if it has one
            this.facingDirection = this.aiTargetDx > 0 ? 1 : -1;
            this.sprite.setFlipX(this.facingDirection === 1 ? (cd.flipX ? true : false) : (cd.flipX ? false : true));
        } else if (movingX) {
            // Player faces movement direction
            if (this.sprite.body.velocity.x < 0) {
                this.sprite.setFlipX(cd.flipX ? false : true);
                this.facingDirection = -1;
            } else if (this.sprite.body.velocity.x > 0) {
                this.sprite.setFlipX(cd.flipX ? true : false);
                this.facingDirection = 1;
            }
        }

        if (!movingX && !this.isAttacking && !isDucking) {
            this.sprite.setVelocityX(0);
        }

        // Reset jump counter on ground
        if (onGround) {
            this.jumps = 0;
        }
        // Detect jump input (discrete press)
        let jumpPressed = false;
        if (this.isAI) {
            if (this.aiInput.up) {
                jumpPressed = true;
                this.aiInput.up = false; // Consume the jump request
            }
        } else {
            const upJustDown = keys.up ? Phaser.Input.Keyboard.JustDown(keys.up) : false;
            const spaceJustDown = keys.space ? Phaser.Input.Keyboard.JustDown(keys.space) : false;
            if (upJustDown || spaceJustDown) {
                jumpPressed = true;
            }
        }

        if (jumpPressed) {
            const jSpd = (typeof this.jumpVelocity === 'number' && !isNaN(this.jumpVelocity)) ? this.jumpVelocity : -400;
            if (onGround) {
                this.sprite.setVelocityY(jSpd);
                this.jumps = 1;
            } else if (this.jumps < 2) {
                this.sprite.setVelocityY(jSpd);
                this.jumps++;
            }
        }

        // Animation state machine
        if (cd.isSheet) {
            if (!onGround) {
                const vy = this.sprite.body.velocity.y;
                if (vy < -10) {
                    // Rising after a jump — hold the jump pose
                    this._playAnim();
                } else {
                    // Falling — gravity has taken over (after jump apex or walking off a ledge)
                    this._playAnim();
                }
            } else if (movingX) {
                this._playAnim();
            } else {
                this._playAnim();
            }
        }

        this.updateAiming();
        
        // Passive MP/SP regen (MP: 1 every 5s = 0.2/sec. SP: 8/sec)
        if (typeof delta === 'number') {
            const regenRate = delta / 1000; // delta is ms
            let statsChanged = false;
            if (this.mp !== undefined && this.maxMp !== undefined && this.mp < this.maxMp) {
                this.mp += 0.2 * regenRate;
                if (this.mp > this.maxMp) this.mp = this.maxMp;
                statsChanged = true;
            }
            if (this.sp !== undefined && this.maxSp !== undefined && this.sp < this.maxSp) {
                this.sp += 8 * regenRate;
                if (this.sp > this.maxSp) this.sp = this.maxSp;
                statsChanged = true;
            }
            
            // Safety check in case anything made it NaN
            if (isNaN(this.mp)) this.mp = this.maxMp;
            if (isNaN(this.sp)) this.sp = this.maxSp;
            
            if (statsChanged && !this.isAI) {
                const now = this.scene.time.now;
                if (!this.lastStatUIRefresh || now - this.lastStatUIRefresh > 100) {
                    this.lastStatUIRefresh = now;
                    // (Removed dead updatePlayerUI)
                }
            }
            
            if (!this.isAI && this.scene && this.scene.updateHUD) this.scene.updateHUD();
        }
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
