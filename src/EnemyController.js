// EnemyController.js - AI powered enemy class

class EnemyController {
    constructor(scene, x, y, player, geminiService, type = 'slime') {
        this.scene = scene;
        this.player = player;
        this.geminiService = geminiService;
        this.type = type;

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
        } else {
            this.sprite.setScale(this.type === 'spider' ? 1.5 : (this.type === 'goblin' ? 1.4 : 1.8)); // Spider boss is large
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
        this.tacticInterval = 2000; // Ask Gemini every 2s

        // Stats
        this.speed = 100;
        if (this.type === 'lich_lord') {
            this.maxHp = 2000;
        } else if (this.type === 'spider' || this.type === 'the_devil') {
            this.maxHp = this.type === 'the_devil' ? 1500 : 400; // other bosses
        } else {
            this.maxHp = 100;
        }
        this.hp = this.maxHp;
        this.isHit = false;
        this.damageCooldown = 500;
        this.lastDamageTime = 0;

        // Clean up text if sprite is destroyed by a zone transition
        this.sprite.on('destroy', () => {
            if (this.aiText && this.aiText.active) this.aiText.destroy();
            if (this.hpText && this.hpText.active) this.hpText.destroy();
        });
    }

    _playAnim(animKey) {
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
        if (!this.player || !this.player.sprite || !this.sprite.active) return;

        // UI removed

        // If currently taking damage or attacking, don't execute AI logic
        if (this.isHit || this.isAttacking) return;

        // Dummy enemies just stand there and take damage
        if (this.isDummy) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Execute current tactic
        this.executeTactic();

        // Ask Gemini for new tactic periodically
        if (time - this.lastTacticTime > this.tacticInterval) {
            this.lastTacticTime = time;
            this.askGeminiForTactic();
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
        const facesLeftByDefault = ['goblin', 'bat', 'mushroom', 'orc', 'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned', 'female_damned', 'tree_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'mummy'].includes(this.type);
        
        let shouldFlip = this.sprite.flipX; // default to current flip to prevent jitter
        if (distanceX > 5) {
            if (facesLeftByDefault) {
                shouldFlip = !isPlayerLeft;
            } else {
                shouldFlip = isPlayerLeft;
            }
        }

        switch (this.currentTactic) {
            case "CHASE":
                // Special Boss Attack Logic
                if (this.type === 'lich_lord') {
                    if (distanceX <= 80) {
                        this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack`);
                        // AOE damage
                        this.scene.time.delayedCall(400, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 100) this.player.takeDamage(15);
                        });
                        break;
                    } else if (distanceX > 150 && Math.random() < 0.015) {
                        this.sprite.setVelocityX(0);
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
                        this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack`);
                        break;
                    } else if (distanceX > 100 && distanceX < 300 && Math.random() < 0.02) {
                        this.sprite.setVelocityX(0);
                        this.sprite.setFlipX(shouldFlip);
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack2`);
                        break;
                    }
                }

                if ((this.type === 'skeleton' || this.type === 'bandit' || this.type === 'frost_giant') && distanceX <= 65) {
                    this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip);
                    this.isAttacking = true;
                    this._playAnim(`${this.type}-attack`);
                    this.scene.time.delayedCall(300, () => {
                        if (!this.sprite || !this.sprite.active) return;
                        if (Math.abs(this.player.sprite.x - this.sprite.x) <= 75) {
                            this.player.takeDamage(5);
                        }
                    });
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
                // Occasionally jump while chasing
                if (Math.random() < 0.02 && this.sprite.body.touching.down) {
                    this.sprite.setVelocityY(-400);
                }
                break;
            case "FLEE":
                const inCorner = this.sprite.body.blocked.left || this.sprite.body.blocked.right || this.sprite.x <= 40 || this.sprite.x >= 760;
                
                if (inCorner) {
                    this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(shouldFlip); // Face the player when cornered
                    
                    if (distanceX <= 60) {
                        // Close corner -> Fight back!
                        this.isAttacking = true;
                        this._playAnim(`${this.type}-attack`);
                        this.scene.time.delayedCall(300, () => {
                            if (!this.sprite || !this.sprite.active) return;
                            if (Math.abs(this.player.sprite.x - this.sprite.x) <= 70) {
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
                } else {
                    this.sprite.setVelocityX(isPlayerLeft ? this.speed : -this.speed);
                    this.sprite.setFlipX(!shouldFlip); // Fleeing means face away
                    this._playAnim(`${this.type}-move`);
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
        // Cooldown prevents overlap() from firing 60x/sec
        const now = this.scene.time.now;
        if (now - this.lastDamageTime < this.damageCooldown) return;
        this.lastDamageTime = now;

        this.hp -= amount;

        this.sprite.setVelocityY(-200);
        this.sprite.setVelocityX(200 * knockbackDirection);

        this.isHit = true;
        this.currentAnimKey = null;

        // Ensure we actually have a hit animation for this enemy
        // Fall back to idle if we don't, to prevent missing key errors
        const hitKey = `${this.type}-hit`;
        if (this.scene.anims.exists(hitKey)) {
            this._playAnim(hitKey);
            this.sprite.once('animationcomplete', () => {
                this.isHit = false;
            });
        } else {
            this._playAnim(`${this.type}-idle`);
            this.scene.time.delayedCall(400, () => {
                this.isHit = false;
            });
        }

        this.sprite.setTint(0xff4444);
        this.scene.time.delayedCall(200, () => {
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });

        if (typeof this.scene.showFloatingText === 'function') {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 20, amount, 0xff0000);
        }

        if (this.hp <= 0) {
            this.die();
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
        this.isHit = true;
        if (this.aiText) this.aiText.destroy();

        // We leave the sprite in the enemies group so it doesn't fall through the floor!
        // The player overlap already checks for !this.isDead, so it won't hurt the player.

        this.sprite.clearTint();
        this.sprite.setVelocityX(0);
        this.currentAnimKey = null;

        const onDeathComplete = () => {
            if (this.sprite && this.sprite.active) this.sprite.destroy();
            if (this.hpText && this.hpText.active) this.hpText.destroy();

            // Wait to be fully dead to grant xp
            if (typeof this.scene.grantRewards === 'function') {
                this.scene.grantRewards(50, 10);
            }
            if (this.player && this.player.progressQuest) {
                this.player.progressQuest(this.type);
            }
            
            // 15% chance to drop a loot chest
            if (Math.random() < 0.15 && this.scene && this.scene.spawnLootChest) {
                // Drop chest at enemy position, on the floor
                this.scene.spawnLootChest(this.sprite.x, 620);
            }
        };

        const dieKey = `${this.type}-die`;
        if (this.scene.anims.exists(dieKey)) {
            this._playAnim(dieKey);
            this.sprite.once('animationcomplete', onDeathComplete);
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
