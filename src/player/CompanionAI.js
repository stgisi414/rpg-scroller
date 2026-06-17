class CompanionAI {
    constructor(player) {
        this.player = player;
    }

    updateAI(time, delta) {
        const player = this.player;
        if (!player.sprite || !player.sprite.active) return;
        
        // DON'T reset inputs every frame - only reset on each AI tick
        // This ensures the shared update() sees the flags for movement/animation
        
        if (time - player.lastAITick < 100) return;
        player.lastAITick = time;

        // Reset inputs at the start of each tick
        player.aiInput.left = false;
        player.aiInput.right = false;
        player.aiInput.up = false;

        const p = player.scene.player;
        if (!p || !p.sprite || !p.sprite.active) return;
        
        let target = null;
        
        if (player.aiState === 'party') {
            let closestEnemy = null;
            let minDist = Infinity;
            player.scene.enemies.getChildren().forEach(e => {
                if (e.active) {
                    // Prevent AI Main Hero from chasing enemies near zone borders to avoid transition loops
                    if (player === p && player.scene && player.scene.zoneType) {
                        const widthTiles = player.scene.zoneType === 'Safe' ? 40 : 84;
                        const totalWidth = widthTiles * 46;
                        if (e.x < 150 || e.x > totalWidth - 150) return; // Ignore enemies near borders
                    }
                    const d = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y);
                    if (d < minDist) { minDist = d; closestEnemy = e; }
                }
            });
            
            if (closestEnemy && minDist < 400) {
                target = closestEnemy;
            } else {
                let targetX = player.sprite.x + 200;
                if (player.scene && player.scene.zoneType) {
                    const widthTiles = player.scene.zoneType === 'Safe' ? 40 : 84;
                    const totalWidth = widthTiles * 46;
                    // Wander towards the right, but if close to the border, wander towards the left
                    if (player.sprite.x > totalWidth - 250) targetX = player.sprite.x - 200;
                    else if (player.sprite.x < 250) targetX = player.sprite.x + 200;
                }
                if (player !== p) {
                    target = p.sprite;
                } else {
                    target = { x: targetX, y: player.sprite.y, isVirtual: true };
                }
            }
        } else if (player.aiState === 'hostile') {
            target = p.sprite;
        }
        
        if (target) {
            const dx = target.x - player.sprite.x;
            const dist = Math.abs(dx);
            
            // --- GEMINI AI OVERHAUL ---
            if (player.scene.geminiService && player.scene.geminiService.isReady && player.aiState === 'hostile') {
                if (time - (player.lastTacticTime || 0) > 3000) {
                    player.lastTacticTime = time;
                    let optimalDist = 40; // Melee
                    if (player.classData.id === 'wizard' || player.classData.id === 'ranger') optimalDist = 150; // Ranged

                    const battleState = {
                        enemyType: player.classId || 'Rival',
                        enemyClassType: (player.classId && (player.classId.includes('ranger') || player.classId.includes('wizard'))) ? 'RANGED' : 'MELEE',
                        distance: dist,
                        playerAction: p.isAttacking ? "Attacking" : "Idle",
                        playerHp: p.hp,
                        playerMaxHp: p.maxHp || 100,
                        enemyHp: player.hp,
                        enemyMaxHp: player.maxHp || 100,
                        enemyMp: player.mp || 0,
                        enemySp: player.sp || 0
                    };
                    player.scene.geminiService.getEnemyTactic(battleState).then(res => {
                        if (!player.scene || player.scene.isSceneDestroyed) return;
                        if (!player.sprite || !player.sprite.active) return;
                        player.currentTactic = res.tactic;
                        if (res.dialogue && player.scene.showFloatingText) {
                            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, res.dialogue, 0xffaa00);
                        }
                    }).catch(err => {
                        console.warn("Companion tactic fetch failed:", err);
                    });
                }
                
                if (player.currentTactic) {
                    if (player.currentTactic === 'MELEE_ATTACK') {
                        if (dx > 0) player.aiInput.right = true; else player.aiInput.left = true;
                        if (dist < 80) player.aiInput.attack = true;
                    } else if (player.currentTactic === 'RANGED_ATTACK') {
                        if (dist < 150) { if (dx > 0) player.aiInput.left = true; else player.aiInput.right = true; }
                        else if (dist > 400) { if (dx > 0) player.aiInput.right = true; else player.aiInput.left = true; }
                        player.aiInput.attack = true;
                    } else if (player.currentTactic === 'SUPER_ATTACK') {
                        player.superComboSpell();
                        player.currentTactic = 'IDLE';
                    } else if (player.currentTactic === 'BLOCK') {
                        player.aiInput.down = true;
                    } else if (player.currentTactic === 'DASH_EVADE') {
                        if (dx > 0) player.aiInput.dashLeft = true; else player.aiInput.dashRight = true;
                        player.currentTactic = 'IDLE';
                    } else if (player.currentTactic === 'CHASE') {
                        let optimalDist = 40; // Melee
                        if (player.classData.id === 'wizard' || player.classData.id === 'ranger') optimalDist = 150; // Ranged
                        if (dist > optimalDist - 20) {
                            if (dx > 0) player.aiInput.right = true; else player.aiInput.left = true;
                        } else {
                            player.aiInput.attack = true;
                        }
                    } else if (player.currentTactic === 'FLEE') {
                        if (dx > 0) player.aiInput.left = true; else player.aiInput.right = true;
                    } else if (player.currentTactic === 'HEAL') {
                        if (player.inventory && player.inventory.potions > 0) {
                            player.inventory.potions--;
                            player.hp = Math.min(player.maxHp, player.hp + 50);
                            if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Potion!", 0x00ff00);
                        }
                        player.currentTactic = 'IDLE';
                    }
                    player.aiTargetDx = dx;
                    return; // Skip fallback AI logic
                }
            }
            // --- END GEMINI AI ---
            
            let optimalDist = 40; // Melee
            if (player.classData.id === 'wizard' || player.classData.id === 'ranger') optimalDist = 150; // Ranged
            if (target === p.sprite && player.aiState === 'party') optimalDist = 80; // Follow distance
            
            // For virtual targets (wandering), ignore optimal distance and just walk there
            const isVirtual = target.isVirtual;
            
            // Movement logic
            if (dist > optimalDist || isVirtual) {
                if (dx > 0) player.aiInput.right = true;
                else player.aiInput.left = true;
            } else if (dist < optimalDist - 20 && !isVirtual) {
                // Back away if too close (unless melee, then stay close)
                if (player.classData.id !== 'knight' && player.classData.id !== 'warrior' && player.classData.id !== 'samurai') {
                    if (dx > 0) player.aiInput.left = true;
                    else player.aiInput.right = true;
                }
            }
            
            // Melee Aggression Override - KEEP walking into the enemy's face!
            if (!isVirtual && target !== p.sprite) {
                if (player.classData.id === 'knight' || player.classData.id === 'warrior' || player.classData.id === 'samurai') {
                    if (dist > 30) {
                        if (dx > 0) player.aiInput.right = true;
                        else player.aiInput.left = true;
                    }
                }
            }

            // Attack logic - attack when in range
            if (player.aiState === 'hostile' || target !== p.sprite) {
                // Adjust trigger distance so melee units actually reach the target instead of swinging at air
                let attackRange = optimalDist + 30;
                if (!isVirtual && target.type === 'spider') attackRange = optimalDist + 60; // large hitbox

                if (dist <= attackRange) {
                    if (Math.random() < 0.3) player.aiInput.attack = true;
                }

                // Dodge and Potion logic for Rivals (or smart enemies)
                if (player.aiState === 'hostile' && player.classId && player.classId.includes('rival')) {
                    if (player.inventory.potions === undefined) player.inventory.potions = 2; // Rivals get 2 potions
                    
                    // Potion use
                    if (player.hp < player.maxHp * 0.4 && player.inventory.potions > 0 && Math.random() < 0.05) {
                        player.inventory.potions--;
                        player.hp = Math.min(player.maxHp, player.hp + 50);
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Potion!", 0x00ff00);
                    }
                    
                    // Active dodging
                    if (p.isAttacking && dist < optimalDist + 50) {
                        if (Math.random() < 0.2) {
                            if (dx > 0) player.aiInput.dashLeft = true;
                            else player.aiInput.dashRight = true;
                        } else if (Math.random() < 0.1) {
                            player.aiInput.up = true; // Jump away
                        }
                    }
                }

                // Class specific tactics (Ranged)
                if (player.classData.id === 'ranger' || player.classData.id === 'mage') {
                    // Try to maintain distance
                    if (dist < 150) {
                        if (dx > 0) player.aiInput.left = true; else player.aiInput.right = true;
                        if (Math.random() < 0.05) player.aiInput.up = true; // jump away
                    }
                }
            }

            // Dash logic - charge into combat or catch up to player
            if ((player.aiInput.left || player.aiInput.right) && !isVirtual) {
                let dashChance = 0;
                
                // Dash to catch up to player
                if (target === p.sprite && dist > 150) {
                    dashChance = 0.2;
                } 
                // Dash to attack enemy
                else if (target !== p.sprite && dist > optimalDist + 20) {
                    dashChance = 0.02; // Default
                    if (player.classData.id === 'knight' || player.classData.id === 'warrior' || player.classData.id === 'samurai') {
                        dashChance = 0.15; // Melee charge
                    }
                }
                
                if (Math.random() < dashChance) {
                    if (player.aiInput.left) player.aiInput.dashLeft = true;
                    if (player.aiInput.right) player.aiInput.dashRight = true;
                }
            }
            
            // Jump logic - only jump if stuck for multiple consecutive ticks
            if (!player._stuckTicks) player._stuckTicks = 0;
            // Ignore attack when checking if stuck, otherwise melee attack stops them from jumping pits!
            const isMovingButStuck = (player.aiInput.left || player.aiInput.right) && Math.abs(player.sprite.body.velocity.x) < 5 && !player.aiInput.attack;
            if (isMovingButStuck) {
                player._stuckTicks++;
            } else {
                player._stuckTicks = 0;
            }
            // Jump if stuck (handles double jumping if stuck mid-air against a wall)
            if (player._stuckTicks >= 5) {
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    player.aiInput.up = true;
                    player._stuckTicks = 0; // Reset after jumping
                } else if (player.doubleJumpsLeft > 0 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                    player._stuckTicks = 0;
                }
            }
            
            // Also jump if target is significantly higher, regardless of horizontal distance
            if (!isVirtual && target.y < player.sprite.y - 40) {
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    player.aiInput.up = true;
                } else if (player.doubleJumpsLeft > 0 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                }
            }
            
            // Double jump across pits! If we are falling fast, and still trying to move left/right
            if (player.sprite.body.velocity.y > 50 && (player.aiInput.left || player.aiInput.right)) {
                if (player.doubleJumpsLeft > 0) {
                    player.aiInput.up = true;
                }
            }
            
            // Teleport failsafe for Party Members who get trapped in deep pits or left behind
            if (player.aiState === 'party' && target === p.sprite) {
                if (dist > 1000 || Math.abs(player.sprite.y - p.sprite.y) > 600) {
                    player.sprite.setPosition(p.sprite.x, p.sprite.y - 50);
                    player.sprite.setVelocity(0, 0);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "*Catching up*", 0xaaaaff);
                    }
                }
            }

            // Always face the target if we are in combat or following!
            // We set this here, but update() overrides it based on left/right input.
            // We will store the targetDx so update() can override its facing logic.
            player.aiTargetDx = dx;
        } else {
            player.aiTargetDx = 0;
            
            // If there's no target, but we are the main player in AI mode, look for NPCs!
            if (player === p && player.aiState === 'party' && player.scene && player.scene.npcs) {
                let closestNpc = null;
                let minDist = Infinity;
                player.scene.npcs.getChildren().forEach(npc => {
                    if (npc.active) {
                        const d = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, npc.x, npc.y);
                        if (d < minDist) { minDist = d; closestNpc = npc; }
                    }
                });
                
                if (closestNpc && minDist < 150) {
                    const dx = closestNpc.x - player.sprite.x;
                    if (minDist > 80) {
                        if (dx > 0) player.aiInput.right = true; else player.aiInput.left = true;
                    } else if (Math.random() < 0.05) {
                        // We are close to an NPC! Interact!
                        if (player.inputManager) {
                            // Synthesize an interact key press
                            if (!player.inputManager.keys.interact.isDown) {
                                player.inputManager.keys.interact.isDown = true;
                                player.inputManager.keys.interact.timeDown = player.scene.time.now;
                            }
                        }
                    }
                }
            }
        }
    }
}

window.CompanionAI = CompanionAI;
