// src/enemy/EnemyBehaviors.js - Handles enemy setup, stats, and tactical AI state machine
window.EnemyBehaviors = {
    initializeEnemy(x, y) {
        this.isZombie = ['zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3'].includes(this.type);
        this.zombieCrawling = false; // Phase 2: crawling after first death
        this.damageMultiplier = 1.0;

        this.scaleMultiplier = this.scene.isIndoors ? (2.5 / 1.5) : 1.0;
        this.bossScaleMultiplier = this.scene.isIndoors ? 1.25 : 1.0;
        this.giantScaleMultiplier = this.scene.isIndoors ? 1.15 : 1.0;

        // Resolve texture key (custom modular composite vs standard key)
        if (this.type.startsWith('special_enemy_')) {
            const parts = this.type.split('_');
            const monsterType = parts[2]; // e.g. 'demon'
            const gender = parts[3];      // e.g. 'male'
            const specialData = window.CharacterComposer.generateSpecialEnemy(this.scene, monsterType, gender);
            this.textureKey = specialData.spriteKey;
            this.specialWeaponType = specialData.weaponType;
        } else {
            this.textureKey = this.type;
        }

        // Create the physics sprite
        this.sprite = this.scene.physics.add.sprite(x, y, this.textureKey);
        
        if (this.type === 'wolfen' || this.type === 'coyle') {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            this.sprite.setSize(45, 65);
            this.sprite.setOffset(42, 30);
        } else if (this.type.startsWith('special_enemy_')) {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            let footY = 64;
            const fd = window.npcFootData && window.npcFootData[this.textureKey];
            if (fd && fd[0] != null) {
                footY = fd[0] + 1;
            }
            this.sprite.setSize(36, 48);
            this.sprite.setOffset((100 - 36) / 2, footY - 48);
        } else if (this.type === 'the_devil') {
            this.sprite.setScale(1.8 * this.bossScaleMultiplier);
            this.sprite.setSize(50, 65);
            this.sprite.setOffset(39, 30);
        } else if (this.type === 'skeleton') {
            const baseScale = this.isSummoned ? 0.8 : 1.4;
            this.sprite.setScale(baseScale * this.scaleMultiplier);
            this.sprite.setSize(40, 64);
            this.sprite.setOffset(44, 32);
        } else if (this.type === 'frost_giant') {
            this.sprite.setScale(2.0 * this.bossScaleMultiplier);
            this.sprite.setSize(40, 64);
            this.sprite.setOffset(44, 32);
        } else if (this.type === 'lich_lord') {
            this.sprite.setScale(1.3 * this.bossScaleMultiplier);
            this.sprite.setSize(40, 64);
            this.sprite.setOffset(44, 30);
        } else if (this.type === 'bandit') {
            this.sprite.setScale(1.03 * this.scaleMultiplier);
            this.sprite.setSize(40, 68);
            this.sprite.setOffset(44, 27);
        } else if (this.type === 'knight_rival') {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            this.sprite.setSize(40, 64);
            this.sprite.setOffset(25, 0);
        } else if (this.type === 'training_dummy') {
            this.sprite.setScale(0.8 * this.scaleMultiplier);
            this.sprite.setSize(40, 90);
            this.sprite.setOffset(44, 38);
        } else if (this.type === 'spider') {
            this.sprite.setScale(1.5 * this.giantScaleMultiplier);
            this.sprite.setSize(40, 40);
            this.sprite.setOffset(44, 40);
        } else if (this.type === 'heavenly_valkyrie') {
            this.sprite.setScale(1.0 * this.scaleMultiplier);
            this.sprite.setSize(40, 70);
            this.sprite.setOffset(44, 25);
        } else if (this.type === 'heavenly_seraph') {
            this.sprite.setScale(1.2 * this.scaleMultiplier);
            this.sprite.setSize(50, 70);
            this.sprite.setOffset(39, 25);
        } else if (this.type === 'heavenly_archangel') {
            this.sprite.setScale(1.3 * this.scaleMultiplier);
            this.sprite.setSize(40, 63);
            this.sprite.setOffset(44, 32);
        } else if (this.type === 'heavenly_cherub') {
            this.sprite.setScale(0.6 * this.scaleMultiplier);
            this.sprite.setSize(30, 40);
            this.sprite.setOffset(49, 40);
        } else if (this.type === 'giant') {
            this.sprite.setScale(2.0 * this.bossScaleMultiplier);
            this.sprite.setSize(50, 62);
            this.sprite.setOffset(39, 27);
        } else if (this.type === 'ogre') {
            this.sprite.setScale(1.8 * this.bossScaleMultiplier);
            this.sprite.setSize(40, 64);
            this.sprite.setOffset(44, 32);
        } else if (this.type === 'troll') {
            this.sprite.setScale(1.6 * this.bossScaleMultiplier);
            this.sprite.setSize(40, 60);
            this.sprite.setOffset(42, 32);
            if (!window.npcFootData) window.npcFootData = {};
            window.npcFootData['troll'] = [
                91, 91, 91, 91, 91, 91, 91, 91, 91, // idle (0..8)
                91, 91, 90, 91, 94, 94, 93, 92, 92, // walk (9..17)
                91, 91, 91, 91, 91, 91, 91, 92, 91, // attack (18..26)
                91, 91, 91, 91, 91, 91, 91, 91, 91, // attack2 (27..35)
                91, 91, 91, 91, 91,                 // hit (36..40)
                91, 91, 93, 93, 94, 94, 94, 94, 94  // die (41..49)
            ];
        } else if (this.type === 'dragon') {
            this.sprite.setScale(3.3 * this.giantScaleMultiplier);
            this.sprite.setSize(110, 40);
            this.sprite.setOffset(9, 42);
        } else if (this.isZombie) {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            this.sprite.setSize(40, 55);
            this.sprite.setOffset(12, 9); // 64x64 frame, center the hitbox
        } else if (this.type === 'hellhound_1') {
            this.sprite.setScale(1.0 * this.scaleMultiplier);
            this.sprite.setSize(84, 48);
            this.sprite.setOffset(22, 80);
            this.sprite.setFlipX(true);
        } else if (this.type === 'hellhound_2') {
            this.sprite.setScale(1.0 * this.scaleMultiplier);
            this.sprite.setSize(90, 50);
            this.sprite.setOffset(14, 78);
            this.sprite.setFlipX(true);
        } else if (this.type === 'hellhound_3') {
            this.sprite.setScale(1.0 * this.scaleMultiplier);
            this.sprite.setSize(103, 60);
            this.sprite.setOffset(12, 68);
            this.sprite.setFlipX(true);
        } else if (this.type === 'willowisp') {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            this.sprite.setSize(24, 24);
            this.sprite.setOffset(4, 4);
        } else if (this.type.startsWith('dark_elf_')) {
            const isQueen = this.type.includes('queen');
            const isMinion = this.type.includes('minion');
            const baseScale = isQueen ? 0.85 : (isMinion ? 0.75 : 1.05);
            this.sprite.setScale(baseScale * this.scaleMultiplier);
            this.sprite.setSize(48, 104);
            this.sprite.setOffset(40, 24);
        } else if (this.type.startsWith('mimic_')) {
            this.sprite.setScale(1.0 * this.scaleMultiplier);
            this.sprite.setSize(56, 50);
            this.sprite.setOffset(36, 78);
        } else if (this.type.startsWith('gorgon_')) {
            this.sprite.setScale(1.05 * this.scaleMultiplier);
            this.sprite.setSize(48, 96);
            this.sprite.setOffset(40, 32);
        } else if (this.type.includes('_golem')) {
            this.sprite.setScale(1.15 * this.scaleMultiplier);
            this.sprite.setSize(56, 100);
            this.sprite.setOffset(36, 28);
        } else {
            this.sprite.setScale((this.type === 'goblin' ? 1.4 : 1.8) * this.scaleMultiplier);
        }
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setBounce(0);

        this.baseIsFlying = ['dragon', 'the_devil', 'bat', 'plague_flies', 'willowisp'].includes(this.type);
        this.isFlying = this.baseIsFlying;
        if (this.isFlying && this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }

        // Land-and-walk state machine for dragon and the_devil
        if (this.baseIsFlying && ['dragon', 'the_devil'].includes(this.type)) {
            this.flightState = 'flying'; // 'flying', 'landing', 'grounded'
            this.flightTimer = 0;
        }

        // Link the sprite to this controller for physics callbacks
        this.sprite.controller = this;

        // Track which animation is currently running so we NEVER call
        // play() more than once per transition. Calling play() every frame
        // (even with ignoreIfPlaying=true) causes Phaser to flash frame 0
        // on internal animation tick boundaries, producing the blink.
        this.currentAnimKey = null;
        this._playAnim(`${this.textureKey}-idle`);

        // When the hit animation finishes, snap back to idle immediately
        // Standard hit reaction for all other enemies
        const hitKey = `${this.textureKey}-hit`;
        if (this.scene.anims.exists(hitKey)) {
            this._playAnim(hitKey);
            this.sprite.off('animationcomplete-' + hitKey);
            this.sprite.once('animationcomplete-' + hitKey, () => {
                if (this.sprite && this.sprite.active) this.isHit = false;
            });
        } else {
            this._playAnim(`${this.textureKey}-idle`);
            this.scene.time.delayedCall(400, () => {
                if (this.sprite && this.sprite.active) this.isHit = false;
            });
        }

        this.sprite.on(`animationcomplete`, (anim) => {
            if (anim.key.includes('-attack') || anim.key.includes('-shoot') || anim.key.includes('-summon')) {
                this.isAttacking = false;
                this._playAnim(`${this.textureKey}-idle`);
            }
        });

        // Tactic tracking
        this.lastTacticTime = 0;
        this._isFetchingTactic = false;
        this.tacticInterval = 4000; // Ask Gemini every 4s
        // Aggro system: enemies patrol/wander until player enters their detection radius
        const bossTypes = ['lich_lord', 'the_devil', 'spider', 'frost_giant', 'skeleton', 'bandit', 'dark_elf_queen'];
        this.aggroRadius = bossTypes.includes(this.type) ? 999 : 420;
        this.isAggrod = false;
        // Wander state
        this._wanderTarget = null;
        this._wanderTimer = 0;
        this._wanderPauseTimer = 0;
        this._wanderPausing = false;
        // Start in WANDER mode, not CHASE
        this.currentTactic = 'WANDER';

        // Stats
        this.speed = 100;
        if (this.type === 'knight_rival') {
            this.maxHp = 500;
            this.speed = 120;
        } else if (this.type === 'dwarf_warrior_rival') {
            this.maxHp = 500;
            this.speed = 100;
        } else if (this.type === 'dwarf_miner_rival') {
            this.maxHp = 400;
            this.speed = 110;
        } else if (this.type === 'elven_spellblade_rival' || this.type === 'dark_elf_spellblade_rival') {
            this.maxHp = 450;
            this.speed = 130;
        } else if (this.type === 'elven_longbowman_rival' || this.type === 'dark_elf_longbowman_rival') {
            this.maxHp = 350;
            this.speed = 120;
        } else if (this.type === 'dark_elf_guard' || this.type === 'dark_elf_guard_rival') {
            this.maxHp = 500;
            this.speed = 115;
        } else if (this.type === 'dark_elf_spellblade') {
            this.maxHp = 450;
            this.speed = 125;
        } else if (this.type === 'dark_elf_longbowman') {
            this.maxHp = 350;
            this.speed = 120;
        } else if (this.type === 'dark_elf_queen' || this.type === 'dark_elf_queen_rival') {
            this.maxHp = 1800;
            this.speed = 130;
        } else if (this.type === 'dark_elf_minion' || this.type === 'dark_elf_minion_rival') {
            this.maxHp = 300;
            this.speed = 130;
        } else if (this.type === 'mimic_1' || this.type === 'mimic_1_rival') {
            this.maxHp = 300;
            this.speed = 120;
        } else if (this.type === 'mimic_2' || this.type === 'mimic_2_rival') {
            this.maxHp = 450;
            this.speed = 130;
        } else if (this.type === 'mimic_3' || this.type === 'mimic_3_rival') {
            this.maxHp = 600;
            this.speed = 140;
        } else if (this.type === 'gorgon_1' || this.type === 'gorgon_1_rival') {
            this.maxHp = 350;
            this.speed = 100;
        } else if (this.type === 'gorgon_2' || this.type === 'gorgon_2_rival') {
            this.maxHp = 480;
            this.speed = 110;
        } else if (this.type === 'gorgon_3' || this.type === 'gorgon_3_rival') {
            this.maxHp = 620;
            this.speed = 120;
        } else if (this.type === 'stone_golem' || this.type === 'stone_golem_rival') {
            this.maxHp = 800;
            this.speed = 70;
        } else if (this.type === 'lava_golem' || this.type === 'lava_golem_rival') {
            this.maxHp = 1000;
            this.speed = 80;
        } else if (this.type === 'copper_golem' || this.type === 'copper_golem_rival') {
            this.maxHp = 700;
            this.speed = 75;
        } else if (this.type === 'lich_lord') {
            this.maxHp = 2000;
        } else if (this.type === 'spider' || this.type === 'the_devil') {
            this.maxHp = this.type === 'the_devil' ? 1500 : 400; // other bosses
        } else if (this.type === 'training_dummy') {
            this.maxHp = 999999;
        } else if (this.type === 'wolfen') {
            this.maxHp = 400;
        } else if (this.type === 'coyle') {
            this.maxHp = 350;
        } else if (this.type === 'heavenly_archangel') {
            this.maxHp = 500;
        } else if (this.type === 'heavenly_valkyrie') {
            this.maxHp = 400;
        } else if (this.type === 'heavenly_seraph') {
            this.maxHp = 350;
        } else if (this.type === 'heavenly_cherub') {
            this.maxHp = 150;
        } else if (this.type === 'giant') {
            this.maxHp = 600;
        } else if (this.type === 'ogre') {
            this.maxHp = 450;
        } else if (this.type === 'troll') {
            this.maxHp = 380;
        } else if (this.type === 'dragon') {
            this.maxHp = 800;
        } else if (this.type === 'willowisp') {
            this.maxHp = 80;
        } else if (this.type === 'bloated_damned') {
            this.maxHp = 120;
            this.speed = 120;
        } else {
            this.maxHp = 100;
        }

        // Apply proximity scaling (further from Zone 0/Willowbrook = stronger enemies)
        const zoneIdx = (this.scene.worldManager && this.scene.worldManager.currentZoneIndex) !== undefined ? this.scene.worldManager.currentZoneIndex : 0;
        const absIdx = Math.abs(zoneIdx);
        const guardTypes = ['knight_rival', 'ranger_rival', 'elven_spellblade_rival', 'elven_longbowman_rival', 'dwarf_warrior_rival', 'dwarf_miner_rival'];
        
        if (guardTypes.includes(this.type)) {
            // Guards scale up rapidly near the rifts
            this.maxHp = Math.round(this.maxHp + (absIdx * 25));
            this.damageMultiplier = 1.0 + (absIdx * 0.05);
        } else if (this.type !== 'training_dummy' && !this.isBoss) {
            // Standard monsters scale moderately
            this.maxHp = Math.round(this.maxHp + (absIdx * 10));
            this.damageMultiplier = 1.0 + (absIdx * 0.02);
        }
        
        this.hp = this.maxHp;
        if (this.scene.zoneBiome === 'Heaven') {
            this.sprite.setTint(0xfff5cc); // Warm celestial golden tint
        }
        if (this.type === 'training_dummy') console.log(`[DEBUG] EnemyController spawned training_dummy. HP set to: ${this.hp}/${this.maxHp}`);
        // State tracking
        this.isHit = false;
        this.provoked = false;
        this.isAttacking = false;
        this.hasExploded = false;
        this.statusEffects = []; // Array of active status effects
        this.damageCooldown = 500;
        this.lastDamageTime = 0;

        // Hook setFrame to handle dynamic foot anchoring on frame changes for custom characters immediately
        if (this.type.startsWith('special_enemy_') || this.type === 'troll') {
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

        // Clean up text if sprite is destroyed by a zone transition
        this.sprite.on('destroy', () => {
            if (this.aiText && this.aiText.active) this.aiText.destroy();
            if (this.hpText && this.hpText.active) this.hpText.destroy();
        });
    },

    executeTactic() {
        if (!this.player || !this.player.sprite) return;

        const isPlayerLeft = this.player.sprite.x < this.sprite.x;
        const distanceX = Math.abs(this.player.sprite.x - this.sprite.x);
        
        let shouldFlip = this.sprite.flipX; // default to current flip to prevent jitter
        if (distanceX > 5) {
            if (this.facesLeftByDefault) {
                shouldFlip = !isPlayerLeft;
            } else {
                shouldFlip = isPlayerLeft;
            }
        }

        if (this.type === 'willowisp') {
            this.handleWispTactic(distanceX, isPlayerLeft, shouldFlip);
            return;
        }

        switch (this.currentTactic) {
            case "ATTACK":
            case "MELEE_ATTACK":
            case "RANGED_ATTACK":
            case "CHASE":
                const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                
                // Special Boss Attack Logic
                if (this.type === 'dwarf_king' || this.type === 'dwarf_king_rival') {
                    if (enemyOnGround) this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip);
                    
                    if (distanceX <= 85) {
                        // Melee attack up close
                        this.isAttacking = true;
                        this._playAnim(`${this.textureKey}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active || this.isDead) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 95 && this.checkCombatYRange()) {
                                this.player.takeDamage(20 * (this.damageMultiplier || 1.0));
                            }
                        });
                    } else {
                        // Summon minions at range on a 4 second cooldown
                        const now = this.scene.time.now;
                        if (!this.lastSummonTime || now - this.lastSummonTime > 4000) {
                            this.lastSummonTime = now;
                            this.isAttacking = true;
                            this._playAnim(`${this.textureKey}-attack`);
                            this.spawnDwarfAlly();
                        } else {
                            // Walk towards player
                            const moveDir = isPlayerLeft ? -1 : 1;
                            this.sprite.setVelocityX(moveDir * this.speed);
                            this._playAnim(`${this.textureKey}-walk`);
                        }
                    }
                    break;
                }

                if (this.type === 'dragon') {
                    if (distanceX <= 170) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        
                        const useMagic = Math.random() < 0.5;
                        if (useMagic) {
                            this._playAnim(`${this.textureKey}-attack2`);
                            this.spawnDragonFirebreath();
                        } else {
                            this._playAnim(`${this.textureKey}-attack`);
                            this.scene.time.delayedCall(300, () => {
                                if (!this.sprite || !this.sprite.active || this.isDead) return;
                                if (Math.abs(this.player.sprite.x - this.sprite.x) <= 175 && this.checkCombatYRange(80)) {
                                    this.player.takeDamage(25 * (this.damageMultiplier || 1.0));
                                }
                            });
                        }
                        break;
                    }
                }

                if (this.type === 'lich_lord') {
                    if (distanceX <= 80) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.textureKey}-attack`);
                        // AOE damage
                        this.scene.time.delayedCall(400, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 100 && this.checkCombatYRange()) {
                                this.player.takeDamage(15 * (this.damageMultiplier || 1.0));
                            }
                        });
                        break;
                    } else if (distanceX > 150 && Math.random() < 0.015) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        if (Math.random() < 0.5) {
                            this._playAnim(`${this.textureKey}-shoot`);
                            this.spawnSkull();
                        } else {
                            this._playAnim(`${this.textureKey}-summon`);
                            this.spawnSkeleton();
                        }
                        break;
                    }
                }

                if (this.type === 'the_devil') {
                    if (distanceX <= 70) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.textureKey}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 90 && this.checkCombatYRange()) {
                                this.player.takeDamage(20 * (this.damageMultiplier || 1.0));
                            }
                        });
                        break;
                    } else if (distanceX > 100 && distanceX < 400 && Math.random() < 0.02) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.textureKey}-attack2`);
                        this.spawnFireball();
                        break;
                    }
                }

                if (this.type === 'bloated_damned') {
                    if (distanceX <= 80 && this.checkCombatYRange()) {
                        this.explodeBloated(false);
                        break;
                    }
                }

                if (this.type === 'old_demon') {
                    // Check if heal spell is off cooldown and we want to cast it
                    const now = this.scene.time.now || Date.now();
                    if (!this.lastHealTime) this.lastHealTime = 0;
                    if (now - this.lastHealTime > 5000) {
                        // Check if there are damaged allies nearby
                        const healRange = 300;
                        const hasDamagedAlly = this.scene.enemies.getChildren().some(enemy => {
                            if (!enemy || !enemy.active || !enemy.controller || enemy.controller.isDead || enemy === this.sprite) return false;
                            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, enemy.x, enemy.y);
                            return dist <= healRange && enemy.controller.hp < enemy.controller.maxHp;
                        });
                        if (hasDamagedAlly) {
                            this.lastHealTime = now;
                            this.isAttacking = true;
                            this.sprite.setVelocityX(0);
                            this.castOldDemonHeal();
                            this.scene.time.delayedCall(1200, () => {
                                if (this.sprite && this.sprite.active) this.isAttacking = false;
                            });
                            break;
                    }
                }

                // Ranged attack if player is within range (say 350)
                    if (distanceX <= 350 && Math.random() < 0.03) {
                        this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        
                        this.sprite.setTint(0xaa88ff);
                        this.scene.time.delayedCall(500, () => {
                            if (this.sprite && this.sprite.active) {
                                this.sprite.clearTint();
                                if (this.scene.zoneBiome === 'Heaven') {
                                    this.sprite.setTint(0xfff5cc);
                                }
                            }
                        });
                        this.spawnOldDemonMagic();
                        this.scene.time.delayedCall(1000, () => {
                            if (this.sprite && this.sprite.active) this.isAttacking = false;
                        });
                        break;
                    }

                    // If not attacking/healing, handle movement
                    if (distanceX > 250) {
                        this.sprite.setVelocityX(isPlayerLeft ? -this.speed : this.speed);
                        this.sprite.setFlipX(shouldFlip);
                        this._playAnim(`${this.textureKey}-move`);
                    } else {
                        this.sprite.setVelocityX(0);
                        this._playAnim(`${this.textureKey}-idle`);
                    }
                    // Platform jumping for Old Demon
                    if (enemyOnGround) {
                        if (this.player.sprite.y < this.sprite.y - 50) {
                            this.sprite.setVelocityY(-600);
                        } else if (this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.body.touching.left || this.sprite.body.touching.right) {
                            this.sprite.setVelocityY(-600);
                        }
                    }
                    break;
                }

                // --- Dark Elf Queen AI (Melee Blade Combo, Step Back, and Summon Minions) ---
                if (this.type === 'dark_elf_queen' || this.type === 'dark_elf_queen_rival') {
                    const now = this.scene.time.now;
                    
                    // 1. Summon Minions (Medium/Long Range on Cooldown)
                    if (distanceX > 150 && (!this.lastSummonTime || now - this.lastSummonTime > 6000) && Math.random() < 0.04) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this.lastSummonTime = now;
                        this._playAnim(`${this.textureKey}-summon`);
                        this.spawnDarkElfMinion();
                        this.scene.time.delayedCall(1000, () => {
                            if (this.sprite && this.sprite.active) this.isAttacking = false;
                        });
                        break;
                    }

                    // 2. Melee Blade Combo (Close Range)
                    if (distanceX <= 80) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;

                        const combo = Math.random();
                        let animSuffix = 'attack';
                        let damage = 20;
                        let delay = 300;
                        if (combo < 0.33) {
                            animSuffix = 'attack'; // Blade 1
                            damage = 22;
                        } else if (combo < 0.66) {
                            animSuffix = 'attack2'; // Blade 2
                            damage = 28;
                        } else {
                            animSuffix = 'attack3'; // Blade 3
                            damage = 36;
                        }

                        this._playAnim(`${this.textureKey}-${animSuffix}`);
                        this.scene.time.delayedCall(delay, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 100 && this.checkCombatYRange()) {
                                this.player.takeDamage(damage * (this.damageMultiplier || 1.0));
                            }
                        });

                        this.scene.time.delayedCall(800, () => {
                            if (this.sprite && this.sprite.active) this.isAttacking = false;
                        });
                        break;
                    }

                    // 3. Step Back Evade (Too Close)
                    if (distanceX < 110 && Math.random() < 0.08 && (!this.lastDashTime || now - this.lastDashTime > 3000)) {
                        this.lastDashTime = now;
                        this.isAttacking = true;
                        this.sprite.setFlipX(shouldFlip);
                        
                        // Dash backwards natively
                        const dashDir = isPlayerLeft ? 1 : -1;
                        this.sprite.setVelocityX(dashDir * 380);
                        this._playAnim(`${this.textureKey}-dash`);
                        
                        this.scene.time.delayedCall(500, () => {
                            if (this.sprite && this.sprite.active) {
                                this.isAttacking = false;
                                this.sprite.setVelocityX(0);
                            }
                        });
                        break;
                    }
                }

                // --- Ranged Dark Elf Archer / Spellblade AI ---
                if (['dark_elf_longbowman', 'dark_elf_longbowman_rival', 'dark_elf_spellblade', 'dark_elf_spellblade_rival'].includes(this.type)) {
                    if (distanceX > 100 && distanceX <= 400 && Math.random() < 0.035) {
                        this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        
                        this._playAnim(`${this.textureKey}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (this.sprite && this.sprite.active) {
                                if (this.type.includes('longbowman')) {
                                    this.shootDarkElfArrow(shouldFlip);
                                } else {
                                    this.shootDarkElfSpell(shouldFlip);
                                }
                            }
                        });
                        this.scene.time.delayedCall(800, () => {
                            if (this.sprite && this.sprite.active) this.isAttacking = false;
                        });
                        break;
                    }
                    
                    if (distanceX < 120) {
                        this.sprite.setVelocityX(isPlayerLeft ? this.speed : -this.speed);
                        this.sprite.setFlipX(shouldFlip);
                        this._playAnim(`${this.textureKey}-move`);
                        break;
                    }
                }

                if (distanceX <= 65) {
                    if (!this.isFlying) this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip);
                    this.isAttacking = true;
                    
                    if (this.type === 'slime') {
                        // Physical jump attack for slime
                        this.sprite.setVelocityX(isPlayerLeft ? -200 : 200);
                        this.sprite.setVelocityY(-250);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange()) {
                                this.player.takeDamage(3 * (this.damageMultiplier || 1.0));
                                if (this.player.applyStatusEffect && Math.random() < 0.30) {
                                    this.player.applyStatusEffect('poison', 5000, 5); // 5 damage/sec for 5s
                                }
                            }
                        });
                        this.scene.time.delayedCall(600, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            this.sprite.setVelocityX(isPlayerLeft ? 150 : -150);
                            this.sprite.setVelocityY(-150);
                        });
                        this.scene.time.delayedCall(1000, () => {
                            if (this.sprite && this.sprite.active) this.isAttacking = false;
                        });
                    } else if (this.type === 'wolfen' || this.type === 'coyle') {
                        // Wolfen/Coyle special bite/claw/sword attack
                        const useBite = Math.random() < 0.5;
                        const animKey = `${this.textureKey}-${useBite ? 'attack2' : 'attack'}`;
                        this._playAnim(animKey);
                        
                        this.sprite.off('animationcomplete-' + animKey);
                        this.sprite.once('animationcomplete-' + animKey, () => {
                            if (this.sprite && this.sprite.active) {
                                this.isAttacking = false;
                                this._playAnim(`${this.textureKey}-idle`);
                            }
                        });

                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active || this.isDead) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange()) {
                                this.player.takeDamage((useBite ? 10 : 7) * (this.damageMultiplier || 1.0));
                            }
                        });
                    } else if (this.isZombie) {
                        // Zombie: random between regular attack and bite attack
                        // Crawling zombies always use crawl-attack
                        if (this.zombieCrawling) {
                            this._playAnim(`${this.textureKey}-crawl-attack`);
                            this.scene.time.delayedCall(400, () => {
                                if (!this.sprite || !this.sprite.active) return;
                                if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange(80)) {
                                    this.player.takeDamage(8 * (this.damageMultiplier || 1.0));
                                }
                            });
                        } else {
                            // 40% chance bite (stronger), 60% regular attack
                            const useBite = Math.random() < 0.4;
                            this._playAnim(`${this.textureKey}-${useBite ? 'attack2' : 'attack'}`);
                            this.scene.time.delayedCall(350, () => {
                                if (!this.sprite || !this.sprite.active) return;
                                if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange()) {
                                    this.player.takeDamage((useBite ? 8 : 5) * (this.damageMultiplier || 1.0));
                                }
                            });
                        }
                    } else {
                        // Standard animation attack
                        const attackAnim = `${this.textureKey}-attack`;
                        if (this.scene.anims.exists(attackAnim)) {
                            this._playAnim(attackAnim);
                        } else {
                            const attackDuration = ['bat', 'plague_flies'].includes(this.type) ? 1000 : 350;
                            this.scene.time.delayedCall(attackDuration, () => {
                                if (this.sprite && this.sprite.active) this.isAttacking = false;
                            });
                        }
                        const damageDelay = ['bat', 'plague_flies'].includes(this.type) ? 500 : 300;
                        this.scene.time.delayedCall(damageDelay, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange()) {
                                let dmg = 5;
                                if (this.type === 'heavenly_archangel') dmg = 15;
                                else if (this.type === 'heavenly_valkyrie') dmg = 12;
                                else if (this.type === 'heavenly_seraph') dmg = 10;
                                else if (this.type === 'heavenly_cherub') dmg = 4;
                                else if (this.type === 'giant') dmg = 22;
                                else if (this.type === 'ogre') dmg = 18;
                                else if (this.type === 'troll') dmg = 14;
                                else if (this.type === 'willowisp') dmg = 8;
                                else if (this.type === 'male_damned') dmg = 8;
                                else if (this.type === 'female_damned') dmg = 8;
                                else if (this.type === 'twisted_damned') dmg = 10;
                                else if (this.type === 'burning_damned') dmg = 8;
                                else if (this.type === 'hellhound_1') dmg = 8;
                                else if (this.type === 'hellhound_2') dmg = 14;
                                else if (this.type === 'hellhound_3') dmg = 22;
                                this.player.takeDamage(dmg * (this.damageMultiplier || 1.0));
                                if (this.player.applyStatusEffect) {
                                    if (this.type === 'frost_giant' && Math.random() < 0.40) {
                                        this.player.applyStatusEffect('freeze', 3000, 50); // 50% slow for 3s
                                    }
                                }
                            }
                        });
                    }
                    break;
                }

                if (distanceX > 5) {
                    this.sprite.setVelocityX(isPlayerLeft ? -this.speed : this.speed);
                    this.sprite.setFlipX(shouldFlip);
                    this._playAnim(`${this.textureKey}-move`);
                } else {
                    this.sprite.setVelocityX(0);
                    this._playAnim(`${this.textureKey}-idle`);
                }
                // Improve platforming AI: jump if player is significantly higher and touching ground, or if horizontally blocked
                if (enemyOnGround) {
                    if (this.player.sprite.y < this.sprite.y - 50) {
                        this.sprite.setVelocityY(-600);
                    } else if (this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.body.touching.left || this.sprite.body.touching.right) {
                        this.sprite.setVelocityY(-600);
                    } else if (Math.random() < 0.003) {
                        this.sprite.setVelocityY(-550);
                    }
                }
                break;
            case "FLEE":
                const inCorner = this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.x <= 40 || this.sprite.x >= (this.scene.physics.world.bounds.width - 40);
                
                if (inCorner) {
                    this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip); // Face the player when cornered
                    
                    if (distanceX <= 60) {
                        // Close corner -> Fight back!
                        this.isAttacking = true;
                        const attackAnim = `${this.textureKey}-attack`;
                        if (this.scene.anims.exists(attackAnim)) {
                            this._playAnim(attackAnim);
                        } else {
                            this.scene.time.delayedCall(350, () => {
                                if (this.sprite && this.sprite.active) this.isAttacking = false;
                            });
                        }
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 70 && this.checkCombatYRange()) {
                                let dmg = this.type === 'lich_lord' ? 15 : 5;
                                if (this.type === 'heavenly_archangel') dmg = 15;
                                else if (this.type === 'heavenly_valkyrie') dmg = 12;
                                else if (this.type === 'heavenly_seraph') dmg = 10;
                                else if (this.type === 'heavenly_cherub') dmg = 4;
                                else if (this.type === 'giant') dmg = 22;
                                else if (this.type === 'ogre') dmg = 18;
                                else if (this.type === 'troll') dmg = 14;
                                else if (this.type === 'willowisp') dmg = 8;
                                this.player.takeDamage(dmg * (this.damageMultiplier || 1.0));
                            }
                        });
                    } else if (this.type === 'lich_lord' && Math.random() < 0.05) {
                        // Far corner + Ranged -> Shoot!
                        this.isAttacking = true;
                        const shootAnim = `${this.textureKey}-shoot`;
                        if (this.scene.anims.exists(shootAnim)) {
                            this._playAnim(shootAnim);
                        } else {
                            this.scene.time.delayedCall(350, () => {
                                if (this.sprite && this.sprite.active) this.isAttacking = false;
                            });
                        }
                        this.spawnSkull();
                    } else {
                        // Just wait menacingly
                        this._playAnim(`${this.textureKey}-idle`);
                    }
                    
                    // Allow cornered enemies to jump if they are stuck in a pit
                    const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                    if (enemyOnGround && this.player.sprite.y < this.sprite.y - 50) {
                        this.sprite.setVelocityY(-600);
                    }
                } else {
                    this.sprite.setVelocityX(isPlayerLeft ? this.speed : -this.speed);
                    this.sprite.setFlipX(!shouldFlip); // Fleeing means face away
                    this._playAnim(`${this.textureKey}-move`);
                    
                    // Allow fleeing enemies to jump over small obstacles
                    const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                    if (enemyOnGround && (this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.body.touching.left || this.sprite.body.touching.right)) {
                        this.sprite.setVelocityY(-600);
                    }
                }
                break;
            case 'WANDER': {
                const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                this._wanderTimer = (this._wanderTimer || 0) + (1000 / 60); // approximate delta

                if (this._wanderPausing) {
                    // Pause in place for a moment
                    this.sprite.setVelocityX(0);
                    this._playAnim(`${this.textureKey}-idle`);
                    this.sprite.setFlipX(shouldFlip);
                    this._wanderPauseTimer = (this._wanderPauseTimer || 0) + (1000 / 60);
                    if (this._wanderPauseTimer >= Phaser.Math.Between(800, 2000)) {
                        this._wanderPausing = false;
                        this._wanderPauseTimer = 0;
                        this._wanderTarget = null; // Pick a new target next frame
                    }
                } else {
                    // Pick a wander target if we don't have one
                    if (!this._wanderTarget) {
                        const worldW = this.scene.physics.world.bounds.width;
                        const offset = (Math.random() - 0.5) * 500;
                        this._wanderTarget = Phaser.Math.Clamp(this.sprite.x + offset, 100, worldW - 100);
                    }

                    const dx = this._wanderTarget - this.sprite.x;
                    if (Math.abs(dx) > 20) {
                        const wanderSpeed = this.speed * 0.45;
                        this.sprite.setVelocityX(dx > 0 ? wanderSpeed : -wanderSpeed);
                        this.sprite.setFlipX(dx < 0 ? !this.facesLeftByDefault : this.facesLeftByDefault);
                        this._playAnim(`${this.textureKey}-move`);
                        // Jump over small obstacles
                        if (onGround && (this.sprite.body.blocked.left || this.sprite.body.blocked.right)) {
                            this.sprite.setVelocityY(-500);
                        }
                    } else {
                        // Reached target, pause
                        this._wanderTarget = null;
                        this._wanderPausing = true;
                        this._wanderPauseTimer = 0;
                    }
                }
                break;
            }
            case "IDLE":
            default:
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(shouldFlip);
                this._playAnim(`${this.textureKey}-idle`);
                break;
        }
    }
};
