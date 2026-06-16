// PlayerController.js - Base class for the player character

class PlayerController {
    constructor(scene, x, y, inputManager, options = {}) {
        this.scene = scene;
        this.inputManager = inputManager;

        this.isAI = options.isAI || false;
        this.aiState = options.aiState || 'idle'; // 'idle', 'patrol', 'hostile', 'party'
        this.npcName = options.npcName || null;
        this.persona = options.persona || null;
        this.camaraderie = options.camaraderie || 0;
        this.classId = options.classId || 'knight';
        this.aiInput = { left: false, right: false, up: false, attack: false, dashLeft: false, dashRight: false, superSpell: false };
        this.lastAITick = 0;
        this.currentAnimKey = null;

        // Get the selected class from options (if AI) or window object
        this.classData = this.isAI ? this._getAIClassData(options.classId) : (window.selectedClass || { id: 'knight', stats: { vit: 10, str: 10, dex: 10, int: 10 }, frameWidth: 80, frameHeight: 64, isSheet: true, idleRow: 0, idleFrames: 5 });
        
        // Restore persisted stats from saveData (fixes stats resetting on reload)
        if (!this.isAI && window.saveData && window.saveData.stats) {
            this.classData.stats = { ...window.saveData.stats };
        }
        const classData = this.classData;

        // Create the physics sprite using the selected class ID
        this.sprite = this.scene.physics.add.sprite(x, y, this.classData.id);
        if (this.classData.flipX) this.sprite.setFlipX(true);
        
        if (this.classData.isSheet) {
            if (!this.scene.anims.exists(classData.id + '_idle')) {
                const tex = this.scene.textures.get(classData.id).getSourceImage();
                const cols = Math.floor(tex.width / classData.frameWidth);
                const af = classData.animFrames || {};

                const row = (r) => ({ start: r * cols, end: r * cols + cols - 1 });

                // Row 0: Idle
                this.scene.anims.create({ key: classData.id + '_idle',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.idle || { start: classData.idleRow * cols, end: classData.idleRow * cols + classData.idleFrames - 1 }),
                    frameRate: 8, repeat: -1 });

                // Row idleRow+1: Walk/Run
                const walkRow = classData.walkRow !== undefined ? classData.walkRow : classData.idleRow + 1;
                this.scene.anims.create({ key: classData.id + '_walk',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.walk || { start: walkRow * cols, end: walkRow * cols + Math.min(7, cols - 1) }),
                    frameRate: 12, repeat: -1 });

                // Attack row 14 = first combat row
                const attackRow = classData.attackRow !== undefined ? classData.attackRow : Math.min(14, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: classData.id + '_attack',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.attack || { start: attackRow * cols, end: attackRow * cols + Math.min(5, cols - 1) }),
                    frameRate: 16, repeat: 0 });

                // Duck row: default row 3, configurable per class
                const duckRow = classData.duckRow !== undefined ? classData.duckRow : Math.min(3, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: classData.id + '_duck',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.duck || { start: duckRow * cols, end: duckRow * cols + Math.min(3, cols - 1) }),
                    frameRate: 8, repeat: -1 });

                // Jump/Leap animation: row 4
                const jumpRow = classData.jumpRow !== undefined ? classData.jumpRow : Math.min(4, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: classData.id + '_jump',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.jump || { start: jumpRow * cols, end: jumpRow * cols + Math.min(cols - 1, cols - 1) }),
                    frameRate: 10, repeat: 0 });

                // Fall animation: row 5
                const fallRow = classData.fallRow !== undefined ? classData.fallRow : Math.min(5, Math.floor(tex.height / classData.frameHeight) - 1);
                this.scene.anims.create({ key: classData.id + '_fall',
                    frames: this.scene.anims.generateFrameNumbers(classData.id,
                        af.fall || { start: fallRow * cols, end: fallRow * cols + Math.min(5, cols - 1) }),
                    frameRate: 10, repeat: -1 });

                if (af.hit) this.scene.anims.create({ key: classData.id + '_hit', frames: this.scene.anims.generateFrameNumbers(classData.id, af.hit), frameRate: 10, repeat: 0 });
                if (af.die) this.scene.anims.create({ key: classData.id + '_die', frames: this.scene.anims.generateFrameNumbers(classData.id, af.die), frameRate: 8, repeat: 0 });

                // Combo animation
                if (classData.comboStartFrame !== undefined && classData.comboEndFrame !== undefined) {
                    this.scene.anims.create({ key: classData.id + '_combo',
                        frames: this.scene.anims.generateFrameNumbers(classData.id,
                            { start: classData.comboStartFrame, end: classData.comboEndFrame }),
                        frameRate: 12, repeat: 0 });
                }

                // Dash animation
                if (classData.dashRow !== undefined) {
                    this.scene.anims.create({ key: classData.id + '_dash',
                        frames: this.scene.anims.generateFrameNumbers(classData.id,
                            { start: classData.dashRow * cols, end: classData.dashRow * cols + Math.min(5, cols - 1) }),
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
            // Frame is 64x64, displayed at 1.5x.
            // Body is smaller to allow overlapping with environment
            if (classData.id === 'knight' || classData.id === 'warrior') {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(28, 16);
            } else {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(20, 16);
            }
        } else {
            this.sprite.setScale(classData ? (classData.spriteScale || 1.5) : 1.5);
        }
        
        // Save base settings for scaling later
        this.baseScale = classData && classData.spriteScale ? classData.spriteScale : 1.5;
        this.baseBodySize = { w: this.sprite.body.width / this.baseScale, h: this.sprite.body.height / this.baseScale };
        this.baseOffset = { x: this.sprite.body.offset.x / this.baseScale, y: this.sprite.body.offset.y / this.baseScale };

        this.sprite.setCollideWorldBounds(true);
        
        // Physics stats influenced by Class Stats
        this.hp = this.classData.stats.vit * 10;
        this.maxHp = this.hp;
        this.stamina = 100;
        this.maxStamina = 100;
        this.mana = 100;
        this.maxMana = 100;
        this.statusEffects = []; // Array of active status effects // ms
        
        this.isAttacking = false;
        this.attackDuration = 300; // ms
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

        // Inventory System (only for real player)
        if (!this.isAI) {
            this.inventory = window.saveData && window.saveData.inventory ? window.saveData.inventory : {
                weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 0, desc: 'A basic stick.' },
                potions: 5,
                scrolls: 2
            };
            
            if (this.inventory.weapon) {
                if (!this.inventory.weapon.iconSrc || this.inventory.weapon.iconSrc.includes('Stick.png')) {
                    this.inventory.weapon.iconSrc = 'src/assets/wooden_staff.png';
                }
            }
            
            this.updateInventoryUI();

            this.quests = window.saveData.quests || [];
            this.renderQuests();
        } else {
            this.inventory = { weapon: { key: 'weapon-stick', damageBonus: 5 } }; // Basic fallback for AI damage calculations
        }
    }

    _getAIClassData(classId) {
        // AI base metadata matching main.js to fix animation rows, sprite sizes, and flip
        const classStats = {
            knight:   { vit: 15, str: 14, dex: 9,  int: 8  },
            wizard:   { vit: 8,  str: 6,  dex: 10, int: 18 },
            samurai: { vit: 10, str: 10, dex: 16, int: 10 },
            ranger:   { vit: 11, str: 12, dex: 15, int: 9  },
            warrior:  { vit: 14, str: 16, dex: 8,  int: 6  } // fallback
        };
        const stats = classStats[classId] || { vit: 12, str: 12, dex: 12, int: 12 };
        
        let meta = { id: classId, stats, isSheet: true };
        
        if (classId === 'knight' || classId === 'warrior') {
            meta = { ...meta, frameWidth: 80, frameHeight: 64, idleFrames: 5, idleRow: 0, flipX: true, attackRow: 14, dashRow: 5,
                animFrames: {
                    jump: { start: 40, end: 43 },
                    fall: { start: 50, end: 53 }
                }
            };
            // Make warrior ID map back to knight animations if 'warrior' was specifically requested
            meta.id = 'knight'; 
        } else if (classId === 'wizard') {
            meta = { ...meta, frameWidth: 64, frameHeight: 64, idleFrames: 6, idleRow: 1, walkRow: 0, attackRow: 2, jumpRow: 3, fallRow: 3, comboStartFrame: 24, comboEndFrame: 41 };
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
                    duck: { frames: [0] },
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
        const stats = this.classData.stats;
        this.speed = 200 + (stats.dex * 5);          // DEX → movement speed
        this.jumpVelocity = -400 - (stats.str * 10);  // STR → jump height
        this.dashSpeed = 400 + (stats.dex * 15);       // DEX → dash speed & distance
        this.maxHp = stats.vit * 10;                   // VIT → max HP
        this.critChance = stats.dex * 0.5;             // DEX → crit % (e.g. 16 DEX = 8%)
        
        // MP system (wizard primary, others get small pool)
        const classId = this.classData.id;
        if (classId === 'wizard') {
            this.maxMp = 50 + (stats.int * 5);
        } else {
            this.maxMp = 20 + (stats.int * 2);
        }
        if (this.mp === undefined) this.mp = this.maxMp;
        
        // SP (Stamina) system - used for dashing
        this.maxSp = 50 + (stats.dex * 3);
        if (this.sp === undefined) this.sp = this.maxSp;

        // Restore HP from save or fully heal
        if (!this.isAI && window.saveData && window.saveData.hp !== undefined && window.saveData.hp > 0) {
            this.hp = window.saveData.hp;
        } else {
            this.hp = this.maxHp;
        }
        // Restore MP/SP from save (stricter guard against NaN/null from old saves)
        if (!this.isAI && window.saveData) {
            if (typeof window.saveData.mp === 'number' && !isNaN(window.saveData.mp)) {
                this.mp = Math.min(window.saveData.mp, this.maxMp);
            } else {
                this.mp = this.maxMp;
            }
            if (typeof window.saveData.sp === 'number' && !isNaN(window.saveData.sp)) {
                this.sp = Math.min(window.saveData.sp, this.maxSp);
            } else {
                this.sp = this.maxSp;
            }
        }
        
        // Final safety: if STILL somehow NaN, reset to max
        if (typeof this.mp !== 'number' || isNaN(this.mp)) this.mp = this.maxMp;
        if (typeof this.sp !== 'number' || isNaN(this.sp)) this.sp = this.maxSp;

        // Update HUD to reflect new stats
        if (!this.isAI && this.inventory && this.scene && this.scene.updateHUD) {
            this.scene.updateHUD();
        }
    }

    applyStatusEffect(type, duration, strength = 0) {
        this.statusEffects.push({ type, duration, strength });
    }

    updateStatusEffects(delta) {
        this.statusEffects = this.statusEffects.filter(effect => {
            effect.duration -= delta;
            return effect.duration > 0;
        });
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
        return mult;
    }

    saveGame() {
        if (!window.saveData) window.saveData = {};
        
        if (this.sessionStartTime) {
            const now = Date.now();
            // Accurately track ms so rapid auto-saves don't lose fractional minutes
            window.saveData.playTimeMs = (window.saveData.playTimeMs || (window.saveData.playTime * 60000) || 0) + (now - this.sessionStartTime);
            window.saveData.playTime = Math.floor(window.saveData.playTimeMs / 60000);
            this.sessionStartTime = now;
        }
        
        window.saveData.inventory = this.inventory;
        window.saveData.quests = this.quests;
        window.saveData.alignment = this.alignment;
        window.saveData.hp = this.hp;
        window.saveData.mp = this.mp;
        window.saveData.sp = this.sp;
        window.saveData.stats = { ...this.classData.stats };
        
        // Save party members (allies)
        if (!this.isAI && this.scene && this.scene.partyMembers) {
            window.saveData.party = this.scene.partyMembers.map(hero => ({
                classId: hero.classData.id,
                hp: hero.hp,
                npcName: hero.npcName,
                persona: hero.persona,
                camaraderie: hero.camaraderie || 0
            }));
        }
    }

    _persistToLocalStorage() {
        try {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === window.saveData.id);
            if (idx > -1) saves[idx] = window.saveData; else saves.push(window.saveData);
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        } catch (e) {
            console.error('Failed to persist save data:', e);
        }
    }

    updateInventoryUI() {
        // Weapon Slot (1)
        const wIcon = document.getElementById('inv-icon-1');
        const wBg = document.getElementById('inv-bg-1');
        const wHolder = document.getElementById('inv-placeholder-1');
        if (this.inventory.weapon && this.inventory.weapon.iconSrc) {
            const iconSrc = this.inventory.weapon.iconSrc;
            if (wBg) {
                wBg.style.backgroundImage = `url('${iconSrc}')`;
                
                let frameW = 64;
                let frameH = 64;
                let extraStyle = '';
                
                if (iconSrc.includes('16x16')) {
                    frameW = 16;
                    frameH = 16;
                } else if (iconSrc.includes('Hand Items')) {
                    frameW = 80;
                    frameH = 64;
                } else if (iconSrc.includes('PixelArt_FantasyWeapons_01') || iconSrc.includes('wooden_staff')) {
                    frameW = 40;
                    frameH = 40;
                    extraStyle = 'background-size: contain; background-position: center; transform: none;';
                }
                
                wBg.style.width = `${frameW}px`;
                wBg.style.height = `${frameH}px`;
                
                const scaleX = 40 / frameW;
                const scaleY = 40 / frameH;
                const scale = Math.min(scaleX, scaleY);
                if (!extraStyle) {
                    extraStyle = `transform: scale(${scale}); background-position: left top;`;
                }
                wBg.style.cssText = `width: ${frameW}px; height: ${frameH}px; background-image: url('${iconSrc}'); background-repeat: no-repeat; image-rendering: pixelated; transform-origin: center; ${extraStyle}`;
            }
            if (wIcon) {
                wIcon.style.display = 'flex';
                wIcon.classList.remove('hidden');
            }
            if (wHolder) wHolder.style.display = 'none';
        }

        // Potion Slot (2)
        const pQty = document.getElementById('inv-qty-2');
        const pIcon = document.getElementById('inv-icon-2');
        const pHolder = document.getElementById('inv-placeholder-2');
        if (pQty) {
            pQty.innerText = 'x' + this.inventory.potions;
            if (pIcon) {
                if (this.inventory.potions > 0) {
                    pIcon.style.display = 'flex';
                    pIcon.classList.remove('hidden');
                    if (pHolder) pHolder.style.display = 'none';
                } else {
                    pIcon.style.display = 'none';
                    pIcon.classList.add('hidden');
                    if (pHolder) pHolder.style.display = 'block';
                }
            }
        }

        // MP Potion Slot (3)
        const sQty = document.getElementById('inv-qty-3');
        const sIcon = document.getElementById('inv-icon-3');
        const sHolder = document.getElementById('inv-placeholder-3');
        if (sQty) {
            this.inventory.mpPotions = this.inventory.mpPotions || 0;
            sQty.innerText = 'x' + this.inventory.mpPotions;
            if (sIcon) {
                if (this.inventory.mpPotions > 0) {
                    sIcon.style.display = 'flex';
                    sIcon.classList.remove('hidden');
                    if (sHolder) sHolder.style.display = 'none';
                } else {
                    sIcon.style.display = 'none';
                    sIcon.classList.add('hidden');
                    if (sHolder) sHolder.style.display = 'block';
                }
            }
        }

        // Meat Slot (4)
        const mQty = document.getElementById('inv-qty-4');
        const mIcon = document.getElementById('inv-icon-4');
        const mHolder = document.getElementById('inv-placeholder-4');
        if (mQty) {
            this.inventory.meat = this.inventory.meat || 0;
            mQty.innerText = 'x' + this.inventory.meat;
            if (mIcon) {
                if (this.inventory.meat > 0) {
                    mIcon.style.display = 'flex';
                    mIcon.classList.remove('hidden');
                    if (mHolder) mHolder.style.display = 'none';
                } else {
                    mIcon.style.display = 'none';
                    mIcon.classList.add('hidden');
                    if (mHolder) mHolder.style.display = 'block';
                }
            }
        }

        // Stamina Potion Slot (5)
        const spQty = document.getElementById('inv-qty-5');
        const spIcon = document.getElementById('inv-icon-5');
        const spHolder = document.getElementById('inv-placeholder-5');
        if (spQty) {
            this.inventory.spPotions = this.inventory.spPotions || 0;
            spQty.innerText = 'x' + this.inventory.spPotions;
            if (spIcon) {
                if (this.inventory.spPotions > 0) {
                    spIcon.style.display = 'flex';
                    spIcon.classList.remove('hidden');
                    if (spHolder) spHolder.style.display = 'none';
                } else {
                    spIcon.style.display = 'none';
                    spIcon.classList.add('hidden');
                    if (spHolder) spHolder.style.display = 'block';
                }
            }
        }

        // Setup click listeners for popup if not already done
        if (!this.inventoryUiBound) {
            this.inventoryUiBound = true;
            this.setupInventoryPopups();
        }
        this.saveGame();
    }

    setupInventoryPopups() {
        const popup = document.getElementById('inv-popup');
        const pTitle = document.getElementById('inv-popup-title');
        const pDesc = document.getElementById('inv-popup-desc');
        
        const showPopup = (slotId, title, desc) => {
            pTitle.innerText = title;
            pDesc.innerText = desc;
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, 0) scale(1)';
            
            // Auto hide after 3 seconds
            if (this.popupTimeout) clearTimeout(this.popupTimeout);
            this.popupTimeout = setTimeout(() => {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-50%, 0) scale(0.95)';
            }, 3000);
        };

        const useWeapon = () => {
            const w = this.inventory.weapon;
            if (w) showPopup(1, w.name, `${w.desc || 'A weapon.'}\nDamage Bonus: +${w.damageBonus}`);
        };

        const slot1 = document.getElementById('inv-slot-1');
        if (slot1) slot1.onclick = useWeapon;

        const slot2 = document.getElementById('inv-slot-2');
        if (slot2) slot2.onclick = () => {
            if (this.usePotion()) {
                showPopup(2, 'Health Potion', 'Restores 50 HP when used.');
            }
        };

        const slot3 = document.getElementById('inv-slot-3');
        if (slot3) slot3.onclick = () => {
            if (this.useMpPotion()) {
                showPopup(3, 'Mana Potion', 'Restores 50 MP when used.');
            }
        };

        const slot4 = document.getElementById('inv-slot-4');
        if (slot4) slot4.onclick = () => {
            if (this.useMeat()) {
                showPopup(4, 'Boar Meat', 'Restores 20 HP when consumed.');
            }
        };

        const slot5 = document.getElementById('inv-slot-5');
        if (slot5) slot5.onclick = () => {
            if (this.useSpPotion()) {
                showPopup(5, 'Stamina Potion', 'Restores 50 SP when used.');
            }
        };

        // Hotkeys
        this.scene.input.keyboard.on('keydown-ONE', useWeapon);
        this.scene.input.keyboard.on('keydown-TWO', () => { if(slot2) slot2.onclick(); });
        this.scene.input.keyboard.on('keydown-THREE', () => { if(slot3) slot3.onclick(); });
        this.scene.input.keyboard.on('keydown-FOUR', () => { if(slot4) slot4.onclick(); });
        this.scene.input.keyboard.on('keydown-FIVE', () => { if(slot5) slot5.onclick(); });
    }

    usePotion() {
        if (this.inventory.potions > 0 && this.hp < this.maxHp) {
            this.inventory.potions--;
            this.hp = Math.min(this.maxHp, this.hp + 50);
            this.updateInventoryUI();
            if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
            
            // Visual feedback
            if (this.scene && this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, '+50 HP', 0x00ff00);
            }
            return true;
        } else if (this.inventory.potions > 0) {
            // Try to give to a party member who needs HP
            return this._givePotionToParty('hp');
        }
        return false;
    }

    useMpPotion() {
        this.inventory.mpPotions = this.inventory.mpPotions || 0;
        if (this.inventory.mpPotions > 0 && this.mp !== undefined && this.mp < this.maxMp) {
            this.inventory.mpPotions--;
            this.mp = Math.min(this.maxMp, this.mp + 50);
            this.updateInventoryUI();
            if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
            
            // Visual feedback
            if (this.scene && this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, '+50 MP', 0x60a5fa);
            }
            return true;
        } else if (this.inventory.mpPotions > 0) {
            // Try to give to a party member who needs MP
            return this._givePotionToParty('mp');
        }
        return false;
    }

    useSpPotion() {
        this.inventory.spPotions = this.inventory.spPotions || 0;
        if (this.inventory.spPotions > 0 && this.sp !== undefined && this.sp < this.maxSp) {
            this.inventory.spPotions--;
            this.sp = Math.min(this.maxSp, this.sp + 50);
            this.updateInventoryUI();
            if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
            
            // Visual feedback
            if (this.scene && this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, '+50 SP', 0x4ade80);
            }
            return true;
        } else if (this.inventory.spPotions > 0) {
            // Try to give to a party member who needs SP
            return this._givePotionToParty('sp');
        }
        return false;
    }

    useMeat() {
        this.inventory.meat = this.inventory.meat || 0;
        if (this.inventory.meat > 0 && this.hp < this.maxHp) {
            this.inventory.meat--;
            this.hp = Math.min(this.maxHp, this.hp + 20);
            this.updateInventoryUI();
            if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
            
            // Visual feedback
            if (this.scene && this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, '+20 HP', 0x00ff00);
            }
            return true;
        }
        return false;
    }

    _givePotionToParty(type) {
        if (!this.scene || !this.scene.partyMembers || this.scene.partyMembers.length === 0) return;
        
        // Find closest party member who needs this stat
        let bestHero = null;
        let bestDist = Infinity;
        
        for (const hero of this.scene.partyMembers) {
            if (!hero.sprite || !hero.sprite.active) continue;
            
            let needsIt = false;
            if (type === 'hp' && hero.hp < hero.maxHp) needsIt = true;
            if (type === 'mp' && hero.mp !== undefined && hero.mp < hero.maxMp) needsIt = true;
            if (type === 'sp' && hero.sp !== undefined && hero.sp < hero.maxSp) needsIt = true;
            
            if (needsIt) {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, hero.sprite.x, hero.sprite.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestHero = hero;
                }
            }
        }
        
        if (!bestHero) {
            if (this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'No one needs it!', 0x888888);
            }
            return false;
        }
        
        // Apply potion to party member
        let label = '';
        let color = '#ffffff';
        if (type === 'hp') {
            this.inventory.potions--;
            bestHero.hp = Math.min(bestHero.maxHp, bestHero.hp + 50);
            label = '+50 HP';
            color = '#00ff00';
        } else if (type === 'mp') {
            this.inventory.mpPotions--;
            bestHero.mp = Math.min(bestHero.maxMp, bestHero.mp + 50);
            label = '+50 MP';
            color = '#60a5fa';
        } else if (type === 'sp') {
            this.inventory.spPotions--;
            bestHero.sp = Math.min(bestHero.maxSp, bestHero.sp + 50);
            label = '+50 SP';
            color = '#4ade80';
        }
        
        // Add Camaraderie boost
        bestHero.camaraderie = (bestHero.camaraderie || 0) + 2;
        
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(bestHero.sprite.x, bestHero.sprite.y - 30, label, parseInt(color.replace('#', '0x'), 16));
            setTimeout(() => {
                this.scene.showFloatingText(bestHero.sprite.x, bestHero.sprite.y - 50, '+2 Camaraderie', 0xf6be3b);
            }, 500);
        }
        
        if (this.scene.updateCharacterSheet) {
            this.scene.updateCharacterSheet();
        }
        
        this.updateInventoryUI();
        
        return true;
    }

    openShopUI(shopType, npcName) {
        const shopUI = document.getElementById('ui-shop');
        const shopTitle = document.getElementById('shop-title');
        const itemsContainer = document.getElementById('shop-items-container');
        
        shopUI.style.display = 'flex';
        shopTitle.innerText = npcName;
        itemsContainer.innerHTML = ''; // clear

        let items = [];
        if (shopType === 'blacksmith') {
            items = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', price: 300, type: 'weapon', damageBonus: 8, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', price: 500, type: 'weapon', damageBonus: 15, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' },
                { key: 'weapon-iron-axe', name: 'Heavy Battleaxe', desc: '+6 Damage', price: 200, type: 'weapon', damageBonus: 6, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_01.png' }
            ];
        } else if (shopType === 'alchemist') {
            items = [
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 20, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 20, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'item-sp-potion', name: 'Stamina Potion', desc: 'Restores 50 SP', price: 20, type: 'sp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' },
                { key: 'item-chest', name: 'Mystery Chest', desc: 'Contains random loot!', price: 100, type: 'chest', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png' }
            ];
        } else if (shopType === 'ranger') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 40, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', price: 250, type: 'weapon', damageBonus: 8, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', price: 80, type: 'weapon', damageBonus: 4, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 10, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'item-fur', name: 'Wolf Pelt', desc: 'Warm fur.', price: 50, type: 'junk', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon45.png' }
            ];
        } else if (shopType === 'wizard') {
            items = [
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 25, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 25, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
            ];
        } else if (shopType === 'samurai') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 50, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
            ];
        } else if (shopType === 'knight') {
            items = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
            ];
        }

        // Filter items: only show generic items and items meant for the current class
        items = items.filter(item => !item.classRestrict || item.classRestrict === this.classData.id);

        // Apply Alignment Price Multiplier
        let multiplier = 1.0;
        if (this.alignment >= 20) multiplier = 0.8; // Heroic discount
        else if (this.alignment >= 10) multiplier = 0.9; // Good discount
        else if (this.alignment <= -20) multiplier = 1.5; // Villainous markup
        else if (this.alignment <= -10) multiplier = 1.2; // Evil markup
        
        items.forEach(item => {
            item.price = Math.max(1, Math.round(item.price * multiplier));
        });

        items.forEach((item, idx) => {
            const itemSrc = item.imageSrc;
            
            // Dynamic framing based on asset type
            let frameW = 64;
            let frameH = 64;
            let extraStyle = '';
            
            if (itemSrc.includes('16x16')) {
                frameW = 16;
                frameH = 16;
            } else if (item.isSpritesheet) {
                if (item.type.includes('potion')) {
                    frameW = 16;
                    frameH = 16;
                } else {
                    frameW = 32;
                    frameH = 32;
                }
            } else if (itemSrc.includes('Hand Items')) {
                frameW = 80;
                frameH = 64;
            } else if (itemSrc.includes('PixelArt_FantasyWeapons_01')) {
                frameW = 48;
                frameH = 48;
                extraStyle = 'background-size: contain; background-position: center; transform: none;';
            }
            
            const scaleX = 48 / frameW;
            const scaleY = 48 / frameH;
            const scale = Math.min(scaleX, scaleY);
            if (!extraStyle) {
                if (item.type === 'mp_potion') {
                    // MP Potion uses the 16x128 Mana Sheet
                    extraStyle = `transform: scale(${scale}); background-position: 0 0; background-size: 16px 128px;`;
                } else if (item.type === 'sp_potion') {
                    // SP Potion uses the 16x128 Stamina Sheet
                    extraStyle = `transform: scale(${scale}); background-position: 0 0; background-size: 16px 128px;`;
                } else if (item.type === 'potion') {
                    // HP Potion uses column 2 (-16px) of 48x128 Healing Sheet
                    extraStyle = `transform: scale(${scale}); background-position: -16px 0; background-size: 48px 128px;`;
                } else {
                    extraStyle = `transform: scale(${scale}); background-position: left top;`;
                }
            }
            
            let classBadge = '';
            if (item.classRestrict) {
                const color = item.classRestrict === this.classData.id ? 'text-primary' : 'text-error';
                classBadge = `<br><span class="${color} font-bold">[${item.classRestrict.toUpperCase()}]</span>`;
            }

            const btnHtml = `
                <div class="bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-2 rounded hover:border-primary transition-colors cursor-pointer" id="shop-item-${idx}">
                    <div class="mb-2" style="width: 48px; height: 48px; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                        <div style="width: ${frameW}px; height: ${frameH}px; background-image: url('${itemSrc}'); background-repeat: no-repeat; image-rendering: pixelated; transform-origin: center; ${extraStyle}"></div>
                    </div>
                    <div class="font-label-caps text-[12px] text-on-surface font-bold text-center">${item.name}</div>
                    <div class="font-body-sm text-[10px] text-on-surface-variant text-center h-8">${item.desc}${classBadge}</div>
                    <div class="font-headline-sm text-secondary font-bold text-[14px] mt-2">${item.price}g</div>
                </div>
            `;
            itemsContainer.insertAdjacentHTML('beforeend', btnHtml);
            
            // Wait for DOM update
            setTimeout(() => {
                const el = document.getElementById(`shop-item-${idx}`);
                if (el) el.onclick = () => this.buyItem(item);
            }, 0);
        });

        // Close btn
        const closeBtn = document.getElementById('btn-close-shop');
        closeBtn.onclick = () => {
            // Tell nearby NPC to close shop (which re-enables keyboard)
            this.scene.npcs.forEach(npc => {
                if (npc.isShopOpen) npc.closeShop();
            });
        };
    }

    buyItem(item) {
        if (item.classRestrict && item.classRestrict !== this.classData.id) {
            // Flash red for class restricted
            const ui = document.getElementById('shop-title');
            if(ui) {
                const oldText = ui.innerText;
                ui.innerText = `WRONG CLASS!`;
                ui.classList.add('text-error');
                setTimeout(() => { ui.innerText = oldText; ui.classList.remove('text-error'); }, 1000);
            }
            return;
        }

        if (!window.saveData) window.saveData = { gold: 0 };
        if (window.saveData.gold === undefined || isNaN(window.saveData.gold)) window.saveData.gold = 0;

        if (window.saveData.gold < item.price) {
            // Flash red for insufficient funds
            const ui = document.getElementById('hud-gold');
            if(ui) {
                ui.classList.add('text-error');
                setTimeout(() => ui.classList.remove('text-error'), 300);
            }
            return;
        }

        // Deduct gold
        window.saveData.gold -= item.price;
        const goldEl = document.getElementById('hud-gold');
        if(goldEl) goldEl.innerText = `Gold: ${window.saveData.gold}`;

        // Apply item effect
        if (item.type === 'weapon') {
            this.inventory.weapon = { key: item.key, iconSrc: item.imageSrc, name: item.name, damageBonus: item.damageBonus, desc: item.desc };
        } else if (item.type === 'potion') {
            this.inventory.potions++;
        } else if (item.type === 'mp_potion') {
            this.inventory.mpPotions = (this.inventory.mpPotions || 0) + 1;
        } else if (item.type === 'sp_potion') {
            this.inventory.spPotions = (this.inventory.spPotions || 0) + 1;
        } else if (item.type === 'meat') {
            this.inventory.meat = (this.inventory.meat || 0) + 1;
        } else if (item.type === 'junk') {
            this.inventory.furs = (this.inventory.furs || 0) + 1;
        } else if (item.type === 'chest') {
            // Random reward
            const roll = Math.random();
            if (roll < 0.5) {
                // Gold
                const reward = 50 + Math.floor(Math.random() * 100);
                window.saveData.gold += reward;
                if(goldEl) goldEl.innerText = `Gold: ${window.saveData.gold}`;
                alert(`The chest contained ${reward} gold!`);
            } else if (roll < 0.8) {
                // Potions
                this.inventory.potions += 3;
                alert(`The chest contained 3 Health Potions!`);
            } else {
                // Rare Weapon
                this.inventory.weapon = { key: 'weapon-diamond-sword', name: 'Diamond Sword', damageBonus: 15, desc: 'Found in a mystery chest!' };
                alert(`Jackpot! You found a Diamond Sword!`);
            }
        }
        
        this.updateInventoryUI();
    }

    updateAlignment(shift) {
        this.alignment += shift;
        
        let alignmentTitle = "Neutral";
        if (this.alignment >= 20) alignmentTitle = "Heroic";
        else if (this.alignment >= 10) alignmentTitle = "Good";
        else if (this.alignment <= -20) alignmentTitle = "Villainous";
        else if (this.alignment <= -10) alignmentTitle = "Evil";

        if (this.alignmentDisplay) {
            this.alignmentDisplay.innerText = `Alignment: ${this.alignment} (${alignmentTitle})`;
        }
    }

    addQuest(quest) {
        // Prevent duplicate quests
        if (this.quests.find(q => q.id === quest.id)) return;
        quest.currentCount = 0;
        this.quests.push(quest);
        window.saveData.quests = this.quests;
        this._persistToLocalStorage();
        this.renderQuests();
        console.log("Quest Added:", quest);
    }

    progressQuest(enemyType) {
        let questUpdated = false;
        for (let i = this.quests.length - 1; i >= 0; i--) {
            const q = this.quests[i];
            if (q.targetType === enemyType) {
                q.currentCount++;
                questUpdated = true;
                
                if (q.currentCount >= q.targetCount) {
                    // Quest Complete!
                    window.saveData.gold += q.rewardGold || 50;
                    document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
                    if (this.scene && this.scene.showFloatingText) {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 80, `Quest Complete: ${q.title}!\n+${q.rewardGold || 50} Gold`, 0xffaa00);
                    }
                    this.quests.splice(i, 1);
                }
            }
        }
        if (questUpdated) {
            window.saveData.quests = this.quests;
            this._persistToLocalStorage();
            this.renderQuests();
        }
    }

    getNextWeaponUpgrade() {
        const classId = this.classData.id;
        let chain = [];
        if (classId === 'knight' || classId === 'warrior') {
            chain = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', damageBonus: 15, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' }
            ];
        } else if (classId === 'wizard') {
            chain = [
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' }
            ];
        } else if (classId === 'samurai') {
            chain = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', damageBonus: 3, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' }
            ];
        } else if (classId === 'ranger') {
            chain = [
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', damageBonus: 4, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', damageBonus: 10, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' }
            ];
        }

        const currentBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
        const upgrade = chain.find(w => w.damageBonus > currentBonus);
        return upgrade || null;
    }

    rollChestLoot(x, y) {
        const roll = Math.random();
        let message = '';
        let color = '#ffffff';

        if (roll < 0.40) {
            // Gold
            const playerLevel = window.saveData ? window.saveData.level : 1;
            const amount = 20 + Math.floor(Math.random() * 60) + (playerLevel * 5);
            window.saveData.gold = (window.saveData.gold || 0) + amount;
            document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
            message = `+${amount} Gold`;
            color = 0xffd700;
        } else if (roll < 0.60) {
            // Health Potion
            this.inventory.potions = (this.inventory.potions || 0) + 1;
            message = '+1 Health Potion';
            color = 0xff6b6b;
        } else if (roll < 0.75) {
            // Mana Potion
            this.inventory.mpPotions = (this.inventory.mpPotions || 0) + 1;
            message = '+1 Mana Potion';
            color = 0x60a5fa;
        } else if (roll < 0.85) {
            // Stamina Potion
            this.inventory.spPotions = (this.inventory.spPotions || 0) + 1;
            message = '+1 Stamina Potion';
            color = 0x4ade80;
        } else {
            // Weapon Upgrade
            const upgrade = this.getNextWeaponUpgrade();
            if (upgrade) {
                this.inventory.weapon = { 
                    key: upgrade.key, 
                    iconSrc: upgrade.imageSrc, 
                    name: upgrade.name, 
                    damageBonus: upgrade.damageBonus, 
                    desc: upgrade.desc 
                };
                message = `Equipped: ${upgrade.name}!`;
                color = 0xda00ff;
            } else {
                // Max level weapon already - give gold
                const amount = 100 + Math.floor(Math.random() * 100);
                window.saveData.gold = (window.saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
                message = `+${amount} Gold`;
                color = 0xffd700;
            }
        }

        // Save & UI Update
        this.updateInventoryUI();
        this._persistToLocalStorage();
        if (this.scene && this.scene.showFloatingText) {
            this.scene.showFloatingText(x, y - 40, message, color);
        }
    }

    renderQuests() {
        const questList = document.getElementById('quest-list');
        const uiQuests = document.getElementById('ui-quests');
        if (!questList || !uiQuests) return;

        if (this.quests.length === 0) {
            uiQuests.classList.add('translate-x-full');
            return;
        }

        uiQuests.classList.remove('translate-x-full');
        questList.innerHTML = '';
        this.quests.forEach(q => {
            const pct = Math.min(100, Math.round((q.currentCount / q.targetCount) * 100));
            questList.innerHTML += `
                <div class="bg-surface-container border border-outline-variant p-2 rounded">
                    <div class="font-body-sm font-bold text-on-surface text-[12px] uppercase">${q.title}</div>
                    <div class="font-label-caps text-[10px] text-on-surface-variant mb-1">${q.description}</div>
                    <div class="flex justify-between items-end mb-1">
                        <span class="font-label-caps text-[9px] text-primary">Progress</span>
                        <span class="font-label-caps text-[9px] text-primary">${q.currentCount} / ${q.targetCount}</span>
                    </div>
                    <div class="h-1 w-full bg-surface-container-highest rounded overflow-hidden">
                        <div class="h-full bg-primary" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        });
    }
    isLeftDown() { return this.isAI ? this.aiInput.left : this.inputManager.keys.left.isDown; }
    isRightDown() { return this.isAI ? this.aiInput.right : this.inputManager.keys.right.isDown; }
    isUpDown() { return this.isAI ? this.aiInput.up : (this.inputManager.keys.up.isDown || this.inputManager.keys.space); }
    isDownDown() { return this.isAI ? this.aiInput.down : this.inputManager.keys.down.isDown; }
    consumeDashLeft() { 
        if (this.isAI) {
            if (this.aiInput.dashLeft) { this.aiInput.dashLeft = false; return true; }
            return false;
        }
        return this.inputManager.consumeDashLeft(); 
    }
    consumeDashRight() { 
        if (this.isAI) {
            if (this.aiInput.dashRight) { this.aiInput.dashRight = false; return true; }
            return false;
        }
        return this.inputManager.consumeDashRight(); 
    }
    consumeAttack() {
        if (this.isAI) {
            if (this.aiInput.attack) { this.aiInput.attack = false; return true; }
            return false;
        }
        return Phaser.Input.Keyboard.JustDown(this.inputManager.keys.attack);
    }
    consumeSuperSpell() {
        return this.isAI ? false : (this.inputManager.keys.superSpell && Phaser.Input.Keyboard.JustDown(this.inputManager.keys.superSpell));
    }

    updateAI(time, delta) {
        if (!this.sprite || !this.sprite.active) return;
        
        // DON'T reset inputs every frame - only reset on each AI tick
        // This ensures the shared update() sees the flags for movement/animation
        
        if (time - this.lastAITick < 100) return;
        this.lastAITick = time;

        // Reset inputs at the start of each tick
        this.aiInput.left = false;
        this.aiInput.right = false;
        this.aiInput.up = false;

        const p = this.scene.player;
        if (!p || !p.sprite || !p.sprite.active) return;
        
        let target = null;
        
        if (this.aiState === 'party') {
            let closestEnemy = null;
            let minDist = Infinity;
            this.scene.enemies.getChildren().forEach(e => {
                if (e.active) {
                    const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y);
                    if (d < minDist) { minDist = d; closestEnemy = e; }
                }
            });
            
            if (closestEnemy && minDist < 400) {
                target = closestEnemy;
            } else {
                target = p.sprite;
            }
        } else if (this.aiState === 'hostile') {
            target = p.sprite;
        }
        
        if (target) {
            const dx = target.x - this.sprite.x;
            const dist = Math.abs(dx);
            
            let optimalDist = 40; // Melee
            if (this.classData.id === 'wizard' || this.classData.id === 'ranger') optimalDist = 150; // Ranged
            if (target === p.sprite && this.aiState === 'party') optimalDist = 80; // Follow distance
            
            if (dist > optimalDist + 10) {
                // Move toward target
                if (dx > 0) this.aiInput.right = true;
                else this.aiInput.left = true;
            } else if (dist < optimalDist - 20) {
                // Too close, back up
                if (dx > 0) this.aiInput.left = true;
                else this.aiInput.right = true;
            }
            // If at optimal distance, don't move - just idle and face target
            
            // Attack logic - attack when in range
            if (this.aiState === 'hostile' || target !== p.sprite) {
                // Increase the trigger distance from +30 to +60 to account for large enemy hitboxes (like the Spider)
                // where the physical collision keeps the NPC too far away to trigger the attack.
                if (dist <= optimalDist + 60) {
                    if (Math.random() < 0.3) this.aiInput.attack = true;
                }

                // Dodge and Potion logic for Rivals (or smart enemies)
                if (this.aiState === 'hostile' && this.classId && this.classId.includes('rival')) {
                    if (this.inventory.potions === undefined) this.inventory.potions = 2; // Rivals get 2 potions
                    
                    // Potion use
                    if (this.hp < this.maxHp * 0.4 && this.inventory.potions > 0 && Math.random() < 0.05) {
                        this.inventory.potions--;
                        this.hp = Math.min(this.maxHp, this.hp + 50);
                        if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, "Potion!", 0x00ff00);
                    }
                    
                    // Active dodging
                    if (p.isAttacking && dist < optimalDist + 50) {
                        if (Math.random() < 0.2) {
                            if (dx > 0) this.aiInput.dashLeft = true;
                            else this.aiInput.dashRight = true;
                        } else if (Math.random() < 0.1) {
                            this.aiInput.up = true; // Jump away
                        }
                    }
                }
            }
            
            // Dash logic - charge into combat if far away
            if ((this.aiInput.left || this.aiInput.right) && dist > optimalDist + 40) {
                let dashChance = 0.01;
                // Melee classes dash more frequently
                if (this.classData.id === 'knight' || this.classData.id === 'warrior' || this.classData.id === 'samurai') dashChance = 0.15;
                
                if (Math.random() < dashChance) {
                    if (this.aiInput.left) this.aiInput.dashLeft = true;
                    if (this.aiInput.right) this.aiInput.dashRight = true;
                }
            }
            
            // Jump logic - only jump if stuck for multiple consecutive ticks
            if (!this._stuckTicks) this._stuckTicks = 0;
            if ((this.aiInput.left || this.aiInput.right) && Math.abs(this.sprite.body.velocity.x) < 5) {
                this._stuckTicks++;
            } else {
                this._stuckTicks = 0;
            }
            // Only jump after being stuck for 5+ consecutive ticks (500ms)
            if (this._stuckTicks >= 5 && (this.sprite.body.blocked.down || this.sprite.body.touching.down)) {
                this.aiInput.up = true;
                this._stuckTicks = 0; // Reset after jumping
            }

            // Always face the target if we are in combat or following!
            // We set this here, but update() overrides it based on left/right input.
            // We will store the targetDx so update() can override its facing logic.
            this.aiTargetDx = dx;
        } else {
            this.aiTargetDx = 0;
        }
    }

    setScaleWithPhysics(scale) {
        this.sprite.setScale(scale);
        if (this.classData && this.classData.isSheet) {
            if (this.classData.id === 'knight' || this.classData.id === 'warrior') {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(28, 16);
            } else {
                this.sprite.body.setSize(24, 48);
                this.sprite.body.setOffset(20, 16);
            }
        }
    }

    _playAnim(key) {
        if (!this.classData || !this.classData.isSheet || !this.sprite || !this.sprite.active) return;
        
        let targetKey = key;
        if (!targetKey) {
            if (this.hp <= 0) targetKey = this.classData.id + '_die';
            else if (this.isAttacking) targetKey = this.classData.id + '_attack';
            else if (this.isDashing) targetKey = this.classData.id + '_dash';
            else if (this.wasDucking) targetKey = this.classData.id + '_duck';
            else if (this.isHit) targetKey = this.classData.id + '_hit';
            else if (this.sprite.body && !this.sprite.body.onFloor() && this.sprite.body.velocity.y < -10) targetKey = this.classData.id + '_jump';
            else if (this.sprite.body && !this.sprite.body.onFloor() && this.sprite.body.velocity.y > 10) targetKey = this.classData.id + '_fall';
            else if (this.sprite.body && Math.abs(this.sprite.body.velocity.x) > 10) targetKey = this.classData.id + '_walk';
            else targetKey = this.classData.id + '_idle';
        }

        // Fallback to idle if animation doesn't exist
        if (!this.scene.anims.exists(targetKey)) {
            targetKey = this.classData.id + '_idle';
            if (!this.scene.anims.exists(targetKey)) return; // Emergency abort
        }

        if (this.currentAnimKey === targetKey) return;
        this.currentAnimKey = targetKey;
        this.sprite.play(targetKey, true);
    }

    update(time, delta) {
        if (!this.sprite || !this.sprite.active) return;
        
        if (this.hp <= 0) {
            this.sprite.setVelocityX(0);
            return;
        }

        if (this.scene.isCutscene) {
            this.sprite.setVelocityX(0);
            return;
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
        if (this.consumeAttack() && !this.isAttacking && onGround) {
            this.attack();
        }

        // Super Spell
        if (this.consumeSuperSpell() && !this.isAttacking && onGround) {
            this.sprite.setVelocityX(0);
            this.superComboSpell();
        }
        if (this.isAttacking) {
            this.sprite.setVelocityX(0);
            return; // Don't process movement during attack
        }

        // Duck (S key, only on ground)
        const isDucking = this.isDownDown() && onGround;
        if (isDucking) {
            this.sprite.setVelocityX(0);
            if (cd.isSheet) this._playAnim();
            // Shrink hitbox
            if (!this.wasDucking) {
                this.sprite.body.setSize(cd.frameWidth * 0.38, cd.frameHeight * 0.45);
                this.sprite.body.setOffset(cd.frameWidth * 0.31, cd.frameHeight * 0.55);
                this.wasDucking = true;
            }
            return;
        } else {
            // Restore hitbox if was ducking
            if (this.wasDucking) {
                this.sprite.body.setSize(cd.frameWidth * 0.38, cd.frameHeight * 0.85);
                this.sprite.body.setOffset(cd.frameWidth * 0.31, cd.frameHeight * 0.15);
                this.wasDucking = false;
            }
        }

        // Horizontal movement
        let movingX = false;
        if (this.isLeftDown()) {
            this.sprite.setVelocityX(-this.speed);
            movingX = true;
        } else if (this.isRightDown()) {
            this.sprite.setVelocityX(this.speed);
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

        // Jump
        if (this.isUpDown() && onGround) {
            this.sprite.setVelocityY(this.jumpVelocity);
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
        
        // Recover stamina
        if (this.stamina < this.maxStamina) {
            this.stamina += 20 * (delta / 1000);
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            if (this.updatePlayerUI) this.updatePlayerUI();
        }
        
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
                    if (this.updatePlayerUI) this.updatePlayerUI();
                }
            }
            
            if (!this.isAI && this.scene && this.scene.updateHUD) this.scene.updateHUD();
        }
    }

    attack() {
        this.isAttacking = true;
        const cd = this.classData;

        // Play attack animation
        if (cd.isSheet && this.scene.anims.exists(cd.id + '_attack')) {
            this._playAnim();
        }

        // Branch logic based on class
        if (cd.id === 'wizard') {
            // Mana check - single shot costs 2 MP
            if (this.mp < 2) {
                this.isAttacking = false;
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            this.mp -= 2;
            if (this.updatePlayerUI) this.updatePlayerUI();
            
            // Ranged Attack
            this.scene.time.delayedCall(100, () => {
                this.fireProjectile();
            });
            
            this.scene.time.delayedCall(this.attackDuration, () => {
                this.isAttacking = false;
                if (cd.isSheet) this._playAnim();
            });
        } else if (cd.id === 'ranger') {
            // Ranger Ranged Attack
            this.scene.time.delayedCall(250, () => {
                if (this.sprite && this.sprite.active) this.fireArrow();
            });

            this.scene.time.delayedCall(this.attackDuration, () => {
                this.isAttacking = false;
                if (cd.isSheet) this._playAnim();
            });
        } else {
            // Melee Attack (Warrior, Samurai uses melee for now)
            const attackRange = this.isAI ? 120 : 80;
            const attackHeight = 55;
            const offsetX = this.facingDirection === 1 ? this.sprite.displayWidth * 0.5 : -this.sprite.displayWidth * 0.5;
            const hitbox = this.scene.add.zone(this.sprite.x + offsetX, this.sprite.y, attackRange, attackHeight);
            this.scene.physics.add.existing(hitbox);
            hitbox.body.setAllowGravity(false);
            hitbox.body.moves = false;

            this.scene.physics.overlap(hitbox, this.scene.enemies, (box, enemySprite) => {
                if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                    // Prevent AI from hitting other enemies if it's hostile AI
                    if (this.isAI && this.aiState === 'hostile') return;
                    
                    const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
                    // Class-specific damage formulas
                    let damage;
                    if (cd.id === 'samurai') {
                        damage = Math.floor(cd.stats.dex * 2.5) + Math.floor(cd.stats.str * 0.5) + weaponBonus + Math.floor(Math.random() * 5);
                    } else if (cd.id === 'ranger') {
                        damage = (cd.stats.dex * 2) + cd.stats.str + weaponBonus + Math.floor(Math.random() * 5);
                    } else {
                        // Knight / Warrior — STR primary
                        damage = (cd.stats.str * 3) + weaponBonus + Math.floor(Math.random() * 5);
                    }
                    damage = Math.floor(damage * this.getDamageMultiplier());
                    // Crit check
                    let isCrit = false;
                    if (Math.random() * 100 < (this.critChance || 0)) {
                        damage = Math.floor(damage * 2);
                        isCrit = true;
                    }
                    enemySprite.controller.takeDamage(damage, this.facingDirection);
                    if (isCrit && this.scene.showFloatingText) {
                        this.scene.showFloatingText(enemySprite.x, enemySprite.y - 60, 'CRIT!', 0xffff00);
                    }
                }
            });

            // If AI is hostile, also check overlap with Player!
            if (this.isAI && this.aiState === 'hostile') {
                this.scene.physics.overlap(hitbox, this.scene.player.sprite, (box, pSprite) => {
                    const damage = (cd.stats.str * 2) + 5 + Math.floor(Math.random() * 5);
                    this.scene.player.takeDamage(damage, this.facingDirection);
                });
            }

            this.scene.time.delayedCall(this.attackDuration, () => {
                this.isAttacking = false;
                hitbox.destroy();
                if (cd.isSheet) this._playAnim();
            });
        }
    }

    fireArrow() {
        if (!this.sprite || !this.sprite.active) return;
        const cd = this.classData;
        const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
        let damage = (cd.stats.dex * 2) + cd.stats.str + weaponBonus + Math.floor(Math.random() * 5);
        damage = Math.floor(damage * this.getDamageMultiplier());

        const offsetX = this.facingDirection === 1 ? 20 : -20;
        const proj = this.scene.physics.add.sprite(this.sprite.x + offsetX, this.sprite.y + 10, 'arrow');

        proj.body.setAllowGravity(false);
        proj.setVelocityX(this.facingDirection * 600);
        if (this.facingDirection === -1) proj.setFlipX(true);

        // Setup collision
        const overlap = this.scene.physics.add.overlap(proj, this.scene.enemies, (p, enemySprite) => {
            if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                if (this.isAI && this.aiState === 'hostile') return; // AI doesn't hit enemies

                let isCrit = false;
                let finalDamage = damage;
                if (Math.random() * 100 < (this.critChance || 0)) {
                    finalDamage = Math.floor(damage * 2);
                    isCrit = true;
                }

                enemySprite.controller.takeDamage(finalDamage, this.facingDirection);
                if (Math.random() < 0.20 && enemySprite.controller.applyStatusEffect) {
                    enemySprite.controller.applyStatusEffect('poison', 5000, 5); // 5 damage/sec for 5 sec
                }
                if (isCrit && this.scene.showFloatingText) {
                    this.scene.showFloatingText(enemySprite.x, enemySprite.y - 60, 'CRIT!', 0xffff00);
                }
                p.destroy();
                this.scene.physics.world.removeCollider(overlap);
            }
        });

        // AI friendly fire checks
        if (this.isAI && this.aiState === 'hostile') {
            const playerOverlap = this.scene.physics.add.overlap(proj, this.scene.player.sprite, (p, pSprite) => {
                const dmg = (cd.stats.dex * 2) + cd.stats.str + 5 + Math.floor(Math.random() * 5);
                this.scene.player.takeDamage(dmg, this.facingDirection);
                p.destroy();
                this.scene.physics.world.removeCollider(playerOverlap);
            });
        }

        // Destroy after 1.5 seconds to prevent memory leaks
        this.scene.time.delayedCall(1500, () => {
            if (proj && proj.active) proj.destroy();
        });
    }

    fireProjectile() {
        const cd = this.classData;
        const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
        let damage = (cd.stats.int * 2) + weaponBonus + Math.floor(Math.random() * 5);
        damage = Math.floor(damage * this.getDamageMultiplier());
        
        const offsetX = this.facingDirection === 1 ? 20 : -20;
        const proj = this.scene.physics.add.sprite(this.sprite.x + offsetX, this.sprite.y, 'projectile_blue');
        
        proj.body.setAllowGravity(false);
        proj.setVelocityX(this.facingDirection * 400);
        if (this.facingDirection === -1) proj.setFlipX(true);
        
        // Setup collision
        const overlap = this.scene.physics.add.overlap(proj, this.scene.enemies, (p, enemySprite) => {
            if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                enemySprite.controller.takeDamage(damage, this.facingDirection);
                if (Math.random() < 0.50 && enemySprite.controller.applyStatusEffect) {
                    enemySprite.controller.applyStatusEffect('burn', 3000, 10); // 10 damage/0.5s for 3s
                }
                p.destroy();
                this.scene.physics.world.removeCollider(overlap);
            }
        });
        
        // Destroy after 2 seconds to prevent memory leaks
        this.scene.time.delayedCall(2000, () => {
            if (proj.active) proj.destroy();
        });
    }

    superComboSpell() {
        const cd = this.classData;
        
        if (cd.id === 'wizard') {
            // Mana check - burst costs 4 MP
            if (this.mp < 4) {
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            this.mp -= 4;
        } else if (cd.id === 'samurai') {
            // Stamina check - 80% of maxSP, lowered by vitality
            let costRatio = 0.8 - (cd.stats.vit * 0.015); // e.g. 10 vit = -15% = 65% of max
            if (costRatio < 0.2) costRatio = 0.2; // Min 20%
            const spCost = Math.floor(this.maxSp * costRatio);
            
            if (this.sp < spCost) {
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            this.sp -= spCost;
        } else if (cd.id === 'ranger') {
            const spCost = Math.floor(this.maxSp * 0.4); // 40% SP cost
            if (this.sp < spCost) {
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            this.sp -= spCost;
        } else if (cd.id === 'knight' || cd.id === 'warrior') {
            const spCost = Math.floor(this.maxSp * 0.5); // 50% SP cost for heavy combo
            if (this.sp < spCost) {
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            this.sp -= spCost;
        }

        if (this.updatePlayerUI) this.updatePlayerUI();
        
        this.isAttacking = true;
        
        // === ANIMATION FRAME LOGGER ===
        const frameLog = [];
        const logStartTime = performance.now();
        const onFrameChange = (anim, frame) => {
            frameLog.push({
                time: Math.round(performance.now() - logStartTime),
                frameIndex: frame.index,
                frameName: frame.textureFrame,
                w: frame.width,
                h: frame.height,
                x: frame.cutX,
                y: frame.cutY
            });
        };
        this.sprite.on('animationupdate', onFrameChange);
        // === END LOGGER SETUP ===

        if (cd.id !== 'knight' && cd.id !== 'warrior') {
            if (cd.isSheet && this.scene.anims.exists(cd.id + '_combo')) {
                this._playAnim(cd.id + '_combo');
                // Log the first frame too
                const curFrame = this.sprite.anims.currentFrame;
                if (curFrame) {
                    frameLog.push({
                        time: 0,
                        frameIndex: curFrame.index,
                        frameName: curFrame.textureFrame,
                        w: curFrame.frame ? curFrame.frame.width : '?',
                        h: curFrame.frame ? curFrame.frame.height : '?',
                        x: curFrame.frame ? curFrame.frame.cutX : '?',
                        y: curFrame.frame ? curFrame.frame.cutY : '?'
                    });
                }
            }
        }

        if (cd.id === 'wizard') {
            // Trigger 3-orb burst after a short delay (approx when wand is raised)
            this.scene.time.delayedCall(400, () => {
                const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
                const damage = (cd.stats.int * 4) + weaponBonus + 10;
                
                // Screen shake for impact
                this.scene.cameras.main.shake(150, 0.008);
                
                // 3 orbs fired straight in rapid succession
                const dir = this.facingDirection || 1;
                const orbSpeed = 400;
                
                for (let i = 0; i < 3; i++) {
                    this.scene.time.delayedCall(i * 100, () => {
                        if (!this.sprite || !this.sprite.active) return;
                        const p = this.scene.physics.add.sprite(this.sprite.x + (dir * 20), this.sprite.y - 10, 'projectile_blue');
                        p.body.setAllowGravity(false);
                        p.setScale(1.5);
                        p.setVelocity(dir * orbSpeed, 0); // All straight
                        
                        const overlap = this.scene.physics.add.overlap(p, this.scene.enemies, (proj, enemySprite) => {
                            if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                                enemySprite.controller.takeDamage(damage, dir);
                                proj.destroy();
                                this.scene.physics.world.removeCollider(overlap);
                            }
                        });
                        
                        this.scene.time.delayedCall(1200, () => { if(p.active) p.destroy(); });
                    });
                }
            });
        } else if (cd.id === 'samurai') {
            // Samurai combo: 16 frames, 4 hits
            const dir = this.facingDirection || 1;
            const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
            let damage = Math.floor(cd.stats.dex * 2.5) + Math.floor(cd.stats.str * 0.5) + weaponBonus;
            damage = Math.floor(damage * this.getDamageMultiplier());
            
            // 4 hits at intervals
            for (let i = 0; i < 4; i++) {
                this.scene.time.delayedCall(i * 300 + 100, () => {
                    if (!this.sprite || !this.sprite.active) return;
                    this.sprite.setVelocityX(200 * dir); // Lunge forward slightly with each hit
                    
                    // Hitbox check
                    const attackRange = 60;
                    const attackHeight = 55;
                    const offsetX = (dir === 1) ? 40 : -40;
                    const hitBox = new Phaser.Geom.Rectangle(this.sprite.x + offsetX - (attackRange/2), this.sprite.y - (attackHeight/2), attackRange, attackHeight);

                    let hitCount = 0;
                    this.scene.enemies.children.iterate((enemySprite) => {
                        if (enemySprite && enemySprite.active && enemySprite.controller && enemySprite.controller.hp > 0) {
                            if (Phaser.Geom.Intersects.RectangleToRectangle(hitBox, enemySprite.getBounds())) {
                                enemySprite.controller.takeDamage(damage, dir);
                                // 100% chance to stun
                                if (enemySprite.controller.applyStatusEffect) {
                                    enemySprite.controller.applyStatusEffect('stun', 1500, 0);
                                }
                                hitCount++;
                            }
                        }
                    });
                    
                    if (hitCount > 0) {
                        this.scene.cameras.main.shake(100, 0.005);
                    }
                });
            }
        } else if (cd.id === 'ranger') {
            const dir = this.facingDirection || 1;
            const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
            let damage = Math.floor((cd.stats.dex * 2) + cd.stats.str + weaponBonus + 5);
            damage = Math.floor(damage * this.getDamageMultiplier());
            
            // 7 arrows 1 millisecond after the other
            for (let i = 0; i < 7; i++) {
                this.scene.time.delayedCall(100 + i, () => {
                    if (!this.sprite || !this.sprite.active) return;
                    this.sprite.setVelocityX(-30 * dir); // Small recoil push
                    
                    const offsetX = dir === 1 ? 20 : -20;
                    // Spread them slightly vertically so it looks like a deadly swarm
                    const offsetY = 5 + (Math.random() * 15 - 7.5);
                    
                    const proj = this.scene.physics.add.sprite(this.sprite.x + offsetX, this.sprite.y + offsetY, 'arrow');
                    proj.body.setAllowGravity(false);
                    proj.setVelocityX(dir * 1000); // Extremely fast
                    if (dir === -1) proj.setFlipX(true);
                    
                    const overlap = this.scene.physics.add.overlap(proj, this.scene.enemies, (p, enemySprite) => {
                        if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                            if (this.isAI && this.aiState === 'hostile') return;
                            enemySprite.controller.takeDamage(damage, dir);
                            p.destroy();
                            this.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
                    // AI friendly fire checks
                    if (this.isAI && this.aiState === 'hostile') {
                        const playerOverlap = this.scene.physics.add.overlap(proj, this.scene.player.sprite, (p, pSprite) => {
                            this.scene.player.takeDamage(damage, dir);
                            p.destroy();
                            this.scene.physics.world.removeCollider(playerOverlap);
                        });
                    }
                    
                    this.scene.time.delayedCall(1000, () => { if(proj.active) proj.destroy(); });
                });
            }
            this.scene.time.delayedCall(100, () => this.scene.cameras.main.shake(200, 0.01));
        } else if (cd.id === 'knight' || cd.id === 'warrior') {
            const dir = this.facingDirection || 1;
            const weaponBonus = this.inventory && this.inventory.weapon ? this.inventory.weapon.damageBonus : 0;
            let damage = Math.floor(cd.stats.str * 3.5) + Math.floor(cd.stats.vit * 1.5) + weaponBonus;
            damage = Math.floor(damage * this.getDamageMultiplier());
            
            // Thrust/Bash attack - lunges forward and hits everything in a wide arc
            this.sprite.setVelocityX(400 * dir); // Massive lunge
            
            this.scene.time.delayedCall(200, () => {
                if (!this.sprite || !this.sprite.active) return;
                
                const attackRange = 100;
                const attackHeight = 80;
                const offsetX = (dir === 1) ? 50 : -50;
                const hitBox = new Phaser.Geom.Rectangle(this.sprite.x + offsetX - (attackRange/2), this.sprite.y - (attackHeight/2), attackRange, attackHeight);

                let hitCount = 0;
                this.scene.enemies.children.iterate((enemySprite) => {
                    if (enemySprite && enemySprite.active && enemySprite.controller && enemySprite.controller.hp > 0) {
                        if (Phaser.Geom.Intersects.RectangleToRectangle(hitBox, enemySprite.getBounds())) {
                            enemySprite.controller.takeDamage(damage, dir);
                            // Add significant knockback
                            if (enemySprite.body) {
                                enemySprite.setVelocityX(dir * 300);
                                enemySprite.setVelocityY(-150);
                            }
                            hitCount++;
                        }
                    }
                });
                
                if (hitCount > 0) {
                    this.scene.cameras.main.shake(300, 0.015);
                }
            });
        }

        // The combo animation has 12 frames at 12fps, so roughly 1000ms duration.
        // Or we just wait for animation complete
        this.sprite.once('animationcomplete', (anim) => {
            if (anim.key === cd.id + '_combo') {
                this.isAttacking = false;
                this._playAnim();
                
                // === PRINT FRAME LOG ===
                this.sprite.off('animationupdate', onFrameChange);
                console.log(`%c=== SUPER ATTACK FRAME LOG (${cd.id}) ===`, 'color: #ff0; font-size: 14px; font-weight: bold;');
                console.log(`Total frames logged: ${frameLog.length}`);
                console.log(`Animation: ${anim.key} | Expected frames: ${anim.frames.length}`);
                console.table(frameLog);
                // Check for duplicates or gaps
                const frameNames = frameLog.map(f => f.frameName);
                const expected = anim.frames.map(f => f.textureFrame);
                const missing = expected.filter(f => !frameNames.includes(f));
                const extra = frameNames.filter(f => !expected.includes(f));
                if (missing.length) console.warn('MISSING frames (never played):', missing);
                if (extra.length) console.warn('EXTRA frames (not in animation def):', extra);
                console.log('Expected frame order:', expected);
                console.log('%c=== END LOG ===', 'color: #ff0;');
            }
        });
        
        // Fallback in case animationcomplete doesn't fire
        this.scene.time.delayedCall(1500, () => {
            if (this.isAttacking) {
                this.isAttacking = false;
                this._playAnim();
            }
        });
    }

    startDash(directionMultiplier) {
        // Stamina check - dash costs 15 SP
        if (this.sp < 15) {
            if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'No Stamina!', 0x44ff44);
            return;
        }
        this.sp -= 15;
        if (this.updatePlayerUI) this.updatePlayerUI();
        
        this.isDashing = true;
        this.sprite.setVelocityX(this.dashSpeed * directionMultiplier);
        this.sprite.setVelocityY(0);
        this.sprite.body.allowGravity = false;
        
        // Visual indicator of dashing (e-frames)
        this.sprite.setAlpha(0.5);

        // Stop dashing after duration
        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            if (this.sprite && this.sprite.body) {
                this.sprite.body.allowGravity = true;
                this.sprite.setAlpha(1.0);
            }
        });
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
        if (this.hp <= 0) return; // Already dead

        this.hp -= amount;
        
        // Show damage text
        if (this.scene && this.scene.showFloatingText) {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, `-${amount}`, 0xff0000);
        }

        // Apply knockback
        if (this.sprite && this.sprite.body) {
            let kbDir = 1;
            if (knockbackDirection !== undefined && !isNaN(knockbackDirection)) {
                // If the number is large, it might be a raw X coordinate passed by mistake
                if (Math.abs(knockbackDirection) > 5) {
                    kbDir = this.sprite.x < knockbackDirection ? -1 : 1;
                } else {
                    kbDir = knockbackDirection > 0 ? 1 : -1;
                }
            } else {
                // Fallback to pushing them backwards based on their current facing direction
                kbDir = this.facingDirection === 1 ? -1 : 1;
            }
            this.sprite.setVelocityX(kbDir * 200);
            this.sprite.setVelocityY(-150);
        }

        if (this.scene.anims.exists(this.classData.id + '_hit') && !this.isAttacking) {
            this._playAnim();
        }

        if (!this.isAI && this.scene && this.scene.updateHUD) {
            this.scene.updateHUD();
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    applyStatusEffect(type, durationMs, strength) {
        if (this.hp <= 0) return;
        
        // Check if effect already exists
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) {
            existing.duration = durationMs;
            if (strength > existing.strength) existing.strength = strength;
        } else {
            this.statusEffects.push({
                type: type,
                duration: durationMs,
                strength: strength,
                tickTimer: 0
            });
        }
    }

    updateStatusEffects(delta) {
        if (!this.sprite || !this.sprite.active || this.hp <= 0) return;

        let hasTint = false;
        
        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i];
            effect.duration -= delta;
            
            // Apply visual tint based on strongest/latest effect
            if (!this.isHit) { // Don't override damage flash
                if (effect.type === 'stun') { this.sprite.setTint(0xffff00); hasTint = true; }
                else if (effect.type === 'freeze' && !hasTint) { this.sprite.setTint(0x88ccff); hasTint = true; }
                else if (effect.type === 'burn' && !hasTint) { this.sprite.setTint(0xff6600); hasTint = true; }
                else if (effect.type === 'poison' && !hasTint) { this.sprite.setTint(0x00ff00); hasTint = true; }
            }

            // Process tick damage
            if (effect.type === 'poison' || effect.type === 'burn') {
                effect.tickTimer += delta;
                const tickRate = effect.type === 'poison' ? 1000 : 500;
                
                if (effect.tickTimer >= tickRate) {
                    effect.tickTimer -= tickRate;
                    this.hp -= effect.strength;
                    
                    if (this.scene && this.scene.showFloatingText) {
                        const color = effect.type === 'poison' ? 0x00ff00 : 0xff6600;
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, `-${effect.strength}`, color);
                    }
                    if (this.updatePlayerUI) this.updatePlayerUI();
                    if (!this.isAI && this.scene && this.scene.updateHUD) this.scene.updateHUD();

                    if (this.hp <= 0) {
                        this.die();
                        return;
                    }
                }
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }
        
        if (this.statusEffects.length === 0 && !this.isHit) {
            this.sprite.clearTint();
        }
    }

    die() {
        if (!this.sprite || !this.sprite.active) return;

        if (this.scene.anims.exists(this.classData.id + '_die')) {
            this._playAnim();
            this.sprite.body.enable = false;
        }

        if (this.isAI) {
            if (this.aiState === 'hostile') {
                if (this.classId && this.classId.includes('rival')) {
                    if (!window.saveData.defeatedRivals) window.saveData.defeatedRivals = [];
                    if (!window.saveData.defeatedRivals.includes(this.classId)) {
                        window.saveData.defeatedRivals.push(this.classId);
                        if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Rival Defeated!", 0xffa500);
                    }
                    if (this.classId === 'megaboss_rival') {
                        window.saveData.isSavior = true;
                        if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 80, "SAVIOR OF THE REALM", 0xffff00);
                    }
                }
                // Drop loot
                if (this.scene && this.scene.grantRewards) {
                    this.scene.grantRewards(50, 20); // 50 XP, 20 Gold
                }
            } else if (this.aiState === 'party') {
                // Remove from party
                const idx = this.scene.partyMembers.indexOf(this);
                if (idx > -1) this.scene.partyMembers.splice(idx, 1);
            }
            if (this.scene.anims.exists(this.classData.id + '_die')) {
                this.sprite.on('animationcomplete', () => this.sprite.destroy());
            } else {
                this.sprite.destroy();
            }
        } else {
            // Real Player dies
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 50, "YOU DIED", 0xff0000);
            
            // Penalty: lose 1% XP
            if (window.saveData) {
                const currentXp = window.saveData.xp || 0;
                const xpLoss = Math.floor(currentXp * 0.01);
                window.saveData.xp = Math.max(0, currentXp - xpLoss);
                if (xpLoss > 0) {
                    this.scene.time.delayedCall(1000, () => {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 70, `Lost ${xpLoss} XP`, 0xffa500);
                    });
                }

                // Respawn at nearest town backwards
                let respawnZone = 0;
                if (window.saveData.worldMap) {
                    for (let i = window.saveData.currentZone || 0; i >= 0; i--) {
                        if (window.saveData.worldMap[i] && window.saveData.worldMap[i].type === 'Safe') {
                            respawnZone = i;
                            break;
                        }
                    }
                }
                window.saveData.currentZone = respawnZone;
                window.saveData.hp = window.saveData.maxHp || this.maxHp || 100;
                // Save it so the reload picks it up
                localStorage.setItem('rpg_save', JSON.stringify(window.saveData));
            }

            // Quick reload
            this.scene.time.delayedCall(3500, () => {
                this.scene.scene.restart();
            });
        }
    }

    // ==========================================
    // Ally Chat Integration
    // ==========================================

    openChat() {
        if (!this.uiContainer) {
            this.uiContainer = document.getElementById('chat-ui');
            this.chatHistoryDiv = document.getElementById('chat-history');
            this.chatInput = document.getElementById('chat-input');
            this.chatSubmitBtn = document.getElementById('chat-submit');
            this.npcNameDiv = document.getElementById('chat-npc-name');
            this.chatHistory = [];
            
            this.chatSubmitHandler = () => this.handlePlayerMessage();
            this.chatKeyHandler = (e) => { if (e.key === 'Enter') this.handlePlayerMessage(); };
        }

        this.isChatOpen = true;
        this.scene.player.isTalking = true;
        this.uiContainer.style.display = 'block';
        
        // Use npcName or default fallback
        const displayName = this.npcName || (this.classData ? this.classData.id : 'Ally');
        this.npcNameDiv.innerText = displayName;

        // Ensure we remove previous listeners to avoid double-firing
        this.chatSubmitBtn.removeEventListener('click', this.chatSubmitHandler);
        this.chatInput.removeEventListener('keypress', this.chatKeyHandler);
        
        this.chatSubmitBtn.addEventListener('click', this.chatSubmitHandler);
        this.chatInput.addEventListener('keypress', this.chatKeyHandler);

        // Hide shop button if present
        const tradeBtn = document.getElementById('chat-trade');
        if (tradeBtn) tradeBtn.style.display = 'none';

        if (this.scene.inputManager) {
            this.scene.input.keyboard.removeCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
            this.scene.inputManager.disableForInput();
        }

        if (this.chatHistory.length === 0) {
            this.addMessageToUI(displayName, "Ready when you are, boss.");
        }

        setTimeout(() => this.chatInput.focus(), 100);
    }

    closeChat() {
        this.isChatOpen = false;
        this.scene.player.isTalking = false;
        this.uiContainer.style.display = 'none';
        this.chatInput.blur();

        if (this.scene.inputManager) {
            this.scene.inputManager.enableForInput();
        }
    }

    addMessageToUI(sender, text, id = null) {
        const msgDiv = document.createElement('div');
        if (id) msgDiv.id = id;
        msgDiv.style.marginBottom = '8px';
        const senderColor = sender === "Player" ? "#66aaff" : (sender === "System" ? "#aaaaaa" : "#ffaa00");
        msgDiv.innerHTML = `<span style="color: ${senderColor}; font-weight: bold;">${sender}:</span> <span>${text}</span>`;
        this.chatHistoryDiv.appendChild(msgDiv);
        this.chatHistoryDiv.scrollTop = this.chatHistoryDiv.scrollHeight;
    }

    async handlePlayerMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.addMessageToUI("Player", text);
        this.chatInput.value = "";
        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;

        const displayName = this.npcName || (this.classData ? this.classData.id : 'Ally');
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const wm = this.scene.worldManager;
        const p = this.scene.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: { level: window.saveData.level || 1, class: p.classData ? p.classData.id : "adventurer", hp: `${p.hp}/${p.maxHp}` }
        };

        const geminiService = this.scene.geminiService;
        const persona = this.persona || "A loyal adventurer traveling with the player.";
        const response = await geminiService.getNpcResponse(persona, this.chatHistory, text, state);

        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        this.addMessageToUI(displayName, response.response);
        
        this.chatHistory.push({ sender: "Player", text: text });
        this.chatHistory.push({ sender: displayName, text: response.response });

        // Add Camaraderie for chatting
        this.camaraderie = (this.camaraderie || 0) + 1;
        this.addMessageToUI("System", `<span style="color:#f6be3b">Camaraderie increased! (+1)</span>`);
        
        // Update character sheet if open
        if (this.scene.updateCharacterSheet) {
            this.scene.updateCharacterSheet();
        }

        this.chatInput.disabled = false;
        this.chatSubmitBtn.disabled = false;
        this.chatInput.focus();
    }
}
