// EnemyController.js - AI powered enemy class

class EnemyController {
    constructor(scene, x, y, player, geminiService, type = 'slime', isBoss = false, isSummoned = false) {
        this.scene = scene;
        this.player = player;
        this.geminiService = geminiService;
        this.type = type;
        this.isBoss = isBoss;
        this.isSummoned = isSummoned;

        // Zombie variants all share the same logic — track the base type
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
        } else if (this.type === 'willowisp') {
            this.sprite.setScale(1.5 * this.scaleMultiplier);
            this.sprite.setSize(24, 24);
            this.sprite.setOffset(4, 4);
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
        const bossTypes = ['lich_lord', 'the_devil', 'spider', 'frost_giant', 'skeleton', 'bandit'];
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
        if (this.type === 'lich_lord') {
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
    }

    _playAnim(animKey) {
        // Zombie crawling phase: remap idle/move to crawl variants
        if (this.zombieCrawling) {
            if (animKey === `${this.textureKey}-idle`) animKey = `${this.textureKey}-crawl-idle`;
            else if (animKey === `${this.textureKey}-move`) animKey = `${this.textureKey}-crawl-move`;
            // hit anim doesn't exist for crawling — use crawl-attack as the counter
            else if (animKey === `${this.textureKey}-hit`) animKey = `${this.textureKey}-crawl-attack`;
        }

        // Flying remapping when airborne (dragon and the_devil)
        if (this.type === 'dragon' || this.type === 'the_devil') {
            const body = this.sprite.body;
            if (body && !body.touching.down && !body.blocked.down) {
                if (animKey === `${this.textureKey}-idle` || animKey === `${this.textureKey}-move`) {
                    animKey = `${this.textureKey}-fly`;
                }
            }
        }

        // Only call play if we are switching animations to prevent blinking!
        if (this.currentAnimKey !== animKey) {
            if (!this.scene.anims.exists(animKey)) {
                console.warn(`Animation "${animKey}" does not exist for textureKey "${this.textureKey}", skipping.`);
                return;
            }
            try {
                this.sprite.play(animKey);
                this.currentAnimKey = animKey;
            } catch (e) {
                console.error(`Failed to play "${animKey}" for "${this.textureKey}":`, e.message);
            }
        }
    }

    checkCombatYRange(customThreshold) {
        if (!this.player || !this.player.sprite) return false;
        const playerY = this.player.sprite.body ? this.player.sprite.body.bottom : this.player.sprite.y;
        const enemyY = this.sprite.body ? this.sprite.body.bottom : this.sprite.y;
        const defaultThreshold = this.player.sprite.body && this.sprite.body ? 65 : 45;
        const threshold = customThreshold !== undefined ? customThreshold : defaultThreshold;
        return Math.abs(playerY - enemyY) < threshold;
    }

    _anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx) {
        const body = this.sprite.body;
        if (!body) return;
        
        const scale = this.sprite.scaleY || (1.5 * (this.scaleMultiplier || 1.0));
        const bodyW = body.width / (this.sprite.scaleX || 1);
        const bodyH = body.height / (this.sprite.scaleY || 1);
        const fw = newFrame.width;
        const fh = newFrame.height;
        
        // Get old footY
        let oldFootY = oldH;
        const fd = window.npcFootData && window.npcFootData[this.textureKey];
        if (fd) {
            if (!isNaN(oldIdx) && fd[oldIdx] != null) oldFootY = fd[oldIdx] + 1;
        }
        const oldOffset = oldFootY - bodyH;
        
        // Get new footY
        let newFootY = fh;
        if (fd) {
            if (!isNaN(newIdx) && fd[newIdx] != null) newFootY = fd[newIdx] + 1;
        }
        const newOffset = newFootY - bodyH;
        
        // Adjust sprite Y immediately to prevent body.position.y from jumping in preUpdate
        this.sprite.y += scale * (0.5 * (fh - oldH) - (newOffset - oldOffset));
        
        // Update body offset only if it has changed
        if (body.offset.x !== (fw / 2 - bodyW / 2) || body.offset.y !== newOffset) {
            body.setOffset(fw / 2 - bodyW / 2, newOffset);
        }
    }

