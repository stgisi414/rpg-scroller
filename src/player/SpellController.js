// src/player/SpellController.js - Extracts massive combo spells from CombatController.js
window.SpellController = {
megaComboSpell() {
        const player = this.player;
        const cd = player.classData;
        
        if (cd.id !== 'wizard' && cd.id !== 'wizard_rival' 
            && cd.id !== 'elven_spellblade' && cd.id !== 'elven_spellblade_rival'
            && cd.id !== 'pyromancer_1_rival'
            && !cd.id.startsWith('priest')) return;
            
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
        
        this._breakInvisibility();

        // Mana check - Spellblade burst costs 8 MP, wizard AoE costs 10 MP, pyromancer flamethrower costs 15 MP
        let cost = 10;
        if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
            cost = 8;
        } else if (cd.id === 'pyromancer_1_rival') {
            cost = 15;
        }
        
        if (player.mp < cost) {
            if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
            return;
        }
        player.mp -= cost;
        
        player.isAttacking = true;
        
        const comboKey = cd.id === 'pyromancer_1_rival' ? cd.id + '_attack2' : cd.id + '_combo';
        if (cd.isSheet && player.scene.anims.exists(comboKey)) {
            player._playAnim(comboKey);
        }

        if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
            player.scene.time.delayedCall(300, () => {
                const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                const damage = Math.floor(cd.stats.int * 3.5) + weaponBonus + 5;
                const dir = player.facingDirection || 1;
                const orbSpeed = 500;
                
                for (let i = 0; i < 3; i++) {
                    player.scene.time.delayedCall(i * 100, () => {
                        if (!player.sprite || !player.sprite.active) return;
                        const p = player.scene.physics.add.sprite(player.sprite.x + (dir * 25), player.sprite.y - 10, 'projectile_blue');
                        if (player.scene.anims.exists('projectile_blue_anim')) {
                            p.play('projectile_blue_anim');
                        }
                        p.body.setAllowGravity(false);
                        p.setScale(0.75);
                        p.setVelocity(dir * orbSpeed * (player.magicRangeMultiplier || 1.0), 0);
                        
                        const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                            const targetCtrl = getTargetController(targetSprite);
                            if (targetCtrl && !targetCtrl.isDead) {
                                targetCtrl.takeDamage(damage, dir);
                                this.applyLifesteal(damage);
                                if (Math.random() < 0.3 && targetCtrl.applyStatusEffect) {
                                    targetCtrl.applyStatusEffect('burn', 3000, 8);
                                }
                                proj.destroy();
                                player.scene.physics.world.removeCollider(overlap);
                            }
                        });
                        
                        player.scene.time.delayedCall(Math.floor(1500 * (player.magicRangeMultiplier || 1.0)), () => { if (p.active) p.destroy(); });
                    });
                }
            });
            player.scene.time.delayedCall(800, () => {
                player.isAttacking = false;
            });
            return;
        } else if (cd.id === 'pyromancer_1_rival') {
            const dir = player.facingDirection || 1;
            const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            const damage = Math.floor(cd.stats.int * 1.5) + weaponBonus + 3;
            
            // Channel/stream flamethrower fireballs over 800ms
            for (let i = 0; i < 8; i++) {
                player.scene.time.delayedCall(i * 100, () => {
                    if (!player.sprite || !player.sprite.active) return;
                    
                    const spreadY = (Math.random() - 0.5) * 30; // slight vertical spread
                    const p = player.scene.physics.add.sprite(player.sprite.x + (dir * 30), player.sprite.y - 10 + spreadY, 'projectile_blue');
                    p.body.setAllowGravity(false);
                    p.setScale(0.5); // 1/2 scale of standard projectile_blue
                    p.setTint(0xff5500); // deep red-orange fire tint
                    p.setVelocity(dir * (400 + Math.random() * 150), 0);
                    if (dir === -1) p.setFlipX(true);
                    
                    if (player.scene.anims.exists('projectile_blue_anim')) {
                        p.play('projectile_blue_anim');
                    }
                    
                    const overlap = player.scene.physics.add.overlap(p, targetGroup, (proj, targetSprite) => {
                        const targetCtrl = getTargetController(targetSprite);
                        if (targetCtrl && !targetCtrl.isDead) {
                            targetCtrl.takeDamage(damage, dir);
                            if (targetCtrl.applyStatusEffect) {
                                targetCtrl.applyStatusEffect('burn', 5000, 5); // stacking/refreshing burn
                            }
                            proj.destroy();
                            player.scene.physics.world.removeCollider(overlap);
                        }
                    });
                    
                    player.scene.time.delayedCall(800, () => { if (p.active) p.destroy(); });
                });
            }
            
            player.scene.time.delayedCall(900, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
            return;
        }

        if (cd.id.startsWith('priest')) {
            player.scene.time.delayedCall(200, () => {
                if (!player.isAI && player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "BLESSING!", 0xffff00);
                }

                // Apply to self
                if (player.applyStatusEffect) player.applyStatusEffect('bless', 12000, 75);
                
                // Spawn animation on self
                if (player.scene.anims.exists('bless_buff_anim')) {
                    const buffSprite = player.scene.add.sprite(player.sprite.x, player.sprite.y - 20, 'bless_buff');
                    buffSprite.setDepth(player.sprite.depth + 1);
                    buffSprite.play('bless_buff_anim');
                    buffSprite.once('animationcomplete-bless_buff_anim', () => buffSprite.destroy());
                }

                // Apply to party members (if not hostile AI)
                if (player.aiState !== 'hostile' && player.scene.partyMembers) {
                    player.scene.partyMembers.forEach(m => {
                        if (m && m.hp > 0 && m.applyStatusEffect && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, m.sprite.x, m.sprite.y) < 400) {
                            m.applyStatusEffect('bless', 12000, 75);
                            if (player.scene.anims.exists('bless_buff_anim')) {
                                const mBuff = player.scene.add.sprite(m.sprite.x, m.sprite.y - 20, 'bless_buff');
                                mBuff.setDepth(m.sprite.depth + 1);
                                mBuff.play('bless_buff_anim');
                                mBuff.once('animationcomplete-bless_buff_anim', () => mBuff.destroy());
                            }
                        }
                    });
                }
            });
            player.scene.time.delayedCall(800, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
            return;
        }

        // Trigger massive AoE explosion around the player
        player.scene.time.delayedCall(400, () => {
            const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            const damage = (cd.stats.int * 8) + weaponBonus + 30; // Mega damage
            
            // Screen shake for impact
            player.scene.cameras.main.shake(300, 0.015);
            
            if (!player.isAI && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "MEGA SPELL!", 0xff00ff);
            }

            // Visual effect - circle of magic bolts expanding
            if (!player.scene.textures.exists('magic_particle')) {
                const graphics = player.scene.add.graphics();
                graphics.fillStyle(0xffffff, 1);
                graphics.fillCircle(8, 8, 8);
                graphics.generateTexture('magic_particle', 16, 16);
                graphics.destroy();
            }

            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const dist = 120;
                const px = player.sprite.x + Math.cos(angle) * dist;
                const py = player.sprite.y + Math.sin(angle) * dist;
                const effect = player.scene.add.sprite(player.sprite.x, player.sprite.y, 'magic_particle').setScale(0.5);
                effect.setTint(0xff00ff);
                
                player.scene.tweens.add({
                    targets: effect,
                    x: px,
                    y: py,
                    scaleX: 2.5,
                    scaleY: 2.5,
                    alpha: 0,
                    duration: 600,
                    ease: 'Quad.easeOut',
                    onComplete: () => effect.destroy()
                });
            }

            // Damage area calculation
            const hitRadius = 250;
            const targets = player.aiState === 'hostile' ? [player.scene.player.sprite] : player.scene.enemies.getChildren();
            
            targets.forEach(targetSprite => {
                if (targetSprite && targetSprite.active && targetSprite.body) {
                    const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, targetSprite.x, targetSprite.y);
                    if (dist <= hitRadius) {
                        const dir = targetSprite.x > player.sprite.x ? 1 : -1;
                        if (player.aiState === 'hostile') {
                            if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                                targetSprite.controller.takeDamage(damage, dir);
                            }
                        } else {
                            if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                                targetSprite.controller.takeDamage(damage, dir);
                                this.applyLifesteal(damage);
                                if (Math.random() < 0.50 && targetSprite.controller.applyStatusEffect) {
                                    targetSprite.controller.applyStatusEffect('burn', 5000, 15);
                                }
                            }
                        }
                    }
                }
            });
            
            // Finish attack
            player.scene.time.delayedCall(500, () => {
                player.isAttacking = false;
            });
        });
    },

