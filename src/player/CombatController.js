class CombatController {
    constructor(player) {
        this.player = player;
    }

    attack() {
        const player = this.player;
        player.isAttacking = true;
        const cd = player.classData;

        // Play attack animation
        if (cd.isSheet && player.scene.anims.exists(cd.id + '_attack')) {
            player._playAnim();
        }

        // Branch logic based on class
        if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
            // Mana check - single shot costs 2 MP
            if (player.mp < 2) {
                player.isAttacking = false;
                if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            player.mp -= 2;
            if (player.updatePlayerUI) player.updatePlayerUI();
            
            // Ranged Attack
            player.scene.time.delayedCall(100, () => {
                this.fireProjectile();
            });
            
            player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else if (cd.id === 'ranger') {
            // Ranger Ranged Attack
            player.scene.time.delayedCall(250, () => {
                if (player.sprite && player.sprite.active) this.fireArrow();
            });

            player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else {
            // Melee Attack (Warrior, Samurai uses melee for now)
            const attackRange = player.isAI ? 120 : 80;
            const attackHeight = 55;
            const offsetX = player.facingDirection === 1 ? player.sprite.displayWidth * 0.5 : -player.sprite.displayWidth * 0.5;
            const hitbox = player.scene.add.zone(player.sprite.x + offsetX, player.sprite.y, attackRange, attackHeight);
            player.scene.physics.add.existing(hitbox);
            hitbox.body.setAllowGravity(false);
            hitbox.body.moves = false;

            player.scene.physics.overlap(hitbox, player.scene.enemies, (box, enemySprite) => {
                if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                    // Prevent AI from hitting other enemies if it's hostile AI
                    if (player.isAI && player.aiState === 'hostile') return;
                    
                    const yDiff = Math.abs(player.sprite.y - enemySprite.y);
                    if (yDiff > 45) return;
                    
                    const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
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
                    damage = Math.floor(damage * player.getDamageMultiplier());
                    // Crit check
                    let isCrit = false;
                    if (Math.random() * 100 < (player.critChance || 0)) {
                        damage = Math.floor(damage * 2);
                        isCrit = true;
                    }
                    enemySprite.controller.takeDamage(damage, player.facingDirection);
                    this.applyLifesteal(damage);
                    if (isCrit && player.scene.showFloatingText) {
                        player.scene.showFloatingText(enemySprite.x, enemySprite.y - 60, 'CRIT!', 0xffff00);
                    }
                }
            });

            // If AI is hostile, also check overlap with Player!
            if (player.isAI && player.aiState === 'hostile') {
                player.scene.physics.overlap(hitbox, player.scene.player.sprite, (box, pSprite) => {
                    const yDiff = Math.abs(player.sprite.y - pSprite.y);
                    if (yDiff > 45) return;
                    
                    const damage = (cd.stats.str * 2) + 5 + Math.floor(Math.random() * 5);
                    player.scene.player.takeDamage(damage, player.facingDirection);
                });
            }

            player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                hitbox.destroy();
                if (cd.isSheet) player._playAnim();
            });
        }
    }

    fireArrow() {
        const player = this.player;
        if (!player.sprite || !player.sprite.active) return;
        const cd = player.classData;
        const weaponBonusRaw = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
        const weaponBonus = typeof weaponBonusRaw === 'number' && !isNaN(weaponBonusRaw) ? weaponBonusRaw : 0;
        let damage = (cd.stats.dex * 2) + cd.stats.str + weaponBonus + Math.floor(Math.random() * 5);
        damage = Math.floor(damage * player.getDamageMultiplier());

        const offsetX = player.facingDirection === 1 ? 20 : -20;
        const proj = player.scene.physics.add.sprite(player.sprite.x + offsetX, player.sprite.y + 10, 'arrow');

        proj.body.setAllowGravity(false);
        proj.setVelocityX(player.facingDirection * 600);
        if (player.facingDirection === -1) proj.setFlipX(true);

        // Setup collision
        const overlap = player.scene.physics.add.overlap(proj, player.scene.enemies, (p, enemySprite) => {
            if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                if (player.isAI && player.aiState === 'hostile') return; // AI doesn't hit enemies

                let isCrit = false;
                let finalDamage = damage;
                if (Math.random() * 100 < (player.critChance || 0)) {
                    finalDamage = Math.floor(damage * 2);
                    isCrit = true;
                }

                enemySprite.controller.takeDamage(finalDamage, player.facingDirection);
                this.applyLifesteal(finalDamage);
                if (Math.random() < 0.20 && enemySprite.controller.applyStatusEffect) {
                    enemySprite.controller.applyStatusEffect('poison', 5000, 5); // 5 damage/sec for 5 sec
                }
                if (isCrit && player.scene.showFloatingText) {
                    player.scene.showFloatingText(enemySprite.x, enemySprite.y - 60, 'CRIT!', 0xffff00);
                }
                p.destroy();
                player.scene.physics.world.removeCollider(overlap);
            }
        });

        // AI friendly fire checks
        if (player.isAI && player.aiState === 'hostile') {
            const playerOverlap = player.scene.physics.add.overlap(proj, player.scene.player.sprite, (p, pSprite) => {
                const dmg = (cd.stats.dex * 2) + cd.stats.str + 5 + Math.floor(Math.random() * 5);
                player.scene.player.takeDamage(dmg, player.facingDirection);
                p.destroy();
                player.scene.physics.world.removeCollider(playerOverlap);
            });
        }

        // Destroy after 1.5 seconds to prevent memory leaks
        player.scene.time.delayedCall(1500, () => {
            if (proj && proj.active) proj.destroy();
        });
    }

    fireProjectile() {
        const player = this.player;
        const cd = player.classData;
        const weaponBonusRaw = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
        const weaponBonus = typeof weaponBonusRaw === 'number' && !isNaN(weaponBonusRaw) ? weaponBonusRaw : 0;
        let damage = (cd.stats.int * 2) + weaponBonus + Math.floor(Math.random() * 5);
        damage = Math.floor(damage * player.getDamageMultiplier());
        
        const offsetX = player.facingDirection === 1 ? 20 : -20;
        const proj = player.scene.physics.add.sprite(player.sprite.x + offsetX, player.sprite.y, 'projectile_blue');
        
        if (player.scene.anims.exists('projectile_blue_anim')) {
            proj.play('projectile_blue_anim');
        }
        
        proj.body.setAllowGravity(false);
        proj.setVelocityX(player.facingDirection * 400);
        if (player.facingDirection === -1) proj.setFlipX(true);
        
        // Setup collision
        const targetGroup = player.isAI ? proj.scene.player.sprite : player.scene.enemies;
        const overlap = player.scene.physics.add.overlap(proj, targetGroup, (p, targetSprite) => {
            if (player.isAI) {
                if (player.scene.player && typeof player.scene.player.takeDamage === 'function') {
                    player.scene.player.takeDamage(damage, player.facingDirection);
                    p.destroy();
                    player.scene.physics.world.removeCollider(overlap);
                }
            } else {
                if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                    targetSprite.controller.takeDamage(damage, player.facingDirection);
                    this.applyLifesteal(damage);
                    if (Math.random() < 0.50 && targetSprite.controller.applyStatusEffect) {
                        targetSprite.controller.applyStatusEffect('burn', 3000, 10);
                    }
                    p.destroy();
                    player.scene.physics.world.removeCollider(overlap);
                }
            }
        });
        
        // Destroy after 2 seconds to prevent memory leaks
        player.scene.time.delayedCall(2000, () => {
            if (proj.active) proj.destroy();
        });
    }

    superComboSpell() {
        const player = this.player;
        const cd = player.classData;
        
        if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
            // Mana check - burst costs 4 MP
            if (player.mp < 4) {
                if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            player.mp -= 4;
        } else if (cd.id === 'samurai') {
            // Stamina check - 80% of maxSP, lowered by vitality
            let costRatio = 0.8 - (cd.stats.vit * 0.015); // e.g. 10 vit = -15% = 65% of max
            if (costRatio < 0.2) costRatio = 0.2; // Min 20%
            const spCost = Math.floor(player.maxSp * costRatio);
            
            if (player.sp < spCost) {
                if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            player.sp -= spCost;
        } else if (cd.id === 'ranger') {
            const spCost = Math.floor(player.maxSp * 0.4); // 40% SP cost
            if (player.sp < spCost) {
                if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            player.sp -= spCost;
        } else if (cd.id === 'knight' || cd.id === 'warrior') {
            const spCost = Math.floor(player.maxSp * 0.5); // 50% SP cost for heavy combo
            if (player.sp < spCost) {
                if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'Not Enough Stamina!', 0x44ff44);
                return;
            }
            player.sp -= spCost;
        }

        if (player.updatePlayerUI) player.updatePlayerUI();
        
        player.isAttacking = true;
        
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
        player.sprite.on('animationupdate', onFrameChange);
        // === END LOGGER SETUP ===

        const comboKey = (cd.id === 'knight' || cd.id === 'warrior') ? cd.id + '_attack' : cd.id + '_combo';
        if (cd.isSheet && player.scene.anims.exists(comboKey)) {
            player._playAnim(comboKey);
            // Log the first frame too
            const curFrame = player.sprite.anims.currentFrame;
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

        if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
            // Trigger 3-orb burst after a short delay (approx when wand is raised)
            player.scene.time.delayedCall(400, () => {
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                const damage = (cd.stats.int * 4) + weaponBonus + 10;
                
                // Screen shake for impact
                player.scene.cameras.main.shake(150, 0.008);
                
                // 3 orbs fired straight in rapid succession
                const dir = player.facingDirection || 1;
                const orbSpeed = 400;
                
                for (let i = 0; i < 3; i++) {
                    player.scene.time.delayedCall(i * 100, () => {
                        if (!player.sprite || !player.sprite.active) return;
                        const p = player.scene.physics.add.sprite(player.sprite.x + (dir * 20), player.sprite.y - 10, 'projectile_blue');
                        if (player.scene.anims.exists('projectile_blue_anim')) {
                            p.play('projectile_blue_anim');
                        }
                        p.body.setAllowGravity(false);
                        p.setScale(1.5);
                        p.setVelocity(dir * orbSpeed, 0); // All straight
                        
                        const targetGroup = player.isAI ? p.scene.player.sprite : player.scene.enemies;
                        const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                            // If hitting player, structure is slightly different
                            if (player.isAI) {
                                if (player.scene.player && typeof player.scene.player.takeDamage === 'function') {
                                    player.scene.player.takeDamage(damage, dir);
                                    proj.destroy();
                                    player.scene.physics.world.removeCollider(overlap);
                                }
                            } else {
                                if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                                    targetSprite.controller.takeDamage(damage, dir);
                                    this.applyLifesteal(damage);
                                    proj.destroy();
                                    player.scene.physics.world.removeCollider(overlap);
                                }
                            }
                        });
                        
                        player.scene.time.delayedCall(1200, () => { if(p.active) p.destroy(); });
                    });
                }
            });
        } else if (cd.id === 'samurai') {
            // Samurai combo: 16 frames, 4 hits
            const dir = player.facingDirection || 1;
            const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            let damage = Math.floor(cd.stats.dex * 2.5) + Math.floor(cd.stats.str * 0.5) + weaponBonus;
            damage = Math.floor(damage * player.getDamageMultiplier());
            
            // 4 hits at intervals
            for (let i = 0; i < 4; i++) {
                player.scene.time.delayedCall(i * 300 + 100, () => {
                    if (!player.sprite || !player.sprite.active) return;
                    player.sprite.setVelocityX(200 * dir); // Lunge forward slightly with each hit
                    
                    // Hitbox check
                    const attackRange = 60;
                    const attackHeight = 55;
                    const offsetX = (dir === 1) ? 40 : -40;
                    const hitBox = new Phaser.Geom.Rectangle(player.sprite.x + offsetX - (attackRange/2), player.sprite.y - (attackHeight/2), attackRange, attackHeight);

                    let hitCount = 0;
                    player.scene.enemies.children.iterate((enemySprite) => {
                        if (enemySprite && enemySprite.active && enemySprite.controller && enemySprite.controller.hp > 0) {
                            if (Phaser.Geom.Intersects.RectangleToRectangle(hitBox, enemySprite.getBounds())) {
                                enemySprite.controller.takeDamage(damage, dir);
                                this.applyLifesteal(damage);
                                // 100% chance to stun
                                if (enemySprite.controller.applyStatusEffect) {
                                    enemySprite.controller.applyStatusEffect('stun', 1500, 0);
                                }
                                hitCount++;
                            }
                        }
                    });
                    
                    if (hitCount > 0) {
                        player.scene.cameras.main.shake(100, 0.005);
                    }
                });
            }
        } else if (cd.id === 'ranger') {
            const dir = player.facingDirection || 1;
            const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            let damage = Math.floor((cd.stats.dex * 2) + cd.stats.str + weaponBonus + 5);
            damage = Math.floor(damage * player.getDamageMultiplier());
            
            // 7 arrows 1 millisecond after the other
            for (let i = 0; i < 7; i++) {
                player.scene.time.delayedCall(100 + i, () => {
                    if (!player.sprite || !player.sprite.active) return;
                    player.sprite.setVelocityX(-30 * dir); // Small recoil push
                    
                    const offsetX = dir === 1 ? 20 : -20;
                    // Spread them slightly vertically so it looks like a deadly swarm
                    const offsetY = 5 + (Math.random() * 15 - 7.5);
                    
                    const proj = player.scene.physics.add.sprite(player.sprite.x + offsetX, player.sprite.y + offsetY, 'arrow');
                    proj.body.setAllowGravity(false);
                    proj.setVelocityX(dir * 1000); // Extremely fast
                    if (dir === -1) proj.setFlipX(true);
                    
                    const overlap = player.scene.physics.add.overlap(proj, player.scene.enemies, (p, enemySprite) => {
                        if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                            if (player.isAI && player.aiState === 'hostile') return;
                            enemySprite.controller.takeDamage(damage, dir);
                            this.applyLifesteal(damage);
                            p.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
                    // AI friendly fire checks
                    if (player.isAI && player.aiState === 'hostile') {
                        const playerOverlap = player.scene.physics.add.overlap(proj, player.scene.player.sprite, (p, pSprite) => {
                            player.scene.player.takeDamage(damage, dir);
                            p.destroy();
                            player.scene.physics.world.removeCollider(playerOverlap);
                        });
                    }
                    
                    player.scene.time.delayedCall(1000, () => { if(proj.active) proj.destroy(); });
                });
            }
            player.scene.time.delayedCall(100, () => player.scene.cameras.main.shake(200, 0.01));
        } else if (cd.id === 'knight' || cd.id === 'warrior') {
            const dir = player.facingDirection || 1;
            const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            let damage = Math.floor(cd.stats.str * 3.5) + Math.floor(cd.stats.vit * 1.5) + weaponBonus;
            damage = Math.floor(damage * player.getDamageMultiplier());
            
            // Thrust/Bash attack - lunges forward and hits everything in a wide arc
            player.sprite.setVelocityX(400 * dir); // Massive lunge
            
            player.scene.time.delayedCall(200, () => {
                if (!player.sprite || !player.sprite.active) return;
                
                const attackRange = 100;
                const attackHeight = 80;
                const offsetX = (dir === 1) ? 50 : -50;
                const hitBox = new Phaser.Geom.Rectangle(player.sprite.x + offsetX - (attackRange/2), player.sprite.y - (attackHeight/2), attackRange, attackHeight);

                let hitCount = 0;
                player.scene.enemies.children.iterate((enemySprite) => {
                    if (enemySprite && enemySprite.active && enemySprite.controller && enemySprite.controller.hp > 0) {
                        if (Phaser.Geom.Intersects.RectangleToRectangle(hitBox, enemySprite.getBounds())) {
                            enemySprite.controller.takeDamage(damage, dir);
                            this.applyLifesteal(damage);
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
                    player.scene.cameras.main.shake(300, 0.015);
                }
            });
        }

        // The combo animation has 12 frames at 12fps, so roughly 1000ms duration.
        // Or we just wait for animation complete
        player.sprite.off('animationcomplete-' + comboKey);
        player.sprite.once('animationcomplete-' + comboKey, (anim) => {
            player.isAttacking = false;
            player._playAnim();
            
            // === PRINT FRAME LOG ===
            player.sprite.off('animationupdate', onFrameChange);
            console.log(`%c=== SUPER ATTACK FRAME LOG (${cd.id}) ===`, 'color: #ff0; font-size: 14px; font-weight: bold;');
            console.log(`Total frames logged: ${frameLog.length}`);
            if (anim && anim.frames) {
                console.log(`Animation: ${comboKey} | Expected frames: ${anim.frames.length}`);
            } else {
                console.log(`Animation: ${comboKey}`);
            }
            console.table(frameLog);
            if (anim && anim.frames) {
                // Check for duplicates or gaps
                const frameNames = frameLog.map(f => f.frameName);
                const expected = anim.frames.map(f => f.textureFrame);
                const missing = expected.filter(f => !frameNames.includes(f));
                const extra = frameNames.filter(f => !expected.includes(f));
                if (missing.length) console.warn('MISSING frames (never played):', missing);
                if (extra.length) console.warn('EXTRA frames (not in animation def):', extra);
                console.log('Expected frame order:', expected);
            }
            console.log('%c=== END LOG ===', 'color: #ff0;');
        });
        
        // Fallback in case animationcomplete doesn't fire
        player.scene.time.delayedCall(1500, () => {
            if (player.isAttacking) {
                player.isAttacking = false;
                player._playAnim();
            }
        });
    }

    startDash(directionMultiplier) {
        const player = this.player;
        // Stamina check - dash costs 15 SP
        if (player.sp < 15) {
            if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Stamina!', 0x44ff44);
            return;
        }
        player.sp -= 15;
        if (player.updatePlayerUI) player.updatePlayerUI();
        
        player.isDashing = true;
        player.sprite.setVelocityX(player.dashSpeed * directionMultiplier);
        player.sprite.setVelocityY(0);
        player.sprite.body.allowGravity = false;
        
        // Visual indicator of dashing (e-frames)
        player.sprite.setAlpha(0.5);

        // Stop dashing after duration
        player.scene.time.delayedCall(player.dashDuration, () => {
            player.isDashing = false;
            if (player.sprite && player.sprite.body) {
                player.sprite.body.allowGravity = true;
                player.sprite.setAlpha(1.0);
            }
        });
    }

    takeDamage(amount, knockbackDirection) {
        const player = this.player;
        if (player.hp <= 0) return; // Already dead

        // Apply damage reduction if shield artifact is equipped
        let finalAmount = amount;
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageReduction) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    finalAmount = Math.max(1, Math.floor(amount * (1 - artifactDef.statBoosts.damageReduction)));
                }
            }
        }

        player.hp -= finalAmount;
        
        // Show damage text
        if (player.scene && player.scene.showFloatingText) {
            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, `-${finalAmount}`, 0xff0000);
        }

        // Apply knockback
        if (player.sprite && player.sprite.body) {
            let kbDir = 1;
            if (knockbackDirection !== undefined && !isNaN(knockbackDirection)) {
                // If the number is large, it might be a raw X coordinate passed by mistake
                if (Math.abs(knockbackDirection) > 5) {
                    kbDir = player.sprite.x < knockbackDirection ? -1 : 1;
                } else {
                    kbDir = knockbackDirection > 0 ? 1 : -1;
                }
            } else {
                // Fallback to pushing them backwards based on their current facing direction
                kbDir = player.facingDirection === 1 ? -1 : 1;
            }
            player.sprite.setVelocityX(kbDir * 200);
            player.sprite.setVelocityY(-150);
        }

        // Damage flash visual
        player.isHit = true;
        player.sprite.setTint(0xff0000);
        player.scene.time.delayedCall(150, () => {
            player.isHit = false;
            if (player.sprite && player.sprite.active) {
                player.sprite.clearTint();
            }
        });

        const hitKey = player.classData.id + '_hit';
        if (player.scene.anims.exists(hitKey) && !player.isAttacking) {
            player._playAnim(hitKey);
        }

        if (player.updatePlayerUI) player.updatePlayerUI();
        if (!player.isAI && player.scene && player.scene.updateHUD) {
            player.scene.updateHUD();
        }

        if (player.hp <= 0) {
            this.die();
        } else if (!player.isAI && player.hp <= player.maxHp * 0.15) {
            // Artifact Teleporter Trigger
            if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
                const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
                if (artifactDef && artifactDef.special === 'auto-teleport') {
                    // Find nearest town
                    if (player.scene && player.scene.biomes) {
                        let nearestTown = null;
                        let minDist = Infinity;
                        for (let key in player.scene.biomes) {
                            const biome = player.scene.biomes[key];
                            if (biome.type === 'town') {
                                const dist = Math.abs(biome.xStart - player.sprite.x);
                                if (dist < minDist) {
                                    minDist = dist;
                                    nearestTown = biome;
                                }
                            }
                        }
                        if (nearestTown) {
                            if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, 'Emergency Teleport!', 0x88ccff);
                            // Heal them a tiny bit so they don't immediately die again
                            player.hp = Math.floor(player.maxHp * 0.20);
                            player.sprite.x = nearestTown.xStart + 300;
                            player.sprite.y = 500;
                        }
                    }
                }
            }
        }
    }

    applyLifesteal(damageDealt) {
        const player = this.player;
        if (player.hp <= 0 || damageDealt <= 0 || typeof damageDealt !== 'number' || isNaN(damageDealt)) return;
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.lifesteal) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    const healAmount = Math.max(1, Math.floor(damageDealt * artifactDef.statBoosts.lifesteal));
                    player.hp = Math.min(player.maxHp, player.hp + healAmount);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmount} HP`, 0x00ff00);
                    }
                    if (player.updatePlayerUI) player.updatePlayerUI();
                    if (!player.isAI && player.scene && player.scene.updateHUD) {
                        player.scene.updateHUD();
                    }
                }
            }
        }
    }

    applyStatusEffect(type, durationMs, strength) {
        const player = this.player;
        if (player.hp <= 0) return;
        
        // Artifact Immunities
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.immunities && artifactDef.immunities.includes(type)) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, 'Immune!', 0xaaaaaa);
                    }
                    return; // Prevent effect
                }
            }
        }
        
        // Check if effect already exists
        const existing = player.statusEffects.find(e => e.type === type);
        if (existing) {
            existing.duration = durationMs;
            if (strength > existing.strength) existing.strength = strength;
        } else {
            player.statusEffects.push({
                type: type,
                duration: durationMs,
                strength: strength,
                tickTimer: 0
            });
        }
    }

    updateStatusEffects(delta) {
        const player = this.player;
        if (!player.sprite || !player.sprite.active || player.hp <= 0) return;

        let hasTint = false;
        
        for (let i = player.statusEffects.length - 1; i >= 0; i--) {
            const effect = player.statusEffects[i];
            effect.duration -= delta;
            
            // Apply visual tint based on strongest/latest effect
            if (!player.isHit) { // Don't override damage flash
                if (effect.type === 'stun') { player.sprite.setTint(0xffff00); hasTint = true; }
                else if (effect.type === 'freeze' && !hasTint) { player.sprite.setTint(0x88ccff); hasTint = true; }
                else if (effect.type === 'burn' && !hasTint) { player.sprite.setTint(0xff6600); hasTint = true; }
                else if (effect.type === 'poison' && !hasTint) { player.sprite.setTint(0x00ff00); hasTint = true; }
            }

            // Process tick damage
            if (effect.type === 'poison' || effect.type === 'burn') {
                effect.tickTimer += delta;
                const tickRate = effect.type === 'poison' ? 1000 : 500;
                
                if (effect.tickTimer >= tickRate) {
                    effect.tickTimer -= tickRate;
                    player.hp -= effect.strength;
                    
                    if (player.scene && player.scene.showFloatingText) {
                        const color = effect.type === 'poison' ? 0x00ff00 : 0xff6600;
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `-${effect.strength}`, color);
                    }
                    if (player.updatePlayerUI) player.updatePlayerUI();
                    if (!player.isAI && player.scene && player.scene.updateHUD) player.scene.updateHUD();

                    if (player.hp <= 0) {
                        this.die();
                        return;
                    }
                }
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                player.statusEffects.splice(i, 1);
            }
        }
        
        if (player.statusEffects.length === 0 && !player.isHit) {
            player.sprite.clearTint();
        }
    }

    die() {
        const player = this.player;
        if (!player.sprite || !player.sprite.active) return;

        if (player.scene.anims.exists(player.classData.id + '_die')) {
            player._playAnim();
            player.sprite.body.enable = false;
        }

        if (window.saveData) {
            window.saveData = JSON.parse(JSON.stringify(window.saveData));
        }
        if (player.isAI) {
            // AI dies
            player.isDead = true;
            player.sprite.setVelocity(0, 0);
            player.sprite.body.enable = false;
            
            if (player.aiState === 'hostile') {
                if (player.classId && player.classId.includes('rival') && window.saveData) {
                    if (!window.saveData.defeatedRivals) window.saveData.defeatedRivals = [];
                    if (!window.saveData.defeatedRivals.includes(player.classId)) {
                        window.saveData.defeatedRivals.push(player.classId);
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Rival Defeated!", 0xffa500);
                    }
                    if (player.classId === 'megaboss_rival') {
                        window.saveData.isSavior = true;
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, "SAVIOR OF THE REALM", 0xffff00);
                    }
                }
                // Drop loot
                if (player.scene && player.scene.grantRewards) {
                    player.scene.grantRewards(50, 20); // 50 XP, 20 Gold
                }
            } else if (player.aiState === 'party') {
                // Remove from party
                const idx = player.scene.partyMembers.indexOf(player);
                if (idx > -1) player.scene.partyMembers.splice(idx, 1);
            }
            if (player.chatSubmitBtn && player.chatSubmitHandler) {
                player.chatSubmitBtn.removeEventListener('click', player.chatSubmitHandler);
            }
            if (player.chatInput && player.chatKeyHandler) {
                player.chatInput.removeEventListener('keypress', player.chatKeyHandler);
            }
            const dieKey = player.classData.id + '_die';
            if (player.scene.anims.exists(dieKey)) {
                player.sprite.off('animationcomplete-' + dieKey);
                player.sprite.once('animationcomplete-' + dieKey, () => {
                    if (player.sprite) player.sprite.destroy();
                });
            } else {
                player.sprite.destroy();
            }
        } else {
            // Real Player dies
            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, "YOU DIED", 0xff0000);
            
            // Penalty: lose 1% XP
            if (window.saveData) {
                const currentXp = window.saveData.xp || 0;
                const xpLoss = Math.floor(currentXp * 0.01);
                window.saveData.xp = Math.max(0, currentXp - xpLoss);
                if (xpLoss > 0) {
                    player.scene.time.delayedCall(1000, () => {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 70, `Lost ${xpLoss} XP`, 0xffa500);
                    });
                }

                // Respawn at nearest town backwards
                let respawnZone = 0;
                if (window.saveData.zones) {
                    for (let i = window.saveData.currentZone || 0; i >= 0; i--) {
                        if (window.saveData.zones[i] && window.saveData.zones[i].type === 'Safe') {
                            respawnZone = i;
                            break;
                        }
                    }
                }
                window.saveData.currentZone = respawnZone;
                window.saveData.hp = window.saveData.maxHp || player.maxHp || 100;
                // Save it so the reload picks it up
                player.hp = window.saveData.hp;
                player.saveGame();
                player._persistToLocalStorage();
            }

            // Quick reload
            player.scene.time.delayedCall(3500, () => {
                player.scene.scene.restart();
            });
        }
    }
}

window.CombatController = CombatController;
