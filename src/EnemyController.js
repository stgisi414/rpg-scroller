// EnemyController.js - AI powered enemy class

class EnemyController {
    constructor(scene, x, y, player, geminiService, type = 'slime') {
        this.scene = scene;
        this.player = player;
        this.geminiService = geminiService;
        this.type = type;

        // Zombie variants all share the same logic — track the base type
        this.isZombie = ['zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3'].includes(this.type);
        this.zombieCrawling = false; // Phase 2: crawling after first death

        // Create the physics sprite
        this.sprite = this.scene.physics.add.sprite(x, y, this.type);
        if (this.type === 'the_devil') {
            this.sprite.setScale(1.3);
            this.sprite.setSize(50, 92);
            this.sprite.setOffset(26, 0);
        } else if (this.type === 'skeleton') {
            this.sprite.setScale(0.8);
            this.sprite.setSize(40, 90);
            this.sprite.setOffset(31, 38); // 90+38 = 128
        } else if (this.type === 'frost_giant') {
            this.sprite.setScale(1.0);
            this.sprite.setSize(40, 100);
            this.sprite.setOffset(31, 28);
        } else if (this.type === 'lich_lord') {
            this.sprite.setScale(1.0);
            this.sprite.setSize(40, 90);
            this.sprite.setOffset(31, 38); // 90+38 = 128
        } else if (this.type === 'bandit') {
            this.sprite.setScale(0.7);
            this.sprite.setSize(40, 100);
            this.sprite.setOffset(31, 28);
        } else if (this.type === 'spider') {
            this.sprite.setScale(1.5);
            this.sprite.setSize(40, 40);
            this.sprite.setOffset(44, 40);
        } else if (this.isZombie) {
            this.sprite.setScale(1.5);
            this.sprite.setSize(40, 55);
            this.sprite.setOffset(20, 9); // 80x64 frame, center the hitbox
        } else {
            this.sprite.setScale(this.type === 'goblin' ? 1.4 : 1.8);
        }
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setBounce(0);

        // Link the sprite to this controller for physics callbacks
        this.sprite.controller = this;

        // Track which animation is currently running so we NEVER call
        // play() more than once per transition. Calling play() every frame
        // (even with ignoreIfPlaying=true) causes Phaser to flash frame 0
        // on internal animation tick boundaries, producing the blink.
        this.currentAnimKey = null;
        this._playAnim(`${this.type}-idle`);

        // When the hit animation finishes, snap back to idle immediately
        this.sprite.on(`animationcomplete-${this.type}-hit`, () => {
            this.isHit = false;
            this._playAnim(`${this.type}-idle`);
        });

        this.sprite.on(`animationcomplete`, (anim) => {
            if (anim.key.includes('-attack') || anim.key.includes('-shoot') || anim.key.includes('-summon')) {
                this.isAttacking = false;
                this._playAnim(`${this.type}-idle`);
            }
        });

        // Tactic tracking
        this.currentTactic = "CHASE";
        this.lastTacticTime = 0;
        this._isFetchingTactic = false;
        this.tacticInterval = 4000; // Ask Gemini every 4s

        // Stats
        this.speed = 100;
        if (this.type === 'lich_lord') {
            this.maxHp = 2000;
        } else if (this.type === 'spider' || this.type === 'the_devil') {
            this.maxHp = this.type === 'the_devil' ? 1500 : 400; // other bosses
        } else if (this.type === 'training_dummy') {
            this.maxHp = 999999;
        } else {
            this.maxHp = 100;
        }
        this.hp = this.maxHp;
        if (this.type === 'training_dummy') console.log(`[DEBUG] EnemyController spawned training_dummy. HP set to: ${this.hp}/${this.maxHp}`);
        // State tracking
        this.isHit = false;
        this.isAttacking = false;
        this.statusEffects = []; // Array of active status effects
        this.damageCooldown = 500;
        this.lastDamageTime = 0;

        // Clean up text if sprite is destroyed by a zone transition
        this.sprite.on('destroy', () => {
            if (this.aiText && this.aiText.active) this.aiText.destroy();
            if (this.hpText && this.hpText.active) this.hpText.destroy();
        });
    }