    handleWispTactic(distanceX, isPlayerLeft, shouldFlip) {
        // Prevent physical movement velocity
        this.sprite.setVelocityX(0);
        this.sprite.setVelocityY(0);

        // Face the player/target
        this.sprite.setFlipX(shouldFlip);

        // Check if we can trigger attack
        const insideAttackRange = distanceX <= 75 && this.checkCombatYRange();
        if (insideAttackRange && (this.currentTactic === 'CHASE' || this.currentTactic === 'ATTACK' || this.currentTactic === 'MELEE_ATTACK')) {
            const now = this.scene.time.now;
            if (now - this.lastDamageTime > this.damageCooldown) {
                this.isAttacking = true;
                this._playAnim(`${this.textureKey}-attack`);
                this.scene.time.delayedCall(350, () => {
                    if (this.sprite && this.sprite.active) this.isAttacking = false;
                });
                this.scene.time.delayedCall(300, () => {
                    if (!this.sprite || !this.sprite.active || this.isDead) return;
                    if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && this.checkCombatYRange()) {
                        this.player.takeDamage(8 * (this.damageMultiplier || 1.0));
                    }
                });
                return;
            }
        }

        // If not attacking, handle teleport movement!
        const now = this.scene.time.now;
        if (!this.lastTeleportTime) this.lastTeleportTime = 0;
        if (!this.isTeleporting && now - this.lastTeleportTime > 2000) {
            let targetX = this.sprite.x;
            let targetY = this.sprite.y;
            let shouldTeleport = false;

            if (this.currentTactic === 'CHASE' || this.currentTactic === 'ATTACK' || this.currentTactic === 'MELEE_ATTACK') {
                if (distanceX > 75 || Math.abs(this.player.sprite.y - this.sprite.y) > 50) {
                    shouldTeleport = true;
                    const dir = this.player.sprite.x < this.sprite.x ? -1 : 1;
                    targetX = this.player.sprite.x - dir * 60;
                    targetY = this.player.sprite.y - 10 + (Math.random() - 0.5) * 30;
                }
            } else if (this.currentTactic === 'WANDER' && this._wanderTarget != null) {
                const dist = Math.abs(this._wanderTarget - this.sprite.x);
                if (dist > 50) {
                    shouldTeleport = true;
                    targetX = this._wanderTarget;
                    targetY = 480 + (Math.random() - 0.5) * 50; // hover height
                }
            } else if (this.currentTactic === 'FLEE') {
                shouldTeleport = true;
                const dir = this.player.sprite.x < this.sprite.x ? 1 : -1;
                targetX = this.sprite.x + dir * 250;
                targetY = this.player.sprite.y - 50 + (Math.random() - 0.5) * 30;
            }

            if (shouldTeleport) {
                this.isTeleporting = true;
                this.lastTeleportTime = now;

                // Teleport Out Tween
                this.scene.tweens.add({
                    targets: this.sprite,
                    alpha: 0,
                    scale: 0,
                    duration: 200,
                    onComplete: () => {
                        if (!this.sprite || !this.sprite.active) return;
                        const worldW = this.scene.physics.world.bounds.width;
                        const worldH = this.scene.physics.world.bounds.height;
                        this.sprite.x = Phaser.Math.Clamp(targetX, 50, worldW - 50);
                        this.sprite.y = Phaser.Math.Clamp(targetY, 150, worldH - 150);

                        // Flash effect
                        const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 15, 0x00ffff, 0.8);
                        this.scene.tweens.add({
                            targets: flash,
                            scale: 2,
                            alpha: 0,
                            duration: 150,
                            onComplete: () => flash.destroy()
                        });

                        // Teleport In Tween
                        this.scene.tweens.add({
                            targets: this.sprite,
                            alpha: 1,
                            scale: 1.5 * (this.scaleMultiplier || 1.0),
                            duration: 200,
                            onComplete: () => {
                                this.isTeleporting = false;
                            }
                        });
                    }
                });
            }
        }

        // Play wisp idle/hover animation
        this._playAnim(`${this.textureKey}-idle`);
    }

    update(time, delta) {
        if (!this.sprite || !this.sprite.active) return;

        // Physics garbage collection: cull if y > 1000
        if (this.sprite.y > 1000) {
            if (this.hpText && this.hpText.active) this.hpText.destroy();
            if (this.aiText && this.aiText.active) this.aiText.destroy();
            this.sprite.destroy();
            return;
        }

        if (!this.player || !this.player.sprite) return;
        if (this.isDead) return;
        if (this.hp <= 0) {
            this.die();
            return;
        }
        
        // Apply status effects
        this.updateStatusEffects(delta);

        // Update flight state machine for land-and-walk bosses (dragon, the_devil)
        if (this.baseIsFlying && ['dragon', 'the_devil'].includes(this.type) && !this.isDead && !this.isDummy) {
            if (!this.flightState) {
                this.flightState = 'flying';
                this.flightTimer = 0;
            }
            this.flightTimer += delta;

            if (this.flightState === 'flying') {
                if (this.flightTimer >= 12000) { // Fly for 12 seconds
                    this.flightState = 'landing';
                    this.flightTimer = 0;
                    this.isFlying = false;
                    if (this.sprite.body) {
                        this.sprite.body.setAllowGravity(true);
                    }
                }
            } else if (this.flightState === 'landing') {
                const body = this.sprite.body;
                if (body && (body.touching.down || body.blocked.down)) {
                    this.flightState = 'grounded';
                    this.flightTimer = 0;
                    this.sprite.setVelocityY(0);
                } else if (this.flightTimer >= 5000) {
                    this.flightState = 'grounded';
                    this.flightTimer = 0;
                }
            } else if (this.flightState === 'grounded') {
                if (this.flightTimer >= 6000) { // Stay on ground for 6 seconds
                    this.flightState = 'flying';
                    this.flightTimer = 0;
                    this.isFlying = true;
                    if (this.sprite.body) {
                        this.sprite.body.setAllowGravity(false);
                    }
                    this.sprite.setVelocityY(-200); // upward thrust to start fly
                }
            }
        }
        
        const isStunned = this.statusEffects.some(e => e.type === 'stun');
        if (isStunned) {
            this.sprite.setVelocityX(0);
            return;
        }

        let speedMultiplier = 1.0;
        const freezeEffect = this.statusEffects.find(e => e.type === 'freeze');
        if (freezeEffect) speedMultiplier = 1.0 - (freezeEffect.strength / 100);

        if (this.baseSpeed === undefined) {
            this.baseSpeed = this.speed || 100;
        }
        this.speed = this.baseSpeed * speedMultiplier;

        if (this.scene.isCutscene) {
            this.sprite.setVelocityX(0);
            if (this._playAnim) this._playAnim(this.type + '-idle');
            return;
        }

        // UI removed

        // Handle flying movement vertically (runs every frame to keep hover active and handle dive bomb attacks)
        if (this.isFlying && this.type !== 'willowisp' && !this.isDead && !this.isDummy && this.player && this.player.sprite) {
            let targetY = this.player.sprite.y - 130;
            
            // If performing a melee attack, dive down to strike the player
            let isMeleeAttack = false;
            if (this.isAttacking) {
                if (['bat', 'plague_flies'].includes(this.type)) {
                    isMeleeAttack = true;
                } else if (this.currentAnimKey && this.currentAnimKey.endsWith('-attack')) {
                    isMeleeAttack = true;
                }
            }
            
            if (isMeleeAttack) {
                targetY = this.player.sprite.y;
            } else {
                // Add vertical bobbing floating effect
                targetY += Math.sin(time / 400) * 15;
            }
            
            const yDiff = targetY - this.sprite.y;
            this.sprite.setVelocityY(Phaser.Math.Clamp(yDiff * 3, -250, 250));
        }

        // If currently taking damage or attacking, don't execute AI logic
        if (this.isDead || this.isHit || this.isAttacking) return;

        // Dummy enemies just stand there and take damage
        if (this.isDummy) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Aggro radius check: switch between WANDER and CHASE based on player proximity
        if (!this.isDummy) {
            let canAggro = true;
            if (this.scene.zoneBiome === 'Heaven' && !this.provoked) {
                canAggro = false;
            }

            if (canAggro) {
                const distToPlayer = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y,
                    this.player.sprite.x, this.player.sprite.y
                );
                if (!this.isAggrod && distToPlayer <= this.aggroRadius) {
                    this.isAggrod = true;
                    this.currentTactic = 'CHASE';
                } else if (this.isAggrod && distToPlayer > this.aggroRadius * 1.6) {
                    // Hysteresis: de-aggro only when player gets well out of range
                    this.isAggrod = false;
                    this.currentTactic = 'WANDER';
                }
            } else {
                this.isAggrod = false;
                this.currentTactic = 'WANDER';
            }
        }

        // Execute current tactic
        this.executeTactic();

        // Ask Gemini for new tactic periodically
        if (this.scene.zoneBiome === 'Heaven' && !this.provoked) {
            // Keep passive in Heaven unless provoked (no Gemini active tactics)
        } else {
            if (time - this.lastTacticTime > this.tacticInterval && !this._isFetchingTactic) {
                this.lastTacticTime = time;
                this._isFetchingTactic = true;
                this.askGeminiForTactic().finally(() => { this._isFetchingTactic = false; });
            }
        }
    }

    async askGeminiForTactic() {
        if (!this.geminiService || !this.geminiService.isReady) return;
        
        // Guard against being destroyed while waiting for the interval
        if (!this.sprite || !this.sprite.active) return;

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.sprite.x, this.player.sprite.y);
        const battleState = {
            distance: distance,
            playerHp: 100,
            enemyHp: this.hp
        };

        const response = await this.geminiService.getEnemyTactic(battleState);
        if (!this.scene || this.scene.isSceneDestroyed) return;
        if (!this.sprite || !this.sprite.active) return;
        this.currentTactic = response.tactic;
        if (this.aiText && this.aiText.active) this.aiText.setText(`${this.type}\n${this.currentTactic}`);
    }

    executeTactic() {
        if (!this.player || !this.player.sprite) return;

        const isPlayerLeft = this.player.sprite.x < this.sprite.x;
        const distanceX = Math.abs(this.player.sprite.x - this.sprite.x);
        
        // GandalfHardcore sprites vary in default facing direction.
        // Goblin faces left. Slime faces right. Assume others face left.
        const facesLeftByDefault = ['goblin', 'bat', 'mushroom', 'orc', 'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned', 'female_damned', 'tree_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'mummy', 'zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3', 'dragon', 'willowisp', 'bloated_damned'].includes(this.type) || this.type.startsWith('special_enemy_');
        
        let shouldFlip = this.sprite.flipX; // default to current flip to prevent jitter
        if (distanceX > 5) {
            if (facesLeftByDefault) {
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
                        this.sprite.setFlipX(dx < 0 ? !facesLeftByDefault : facesLeftByDefault);
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

    takeDamage(amount, knockbackDirection) {
        if (this.isDead) return;

        // Cooldown prevents overlap() from firing 60x/sec
        const now = this.scene.time.now;
        if (now - this.lastDamageTime < this.damageCooldown) return;
        this.lastDamageTime = now;

        if (this.scene.zoneBiome === 'Heaven') {
            this.provoked = true;
        }

        this.hp -= amount;

        if (this.type !== 'training_dummy') {
            this.sprite.setVelocityY(-200);
            this.sprite.setVelocityX(200 * knockbackDirection);
        }

        this.isHit = true;
        this.isAttacking = false; // Fix: reset attacking state so interrupted attacks don't permanently break the AI
        this.currentAnimKey = null;

        // Zombie auto-counter: row 4 is BOTH hit + quick attack
        // When a zombie takes damage, it plays the hit/counter anim and
        // deals damage back to the player if they're in range.
        if (this.isZombie && !this.zombieCrawling && this.hp > 0) {
            const hitKey = `${this.textureKey}-hit`;
            this._playAnim(hitKey);
            this.sprite.off('animationcomplete-' + hitKey);
            this.sprite.once('animationcomplete-' + hitKey, () => {
                if (this.sprite && this.sprite.active) this.isHit = false;
            });
            // Auto-counter: deal damage back partway through the animation
            this.scene.time.delayedCall(250, () => {
                if (!this.sprite || !this.sprite.active || this.isDead) return;
                if (this.player && this.player.sprite) {
                    if (Math.abs(this.player.sprite.x - this.sprite.x) <= 80 && this.checkCombatYRange()) {
                        this.player.takeDamage(4 * (this.damageMultiplier || 1.0));
                    }
                }
            });
        } else {
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
        }

        this.sprite.setTint(0xff4444);
        this.scene.time.delayedCall(200, () => {
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });

        if (typeof this.scene.showFloatingText === 'function') {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 20, amount, 0xff0000);
        }

        if (this.type === 'training_dummy') console.log(`[DEBUG] Training Dummy hit! Took ${amount} damage. Current HP: ${this.hp}`);

        if (this.hp <= 0) {
            if (this.type === 'training_dummy') {
                console.log(`[DEBUG] Training Dummy HP hit 0. Resetting to ${this.maxHp} to prevent death!`);
                this.hp = this.maxHp || 999999;
            } else {
                this.die();
            }
        }
    }

    applyStatusEffect(type, durationMs, strength) {
        if (this.hp <= 0) return;
        
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
            if (!effect) continue;
            effect.duration -= delta;
            
            if (!this.isHit) {
                if (effect.type === 'stun') { this.sprite.setTint(0xffff00); hasTint = true; }
                else if (effect.type === 'freeze' && !hasTint) { this.sprite.setTint(0x88ccff); hasTint = true; }
                else if (effect.type === 'burn' && !hasTint) { this.sprite.setTint(0xff6600); hasTint = true; }
                else if (effect.type === 'poison' && !hasTint) { this.sprite.setTint(0x00ff00); hasTint = true; }
            }

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
                    if (this.hpText && this.hpText.active) {
                        this.hpText.setText(`HP: ${this.hp}`);
                    }

                    if (this.hp <= 0) {
                        if (this.type === 'training_dummy') {
                            this.hp = this.maxHp || 9999;
                        } else {
                            this.die();
                        }
                        return;
                    }
                }
            }

            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }
        
        if (this.statusEffects.length === 0 && !this.isHit) {
            this.sprite.clearTint();
        }
    }

    spawnSkull() {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        this.scene.time.delayedCall(300, () => {
            if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
            // Use burning_skull_blue for the tracking projectile
            const skull = this.scene.enemyProjectiles.create(this.sprite.x + (this.sprite.flipX ? -20 : 20), this.sprite.y - 20, 'burning_skull_blue');
            if (skull) {
                skull.setScale(1.5 * (this.scaleMultiplier || 1.0));
                skull.body.setSize(16, 16);
                skull.damage = 15 * (this.damageMultiplier || 1.0);
                const dx = this.player.sprite.x - skull.x;
                const dy = this.player.sprite.y - skull.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                skull.setVelocityX((dx / dist) * 250);
                skull.setVelocityY((dy / dist) * 250);
            }
        });
    }
    spawnFireball() {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        this.scene.time.delayedCall(400, () => {
            if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
            // Devil shoots a large red burning skull
            const fireball = this.scene.enemyProjectiles.create(this.sprite.x + (this.sprite.flipX ? -40 : 40), this.sprite.y - 10, 'burning_skull');
            if (fireball) {
                fireball.setScale(2 * (this.scaleMultiplier || 1.0));
                fireball.body.setSize(16, 16);
                fireball.damage = 20 * (this.damageMultiplier || 1.0);
                const dx = this.player.sprite.x - fireball.x;
                const dy = this.player.sprite.y - fireball.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                fireball.setVelocityX((dx / dist) * 350);
                fireball.setVelocityY((dy / dist) * 350);
                // Adjust rotation so it faces movement
                fireball.setRotation(Math.atan2(dy, dx));
            }
        });
    }

    spawnOldDemonMagic() {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        this.scene.time.delayedCall(300, () => {
            if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
            const proj = this.scene.enemyProjectiles.create(this.sprite.x + (this.sprite.flipX ? -20 : 20), this.sprite.y - 20, 'projectile_blue');
            if (proj) {
                proj.setScale(1.2 * (this.scaleMultiplier || 1.0));
                proj.body.setSize(20, 20);
                proj.damage = 12 * (this.damageMultiplier || 1.0);
                proj.play('projectile_blue_anim');
                const dx = this.player.sprite.x - proj.x;
                const dy = this.player.sprite.y - proj.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                proj.setVelocityX((dx / dist) * 280);
                proj.setVelocityY((dy / dist) * 280);
                proj.setRotation(Math.atan2(dy, dx));
            }
        });
    }

    castOldDemonHeal() {
        if (!this.sprite || !this.sprite.active || !this.scene || this.scene.isSceneDestroyed) return;
        
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 50, "HEAL!", 0x00ff00);
        }
        
        this.sprite.setTint(0x00ff00);
        this.scene.time.delayedCall(400, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.clearTint();
                if (this.scene.zoneBiome === 'Heaven') {
                    this.sprite.setTint(0xfff5cc);
                }
            }
        });

        const healRange = 300;
        const healAmount = 50;
        const enemies = this.scene.enemies.getChildren();
        
        enemies.forEach(enemy => {
            if (!enemy || !enemy.active || !enemy.controller || enemy.controller.isDead || enemy === this.sprite) return;
            
            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, enemy.x, enemy.y);
            if (dist <= healRange) {
                const controller = enemy.controller;
                if (controller.hp < controller.maxHp) {
                    const actualHeal = Math.min(healAmount, controller.maxHp - controller.hp);
                    controller.hp += actualHeal;
                    
                    if (this.scene.showFloatingText) {
                        this.scene.showFloatingText(enemy.x, enemy.y - 40, `+${actualHeal} HP`, 0x00ff00);
                    }
                    
                    enemy.setTint(0x88ff88);
                    this.scene.time.delayedCall(400, () => {
                        if (enemy && enemy.active) {
                            enemy.clearTint();
                            if (this.scene.zoneBiome === 'Heaven') {
                                enemy.setTint(0xfff5cc);
                            }
                        }
                    });
                }
            }
        });
    }

    spawnDragonFirebreath() {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        
        const intervals = [200, 380, 560];
        const spreads = [-0.15, 0, 0.15];
        
        intervals.forEach((delay, index) => {
            this.scene.time.delayedCall(delay, () => {
                if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite || this.isDead) return;
                
                const spawnX = this.sprite.x + (this.sprite.flipX ? -60 : 60);
                const spawnY = this.sprite.y - 10;
                
                const fireball = this.scene.enemyProjectiles.create(spawnX, spawnY, 'burning_skull');
                if (fireball) {
                    fireball.setScale(2.5 * (this.scaleMultiplier || 1.0));
                    fireball.body.setSize(20, 20);
                    fireball.damage = 25 * (this.damageMultiplier || 1.0);
                    
                    const dx = this.player.sprite.x - spawnX;
                    const dy = this.player.sprite.y - spawnY;
                    let angle = Math.atan2(dy, dx);
                    
                    angle += spreads[index];
                    
                    const speed = 350;
                    fireball.setVelocityX(Math.cos(angle) * speed);
                    fireball.setVelocityY(Math.sin(angle) * speed);
                    fireball.setRotation(angle);
                }
            });
        });
    }


    spawnSkeleton() {
        if (!this.sprite || !this.sprite.active) return;
        this.scene.time.delayedCall(600, () => {
            if (!this.sprite || !this.sprite.active) return;
            // Spawn further away so they aren't hidden behind the boss
            const xOffset = Math.random() < 0.5 ? -120 : 120;
            const skeletonScale = 0.8 * (this.scene.isIndoors ? (2.5 / 1.5) : 1.0);
            const spawnY = this.sprite.y + (30 * this.sprite.scaleY) - (32 * skeletonScale);
            const skeleton = new EnemyController(this.scene, this.sprite.x + xOffset, spawnY, this.player, this.geminiService, 'skeleton', false, true);
            if (this.scene.enemies) {
                this.scene.enemies.add(skeleton.sprite);
            }
        });
    }

    explodeBloated(instant = false) {
        if (this.hasExploded) return;

        if (instant) {
            this.hasExploded = true;
            
            // Show "BOOM!" floating text
            if (this.scene.showFloatingText) {
                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, "BOOM!", 0xff3300);
            }
            
            // Camera shake
            this.scene.cameras.main.shake(300, 0.01);
            
            // Check if player is in explosion radius (120 pixels)
            const playerDist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.sprite.x, this.player.sprite.y);
            if (playerDist <= 120) {
                this.player.takeDamage(50 * (this.damageMultiplier || 1.0));
                // Apply knockback
                const dx = this.player.sprite.x - this.sprite.x;
                const knockbackX = dx > 0 ? 300 : -300;
                this.player.sprite.setVelocityX(knockbackX);
                this.player.sprite.setVelocityY(-200);
            }
        } else {
            this.isAttacking = true;
            this.sprite.setVelocityX(0);
            
            // Rapid flashing effect (red and white) for 800ms
            let flashCount = 0;
            const flashTimer = this.scene.time.addEvent({
                delay: 100,
                callback: () => {
                    if (!this.sprite || !this.sprite.active || this.isDead) {
                        flashTimer.destroy();
                        return;
                    }
                    if (flashCount % 2 === 0) {
                        this.sprite.setTint(0xff0000);
                    } else {
                        this.sprite.setTint(0xffffff);
                    }
                    flashCount++;
                },
                repeat: 7
            });

            // Trigger explosion after 800ms
            this.scene.time.delayedCall(800, () => {
                if (!this.sprite || !this.sprite.active || this.isDead) return;
                
                this.hasExploded = true;
                
                if (this.scene.showFloatingText) {
                    this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, "BOOM!", 0xff3300);
                }
                
                this.scene.cameras.main.shake(300, 0.01);
                
                const playerDist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.sprite.x, this.player.sprite.y);
                if (playerDist <= 120) {
                    this.player.takeDamage(50 * (this.damageMultiplier || 1.0));
                    const dx = this.player.sprite.x - this.sprite.x;
                    const knockbackX = dx > 0 ? 300 : -300;
                    this.player.sprite.setVelocityX(knockbackX);
                    this.player.sprite.setVelocityY(-200);
                }
                
                this.hp = 0;
                this.die();
            });
        }
    }

    die() {
        if (this.type === 'training_dummy') console.log(`[DEBUG] CRITICAL: Training Dummy die() called! This should not happen! Y-coord: ${this.sprite.y}`);
        
        // Bloated Damned on-death instant explosion
        if (this.type === 'bloated_damned' && !this.hasExploded) {
            this.explodeBloated(true);
        }
        
        this.isHit = true;
        this.isDead = true;
        if (this.aiText) this.aiText.destroy();

        if (this.baseIsFlying && this.sprite && this.sprite.body) {
            this.sprite.body.setAllowGravity(true);
        }

        // We leave the sprite in the enemies group so it doesn't fall through the floor!
        // The player overlap already checks for !this.isDead, so it won't hurt the player.

        this.sprite.clearTint();
        this.sprite.setVelocityX(0);
        this.currentAnimKey = null;

        const onDeathComplete = () => {
            if (!this.scene || this.scene.isSceneDestroyed) return;
            // Cache position BEFORE destroying the sprite (BUG-04 fix)
            const deathX = (this.sprite && this.sprite.active) ? this.sprite.x : 600;
            if (this.sprite && this.sprite.active) this.sprite.destroy();
            if (this.hpText && this.hpText.active) this.hpText.destroy();

            // Wait to be fully dead to grant xp
            if (typeof this.scene.grantRewards === 'function') {
                // Scale rewards by enemy type (BUG-19 fix: was flat 50/10 for everything)
                const rewards = {
                    slime: [20, 5], bat: [20, 5], mushroom: [25, 8],
                    goblin: [35, 10], orc: [50, 15], bandit: [45, 12],
                    skeleton: [40, 10], mummy: [45, 12], scarab_beetle: [30, 8],
                    spider: [200, 50], the_devil: [500, 100], lich_lord: [750, 150],
                    frost_giant: [400, 80], training_dummy: [0, 0],
                    zombie: [60, 18], zombie_v1: [60, 18], zombie_v2: [60, 18], zombie_v3: [60, 18],
                    wolfen: [65, 20], coyle: [65, 20]
                };
                let rewardKey = this.type;
                if (rewardKey.startsWith('special_enemy_')) {
                    rewardKey = 'special_enemy';
                    rewards['special_enemy'] = [55, 16];
                }
                const [xp, gold] = rewards[rewardKey] || [50, 10];
                this.scene.grantRewards(xp, gold);
            }
            if (this.player && this.player.progressQuest) {
                // All zombie variants count as 'zombie' for quest progress
                this.player.progressQuest(this.isZombie ? 'zombie' : this.type);
            }
            
            // 15% chance to drop a loot chest
            if (Math.random() < 0.15 && this.scene && this.scene.spawnLootChest) {
                // Drop chest at cached enemy position, on the floor
                this.scene.spawnLootChest(deathX, 620);
            }

            // Check if Hell zone -666 is fully cleared!
            if (this.scene && this.scene.worldManager && this.scene.worldManager.currentZoneIndex === -666) {
                const aliveCount = this.scene.enemies.getChildren().filter(e => e && e.active && e !== this.sprite && e.controller && !e.controller.isDead).length;
                if (aliveCount === 0 && !this.scene.hellCleared) {
                    this.scene.hellCleared = true;
                    if (typeof this.scene.clearHellZone === 'function') {
                        this.scene.clearHellZone();
                    }
                }
            }
        };

        // Zombie two-phase death: first defeat → transform → crawl phase → final death
        if (this.isZombie && !this.zombieCrawling) {
            // PHASE 1: First defeat (row 5) — zombie falls down
            const dieKey = `${this.textureKey}-die`;
            this._playAnim(dieKey);
            this.sprite.off('animationcomplete-' + dieKey);
            this.sprite.once('animationcomplete-' + dieKey, () => {
                if (!this.sprite || !this.sprite.active || !this.scene || this.scene.isSceneDestroyed) return;
                
                // PHASE 2: Transform to crawler (row 6)
                const transformKey = `${this.textureKey}-transform`;
                this.currentAnimKey = null;
                this._playAnim(transformKey);
                this.sprite.off('animationcomplete-' + transformKey);
                this.sprite.once('animationcomplete-' + transformKey, () => {
                    if (!this.sprite || !this.sprite.active || !this.scene || this.scene.isSceneDestroyed) return;
                    
                    // Zombie is now a crawler! Revive with 40% of original HP
                    this.zombieCrawling = true;
                    this.isDead = false;
                    this.isHit = false;
                    this.isAttacking = false;
                    this.hp = Math.floor(this.maxHp * 0.4);
                    this.speed = Math.floor(this.speed * 0.6); // Crawlers are slower
                    this.currentAnimKey = null;
                    
                    // Shrink hitbox for crawling form
                    this.sprite.setSize(50, 30);
                    this.sprite.setOffset(15, 34); // Lower on the frame since crawling
                    
                    this._playAnim(`${this.textureKey}-crawl-idle`);
                    
                    if (typeof this.scene.showFloatingText === 'function') {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'Still alive!', 0xff6600);
                    }
                });
            });
            return; // Don't fall through to normal death
        }
 
        // Zombie crawling phase final death (row 8)
        if (this.isZombie && this.zombieCrawling) {
            const finalDieKey = `${this.textureKey}-final-die`;
            this._playAnim(finalDieKey);
            this.sprite.off('animationcomplete-' + finalDieKey);
            this.sprite.once('animationcomplete-' + finalDieKey, onDeathComplete);
            return;
        }
 
        // Standard death for non-zombie enemies
        const dieKey = `${this.textureKey}-die`;
        if (this.scene.anims.exists(dieKey)) {
            this._playAnim(dieKey);
            this.sprite.off('animationcomplete-' + dieKey);
            this.sprite.once('animationcomplete-' + dieKey, onDeathComplete);
        } else {
            this._playAnim(`${this.textureKey}-idle`);
            this.sprite.setTint(0x555555);
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0,
                duration: 500,
                onComplete: onDeathComplete
            });
        }
    }
}
