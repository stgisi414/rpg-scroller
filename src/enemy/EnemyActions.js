// src/enemy/EnemyActions.js - Special spells, summoning, and projectiles for enemies
window.EnemyActions = {
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
    },

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
    },

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
    },

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
    },

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
    },

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
    },

spawnDarkElfMinion() {
        if (!this.sprite || !this.sprite.active) return;
        
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, "Rise, my loyal subjects!", 0xa020f0);
        }
        
        this.scene.time.delayedCall(600, () => {
            if (!this.sprite || !this.sprite.active) return;
            const xOffset = Math.random() < 0.5 ? -140 : 140;
            const minionScale = 0.9 * (this.scene.isIndoors ? (2.5 / 1.5) : 1.0);
            const spawnY = this.sprite.y + (30 * this.sprite.scaleY) - (32 * minionScale);
            
            const isRival = this.type.includes('rival');
            const minionType = isRival ? 'dark_elf_minion_rival' : 'dark_elf_minion';
            const minion = new EnemyController(this.scene, this.sprite.x + xOffset, spawnY, this.player, this.geminiService, minionType, false, true);
            if (minion.sprite) {
                minion.isAttacking = true; // disable standard AI move during spawn
                minion.sprite.play(`${minionType}-spawn`);
                minion.scene.time.delayedCall(1000, () => {
                    if (minion.sprite && minion.sprite.active) {
                        minion.isAttacking = false;
                    }
                });
            }
            if (this.scene.enemies) {
                this.scene.enemies.add(minion.sprite);
            }
        });
    },

spawnDwarfAlly() {
        if (!this.sprite || !this.sprite.active) return;
        
        // Float text showing summoning
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 30, "Rise, shield-brothers!", 0xffd700);
        }
        
        this.scene.time.delayedCall(600, () => {
            if (!this.sprite || !this.sprite.active) return;
            
            // Spawn random dwarf warrior or miner rival
            const xOffset = Math.random() < 0.5 ? -150 : 150;
            const dwarfType = Math.random() < 0.6 ? 'dwarf_warrior_rival' : 'dwarf_miner_rival';
            const scaleMultiplier = this.scene.isIndoors ? (2.5 / 1.5) : 1.0;
            const spawnY = this.sprite.y + (30 * this.sprite.scaleY) - (40 * scaleMultiplier);
            
            const dwarf = new EnemyController(this.scene, this.sprite.x + xOffset, spawnY, this.player, this.geminiService, dwarfType, false, true);
            if (this.scene.enemies) {
                this.scene.enemies.add(dwarf.sprite);
            }
        });
    },

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
    },

shootDarkElfArrow(shouldFlip) {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        const dir = shouldFlip ? -1 : 1;
        const arrow = this.scene.enemyProjectiles.create(this.sprite.x + (dir * 20), this.sprite.y, 'elf_arrow');
        if (arrow) {
            arrow.body.setAllowGravity(false);
            arrow.setVelocityX(dir * 550);
            if (shouldFlip) arrow.setFlipX(true);
            arrow.damage = 12 * (this.damageMultiplier || 1.0);
        }
    },

shootDarkElfSpell(shouldFlip) {
        if (!this.sprite || !this.sprite.active || !this.player || !this.player.sprite) return;
        const dir = shouldFlip ? -1 : 1;
        const orb = this.scene.enemyProjectiles.create(this.sprite.x + (dir * 20), this.sprite.y, 'projectile_blue');
        if (orb) {
            orb.body.setAllowGravity(false);
            orb.setScale(0.5);
            orb.setTint(0x9400d3); // Dark purple magic tint!
            orb.setVelocityX(dir * 450);
            if (shouldFlip) orb.setFlipX(true);
            orb.damage = 18 * (this.damageMultiplier || 1.0);
        }
    }
};