    _playAnim(animKey) {
        // Zombie crawling phase: remap idle/move to crawl variants
        if (this.zombieCrawling) {
            if (animKey === `${this.type}-idle`) animKey = `${this.type}-crawl-idle`;
            else if (animKey === `${this.type}-move`) animKey = `${this.type}-crawl-move`;
            // hit anim doesn't exist for crawling — use crawl-attack as the counter
            else if (animKey === `${this.type}-hit`) animKey = `${this.type}-crawl-attack`;
        }

        // Only call play if we are switching animations to prevent blinking!
        if (this.currentAnimKey !== animKey) {
            if (!this.scene.anims.exists(animKey)) {
                console.warn(`Animation "${animKey}" does not exist for type "${this.type}", skipping.`);
                return;
            }
            try {
                this.sprite.play(animKey);
                this.currentAnimKey = animKey;
            } catch (e) {
                console.error(`Failed to play "${animKey}" for "${this.type}":`, e.message);
            }
        }
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
        if (this.hp <= 0) return;
        
        // Apply status effects
        this.updateStatusEffects(delta);
        
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

        // If currently taking damage or attacking, don't execute AI logic
        if (this.isDead || this.isHit || this.isAttacking) return;

        // Dummy enemies just stand there and take damage
        if (this.isDummy) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Execute current tactic
        this.executeTactic();

        // Ask Gemini for new tactic periodically
        if (time - this.lastTacticTime > this.tacticInterval && !this._isFetchingTactic) {
            this.lastTacticTime = time;
            this._isFetchingTactic = true;
            this.askGeminiForTactic().finally(() => { this._isFetchingTactic = false; });
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
        const facesLeftByDefault = ['goblin', 'bat', 'mushroom', 'orc', 'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned', 'female_damned', 'tree_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'mummy', 'zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3'].includes(this.type);
        
        let shouldFlip = this.sprite.flipX; // default to current flip to prevent jitter
        if (distanceX > 5) {
            if (facesLeftByDefault) {
                shouldFlip = !isPlayerLeft;
            } else {
                shouldFlip = isPlayerLeft;
            }
        }

        switch (this.currentTactic) {
            case "ATTACK":
            case "MELEE_ATTACK":
            case "RANGED_ATTACK":
            case "CHASE":
                const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                // Special Boss Attack Logic
                if (this.type === 'lich_lord') {
                    if (distanceX <= 80) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack`);
                        // AOE damage
                        this.scene.time.delayedCall(400, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 100 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                this.player.takeDamage(15);
                            }
                        });
                        break;
                    } else if (distanceX > 150 && Math.random() < 0.015) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        if (Math.random() < 0.5) {
                            this._playAnim(`${this.type}-shoot`);
                            this.spawnSkull();
                        } else {
                            this._playAnim(`${this.type}-summon`);
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
                        this._playAnim(`${this.type}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 90 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                this.player.takeDamage(20);
                            }
                        });
                        break;
                    } else if (distanceX > 100 && distanceX < 400 && Math.random() < 0.02) {
                        if (enemyOnGround) this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack2`);
                        this.spawnFireball();
                        break;
                    }
                }

                if (distanceX <= 65) {
                    if (enemyOnGround) this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip);
                    this.isAttacking = true;
                    
                    if (this.type === 'slime') {
                        // Physical jump attack for slime
                        this.sprite.setVelocityX(isPlayerLeft ? -200 : 200);
                        this.sprite.setVelocityY(-250);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                this.player.takeDamage(3);
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
                    } else if (this.isZombie) {
                        // Zombie: random between regular attack and bite attack
                        // Crawling zombies always use crawl-attack
                        if (this.zombieCrawling) {
                            this._playAnim(`${this.type}-crawl-attack`);
                            this.scene.time.delayedCall(400, () => {
                                if (!this.sprite || !this.sprite.active) return;
                                if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && Math.abs(this.player.sprite.y - this.sprite.y) < 60) {
                                    this.player.takeDamage(8);
                                }
                            });
                        } else {
                            // 40% chance bite (stronger), 60% regular attack
                            const useBite = Math.random() < 0.4;
                            this._playAnim(`${this.type}-${useBite ? 'attack2' : 'attack'}`);
                            this.scene.time.delayedCall(350, () => {
                                if (!this.sprite || !this.sprite.active) return;
                                if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                    this.player.takeDamage(useBite ? 8 : 5);
                                }
                            });
                        }
                    } else {
                        // Standard animation attack
                        this._playAnim(`${this.type}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                this.player.takeDamage(5);
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
                    this._playAnim(`${this.type}-move`);
                } else {
                    this.sprite.setVelocityX(0);
                    this._playAnim(`${this.type}-idle`);
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
                        this._playAnim(`${this.type}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 70 && Math.abs(this.player.sprite.y - this.sprite.y) < 45) {
                                this.player.takeDamage(this.type === 'lich_lord' ? 15 : 5);
                            }
                        });
                    } else if (this.type === 'lich_lord' && Math.random() < 0.05) {
                        // Far corner + Ranged -> Shoot!
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-shoot`);
                        this.spawnSkull();
                    } else {
                        // Just wait menacingly
                        this._playAnim(`${this.type}-idle`);
                    }
                    
                    // Allow cornered enemies to jump if they are stuck in a pit
                    const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                    if (enemyOnGround && this.player.sprite.y < this.sprite.y - 50) {
                        this.sprite.setVelocityY(-600);
                    }
                } else {
                    this.sprite.setVelocityX(isPlayerLeft ? this.speed : -this.speed);
                    this.sprite.setFlipX(!shouldFlip); // Fleeing means face away
                    this._playAnim(`${this.type}-move`);
                    
                    // Allow fleeing enemies to jump over small obstacles
                    const enemyOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
                    if (enemyOnGround && (this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.body.touching.left || this.sprite.body.touching.right)) {
                        this.sprite.setVelocityY(-600);
                    }
                }
                break;
            case "IDLE":
            default:
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(shouldFlip);
                this._playAnim(`${this.type}-idle`);
                break;
        }
    }

    takeDamage(amount, knockbackDirection) {
        if (this.isDead || this.hp <= 0) return;

        // Cooldown prevents overlap() from firing 60x/sec
        const now = this.scene.time.now;
        if (now - this.lastDamageTime < this.damageCooldown) return;
        this.lastDamageTime = now;

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
            const hitKey = `${this.type}-hit`;
            this._playAnim(hitKey);
            this.sprite.off('animationcomplete-' + hitKey);
            this.sprite.once('animationcomplete-' + hitKey, () => {
                if (this.sprite && this.sprite.active) this.isHit = false;
            });
            // Auto-counter: deal damage back partway through the animation
            this.scene.time.delayedCall(250, () => {
                if (!this.sprite || !this.sprite.active || this.isDead) return;
                if (this.player && this.player.sprite) {
                    if (Math.abs(this.player.sprite.x - this.sprite.x) <= 80 && Math.abs(this.player.sprite.y - this.sprite.y) < 50) {
                        this.player.takeDamage(4);
                    }
                }
            });
        } else {
            // Standard hit reaction for all other enemies
            const hitKey = `${this.type}-hit`;
            if (this.scene.anims.exists(hitKey)) {
                this._playAnim(hitKey);
                this.sprite.off('animationcomplete-' + hitKey);
                this.sprite.once('animationcomplete-' + hitKey, () => {
                    if (this.sprite && this.sprite.active) this.isHit = false;
                });
            } else {
                this._playAnim(`${this.type}-idle`);
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
                skull.setScale(1.5);
                skull.body.setSize(16, 16);
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
                fireball.setScale(2);
                fireball.body.setSize(16, 16);
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


    spawnSkeleton() {
        if (!this.sprite || !this.sprite.active) return;
        this.scene.time.delayedCall(600, () => {
            if (!this.sprite || !this.sprite.active) return;
            // Spawn further away so they aren't hidden behind the boss
            const xOffset = Math.random() < 0.5 ? -120 : 120;
            const skeleton = new EnemyController(this.scene, this.sprite.x + xOffset, this.sprite.y, this.player, this.geminiService, 'skeleton');
            if (this.scene.enemies) {
                this.scene.enemies.add(skeleton.sprite);
            }
        });
    }

    die() {
        if (this.type === 'training_dummy') console.log(`[DEBUG] CRITICAL: Training Dummy die() called! This should not happen! Y-coord: ${this.sprite.y}`);
        this.isHit = true;
        this.isDead = true;
        if (this.aiText) this.aiText.destroy();

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
                    zombie: [60, 18], zombie_v1: [60, 18], zombie_v2: [60, 18], zombie_v3: [60, 18]
                };
                const [xp, gold] = rewards[this.type] || [50, 10];
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
        };

        // Zombie two-phase death: first defeat → transform → crawl phase → final death
        if (this.isZombie && !this.zombieCrawling) {
            // PHASE 1: First defeat (row 5) — zombie falls down
            const dieKey = `${this.type}-die`;
            this._playAnim(dieKey);
            this.sprite.off('animationcomplete-' + dieKey);
            this.sprite.once('animationcomplete-' + dieKey, () => {
                if (!this.sprite || !this.sprite.active || !this.scene || this.scene.isSceneDestroyed) return;
                
                // PHASE 2: Transform to crawler (row 6)
                const transformKey = `${this.type}-transform`;
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
                    
                    this._playAnim(`${this.type}-crawl-idle`);
                    
                    if (typeof this.scene.showFloatingText === 'function') {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, 'Still alive!', 0xff6600);
                    }
                });
            });
            return; // Don't fall through to normal death
        }

        // Zombie crawling phase final death (row 8)
        if (this.isZombie && this.zombieCrawling) {
            const finalDieKey = `${this.type}-final-die`;
            this._playAnim(finalDieKey);
            this.sprite.off('animationcomplete-' + finalDieKey);
            this.sprite.once('animationcomplete-' + finalDieKey, onDeathComplete);
            return;
        }

        // Standard death for non-zombie enemies
        const dieKey = `${this.type}-die`;
        if (this.scene.anims.exists(dieKey)) {
            this._playAnim(dieKey);
            this.sprite.off('animationcomplete-' + dieKey);
            this.sprite.once('animationcomplete-' + dieKey, onDeathComplete);
        } else {
            this._playAnim(`${this.type}-idle`);
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
