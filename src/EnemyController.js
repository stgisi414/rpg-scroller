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
        window.EnemyBehaviors.initializeEnemy.call(this, x, y);
    }

    _playAnim(animKey) {
        // Remap from hyphen-separated (enemy format) to underscore-separated (player/class format) if textureKey is knight_rival
        if (this.textureKey === 'knight_rival') {
            animKey = animKey.replace('knight_rival-', 'knight_rival_');
            if (animKey.endsWith('_move')) animKey = animKey.replace('_move', '_walk');
        }

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

    get facesLeftByDefault() {
        return ['goblin', 'bat', 'mushroom', 'orc', 'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned', 'female_damned', 'tree_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'mummy', 'zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3', 'dragon', 'willowisp', 'bloated_damned', 'knight_rival'].includes(this.type) || this.type.startsWith('special_enemy_');
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

        // Find closest target (player, companion, or other enemies if mind controlled)
        const isMindControlled = this.statusEffects && this.statusEffects.some(e => e.type === 'mind_control');
        if (this.scene) {
            let bestTarget = null;
            let minDist = Infinity;

            if (isMindControlled) {
                // Target the closest other active enemy!
                if (this.scene.enemies) {
                    this.scene.enemies.getChildren().forEach(e => {
                        if (e && e.active && e !== this.sprite && e.controller && !e.controller.isDead) {
                            const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y);
                            if (d < minDist) {
                                minDist = d;
                                bestTarget = e.controller;
                            }
                        }
                    });
                }
            } else if (this.scene.player) {
                // Only target the main player if they are NOT invisible
                if (!this.scene.player.isInvisible) {
                    bestTarget = this.scene.player;
                    minDist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.scene.player.sprite.x, this.scene.player.sprite.y);
                }
                
                // Party members & mules are always targetable (they can't be invisible)
                if (this.scene.partyMembers) {
                    this.scene.partyMembers.forEach(m => {
                        if (m && m.sprite && m.sprite.active && !m.isDead) {
                            const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, m.sprite.x, m.sprite.y);
                            if (d < minDist) {
                                minDist = d;
                                bestTarget = m;
                            }
                        }
                    });
                }
            }

            if (bestTarget) {
                this.player = bestTarget;
            }
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
        return window.EnemyBehaviors.executeTactic.call(this);
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

        // Apply player status effects on hit
        if (this.player && this.player.inventory) {
            const player = this.player;
            const weapon = player.inventory.weapon;
            const artifactKey = (player.inventory.artifacts && player.inventory.equippedArtifact >= 0) ? player.inventory.artifacts[player.inventory.equippedArtifact] : null;

            // 1. Artifact Effects
            if (artifactKey === 'artifact-poison-cask') {
                if (this.applyStatusEffect) {
                    this.applyStatusEffect('poison', 5000, 6);
                }
            }

            // 2. Weapon Effects
            if (weapon && weapon.key) {
                const wKey = weapon.key;
                if (wKey === 'weapon-poison-stiletto' || wKey === 'weapon-poison-shiv' || wKey === 'weapon-poison-stiletto') {
                    if (Math.random() < 0.30 && this.applyStatusEffect) {
                        this.applyStatusEffect('poison', 5000, 5);
                    }
                } else if (wKey === 'weapon-serrated-kukri') {
                    if (Math.random() < 0.35 && this.applyStatusEffect) {
                        this.applyStatusEffect('bleed', 4500, 8);
                    }
                } else if (wKey === 'weapon-flame-zweihander') {
                    if (Math.random() < 0.30 && this.applyStatusEffect) {
                        this.applyStatusEffect('burn', 4000, 10);
                    }
                } else if (wKey === 'weapon-dwarven-warhammer') {
                    if (Math.random() < 0.15 && this.applyStatusEffect) {
                        this.applyStatusEffect('stun', 1500, 0);
                    }
                } else if (wKey === 'weapon-frostfire-scepter') {
                    if (this.applyStatusEffect) {
                        const rand = Math.random();
                        if (rand < 0.25) this.applyStatusEffect('freeze', 3000, 40);
                        else if (rand < 0.50) this.applyStatusEffect('burn', 3000, 12);
                    }
                } else if (wKey === 'weapon-dread-scepter') {
                    const healAmt = Math.max(1, Math.floor(amount * 0.10));
                    player.hp = Math.min(player.maxHp, player.hp + healAmt);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmt} HP`, 0x00ff00);
                    }
                    if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                } else if (wKey === 'weapon-calamity-blade' || wKey === 'weapon-demon-sai') {
                    const healAmt = Math.max(1, Math.floor(amount * 0.05));
                    player.hp = Math.min(player.maxHp, player.hp + healAmt);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmt} HP`, 0x00ff00);
                    }
                    if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                }
            }
        }

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
                if (effect.type === 'mind_control') { this.sprite.setTint(0x32cd32); hasTint = true; }
                else if (effect.type === 'stun' && !hasTint) { this.sprite.setTint(0xffff00); hasTint = true; }
                else if (effect.type === 'freeze' && !hasTint) { this.sprite.setTint(0x88ccff); hasTint = true; }
                else if (effect.type === 'burn' && !hasTint) { this.sprite.setTint(0xff6600); hasTint = true; }
                else if (effect.type === 'poison' && !hasTint) { this.sprite.setTint(0xbf00ff); hasTint = true; }
                else if (effect.type === 'bleed' && !hasTint) { this.sprite.setTint(0xcc0000); hasTint = true; }
            }

            if (effect.type === 'poison' || effect.type === 'burn' || effect.type === 'bleed') {
                effect.tickTimer += delta;
                const tickRate = effect.type === 'poison' ? 1000 : (effect.type === 'burn' ? 500 : 750);
                
                if (effect.tickTimer >= tickRate) {
                    effect.tickTimer -= tickRate;
                    this.hp -= effect.strength;
                    
                    if (this.scene && this.scene.showFloatingText) {
                        let color = 0xbf00ff;
                        if (effect.type === 'burn') color = 0xff6600;
                        if (effect.type === 'bleed') color = 0xcc0000;
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
        return window.EnemyActions.spawnSkull.call(this);
    }

    spawnFireball() {
        return window.EnemyActions.spawnFireball.call(this);
    }

    spawnOldDemonMagic() {
        return window.EnemyActions.spawnOldDemonMagic.call(this);
    }

    castOldDemonHeal() {
        return window.EnemyActions.castOldDemonHeal.call(this);
    }

    spawnDragonFirebreath() {
        return window.EnemyActions.spawnDragonFirebreath.call(this);
    }

    spawnSkeleton() {
        return window.EnemyActions.spawnSkeleton.call(this);
    }

    spawnDarkElfMinion() {
        return window.EnemyActions.spawnDarkElfMinion.call(this);
    }

    spawnDwarfAlly() {
        return window.EnemyActions.spawnDwarfAlly.call(this);
    }

    explodeBloated(instant = false) {
        return window.EnemyActions.explodeBloated.call(this, instant);
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
                    wolfen: [65, 20], coyle: [65, 20],
                    hellhound_1: [65, 20], hellhound_2: [65, 20], hellhound_3: [65, 20]
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

                // Defeating a knight_rival counts as an assassination target and tanks reputation directly (Phase 6)
                if (this.type === 'knight_rival') {
                    const currentZone = (saveData && saveData.currentZone) || 0;
                    const rulingFaction = window.getFactionForZone ? window.getFactionForZone(currentZone) : null;
                    if (rulingFaction) {
                        if (window.changeFactionReputation) {
                            window.changeFactionReputation(rulingFaction.id, -5, true);
                            if (this.scene && this.scene.showFloatingText && this.player && this.player.sprite && this.player.sprite.active) {
                                this.scene.showFloatingText(this.player.sprite.x, this.player.sprite.y - 100, `⚠️ -5 rep with ${rulingFaction.name} (Slain Guard)`, 0xff4444);
                            }
                        }
                        this.player.progressQuest('assassination_complete', rulingFaction.id);
                    }
                }
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

    shootDarkElfArrow(shouldFlip) {
        return window.EnemyActions.shootDarkElfArrow.call(this, shouldFlip);
    }

    shootDarkElfSpell(shouldFlip) {
        return window.EnemyActions.shootDarkElfSpell.call(this, shouldFlip);
    }
}

window.EnemyController = EnemyController;