summonComboSpell() {
        const player = this.player;
        const cd = player.classData;
        
        this._breakInvisibility();
        if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
            // Mana check - costs 10 MP
            const cost = 10;
            if (player.mp < cost) {
                if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            player.mp -= cost;
            player.isAttacking = true;

            // Play combo animation
            const comboKey = cd.id + '_combo';
            if (cd.isSheet && player.scene.anims.exists(comboKey)) {
                player._playAnim(comboKey);
            }

            // Apply Spellblade Buff (10 seconds)
            player.hasSpellbladeBuff = true;
            player.speedMultiplier = 1.5;
            player.magicRangeMultiplier = 1.8;
            
            const strBoost = 15;
            cd.stats.str += strBoost;
            
            if (player.sprite && player.sprite.active) {
                player.sprite.setTint(0xffd700); // Golden glow
            }

            if (!player.isAI && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "M-BUFF ACTIVATED!", 0xffd700);
            }

            player.scene.time.delayedCall(10000, () => {
                player.hasSpellbladeBuff = false;
                player.speedMultiplier = 1.0;
                player.magicRangeMultiplier = 1.0;
                cd.stats.str -= strBoost;
                if (player.sprite && player.sprite.active) {
                    player.sprite.clearTint();
                }
                if (player.scene && player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, "Buff Expired", 0xffaa00);
                }
            });

            // Summon one ally based on alignment
            let summonClassId = '';
            const align = player.alignment || 0;
            if (align > 20) {
                // Good alignment: one heavenly type ally
                const goodAllies = ['heavenly_archangel', 'heavenly_cherub', 'heavenly_seraph', 'heavenly_valkyrie'];
                summonClassId = goodAllies[Math.floor(Math.random() * goodAllies.length)];
            } else if (align < -20) {
                // Evil alignment: one hell biome enemy
                const evilAlliesClean = ['male_damned', 'female_damned', 'twisted_damned', 'burning_damned', 'imp', 'old_demon'];
                summonClassId = evilAlliesClean[Math.floor(Math.random() * evilAlliesClean.length)];
            } else {
                // Neutral alignment: ambient custom hero
                const npcData = window.CharacterComposer.generateRandomNPC(player.scene, Math.random() < 0.5 ? 'male' : 'female');
                summonClassId = npcData.spriteKey;
            }

            if (summonClassId) {
                const spawnX = player.sprite.x - (player.facingDirection * 50);
                const spawnY = player.sprite.y;
                const ally = new PlayerController(player.scene, spawnX, spawnY, player.inputManager, {
                    isAI: true,
                    aiState: 'party',
                    classId: summonClassId
                });

                if (player.scene.partyMembers) {
                    player.scene.partyMembers.push(ally);
                }
                if (player.scene.heroGroup) {
                    player.scene.heroGroup.add(ally.sprite);
                }
                // Add collision with floor/platforms
                const groundCollider = player.scene.floor || player.scene.platforms;
                if (groundCollider) {
                    player.scene.physics.add.collider(ally.sprite, groundCollider);
                }

                if (player.scene.showFloatingText) {
                    player.scene.showFloatingText(spawnX, spawnY - 30, `Summoned ${summonClassId.replace('heavenly_', '').replace('custom_npc_', 'Hero')}`, 0xffff00);
                }

                // Clean up summoned unit after 15 seconds (rather than leaving dead on floor)
                player.scene.time.delayedCall(15000, () => {
                    if (ally && ally.sprite && ally.sprite.active) {
                        // Visual effect on vanish
                        const vanish = player.scene.add.sprite(ally.sprite.x, ally.sprite.y, 'magic_particle');
                        vanish.setScale(ally.sprite.scaleX);
                        vanish.setTint(0xffd700);
                        player.scene.tweens.add({
                            targets: vanish,
                            scaleX: ally.sprite.scaleX * 2,
                            scaleY: ally.sprite.scaleY * 2,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => vanish.destroy()
                        });
                        
                        // Fade out and destroy
                        player.scene.tweens.add({
                            targets: ally.sprite,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => {
                                ally.destroy();
                            }
                        });
                    }
                });
            }

            player.scene.time.delayedCall(800, () => {
                player.isAttacking = false;
            });
            return;
        }

        if (cd.id !== 'wizard' && cd.id !== 'wizard_rival') return;
        
        // Mana check - summon costs 30 MP (massive heal)
        if (player.mp < 30) {
            if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'Not Enough Mana (30)!', 0x4488ff);
            return;
        }
        player.mp -= 30;
        
        player.isAttacking = true;
        
        // Use the same combo anim or idle
        const comboKey = cd.id + '_combo';
        if (cd.isSheet && player.scene.anims.exists(comboKey)) {
            player._playAnim(comboKey);
        }

        player.scene.time.delayedCall(300, () => {
            // Screen effect
            player.scene.cameras.main.flash(500, 255, 255, 255);
            
            if (!player.isAI && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "ANGELIC SUMMON!", 0xffff00);
            }

            // Spawn the angel sprite floating above the player
            const angel = player.scene.add.sprite(player.sprite.x, player.sprite.y - 120, 'summon_angel');
            angel.setScale(2.0);
            angel.setDepth(10);
            angel.setAlpha(0);
            
            // Try to play animation
            if (!player.scene.anims.exists('summon_angel_anim')) {
                player.scene.anims.create({
                    key: 'summon_angel_anim',
                    frames: player.scene.anims.generateFrameNumbers('summon_angel', { start: 0, end: 9 }),
                    frameRate: 15,
                    repeat: -1
                });
            }
            angel.play('summon_angel_anim', true);
            
            // Fade in and float up
            player.scene.tweens.add({
                targets: angel,
                alpha: 1,
                y: player.sprite.y - 150,
                duration: 1000,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    // Heal the player
                    player.hp = player.maxHp;
                    if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, "FULL HEAL!", 0x00ff00);
                    
                    // Heal the party
                    if (player.aiState !== 'hostile' && player.scene.partyMembers) {
                        player.scene.partyMembers.forEach(member => {
                            if (member && member.hp > 0 && member.aiState === 'party') {
                                member.hp = member.maxHp;
                                if (player.scene.showFloatingText) player.scene.showFloatingText(member.sprite.x, member.sprite.y - 30, "FULL HEAL!", 0x00ff00);
                            }
                        });
                    }

                    if (!player.isAI && player.scene.updateHUD) player.scene.updateHUD();

                    // Fade out
                    player.scene.tweens.add({
                        targets: angel,
                        alpha: 0,
                        y: player.sprite.y - 200,
                        duration: 1000,
                        delay: 500,
                        onComplete: () => angel.destroy()
                    });
                }
            });
            
            // Finish attack early so player can move while angel finishes
            player.scene.time.delayedCall(600, () => {
                player.isAttacking = false;
            });
        });
    },
superComboSpell() {
    return SpellController_Helper.superComboSpell.call(this);
}
};
