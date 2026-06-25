class CompanionAI {
    constructor(player) {
        this.player = player;
        this._wantsToAdventure = false;
        this._lastZoneIndex = null;
    }

    _isElementVisible(id) {
        const el = document.getElementById(id);
        return el && window.getComputedStyle(el).display !== 'none';
    }

    updateAI(time, delta) {
        const player = this.player;
        if (!player.sprite || !player.sprite.active) {
            return;
        }

        // Reset wantsToAdventure when entering a Safe zone
        const currentZoneIndex = player.scene.worldManager ? player.scene.worldManager.currentZoneIndex : 0;
        if (this._lastZoneIndex !== currentZoneIndex) {
            this._lastZoneIndex = currentZoneIndex;
            if (player.scene.zoneType === 'Safe') {
                this._wantsToAdventure = false;
                this._wantsToTravel = false;
            }
        }
        
        // DON'T reset inputs every frame - only reset on each AI tick
        // This ensures the shared update() sees the flags for movement/animation
        
        if (time - player.lastAITick < 100) {
            return;
        }
        player.lastAITick = time;

        // Reset inputs at the start of each tick
        player.aiInput.left = false;
        player.aiInput.right = false;
        player.aiInput.up = false;
        player.aiInput.down = false;
        player.aiInput.interact = false;
        player.aiInput.superSpell = false;
        player.aiInput.megaSpell = false;
        player.aiInput.summonSpell = false;

        const p = player.scene.player;
        if (!p || !p.sprite || !p.sprite.active) {
            return;
        }
        
        if (player.isAI && player === p) {
            this._handleMainHeroAutoPlay(time, delta);
        }
        
        let target = null;
        
        let hasCloseNpc = false;
        if (player === p && player.scene.zoneType === 'Safe') {
            const isChatOpen = this._isElementVisible('chat-ui');
            const isShopOpen = this._isElementVisible('ui-shop');
            if (player.scene.npcs && !isChatOpen && !isShopOpen && (time - (this._lastChatClosedTime || 0) > 8000)) {
                let minDist = Infinity;
                player.scene.npcs.forEach(npc => {
                    if (npc && npc.sprite && npc.sprite.active) {
                        const d = Math.abs(npc.sprite.x - player.sprite.x);
                        if (d < minDist) { minDist = d; }
                    }
                });
                if (minDist < 200) {
                    hasCloseNpc = true;
                }
            }
        }

        const hasMainHeroSafeZoneInput = player === p && player.scene.zoneType === 'Safe' && (
            player.aiInput.left || 
            player.aiInput.right || 
            player.aiInput.interact ||
            (!this._wantsToAdventure && hasCloseNpc) ||
            this._isElementVisible('chat-ui') ||
            this._isElementVisible('ui-shop') ||
            this._isElementVisible('ui-town-directory')
        );

        if (player.aiState === 'party' && !hasMainHeroSafeZoneInput) {
            let closestEnemy = null;
            let minDist = Infinity;
            player.scene.enemies.getChildren().forEach(e => {
                if (e.active && (!e.controller || !e.controller.isDead)) {
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
            
            // Main hero in Auto-Play targets enemies at any distance (full zone seeking).
            // Companions only target enemies within 400px to avoid running off-screen away from the player.
            const maxDetectionDist = (player === p) ? 3000 : 400;
            if (closestEnemy && minDist < maxDetectionDist) {
                target = closestEnemy;
            } else {
                let isProgression = false;
                const widthTiles = player.scene.zoneType === 'Safe' ? 40 : 84;
                const totalWidth = widthTiles * 46;
                
                if (player === p) {
                    if (player.scene.zoneType !== 'Safe') {
                        // Check if all enemies in the zone are dead
                        let hasEnemies = false;
                        player.scene.enemies.getChildren().forEach(e => {
                            if (e.active && (!e.controller || !e.controller.isDead)) {
                                hasEnemies = true;
                            }
                        });
                        if (!hasEnemies) {
                            isProgression = true;
                        }
                    } else if (this._wantsToAdventure) {
                        isProgression = true;
                    }
                }

                if (isProgression) {
                    target = { x: totalWidth + 100, y: player.sprite.y, isVirtual: true };
                } else {
                    let targetX = player.lastVirtualTargetX || player.sprite.x;
                    if (!player.lastVirtualTargetX || Math.abs(player.sprite.x - player.lastVirtualTargetX) < 15 || time % 8000 < 100) {
                        // Wander towards the right, but if close to the border, wander towards the left
                        if (player.sprite.x > totalWidth - 250) targetX = player.sprite.x - 200;
                        else if (player.sprite.x < 250) targetX = player.sprite.x + 200;
                        else targetX = player.sprite.x + (Math.random() < 0.5 ? 200 : -200);
                    }
                    player.lastVirtualTargetX = targetX;
                    if (player !== p) {
                        target = p.sprite;
                    } else {
                        target = { x: targetX, y: player.sprite.y, isVirtual: true };
                    }
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
                    const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                    if (isRanged) {
                        optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
                    }

                    const battleState = {
                        enemyType: player.classId || 'Rival',
                        enemyClassType: isRanged ? 'RANGED' : 'MELEE',
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
                        const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                        if (isRanged) {
                            optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
                        }
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
            const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
            if (isRanged) {
                optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
            }
            if (target === p.sprite && player.aiState === 'party') optimalDist = 80; // Follow distance
            
            // For virtual targets (wandering), ignore optimal distance and just walk there
            const isVirtual = target.isVirtual;
            
            // Movement logic
            if (dist > optimalDist || (isVirtual && dist > 10)) {
                if (dx > 5) player.aiInput.right = true;
                else if (dx < -5) player.aiInput.left = true;
            } else if (dist < optimalDist - 20 && !isVirtual) {
                // Back away if too close (unless melee, then stay close)
                if (player.classData.id !== 'knight' && player.classData.id !== 'warrior' && player.classData.id !== 'samurai') {
                    if (dx > 5) player.aiInput.left = true;
                    else if (dx < -5) player.aiInput.right = true;
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

            // Vertical traversal (jumping)
            if (!isVirtual) {
                const dy = target.y - player.sprite.y;
                
                // If the target is WAY above us (unreachable by direct double jump), 
                // we should wander horizontally to find a lower platform or stairs
                if (dy < -180) {
                    if (time % 4000 < 2000) player.aiInput.left = true;
                    else player.aiInput.right = true;
                    
                    // Periodically jump while wandering to get onto ledges
                    if (Math.random() < 0.05) player.aiInput.up = true;
                }
                // If target is above us by at least 40 pixels, and we are horizontally close, jump!
                else if (dy < -40 && dist < 150) {
                    player.aiInput.up = true;
                }
                // If target is below us and we are directly above them, keep walking to fall off the ledge
                else if (dy > 50 && dist < 30) {
                    if (target.x > player.sprite.x) player.aiInput.right = true;
                    else player.aiInput.left = true;
                }
            }

            // Attack logic - attack when in range and target is an enemy
            const isEnemy = target && !target.isVirtual && target !== p.sprite && target !== player.sprite;
            if (player.aiState === 'hostile' || isEnemy) {
                // Adjust trigger distance so melee units actually reach the target instead of swinging at air
                let attackRange = optimalDist + 30;
                if (!isVirtual && target.type === 'spider') attackRange = optimalDist + 60; // large hitbox

                // Super Spells and Abilities
                let usedSpell = false;
                if (player.classData.id === 'wizard' || player.classData.id === 'wizard_rival') {
                    if (player.hp < player.maxHp * 0.4 && player.mp >= 30 && Math.random() < 0.2) {
                        player.aiInput.summonSpell = true;
                        usedSpell = true;
                    } else if (player.mp >= 10 && Math.random() < 0.1) {
                        let closeEnemies = 0;
                        if (player.scene && player.scene.enemies) {
                            player.scene.enemies.getChildren().forEach(e => {
                                if (e.active && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y) < 150) {
                                    closeEnemies++;
                                }
                            });
                        }
                        if (closeEnemies >= 2 || (target !== p.sprite && dist < 120)) {
                            player.aiInput.megaSpell = true;
                            usedSpell = true;
                        }
                    } else if (player.mp >= 4 && dist <= attackRange && Math.random() < 0.2) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'ranger' || player.classData.id === 'ranger_rival') {
                    if (player.sp >= player.maxSp * 0.4 && dist <= attackRange + 100 && Math.random() < 0.15) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'knight' || player.classData.id === 'warrior' || player.classData.id === 'knight_rival') {
                    if (player.sp >= player.maxSp * 0.5 && dist <= attackRange && Math.random() < 0.15) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'samurai' || player.classData.id === 'samurai_rival') {
                    let costRatio = 0.8 - ((player.classData.stats.vit || 10) * 0.015);
                    if (costRatio < 0.2) costRatio = 0.2;
                    if (player.sp >= player.maxSp * costRatio && dist <= attackRange + 50 && Math.random() < 0.15) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') {
                    if (player.mp >= 8 && Math.random() < 0.1) {
                        player.aiInput.megaSpell = true;
                        usedSpell = true;
                    } else if (player.mp >= 4 && dist <= attackRange + 80 && Math.random() < 0.2) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                }

                if (!usedSpell && dist <= attackRange) {
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
                } else if (player.jumps < 2 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                    player._stuckTicks = 0;
                }
            }
            
            // Also jump if target is significantly higher, regardless of horizontal distance
            if (!isVirtual && target.y < player.sprite.y - 40) {
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    player.aiInput.up = true;
                } else if (player.jumps < 2 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                }
            }
            
            // Double jump across pits! If we are falling fast, and still trying to move left/right
            if (player.sprite.body.velocity.y > 50 && (player.aiInput.left || player.aiInput.right)) {
                if (player.jumps < 2) {
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
        }
    }

    _handleMainHeroAutoPlay(time, delta) {
        const player = this.player;
        const scene = player.scene;
        if (!scene) return;

        // 1. CHEST LOOTING & BREAKABLES
        // Prioritize chests over wandering
        if (scene.lootChests && scene.lootChests.length > 0) {
            const chest = scene.lootChests.find(c => !c.isOpen);
            if (chest) {
                const cx = chest.sprite.x;
                const dist = Math.abs(cx - player.sprite.x);
                if (dist > 40) {
                    if (cx > player.sprite.x) player.aiInput.right = true;
                    else player.aiInput.left = true;
                    if (dist > 150 && Math.random() < 0.1) {
                        if (cx > player.sprite.x) player.aiInput.dashRight = true;
                        else player.aiInput.dashLeft = true;
                    }
                } else {
                    player.aiInput.interact = true;
                }
                return; // Stop other logic while going for loot
            }
        }

        // 2. TOWN & SAFE ZONE BEHAVIORS
        if (scene.zoneType === 'Safe') {
            // Leave indoor locations after a small duration
            if (scene.isIndoors) {
                const leaveBtn = scene.indoorLeaveBtn;
                if (leaveBtn && leaveBtn.style.display !== 'none') {
                    if (this._wantsToAdventure || Math.random() < 0.005) {
                        leaveBtn.click();
                        return;
                    }
                }
            }

            // Emotes (Idle)
            if (Math.random() < 0.005 && player.sprite.body.velocity.x === 0 && scene.showFloatingText) {
                const emotes = ["💤", "...", "✨", "🎵"];
                scene.showFloatingText(player.sprite.x, player.sprite.y - 40, emotes[Math.floor(Math.random()*emotes.length)], 0xffffff);
            }

            // NPC Interaction & Trading
            const isChatOpen = this._isElementVisible('chat-ui');
            const isShopOpen = this._isElementVisible('ui-shop');
            const isDirOpen = this._isElementVisible('ui-town-directory');

            // Randomly want to adventure if not already chatting/shopping/etc.
            if (!isChatOpen && !isShopOpen && !isDirOpen && !scene.isIndoors && !this._wantsToAdventure && Math.random() < 0.002) {
                this._wantsToAdventure = true;
                this._wantsToTravel = false;
            }

            // Party Camaraderie Chat (only trigger if chat and shop are not already open)
            if (!isChatOpen && !isShopOpen && scene.partyMembers && scene.partyMembers.length > 0 && Math.random() < 0.002) {
                const chatIdx = Math.floor(Math.random() * scene.partyMembers.length);
                if (window._gameScene && window._gameScene.startPartyChat) {
                    window._gameScene.startPartyChat(chatIdx);
                }
            }

            // Detect when chat closes
            if (!isChatOpen && this._wasChatOpen) {
                this._wasChatOpen = false;
                this._lastChatClosedTime = time;
            }

            if (isShopOpen) {
                if (this._wantsToAdventure) {
                    const closeBtn = document.getElementById('btn-close-shop');
                    if (closeBtn) closeBtn.click();
                    return;
                }
                // Trading Logic
                if (time - (this._lastTradeTime || 0) > 1500) {
                    this._lastTradeTime = time;
                    const itemsContainer = document.getElementById('shop-items-container');
                    if (itemsContainer && window.saveData) {
                        const itemCards = Array.from(itemsContainer.children);
                        const affordable = itemCards.filter(card => {
                            const priceEl = card.querySelector('.font-headline-sm');
                            if (!priceEl) return false;
                            const costMatch = priceEl.innerText.match(/(\d+)g/);
                            return costMatch && parseInt(costMatch[1]) <= window.saveData.gold;
                        });

                        if (affordable.length > 0 && Math.random() < 0.6) {
                            // Click the card to buy
                            affordable[Math.floor(Math.random() * affordable.length)].click();
                            if (scene.showFloatingText) scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Bought item!", 0x00ff00);
                        } else {
                            // Close shop
                            const closeBtn = document.getElementById('btn-close-shop');
                            if (closeBtn) closeBtn.click();
                        }
                    }
                }
                return;
            }

            if (isChatOpen) {
                this._wasChatOpen = true;

                const inputField = document.getElementById('chat-input');
                const submitBtn = document.getElementById('chat-submit');

                // If the NPC is currently generating a response, wait!
                if (inputField && inputField.disabled) {
                    return;
                }

                // Initialize message count for this conversation
                const npcName = document.getElementById('chat-npc-name')?.innerText || 'NPC';
                if (this._currentChatNpc !== npcName) {
                    this._currentChatNpc = npcName;
                    this._chatMessageCount = 0;
                }

                // If we've chatted enough, close the chat (use 10% chance for a brief natural pause)
                if (this._chatMessageCount >= 3 && Math.random() < 0.1) {
                    const activeNpc = scene.npcs.find(n => n.isChatOpen);
                    if (activeNpc) {
                        activeNpc.closeChat();
                        this._currentChatNpc = null;
                        this._chatMessageCount = 0;
                        this._wasChatOpen = false;
                        this._lastChatClosedTime = time;
                        return;
                    }
                }

                // Roleplay Chat Logic
                if (time - (this._lastChatTime || 0) > 4000) {
                    this._lastChatTime = time;
                    const historyDiv = document.getElementById('chat-history');
                    const tradeBtn = document.getElementById('chat-trade');
                    
                    if (tradeBtn && tradeBtn.style.display !== 'none' && Math.random() < 0.3) {
                        tradeBtn.click(); // Open shop
                        return;
                    }

                    if (historyDiv && scene.geminiService) {
                        // Extract recent chat context to reply
                        const chatLines = Array.from(historyDiv.querySelectorAll('div')).map(d => d.innerText);
                        const chatContext = chatLines.slice(-3).join('\n');

                        if (inputField && submitBtn && !inputField.value) {
                            this._chatMessageCount = (this._chatMessageCount || 0) + 1;
                            scene.geminiService.getHeroAutoPlayResponse(player.classData.id, npcName, chatContext).then(reply => {
                                inputField.value = reply;
                                submitBtn.click();
                            }).catch(err => {
                                inputField.value = "Interesting.";
                                submitBtn.click();
                            });
                        }
                    }
                }
                return;
            }

            // Find NPCs to talk to
            if (scene.npcs && !isChatOpen && !isShopOpen && !this._wantsToAdventure && time - (this._lastChatClosedTime || 0) > 8000) {
                let closestNpc = null;
                let minDist = Infinity;
                scene.npcs.forEach(npc => {
                    if (npc && npc.sprite && npc.sprite.active) {
                        const d = Math.abs(npc.sprite.x - player.sprite.x);
                        if (d < minDist) { minDist = d; closestNpc = npc; }
                    }
                });

                if (closestNpc && minDist < 200) {
                    if (minDist > 60) {
                        if (closestNpc.sprite.x > player.sprite.x) {
                            player.aiInput.right = true;
                        } else {
                            player.aiInput.left = true;
                        }
                    } else {
                        player.aiInput.interact = true;
                    }
                }
            }

            // Town Directory Navigation
            if (isDirOpen) {
                if (this._wantsToAdventure) {
                    const closeBtn = document.getElementById('btn-close-directory');
                    if (closeBtn) closeBtn.click();
                    return;
                }
                if (time - (this._lastDirTime || 0) > 1000) {
                    const locContainer = document.getElementById('directory-locations-container');
                    if (locContainer) {
                        const cards = Array.from(locContainer.children);
                        if (cards.length > 0) {
                            this._lastDirTime = time;
                            cards[Math.floor(Math.random() * cards.length)].click();
                        }
                    }
                }
                return;
            }

            if (scene.angelStatue && !isDirOpen && scene.zoneType === 'Safe') {
                // 0.1% chance every tick to want to travel if idle
                if (!this._wantsToTravel && !this._wantsToAdventure && Math.random() < 0.001) {
                    this._wantsToTravel = true;
                }
                if (this._wantsToTravel && !this._wantsToAdventure) {
                    const ax = scene.angelStatue.x;
                    const dist = Math.abs(ax - player.sprite.x);
                    if (dist > 60) {
                        if (ax > player.sprite.x) player.aiInput.right = true;
                        else player.aiInput.left = true;
                    } else {
                        player.aiInput.interact = true;
                        this._wantsToTravel = false;
                    }
                }
            }

        } else {
            // 3. HOSTILE ZONE BEHAVIORS (Party Support, Breakables, Hazards)
            
            // Party Support (Heal Allies)
            if (scene.partyMembers && player.inventory.potions > 0 && time - (this._lastSupportTime || 0) > 3000) {
                let lowAlly = null;
                scene.partyMembers.forEach(m => {
                    if (m.hp > 0 && m.hp < m.maxHp * 0.4) lowAlly = m;
                });
                if (lowAlly) {
                    this._lastSupportTime = time;
                    if (typeof player._givePotionToParty === 'function') {
                        player._givePotionToParty('hp');
                        if (scene.showFloatingText) scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Healed ally!", 0x00ff00);
                    }
                }
            }

            // Emotes (Damage/Danger)
            if (player.hp < player.maxHp * 0.3 && Math.random() < 0.05 && scene.showFloatingText) {
                scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "💦", 0x44aaff);
            }
        }

    }
}

window.CompanionAI = CompanionAI;
