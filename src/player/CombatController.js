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
        const player = this.player;
        const cd = player.classData;
        
        if (cd.id !== 'wizard' && cd.id !== 'wizard_rival' 
            && cd.id !== 'elven_spellblade' && cd.id !== 'elven_spellblade_rival'
            && cd.id !== 'pyromancer_1_rival') return;
            
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
    }

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
    }

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
        }        if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
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
                    // Spread them slightly vertically so it looks like a deadly swarm
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
        } else if (cd.id && cd.id.startsWith('priest')) {
            // Priest Healing Special: Heals whole party by 35% of max HP with golden glowing effects
            player.scene.time.delayedCall(300, () => {
                if (!player.sprite || !player.sprite.active) return;

                const alliesToHeal = [];
                if (player.aiState === 'hostile') {
                    alliesToHeal.push(player);
                } else {
                    // Include main player
                    if (player.scene.player) alliesToHeal.push(player.scene.player);
                    // Include companions
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

                        // Apply level-scaled regen buff: 23s + 1s per level
                        const lvl = window.saveData ? (window.saveData.level || 1) : 1;
                        const regenDuration = (23 + lvl) * 1000;
                        const regenStrength = Math.floor(cd.stats.int * 0.25) + 3;
                        if (ally.applyStatusEffect) {
                            ally.applyStatusEffect('regen', regenDuration, regenStrength);
                        }

                        // Gold glow tint
                        ally.sprite.setTint(0xffd700);
                        player.scene.time.delayedCall(800, () => {
                            if (ally.sprite && ally.sprite.active) {
                                ally.sprite.clearTint();
                            }
                        });

                        // Play PixelLab generated golden glowing animation
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

                        // Rising golden sparkles
                        for (let i = 0; i < 12; i++) {
                            const particle = player.scene.add.graphics();
                            particle.fillStyle(0xffd700, 0.7);
                            
                            const size = Phaser.Math.Between(4, 9);
                            const offsetX = Phaser.Math.Between(-30, 30);
                            const offsetY = Phaser.Math.Between(-40, 20);
                            
                            // Draw diamond-like sparkle shape
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
        const player = this.player;
        if (player.hp <= 0) return; // Already dead
        if (player.invulnerable) return; // Immune to damage (e.g. Witch fade)

        // Evasion check (including passive skills)
        const passives = player.passiveSkills || ( (!player.isAI && window.saveData) ? (window.saveData.passiveSkills || {}) : {} );
        const activeModifiers = {};
        for (const skillId in passives) {
            const rank = passives[skillId] || 0;
            if (rank > 0 && window.PASSIVE_SKILLS_DATA) {
                const skillDef = window.PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
                if (skillDef && skillDef.statsModifiers) {
                    for (const statKey in skillDef.statsModifiers) {
                        const val = skillDef.statsModifiers[statKey];
                        if (statKey.toLowerCase().includes('multiplier')) {
                            const delta = val - 1;
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + delta * rank;
                        } else {
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + val * rank;
                        }
                    }
                }
            }
        }

        let evasionChance = (activeModifiers.evasion || 0);
        let artifactDef = null;
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.evasion) {
                evasionChance += artifactDef.statBoosts.evasion;
            }
        }

        if (evasionChance > 0 && Math.random() < evasionChance) {
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, "Evaded!", 0x88ff88);
            }
            return;
        }

        // Block / Parry check — any class can block when ducking
        const isBlocking = player.wasDucking;

        // Apply damage reduction
        let finalAmount = amount;
        let dr = (activeModifiers.damage_reduction || 0) + (activeModifiers.damageReduction || 0);
        if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageReduction) {
            let alignmentValid = true;
            if (artifactDef.alignmentReq) {
                const align = player.alignment || 0;
                if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
            }
            if (alignmentValid) {
                dr += artifactDef.statBoosts.damageReduction;
            }
        }
        finalAmount = Math.max(1, Math.floor(amount * (1 - dr)));

        // Spiked Collar companion defense boost
        if (player.isAI && player.scene && player.scene.player) {
            const mainPlayer = player.scene.player;
            if (mainPlayer.inventory && mainPlayer.inventory.artifacts && mainPlayer.inventory.equippedArtifact >= 0) {
                const artKey = mainPlayer.inventory.artifacts[mainPlayer.inventory.equippedArtifact];
                if (artKey === 'artifact-spiked-collar') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * 0.85)); // 15% reduction
                }
            }
        }

        // Apply temporary armor / resistance potions
        if (player.statusEffects) {
            player.statusEffects.forEach(effect => {
                if (effect.type === 'armor') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * (1 - (effect.strength / 100))));
                } else if (effect.type === 'elixir_gods') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * 0.80)); // 20% DR
                }
            });
        }

        // Apply parry reduction: Witch takes 50% damage (50% mitigation), Knight/Samurai take 25% damage (75% mitigation)
        if (isBlocking) {
            const classId = player.classData && player.classData.id ? player.classData.id : '';
            if (classId.startsWith('witch')) {
                finalAmount = Math.max(0, Math.floor(finalAmount * 0.50));
            } else {
                finalAmount = Math.max(0, Math.floor(finalAmount * 0.25));
            }
        }

        player.hp -= finalAmount;

        // Damage reflection (Mirror Shield)
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.reflectDamage) {
                let closestEnemy = null;
                let minDist = 300;
                if (player.scene && player.scene.enemies) {
                    player.scene.enemies.getChildren().forEach(e => {
                        if (e && e.active && e.controller && !e.controller.isDead) {
                            const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y);
                            if (dist < minDist) {
                                minDist = dist;
                                closestEnemy = e.controller;
                            }
                        }
                    });
                }
                if (closestEnemy) {
                    const reflectedDmg = Math.max(1, Math.floor(finalAmount * artifactDef.statBoosts.reflectDamage));
                    closestEnemy.takeDamage(reflectedDmg, -knockbackDirection);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(closestEnemy.sprite.x, closestEnemy.sprite.y - 40, `Reflected: ${reflectedDmg}`, 0xff5555);
                    }
                }
            }
        }
        
        // Show damage text
        if (player.scene && player.scene.showFloatingText) {
            if (isBlocking) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, `Blocked! -${finalAmount}`, 0x8888ff);
            } else {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, `-${finalAmount}`, 0xff0000);
            }
        }

        // Apply knockback (negated if parrying)
        if (player.sprite && player.sprite.body) {
            if (isBlocking) {
                player.sprite.setVelocityX(0);
            } else {
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
        if (player.scene.anims.exists(hitKey) && !player.isAttacking && !isBlocking) {
            player._playAnim(hitKey);
        }


        if (!player.isAI && player.scene && player.scene.updateHUD) {
            player.scene.updateHUD();
        }

        // --- Auto-Potion Artifact: use HP potion automatically when below 30% HP ---
        if (!player.isAI && player.hp <= player.maxHp * 0.30) {
            if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
                const apKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                const apDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[apKey] : null;
                if (apDef && apDef.special === 'auto-potion') {
                    const now = player.scene ? player.scene.time.now : Date.now();
                    if (!player._lastAutoPotTime || now - player._lastAutoPotTime > 3000) {
                        if (player.inventory.potions > 0) {
                            player._lastAutoPotTime = now;
                            if (player.inventoryManager) {
                                player.inventoryManager.usePotion();
                            } else {
                                player.inventory.potions--;
                                player.hp = Math.min(player.maxHp, player.hp + 50);
                            }
                            if (player.scene && player.scene.showFloatingText) {
                                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, '+50 HP (Auto)', 0x44ff44);
                            }
                            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                        }
                    }
                }
            }
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
            
                    if (!player.isAI && player.scene && player.scene.updateHUD) {
                        player.scene.updateHUD();
                    }
                }
            }
        }

        // Potion lifesteal boost
        if (player.statusEffects) {
            const lBoost = player.statusEffects.find(e => e.type === 'lifesteal_boost');
            if (lBoost) {
                const healAmount = Math.max(1, Math.floor(damageDealt * (lBoost.strength / 100)));
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
                if (player.scene && player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmount} HP`, 0x00ff00);
                }
                if (!player.isAI && player.scene && player.scene.updateHUD) {
                    player.scene.updateHUD();
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
                if (effect.type === 'mind_control') { player.sprite.setTint(0x32cd32); hasTint = true; }
                else if (effect.type === 'stun' && !hasTint) { player.sprite.setTint(0xffff00); hasTint = true; }
                else if (effect.type === 'freeze' && !hasTint) { player.sprite.setTint(0x88ccff); hasTint = true; }
                else if (effect.type === 'burn' && !hasTint) { player.sprite.setTint(0xff6600); hasTint = true; }
                else if (effect.type === 'poison' && !hasTint) { player.sprite.setTint(0xbf00ff); hasTint = true; }
                else if (effect.type === 'regen' && !hasTint) { player.sprite.setTint(0x88ff88); hasTint = true; }
                else if (effect.type === 'elixir_gods' && !hasTint) { player.sprite.setTint(0xffd700); hasTint = true; }
                else if (effect.type === 'haste' && !hasTint) { player.sprite.setTint(0xffffff); hasTint = true; }
            }

            // Process tick damage
            if (effect.type === 'poison' || effect.type === 'burn') {
                effect.tickTimer += delta;
                const tickRate = effect.type === 'poison' ? 1000 : 500;
                
                if (effect.tickTimer >= tickRate) {
                    effect.tickTimer -= tickRate;
                    
                    const isFighterScene = player.scene && player.scene.sys && player.scene.sys.settings && player.scene.sys.settings.key === 'FighterScene';
                    const shouldDamage = !isFighterScene || player.scene.matchActive;
                    
                    if (shouldDamage) {
                        player.hp -= effect.strength;
                    }
                    
                    if (player.scene && player.scene.showFloatingText) {
                        const color = effect.type === 'poison' ? 0xbf00ff : 0xff6600;
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `-${effect.strength}`, color);
                    }
            
                    if (!player.isAI && player.scene && player.scene.updateHUD) player.scene.updateHUD();
 
                    if (shouldDamage && player.hp <= 0) {
                        this.die();
                        return;
                    }
                }
            }

            // Process regen tick
            if (effect.type === 'regen') {
                effect.tickTimer += delta;
                if (effect.tickTimer >= 1000) {
                    effect.tickTimer -= 1000;
                    player.hp = Math.min(player.maxHp, player.hp + effect.strength);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 45, `+${effect.strength}`, 0x00ff00);
                    }
                    if (!player.isAI && player.scene && player.scene.updateHUD) player.scene.updateHUD();
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

        // Phoenix Feather Revive
        if (!player.isAI && player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.special === 'phoenix-revive') {
                if (!player.phoenixReviveUsedInZone) {
                    player.phoenixReviveUsedInZone = true;
                    player.hp = Math.floor(player.maxHp * 0.3);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Phoenix Rebirth!", 0xffaa00);
                    }
                    if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                    return;
                }
            }
        }

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

                    // Apply faction reputation changes on defeating a Rival (Phase 8)
                    if (player.faction && window.changeFactionReputation) {
                        window.changeFactionReputation(player.faction, -10, true);
                        const rivalFactionData = window.WORLD_FACTIONS[player.faction];
                        if (rivalFactionData && rivalFactionData.relations) {
                            const enemyFactions = Object.keys(rivalFactionData.relations).filter(fid => rivalFactionData.relations[fid] <= -30);
                            enemyFactions.forEach(fid => {
                                window.changeFactionReputation(fid, 10, true);
                                const fName = window.WORLD_FACTIONS[fid] ? window.WORLD_FACTIONS[fid].name : fid;
                                if (player.scene && player.scene.showFloatingText) {
                                    player.scene.time.delayedCall(1000, () => {
                                        if (player.sprite && player.sprite.active) {
                                            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 100, `🤝 +10 rep with ${fName}`, 0x88aaff);
                                        }
                                    });
                                }
                            });
                        }
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
                if (player.isCargoCarrier) {
                    if (window.saveData.cargo) {
                        let remaining = 2;
                        for (const itemId in window.saveData.cargo) {
                            if (remaining <= 0) break;
                            const qty = window.saveData.cargo[itemId] || 0;
                            if (qty > 0) {
                                const toSubtract = Math.min(qty, remaining);
                                window.saveData.cargo[itemId] -= toSubtract;
                                remaining -= toSubtract;
                                if (window.saveData.cargo[itemId] <= 0) {
                                    delete window.saveData.cargo[itemId];
                                }
                            }
                        }
                    }
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, "MULE LOST! -2 CARGO!", 0xff4444);
                    }
                    if (player.scene && player.scene.spawnCargoCompanion) {
                        player.scene.time.delayedCall(100, () => {
                            player.scene.spawnCargoCompanion();
                        });
                    }
                }
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
            // ═══════════════════════════════════════════
            // PLAYER DEATH → REBIRTH CUTSCENE
            // ═══════════════════════════════════════════
            const scene = player.scene;
            scene.isCutscene = true;

            // --- 1. WIPE ALL PARTY MEMBERS & MULES ---
            if (scene.partyMembers) {
                [...scene.partyMembers].forEach(member => {
                    if (member.sprite) member.sprite.destroy();
                });
                scene.partyMembers = [];
            }
            // Clear saved party
            if (window.saveData) {
                window.saveData.party = [];
                // Wipe all cargo (mules are gone)
                window.saveData.cargo = {};
            }
            // Respawn cargo companion (removes mule sprites)
            if (scene.spawnCargoCompanion) scene.spawnCargoCompanion();

            // --- 2. XP PENALTY ---
            let xpLoss = 0;
            if (window.saveData) {
                const currentZone = window.saveData.currentZone || 0;
                const isHell = currentZone === -666 || (scene.worldManager && scene.worldManager.currentZoneData && scene.worldManager.currentZoneData.biome === 'Hell');
                const lossPct = isHell ? 0.10 : 0.01;
                const currentXp = window.saveData.xp || 0;
                xpLoss = Math.floor(currentXp * lossPct);
                window.saveData.xp = Math.max(0, currentXp - xpLoss);
            }

            // --- 3. CALCULATE RESPAWN ZONE ---
            let respawnZone = 0;
            if (window.saveData) {
                const currentZone = window.saveData.currentZone || 0;
                const isHell = currentZone === -666;
                if (!isHell && window.saveData.zones) {
                    for (let i = currentZone; i >= 0; i--) {
                        if (i % 4 === 0) { respawnZone = i; break; }
                    }
                }
                window.saveData.currentZone = respawnZone;
                if (window.saveData.preWrathZone !== undefined) {
                    delete window.saveData.preWrathZone;
                }
                window.saveData.hp = window.saveData.maxHp || player.maxHp || 100;
                player.hp = window.saveData.hp;
                player.saveGame();
                player._persistToLocalStorage();
            }

            // --- 4. SHOW REBIRTH CUTSCENE OVERLAY ---
            const overlay = document.createElement('div');
            overlay.id = 'death-rebirth-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0); display: flex; flex-direction: column;
                align-items: center; justify-content: center; gap: 16px;
                font-family: 'Cinzel', 'Georgia', serif;
                pointer-events: none; transition: background 2s ease;
            `;
            document.body.appendChild(overlay);

            // Fade to black
            requestAnimationFrame(() => { overlay.style.background = 'rgba(0,0,0,1)'; });

            // Show death text after fade
            setTimeout(() => {
                const deathText = document.createElement('div');
                deathText.style.cssText = `
                    font-size: 56px; font-weight: 900; color: #cc0000;
                    text-shadow: 0 0 30px #ff0000, 0 0 60px #880000;
                    letter-spacing: 12px; text-transform: uppercase;
                    opacity: 0; transition: opacity 1.5s ease;
                `;
                deathText.textContent = 'YOU HAVE FALLEN';
                overlay.appendChild(deathText);
                requestAnimationFrame(() => { deathText.style.opacity = '1'; });

                // Show penalties
                setTimeout(() => {
                    const penaltyContainer = document.createElement('div');
                    penaltyContainer.style.cssText = `
                        display: flex; flex-direction: column; align-items: center; gap: 8px;
                        opacity: 0; transition: opacity 1s ease;
                    `;

                    const penalties = [];
                    if (xpLoss > 0) penalties.push(`⚔️ Lost ${xpLoss} XP`);
                    penalties.push('💀 All party members perished');
                    penalties.push('📦 All cargo lost');

                    penalties.forEach(p => {
                        const line = document.createElement('div');
                        line.style.cssText = `font-size: 18px; color: #ff6666; letter-spacing: 2px;`;
                        line.textContent = p;
                        penaltyContainer.appendChild(line);
                    });

                    overlay.appendChild(penaltyContainer);
                    requestAnimationFrame(() => { penaltyContainer.style.opacity = '1'; });
                }, 1500);

                // Show rebirth text
                setTimeout(() => {
                    deathText.style.transition = 'opacity 1s ease, color 1.5s ease, text-shadow 1.5s ease';
                    deathText.textContent = 'REBORN';
                    deathText.style.color = '#44ddff';
                    deathText.style.textShadow = '0 0 30px #00aaff, 0 0 60px #0066aa';
                    deathText.style.letterSpacing = '16px';

                    const subtitleText = document.createElement('div');
                    subtitleText.style.cssText = `
                        font-size: 16px; color: #aaddff; letter-spacing: 4px;
                        font-style: italic; margin-top: 12px;
                        opacity: 0; transition: opacity 1s ease;
                    `;
                    const kingdom = window.getKingdomForZone ? window.getKingdomForZone(respawnZone) : null;
                    const townName = kingdom ? kingdom.name : 'the nearest town';
                    subtitleText.textContent = `Awakening in ${townName}...`;
                    overlay.appendChild(subtitleText);
                    requestAnimationFrame(() => { subtitleText.style.opacity = '1'; });
                }, 4000);

                // Fade out and restart
                setTimeout(() => {
                    overlay.style.transition = 'background 1.5s ease';
                    overlay.style.background = 'rgba(0,0,0,0)';
                    setTimeout(() => {
                        overlay.remove();
                        scene.scene.restart();
                    }, 1600);
                }, 6000);

            }, 2000);
        }
    }
}

window.CombatController = CombatController;
