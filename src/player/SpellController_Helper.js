// src/player/SpellController_Helper.js - Helper containing offloaded superComboSpell logic for SpellController

const SpellController_Helper = {
    superComboSpell() {
        const player = this.player;
        const cd = player.classData;
        
        const isFighterScene = player.scene && player.scene.sys && player.scene.sys.settings && player.scene.sys.settings.key === 'FighterScene';
        let targetGroup;
        let getTargetController = (sprite) => sprite ? sprite.controller : null;
        
        if (isFighterScene) {
            if (player === player.scene.p1) {
                targetGroup = player.scene.p2 ? player.scene.p2.sprite : null;
                getTargetController = () => player.scene.p2;
            } else {
                targetGroup = player.scene.p1 ? player.scene.p1.sprite : null;
                getTargetController = () => player.scene.p1;
            }
        } else {
            if (player.aiState === 'hostile') {
                targetGroup = player.scene.player ? player.scene.player.sprite : null;
                getTargetController = () => player.scene.player;
            } else {
                targetGroup = player.scene.enemies;
                getTargetController = (sprite) => sprite ? sprite.controller : null;
            }
        }
        
        const isManaCaster = cd.id === 'wizard' || cd.id === 'wizard_rival' 
            || cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival'
            || cd.id === 'witch' || cd.id === 'witch_1_rival' || cd.id === 'witch_3_rival'
            || cd.id === 'pyromancer' || cd.id === 'pyromancer_1_rival' || cd.id === 'pyromancer_2_rival'
            || (cd.id && cd.id.startsWith('priest'));
        
        if (isManaCaster) {
            let cost = 4;
            if (cd.id.startsWith('witch')) {
                cost = 35;
            } else if (cd.id.startsWith('pyromancer')) {
                cost = 15;
            }
            if (player.mp < cost) {
                if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            player.mp -= cost;
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
                        p.setScale(0.75);
                        p.setVelocity(dir * orbSpeed, 0); // All straight
                        
                        const targetGroup = player.aiState === 'hostile' ? p.scene.player.sprite : player.scene.enemies;
                        const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                            // If hitting player, structure is slightly different
                            if (player.aiState === 'hostile') {
                                if (player.scene.player && typeof player.scene.player.takeDamage === 'function') {
                                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                                    const targetBottom = player.scene.player.sprite.body ? player.scene.player.sprite.body.bottom : player.scene.player.sprite.y;
                                    if (Math.abs(playerBottom - targetBottom) > 65) return;

                                    player.scene.player.takeDamage(damage, dir);
                                    proj.destroy();
                                    player.scene.physics.world.removeCollider(overlap);
                                }
                            } else {
                                if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                                    if (targetSprite.controller.isDead) return;
                                    
                                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                                    const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                                    if (Math.abs(playerBottom - targetBottom) > 65) return;

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
        } else if (cd.id.startsWith('pyromancer')) {
            player.scene.time.delayedCall(400, () => {
                if (!player.sprite || !player.sprite.active) return;
                
                const dir = player.facingDirection || 1;
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                
                if (cd.id === 'pyromancer_1_rival') {
                    const damage = Math.floor(cd.stats.int * 5.0) + weaponBonus + 15;
                    const proj = player.scene.physics.add.sprite(player.sprite.x + (dir * 30), player.sprite.y - 10, 'pyromancer_1_charge');
                    proj.body.setAllowGravity(false);
                    proj.setScale(1.8);
                    proj.setVelocity(dir * 550, 0);
                    if (dir === -1) proj.setFlipX(true);
                    
                    if (player.scene.anims.exists('pyromancer_1_charge_fly')) {
                        proj.play('pyromancer_1_charge_fly');
                    }
                    
                    let exploded = false;
                    const explode = (chargeProj, hitTarget) => {
                        if (exploded) return;
                        exploded = true;
                        chargeProj.setVelocity(0, 0);
                        if (player.scene.anims.exists('pyromancer_1_charge_explode')) {
                            chargeProj.play('pyromancer_1_charge_explode');
                        }
                        
                        const targetCtrl = getTargetController(hitTarget);
                        if (targetCtrl && !targetCtrl.isDead) {
                            targetCtrl.takeDamage(damage, dir);
                            if (targetCtrl.applyStatusEffect) {
                                targetCtrl.applyStatusEffect('burn', 5000, 15);
                            }
                        }
                        
                        player.scene.time.delayedCall(200, () => {
                            chargeProj.destroy();
                        });
                    };

                    const overlap = player.scene.physics.add.overlap(proj, targetGroup, (pSprite, targetSprite) => {
                        const targetCtrl = getTargetController(targetSprite);
                        if (targetCtrl && !targetCtrl.isDead) {
                            explode(proj, targetSprite);
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
                    player.scene.time.delayedCall(1200, () => {
                        if (proj.active && !exploded) {
                            explode(proj, null);
                        }
                    });
                } else if (cd.id === 'pyromancer_2_rival') {
                    const damage = Math.floor(cd.stats.int * 2.0) + weaponBonus + 5;
                    const range = 140;
                    const height = 60;
                    const offsetX = dir === 1 ? 70 : -70;
                    
                    // Tick damage 3 times over 600ms
                    for (let i = 0; i < 3; i++) {
                        player.scene.time.delayedCall(i * 150, () => {
                            if (!player.sprite || !player.sprite.active) return;
                            
                            // Spawn some aesthetic fire graphics particles streaming forward
                            const particleCount = 8;
                            for (let pIdx = 0; pIdx < particleCount; pIdx++) {
                                const particle = player.scene.add.graphics();
                                particle.fillStyle(0xff5500, 0.8);
                                const size = Phaser.Math.Between(4, 10);
                                particle.fillRect(-size/2, -size/2, size, size);
                                particle.setPosition(player.sprite.x + (dir * 25), player.sprite.y - 10 + Phaser.Math.Between(-15, 15));
                                particle.setBlendMode(Phaser.BlendModes.ADD);
                                
                                player.scene.tweens.add({
                                    targets: particle,
                                    x: player.sprite.x + (dir * Phaser.Math.Between(50, 160)),
                                    y: player.sprite.y - 10 + Phaser.Math.Between(-25, 25),
                                    alpha: 0,
                                    scaleX: 1.5,
                                    scaleY: 1.5,
                                    duration: Phaser.Math.Between(300, 500),
                                    ease: 'Quad.easeOut',
                                    onComplete: () => particle.destroy()
                                });
                            }

                            // Create temporary hit zone for this tick
                            const hitZone = player.scene.add.zone(player.sprite.x + offsetX, player.sprite.y, range, height);
                            player.scene.physics.add.existing(hitZone);
                            hitZone.body.setAllowGravity(false);
                            hitZone.body.moves = false;
                            
                            const overlap = player.scene.physics.add.overlap(hitZone, targetGroup, (zone, targetSprite) => {
                                const targetCtrl = getTargetController(targetSprite);
                                if (targetCtrl && !targetCtrl.isDead) {
                                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                                    const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                                    if (Math.abs(playerBottom - targetBottom) > 65) return;
                                    
                                    targetCtrl.takeDamage(damage, dir);
                                    if (targetCtrl.applyStatusEffect) {
                                        targetCtrl.applyStatusEffect('burn', 5000, 10);
                                    }
                                    // Remove collider so it only ticks once per hitZone instance
                                    player.scene.physics.world.removeCollider(overlap);
                                }
                            });
                            
                            player.scene.time.delayedCall(120, () => {
                                hitZone.destroy();
                            });
                        });
                    }
                } else {
                    const damage = Math.floor(cd.stats.int * 4.5) + weaponBonus + 12;
                    const p = player.scene.physics.add.sprite(player.sprite.x + (dir * 30), player.sprite.y - 10, 'projectile_blue');
                    p.body.setAllowGravity(false);
                    p.setScale(0.9);
                    p.setTint(0xff6600); // Orange/fire tint
                    p.setVelocity(dir * 500, 0);
                    if (dir === -1) p.setFlipX(true);
                    
                    if (player.scene.anims.exists('projectile_blue_anim')) {
                        p.play('projectile_blue_anim');
                    }
                    
                    const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                        const targetCtrl = getTargetController(targetSprite);
                        if (targetCtrl && !targetCtrl.isDead) {
                            const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                            const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                            if (Math.abs(playerBottom - targetBottom) > 65) return;
                            
                            targetCtrl.takeDamage(damage, dir);
                            this.applyLifesteal(damage);
                            if (targetCtrl.applyStatusEffect) {
                                targetCtrl.applyStatusEffect('burn', 15000, 8);
                            }
                            proj.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
                    player.scene.time.delayedCall(700, () => {
                        if (p.active) p.destroy();
                    });
                }
            });
        } else if (cd.id === 'witch') {
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                const damage = Math.floor(cd.stats.int * 4.5) + weaponBonus + 15;
                const dir = player.facingDirection || 1;
                
                const proj = player.scene.physics.add.sprite(player.sprite.x + (dir * 25), player.sprite.y - 10, 'witch_spear');
                if (player.scene.anims.exists('witch_spear_fly')) {
                    proj.play('witch_spear_fly');
                }
                proj.body.setAllowGravity(false);
                proj.setScale(1.5);
                proj.setVelocity(dir * 600 * (player.magicRangeMultiplier || 1.0), 0);
                if (dir === -1) proj.setFlipX(true);
                
                let exploded = false;
                const explode = (spearProj) => {
                    if (exploded) return;
                    exploded = true;
                    spearProj.setVelocity(0, 0);
                    if (player.scene.anims.exists('witch_spear_explode')) {
                        spearProj.play('witch_spear_explode');
                    }
                    
                    // Screen shake
                    player.scene.cameras.main.shake(150, 0.008);
                    
                    // Deal area damage
                    const radius = 120;
                    if (isFighterScene) {
                        const targetCtrl = (player === player.scene.p1) ? player.scene.p2 : player.scene.p1;
                        if (targetCtrl && targetCtrl.sprite && targetCtrl.sprite.active && targetCtrl.hp > 0) {
                            const dist = Phaser.Math.Distance.Between(spearProj.x, spearProj.y, targetCtrl.sprite.x, targetCtrl.sprite.y);
                            if (dist <= radius) {
                                targetCtrl.takeDamage(damage, dir);
                            }
                        }
                    } else if (player.aiState === 'hostile') {
                        const p1 = player.scene.player;
                        if (p1 && p1.sprite && p1.sprite.active && p1.hp > 0) {
                            const dist = Phaser.Math.Distance.Between(spearProj.x, spearProj.y, p1.sprite.x, p1.sprite.y);
                            if (dist <= radius) {
                                p1.takeDamage(damage, dir);
                            }
                        }
                    } else {
                        const enemiesGroup = player.scene.enemies;
                        if (enemiesGroup) {
                            enemiesGroup.getChildren().forEach(e => {
                                if (e && e.active && e.controller && !e.controller.isDead) {
                                    const dist = Phaser.Math.Distance.Between(spearProj.x, spearProj.y, e.x, e.y);
                                    if (dist <= radius) {
                                        e.controller.takeDamage(damage, dir);
                                        this.applyLifesteal(damage);
                                    }
                                }
                            });
                        }
                    }
                    
                    player.scene.time.delayedCall(400, () => {
                        spearProj.destroy();
                    });
                };

                const overlap = player.scene.physics.add.overlap(proj, targetGroup, (p, targetSprite) => {
                    const targetCtrl = getTargetController(targetSprite);
                    if (targetCtrl && !targetCtrl.isDead) {
                        explode(proj);
                        player.scene.physics.world.removeCollider(overlap);
                    }
                });
                
                // Destroy spear if it travels too far without hitting anything
                player.scene.time.delayedCall(Math.floor(1200 * (player.magicRangeMultiplier || 1.0)), () => {
                    if (proj.active && !exploded) {
                        explode(proj);
                    }
                });
            });
            player.scene.time.delayedCall(600, () => {
                player.isAttacking = false;
            });
        } else if (cd.id === 'witch_1_rival') {
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;
                
                const radius = 350;
                const targets = [];
                
                if (player.aiState === 'hostile') {
                    const p1 = player.scene.player;
                    if (p1 && p1.sprite && p1.sprite.active && p1.hp > 0) {
                        const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, p1.sprite.x, p1.sprite.y);
                        if (dist <= radius) {
                            targets.push(p1);
                        }
                    }
                } else {
                    if (player.scene.enemies) {
                        player.scene.enemies.getChildren().forEach(e => {
                            if (e && e.active && e.controller && !e.controller.isDead) {
                                const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y);
                                if (dist <= radius) {
                                    targets.push(e.controller);
                                }
                            }
                        });
                    }
                }
                
                targets.forEach(target => {
                    if (target.applyStatusEffect) {
                        target.applyStatusEffect('stun', 5000, 0);
                        
                        if (player.scene.showFloatingText) {
                            player.scene.showFloatingText(target.sprite.x, target.sprite.y - 40, 'SLOWED!', 0xbb00ff);
                        }
                        
                        if (target.sprite) {
                            target.sprite.setTint(0xba55d3);
                            player.scene.time.delayedCall(5000, () => {
                                if (target.sprite && target.sprite.active) {
                                    target.sprite.clearTint();
                                }
                            });
                        }
                        
                        if (player.scene.anims.exists('witch_debuff_anim')) {
                            const debuffSprite = player.scene.add.sprite(target.sprite.x, target.sprite.y - 10, 'witch_debuff');
                            debuffSprite.setScale(1.6);
                            debuffSprite.play('witch_debuff_anim');
                            
                            player.scene.time.delayedCall(5000, () => {
                                if (debuffSprite && debuffSprite.active) {
                                    debuffSprite.destroy();
                                }
                            });
                            
                            const updateTimer = player.scene.time.addEvent({
                                delay: 50,
                                callback: () => {
                                    if (debuffSprite && debuffSprite.active && target.sprite && target.sprite.active) {
                                        debuffSprite.setPosition(target.sprite.x, target.sprite.y - 10);
                                    } else {
                                        updateTimer.destroy();
                                    }
                                },
                                loop: true
                            });
                        }
                    }
                });
            });
        } else if (cd.id === 'witch_3_rival') {
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                const damage = Math.floor(cd.stats.int * 4.0) + weaponBonus + 10;
                const dir = player.facingDirection || 1;
                
                const proj = player.scene.physics.add.sprite(player.sprite.x + (dir * 25), player.sprite.y - 10, 'witch_3_charge');
                if (player.scene.anims.exists('witch_3_charge_fly')) {
                    proj.play('witch_3_charge_fly');
                }
                proj.body.setAllowGravity(false);
                proj.setScale(1.5);
                proj.setVelocity(dir * 500 * (player.magicRangeMultiplier || 1.0), 0);
                if (dir === -1) proj.setFlipX(true);
                
                let exploded = false;
                const explode = (chargeProj, hitTarget) => {
                    if (exploded) return;
                    exploded = true;
                    chargeProj.setVelocity(0, 0);
                    if (player.scene.anims.exists('witch_3_charge_explode')) {
                        chargeProj.play('witch_3_charge_explode');
                    }
                    
                    const targetCtrl = getTargetController(hitTarget);
                    if (targetCtrl && !targetCtrl.isDead) {
                        targetCtrl.takeDamage(damage, dir);
                        
                        if (targetCtrl.applyStatusEffect) {
                            targetCtrl.applyStatusEffect('mind_control', 5000, 0);
                        }
                        
                        if (player.scene.showFloatingText) {
                            player.scene.showFloatingText(targetCtrl.sprite.x, targetCtrl.sprite.y - 40, 'MIND CONTROLLED!', 0x32cd32);
                        }
                        
                        if (targetCtrl.sprite) {
                            targetCtrl.sprite.setTint(0x32cd32);
                            player.scene.time.delayedCall(5000, () => {
                                if (targetCtrl.sprite && targetCtrl.sprite.active) {
                                    targetCtrl.sprite.clearTint();
                                }
                            });
                        }
                        
                        if (player.scene.anims.exists('mind_control_debuff_anim')) {
                            const debuffSprite = player.scene.add.sprite(targetCtrl.sprite.x, targetCtrl.sprite.y - 10, 'mind_control_debuff');
                            debuffSprite.setScale(1.6);
                            debuffSprite.play('mind_control_debuff_anim');
                            
                            player.scene.time.delayedCall(5000, () => {
                                if (debuffSprite && debuffSprite.active) {
                                    debuffSprite.destroy();
                                }
                            });
                            
                            const updateTimer = player.scene.time.addEvent({
                                delay: 50,
                                callback: () => {
                                    if (debuffSprite && debuffSprite.active && targetCtrl.sprite && targetCtrl.sprite.active) {
                                        debuffSprite.setPosition(targetCtrl.sprite.x, targetCtrl.sprite.y - 10);
                                    } else {
                                        updateTimer.destroy();
                                    }
                                },
                                loop: true
                            });
                        }
                    }
                    
                    player.scene.time.delayedCall(300, () => {
                        chargeProj.destroy();
                    });
                };

                const overlap = player.scene.physics.add.overlap(proj, targetGroup, (p, targetSprite) => {
                    const targetCtrl = getTargetController(targetSprite);
                    if (targetCtrl && !targetCtrl.isDead) {
                        explode(proj, targetSprite);
                        player.scene.physics.world.removeCollider(overlap);
                    }
                });
                
                player.scene.time.delayedCall(Math.floor(1500 * (player.magicRangeMultiplier || 1.0)), () => {
                    if (proj.active && !exploded) {
                        explode(proj, null);
                    }
                });
            });
            player.scene.time.delayedCall(600, () => {
                player.isAttacking = false;
            });
        } else if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
            player.scene.time.delayedCall(300, () => {
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                const damage = Math.floor(cd.stats.int * 4.5) + weaponBonus + 10;
                const dir = player.facingDirection || 1;
                
                if (!player.sprite || !player.sprite.active) return;
                const p = player.scene.physics.add.sprite(player.sprite.x + (dir * 25), player.sprite.y - 10, 'projectile_blue');
                if (player.scene.anims.exists('projectile_blue_anim')) {
                    p.play('projectile_blue_anim');
                }
                p.body.setAllowGravity(false);
                p.setScale(0.75);
                p.setVelocity(dir * 500 * (player.magicRangeMultiplier || 1.0), 0);
                
                const targetGroup = player.aiState === 'hostile' ? p.scene.player.sprite : player.scene.enemies;
                const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                    if (player.aiState === 'hostile') {
                        if (player.scene.player && typeof player.scene.player.takeDamage === 'function') {
                            const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                            const targetBottom = player.scene.player.sprite.body ? player.scene.player.sprite.body.bottom : player.scene.player.sprite.y;
                            if (Math.abs(playerBottom - targetBottom) > 65) return;
                            player.scene.player.takeDamage(damage, dir);
                            proj.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    } else {
                        if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                            if (targetSprite.controller.isDead) return;
                            const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                            const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                            if (Math.abs(playerBottom - targetBottom) > 65) return;
                            targetSprite.controller.takeDamage(damage, dir);
                            this.applyLifesteal(damage);
                            if (Math.random() < 0.3 && targetSprite.controller.applyStatusEffect) {
                                targetSprite.controller.applyStatusEffect('burn', 3000, 8);
                            }
                            proj.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    }
                });
                
                player.scene.time.delayedCall(Math.floor(1500 * (player.magicRangeMultiplier || 1.0)), () => { if (p.active) p.destroy(); });
            });
            player.scene.time.delayedCall(600, () => {
                player.isAttacking = false;
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
        } else if (cd.id === 'ranger' || cd.id === 'ranger_rival' || cd.id === 'elven_longbowman' || cd.id === 'elven_longbowman_rival') {
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
                    const offsetY = 5 + (Math.random() * 15 - 7.5);
                    
                    const arrowTex = (cd.id === 'elven_longbowman' || cd.id === 'elven_longbowman_rival') ? 'elf_arrow' : 'arrow';
                    const proj = player.scene.physics.add.sprite(player.sprite.x + offsetX, player.sprite.y + offsetY, arrowTex);
                    proj.body.setAllowGravity(false);
                    proj.setVelocityX(dir * 1000); // Extremely fast
                    if (dir === -1) proj.setFlipX(true);
                    
                    const overlap = player.scene.physics.add.overlap(proj, player.scene.enemies, (p, enemySprite) => {
                        if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                            if (player.isAI && player.aiState === 'hostile') return;
                            if (enemySprite.controller.isDead) return;
                            
                            const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                            const enemyBottom = enemySprite.body ? enemySprite.body.bottom : enemySprite.y;
                            if (Math.abs(playerBottom - enemyBottom) > 65) return;

                            enemySprite.controller.takeDamage(damage, dir);
                            this.applyLifesteal(damage);
                            p.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
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
        } else if (cd.id && cd.id.startsWith('priest')) {
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;

                const alliesToHeal = [];
                if (player.aiState === 'hostile') {
                    alliesToHeal.push(player);
                } else {
                    if (player.scene.player) alliesToHeal.push(player.scene.player);
                    if (player.scene.partyMembers) {
                        player.scene.partyMembers.forEach(m => {
                            if (m && m !== player.scene.player) alliesToHeal.push(m);
                        });
                    }
                }

                alliesToHeal.forEach(ally => {
                    if (ally && ally.sprite && ally.sprite.active && ally.hp > 0) {
                        const healAmount = Math.floor(ally.maxHp * 0.35);
                        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
                        
                        if (player.scene.showFloatingText) {
                            player.scene.showFloatingText(ally.sprite.x, ally.sprite.y - 30, `+${healAmount} HP`, 0xffd700);
                        }

                        const lvl = saveData ? (saveData.level || 1) : 1;
                        const regenDuration = (23 + lvl) * 1000;
                        const regenStrength = Math.floor(cd.stats.int * 0.25) + 3;
                        if (ally.applyStatusEffect) {
                            ally.applyStatusEffect('regen', regenDuration, regenStrength);
                        }

                        ally.sprite.setTint(0xffd700);
                        player.scene.time.delayedCall(800, () => {
                            if (ally.sprite && ally.sprite.active) {
                                ally.sprite.clearTint();
                            }
                        });

                        if (player.scene.anims.exists('heal_animation_anim')) {
                            const healSprite = player.scene.add.sprite(ally.sprite.x, ally.sprite.y - 15, 'heal_animation');
                            healSprite.setBlendMode(Phaser.BlendModes.ADD);
                            healSprite.setAlpha(0.5);
                            healSprite.setScale(2.2);
                            healSprite.play('heal_animation_anim');
                            healSprite.once('animationcomplete-heal_animation_anim', () => {
                                healSprite.destroy();
                            });
                        }

                        for (let i = 0; i < 12; i++) {
                            const particle = player.scene.add.graphics();
                            particle.fillStyle(0xffd700, 0.7);
                            
                            const size = Phaser.Math.Between(4, 9);
                            const offsetX = Phaser.Math.Between(-30, 30);
                            const offsetY = Phaser.Math.Between(-40, 20);
                            
                            particle.fillRect(-size/2, -size/2, size, size);
                            particle.setPosition(ally.sprite.x + offsetX, ally.sprite.y + offsetY);
                            particle.setBlendMode(Phaser.BlendModes.ADD);
                            
                            player.scene.tweens.add({
                                targets: particle,
                                y: ally.sprite.y + offsetY - Phaser.Math.Between(60, 120),
                                alpha: 0,
                                scaleX: 1.5,
                                scaleY: 1.5,
                                duration: Phaser.Math.Between(600, 1000),
                                ease: 'Quad.easeOut',
                                onComplete: () => particle.destroy()
                             });
                        }
                    }
                });

                if (player.scene.updateHUD) player.scene.updateHUD();
            });
        }

        player.sprite.off('animationcomplete-' + comboKey);
        player.sprite.once('animationcomplete-' + comboKey, (anim) => {
            player.isAttacking = false;
            player._playAnim();
            
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
        
        player.scene.time.delayedCall(1500, () => {
            if (player.isAttacking) {
                player.isAttacking = false;
                player._playAnim();
            }
        });
    }
};
