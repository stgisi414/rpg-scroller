class CombatController {
    constructor(player) {
        this.player = player;
    }

    findKingTarget(player) {
        const scene = player.scene;
        if (!scene) return player;
        
        // In 1v1 FighterScene, queens buff/heal themselves
        const isFighterScene = scene.sys && scene.sys.settings && scene.sys.settings.key === 'FighterScene';
        if (isFighterScene) return player;

        const candidates = [];
        
        if (scene.player && scene.player !== player) candidates.push(scene.player);
        if (scene.p1 && scene.p1 !== player) candidates.push(scene.p1);
        if (scene.p2 && scene.p2 !== player) candidates.push(scene.p2);
        
        if (scene.partyMembers) {
            scene.partyMembers.forEach(m => {
                if (m && m !== player) candidates.push(m);
            });
        }
        if (scene.enemies) {
            scene.enemies.children.entries.forEach(sprite => {
                if (sprite.controller && sprite.controller !== player) {
                    candidates.push(sprite.controller);
                }
            });
        }
        if (scene.heroGroup) {
            scene.heroGroup.children.entries.forEach(sprite => {
                if (sprite.controller && sprite.controller !== player) {
                    candidates.push(sprite.controller);
                }
            });
        }

        const sameTeamKings = candidates.filter(c => {
            const classId = c.classId || (c.classData && c.classData.id);
            if (!classId || !classId.includes('king')) return false;
            if (player.alignment !== undefined && c.alignment !== undefined) {
                return player.alignment === c.alignment;
            }
            const isPlayer1 = (player === scene.player || (scene.p1 && player === scene.p1));
            const isPlayer2 = (c === scene.player || (scene.p1 && c === scene.p1));
            return isPlayer1 === isPlayer2;
        });

        if (sameTeamKings.length > 0) return sameTeamKings[0];
        
        const sameTeamAllies = candidates.filter(c => {
            if (player.alignment !== undefined && c.alignment !== undefined) {
                return player.alignment === c.alignment;
            }
            const isPlayer1 = (player === scene.player || (scene.p1 && player === scene.p1));
            const isPlayer2 = (c === scene.player || (scene.p1 && c === scene.p1));
            return isPlayer1 === isPlayer2;
        });
        
        if (sameTeamAllies.length > 0) return sameTeamAllies[0];
        return player;
    }

    _breakInvisibility() {
        const player = this.player;
        if (player.isInvisible) {
            player.isInvisible = false;
            player.sprite.setAlpha(1.0);
            if (player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, '👁️ Revealed!', 0xff6600);
            }
        }
    }

    getPlayerCritChance() {
        const player = this.player;
        let critChance = player.critChance || 0;
        if (player.statusEffects) {
            const critEffect = player.statusEffects.find(e => e.type === 'critical_boost');
            if (critEffect) critChance += critEffect.strength;
            const blessEffect = player.statusEffects.find(e => e.type === 'bless');
            if (blessEffect) critChance += blessEffect.strength;
            if (player.statusEffects.some(e => e.type === 'elixir_gods')) critChance += 5;
        }
        return critChance;
    }

    attack() {
        const player = this.player;
        
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

        // Cancel any pending attack completion timer to avoid overlapping resets
        if (player.attackTimer) {
            player.attackTimer.destroy();
            player.attackTimer = null;
        }

        // Destroy any active melee attack hitbox from a previous combo stage
        if (player.activeHitbox) {
            player.activeHitbox.destroy();
            player.activeHitbox = null;
        }

        player.isAttacking = true;

        // Break invisibility on attack
        this._breakInvisibility();

        // Calculate dynamic attack duration with haste status effects
        let duration = player.classData.attackDuration || 300;
        if (player.statusEffects) {
            const haste = player.statusEffects.find(e => e.type === 'haste');
            if (haste) {
                duration = Math.floor(duration * (1 - (haste.strength / 100)));
            }
            if (player.statusEffects.some(e => e.type === 'elixir_gods')) {
                duration = Math.floor(duration * 0.90);
            }
        }
        player.attackDuration = duration;

        const cd = player.classData;

        // Play attack animation (alternate if attack2 exists)
        if (cd.isSheet && player.scene.anims.exists(cd.id + '_attack')) {
            if (cd.attack2Frames && player.scene.anims.exists(cd.id + '_attack2') && cd.id !== 'pyromancer_1_rival') {
                // Determine if we should continue combo or start fresh with attack1
                const now = player.scene.time.now;
                const comboWindow = 1000; // 1-second combo chain window
                if (!player._lastAttackTime || (now - player._lastAttackTime > comboWindow)) {
                    player._attackSwap = false;
                }
                player._lastAttackTime = now;

                const animKey = player._attackSwap ? cd.id + '_attack2' : cd.id + '_attack';
                player._playAnim(animKey);

                // Toggle swap for the next hit
                player._attackSwap = !player._attackSwap;
            } else {
                player._playAnim();
            }
        }

        // Branch logic based on class
        const isMagicUser = (cd.id === 'wizard' || cd.id === 'wizard_rival' 
            || (cd.id && cd.id.startsWith('custom_npc_') && cd.weaponType === 'magic')) 
            && !cd.id.startsWith('witch') && !cd.id.startsWith('priest') && !cd.id.startsWith('pyromancer');
        if (isMagicUser) {
            // Mana check - single shot costs 2 MP
            if (player.mp < 2) {
                player.isAttacking = false;
                if (!player.isAI && player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Mana!', 0x4488ff);
                return;
            }
            player.mp -= 2;
     
            
            // Ranged Attack
            player.scene.time.delayedCall(100, () => {
                this.fireProjectile();
            });
            
            player.attackTimer = player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else if (cd.id === 'elven_queen' || cd.id === 'elven_queen_rival') {
            // Elven Queen: heal & regen spell, no damage
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;
                const target = this.findKingTarget(player);
                if (target && target.sprite && target.sprite.active && target.hp > 0) {
                    const healAmount = Math.floor(target.maxHp * 0.25) + 30;
                    target.hp = Math.min(target.maxHp, target.hp + healAmount);
                    
                    if (player.scene.showFloatingText) {
                        player.scene.showFloatingText(target.sprite.x, target.sprite.y - 30, `+${healAmount} HP`, 0x00ff00);
                    }
                    
                    if (target.applyStatusEffect) {
                        target.applyStatusEffect('regen', 10000, 15);
                    }
                    
                    if (player.scene.anims.exists('elven_queen_buff_anim')) {
                        const buffSprite = player.scene.add.sprite(target.sprite.x, target.sprite.y - 15, 'elven_queen_buff');
                        buffSprite.setBlendMode(Phaser.BlendModes.ADD);
                        buffSprite.setScale(1.5);
                        buffSprite.play('elven_queen_buff_anim');
                        buffSprite.once('animationcomplete-elven_queen_buff_anim', () => {
                            buffSprite.destroy();
                        });
                    }
                }
            });

            player.attackTimer = player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else if (cd.id === 'human_queen') {
            // Human Queen: buff health & damage 166%, no damage
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;
                const target = this.findKingTarget(player);
                if (target && target.sprite && target.sprite.active && target.hp > 0) {
                    if (!target.queenMaxHpBuffed) {
                        const hpBuff = Math.floor(target.maxHp * 1.66);
                        target.queenHpBuffAmount = hpBuff;
                        target.queenMaxHpBuffed = true;
                        target.maxHp += hpBuff;
                        target.hp = Math.min(target.maxHp, target.hp + hpBuff);
                        target.queenDamageBuffActive = true;
                        
                        if (player.scene.showFloatingText) {
                            player.scene.showFloatingText(target.sprite.x, target.sprite.y - 30, `Regal Buff! +166%`, 0xffd700);
                        }
                        
                        player.scene.time.delayedCall(10000, () => {
                            if (target && target.sprite && target.sprite.active) {
                                target.queenDamageBuffActive = false;
                                if (target.queenMaxHpBuffed) {
                                    target.queenMaxHpBuffed = false;
                                    target.maxHp = Math.max(10, target.maxHp - target.queenHpBuffAmount);
                                    target.hp = Math.min(target.maxHp, target.hp);
                                    if (player.scene.showFloatingText) {
                                        player.scene.showFloatingText(target.sprite.x, target.sprite.y - 30, "Buff Expired", 0xffaa00);
                                    }
                                }
                            }
                        });
                    } else {
                        if (player.scene.showFloatingText) {
                            player.scene.showFloatingText(target.sprite.x, target.sprite.y - 30, `Buff Refreshed!`, 0xffd700);
                        }
                    }
                    
                    if (player.scene.anims.exists('human_queen_buff_anim')) {
                        const buffSprite = player.scene.add.sprite(target.sprite.x, target.sprite.y - 15, 'human_queen_buff');
                        buffSprite.setBlendMode(Phaser.BlendModes.ADD);
                        buffSprite.setScale(1.5);
                        buffSprite.play('human_queen_buff_anim');
                        buffSprite.once('animationcomplete-human_queen_buff_anim', () => {
                            buffSprite.destroy();
                        });
                    }
                }
            });

            player.attackTimer = player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else if (cd.id === 'ranger' || cd.id === 'ranger_rival' || cd.id === 'elven_longbowman' || cd.id === 'elven_longbowman_rival') {
            // Ranger Ranged Attack
            player.scene.time.delayedCall(250, () => {
                if (player.sprite && player.sprite.active) this.fireArrow();
            });

            player.attackTimer = player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (cd.isSheet) player._playAnim();
            });
        } else {
            // Melee Attack (Warrior, Samurai uses melee for now)
            let attackRange = player.isAI ? 120 : 80;
            if (cd.id && cd.id.includes('dark_elf_guard')) {
                attackRange = 180;
            }
            const attackHeight = 55;
            const offset = (attackRange / 2) - 10;
            const hitboxX = player.sprite.x + (offset * player.facingDirection);
            const hitbox = player.scene.add.zone(hitboxX, player.sprite.y, attackRange, attackHeight);
            player.scene.physics.add.existing(hitbox);
            hitbox.body.setAllowGravity(false);
            hitbox.body.moves = false;
            player.activeHitbox = hitbox;

            player.scene.physics.overlap(hitbox, targetGroup, (box, targetSprite) => {
                const targetCtrl = getTargetController(targetSprite);
                if (targetCtrl && typeof targetCtrl.takeDamage === 'function') {
                    if (targetCtrl.isDead) return;
                    
                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                    const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                    if (Math.abs(playerBottom - targetBottom) > 65) return;
                    
                    const weaponBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
                    
                    // Class-specific damage formulas
                    let damage;
                    if (cd.id && cd.id.startsWith('custom_npc_')) {
                        const weaponType = cd.weaponType || 'sword';
                        if (weaponType === 'axe' || weaponType === 'pickaxe') {
                            damage = (cd.stats.str * 3.5) + weaponBonus + Math.floor(Math.random() * 5);
                        } else if (weaponType === 'hoe') {
                            damage = (cd.stats.str * 2.5) + (cd.stats.dex * 1.5) + weaponBonus + Math.floor(Math.random() * 5);
                        } else { // sword / default
                            damage = (cd.stats.str * 3) + weaponBonus + Math.floor(Math.random() * 5);
                        }
                    } else if (cd.id === 'samurai') {
                        damage = Math.floor(cd.stats.dex * 2.5) + Math.floor(cd.stats.str * 0.5) + weaponBonus + Math.floor(Math.random() * 5);
                    } else if (cd.id === 'ranger') {
                        damage = (cd.stats.dex * 2) + cd.stats.str + weaponBonus + Math.floor(Math.random() * 5);
                    } else if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
                        damage = Math.floor(cd.stats.str * 3.5) + Math.floor(cd.stats.int * 1.5) + weaponBonus + Math.floor(Math.random() * 5);
                    } else if (cd.id.startsWith('pyromancer')) {
                        damage = Math.floor(cd.stats.int * 3) + weaponBonus + Math.floor(Math.random() * 5);
                    } else {
                        // Knight / Warrior — STR primary
                        damage = (cd.stats.str * 3) + weaponBonus + Math.floor(Math.random() * 5);
                    }
                    
                    damage = Math.floor(damage * player.getDamageMultiplier());
                    
                    // Crit check
                    let isCrit = false;
                    if (Math.random() * 100 < this.getPlayerCritChance()) {
                        damage = Math.floor(damage * 2);
                        isCrit = true;
                    }
                    
                    targetCtrl.takeDamage(damage, player.facingDirection);
                    this.applyLifesteal(damage);
                    
                    if (isCrit && player.scene.showFloatingText) {
                        player.scene.showFloatingText(targetSprite.x, targetSprite.y - 60, 'CRIT!', 0xffff00);
                    }
                    
                    // Apply burn if it is pyromancer_1_rival's basic Flame Punch attack
                    if (cd.id === 'pyromancer_1_rival') {
                        if (targetCtrl.applyStatusEffect) {
                            targetCtrl.applyStatusEffect('burn', 5000, 12);
                        }
                    }
                }
            });

            player.attackTimer = player.scene.time.delayedCall(player.attackDuration, () => {
                player.isAttacking = false;
                if (player.activeHitbox) {
                    player.activeHitbox.destroy();
                    player.activeHitbox = null;
                }
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
        const arrowTex = (cd.id === 'elven_longbowman' || cd.id === 'elven_longbowman_rival') ? 'elf_arrow' : 'arrow';
        const proj = player.scene.physics.add.sprite(player.sprite.x + offsetX, player.sprite.y + 10, arrowTex);

        proj.body.setAllowGravity(false);
        proj.setVelocityX(player.facingDirection * 600);
        if (player.facingDirection === -1) proj.setFlipX(true);

        // Setup collision
        const overlap = player.scene.physics.add.overlap(proj, player.scene.enemies, (p, enemySprite) => {
            if (enemySprite.controller && typeof enemySprite.controller.takeDamage === 'function') {
                if (player.isAI && player.aiState === 'hostile') return; // AI doesn't hit enemies
                if (enemySprite.controller.isDead) return; // Fix: ignore already dead enemies

                const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                const enemyBottom = enemySprite.body ? enemySprite.body.bottom : enemySprite.y;
                if (Math.abs(playerBottom - enemyBottom) > 65) return;

                let isCrit = false;
                let finalDamage = damage;
                if (Math.random() * 100 < this.getPlayerCritChance()) {
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
        proj.setScale(0.5);
        proj.setVelocityX(player.facingDirection * 400);
        if (player.facingDirection === -1) proj.setFlipX(true);
        
        // Setup collision
        const targetGroup = player.aiState === 'hostile' ? proj.scene.player.sprite : player.scene.enemies;
        const overlap = player.scene.physics.add.overlap(proj, targetGroup, (p, targetSprite) => {
            if (player.aiState === 'hostile') {
                if (player.scene.player && typeof player.scene.player.takeDamage === 'function') {
                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                    const targetBottom = player.scene.player.sprite.body ? player.scene.player.sprite.body.bottom : player.scene.player.sprite.y;
                    if (Math.abs(playerBottom - targetBottom) > 65) return;
                    
                    player.scene.player.takeDamage(damage, player.facingDirection);
                    p.destroy();
                    player.scene.physics.world.removeCollider(overlap);
                }
            } else {
                if (targetSprite.controller && typeof targetSprite.controller.takeDamage === 'function') {
                    if (targetSprite.controller.isDead) return;
                    
                    const playerBottom = player.sprite.body ? player.sprite.body.bottom : player.sprite.y;
                    const targetBottom = targetSprite.body ? targetSprite.body.bottom : targetSprite.y;
                    if (Math.abs(playerBottom - targetBottom) > 65) return;

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

    megaComboSpell() {
        window.SpellController.megaComboSpell.call(this);
    }

    summonComboSpell() {
        window.SpellController.summonComboSpell.call(this);
    }

    superComboSpell() {
        window.SpellController.superComboSpell.call(this);
    }
    startDash(directionMultiplier) {
        const player = this.player;
        // Stamina check - dash costs 15 SP
        if (player.sp < 15) {
            if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No Stamina!', 0x44ff44);
            return;
        }
        player.sp -= 15;

        
        player.isDashing = true;
        const dSpd = (typeof player.dashSpeed === 'number' && !isNaN(player.dashSpeed)) ? player.dashSpeed : 500;
        player.sprite.setVelocityX(dSpd * directionMultiplier);
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
        return window.StatusEffectManager.takeDamage.call(this, amount, knockbackDirection);
    }

    applyLifesteal(damageDealt) {
        return window.StatusEffectManager.applyLifesteal.call(this, damageDealt);
    }

    applyStatusEffect(type, durationMs, strength) {
        return window.StatusEffectManager.applyStatusEffect.call(this, type, durationMs, strength);
    }

    updateStatusEffects(delta) {
        return window.StatusEffectManager.updateStatusEffects.call(this, delta);
    }

    die() {
        return window.StatusEffectManager.die.call(this);
    }

}
