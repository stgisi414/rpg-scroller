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

_getQuestTargetZone(player) {
    return CompanionAI_Helper._getQuestTargetZone.call(this, player);
}

    updateAI(time, delta) {
        const player = this.player;
        if (!player.sprite || !player.sprite.active || !player.classData) {
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

        // Self Potion Usage Logic (for companions and main hero autoplay)
        if (player.isAI && player.aiState === 'party' && !player.isCargoCarrier && player.inventory && player.inventory.potions > 0 && player.hp > 0 && player.hp < player.maxHp) {
            if (!player._lastSelfPotTime || (time - player._lastSelfPotTime > 3000)) {
                const autoplayConfig = window.autoplayConfig;
                const selfPotionPct = autoplayConfig ? autoplayConfig.selfPotionPct : 40;
                let selfPotionThresh = selfPotionPct / 100;
                if (player.maxHp <= 150) {
                    selfPotionThresh = Math.max(selfPotionThresh, 0.65); // Priest / Wizard starting HP buffer
                } else if (player.maxHp <= 250) {
                    selfPotionThresh = Math.max(selfPotionThresh, 0.50); // Knight / Ranger starting HP buffer
                }
                if (player.hp < player.maxHp * selfPotionThresh) {
                    player._lastSelfPotTime = time;
                    if (typeof player.usePotion === 'function') {
                        player.usePotion();
                    } else {
                        player.inventory.potions--;
                        player.hp = Math.min(player.maxHp, player.hp + 50);
                    }
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Potion!", 0x00ff00);
                    }
                }
            }
        }
        
        if (player.isAI && player === p) {
            this._handleMainHeroAutoPlay(time, delta);
        }
        
        let target = null;
        
        const isArenaActive = player.scene.currentIndoorLocation === 'coliseum' && player.scene.arenaManager && player.scene.arenaManager.isActive;
        const isActuallySafe = player.scene.zoneType === 'Safe' && !isArenaActive;

        let hasCloseNpc = false;
        if (player === p && isActuallySafe) {
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

        const isNearInteractCooldown = this._lastInteractPressTime && (time - this._lastInteractPressTime < 3000);
        const hasMainHeroSafeZoneInput = player === p && isActuallySafe && (
            player.aiInput.left || 
            player.aiInput.right || 
            player.aiInput.interact ||
            this._wantsGuildHall ||
            this._wantsToTravel ||
            isNearInteractCooldown ||
            (!this._wantsToAdventure && hasCloseNpc) ||
            this._isElementVisible('chat-ui') ||
            this._isElementVisible('ui-shop') ||
            this._isElementVisible('ui-town-directory')
        );

        if (player.isCargoCarrier) {
            // Mules ALWAYS follow the main player, not other party members
            target = p.sprite;

            // Hard clamp: prevent mules from going near zone edges
            const mapW = (player.scene.physics && player.scene.physics.world)
                ? player.scene.physics.world.bounds.width : 1840;
            if (player.sprite.x < 60) player.sprite.x = 60;
            if (player.sprite.x > mapW - 60) player.sprite.x = mapW - 60;
        } else if (player.aiState === 'party' && !hasMainHeroSafeZoneInput) {
            let closestEnemy = null;
            let bestScore = -Infinity;
            let chosenDist = Infinity;

            player.scene.enemies.getChildren().forEach(e => {
                if (e.active && (!e.controller || !e.controller.isDead)) {
                    // Prevent AI Main Hero from chasing enemies near zone borders to avoid transition loops
                        const currentZoneIdx = player.scene.worldManager ? player.scene.worldManager.currentZoneIndex : 0;
                        const isCapital = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
                        const widthTiles = isActuallySafe ? (isCapital ? 60 : 40) : 84;
                        const totalWidth = widthTiles * 46;
                        if (e.x < 150 || e.x > totalWidth - 150) return; // Ignore enemies near borders
                    const d = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y);
                    
                    // --- PART 1: WEIGHTED TARGET RANKING ---
                    let score = -d; // base priority is closeness
                    
                    // Bosses: +500
                    const isBoss = e.controller && (e.controller.isBoss || ['bandit', 'frost_giant', 'the_devil', 'lich_lord'].includes(e.controller.type));
                    if (isBoss) score += 500;
                    
                    // Ranged Snipers: +300
                    const eTexture = e.texture ? e.texture.key : '';
                    const isRanged = eTexture.includes('wizard') || eTexture.includes('ranger') || eTexture.includes('archer') || eTexture.includes('longbowman') || eTexture.includes('witch') || eTexture.includes('mage') || eTexture.includes('devil') || eTexture.includes('lich') || (e.scene && e.scene.anims.exists(eTexture + '-shoot'));
                    if (isRanged) score += 300;
                    
                    // Low Health: +200
                    if (e.controller && e.controller.hp && e.controller.maxHp) {
                        const healthPct = e.controller.hp / e.controller.maxHp;
                        if (healthPct < 0.3) score += 200;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        closestEnemy = e;
                        chosenDist = d;
                    }
                }
            });
            
            // Main hero in Auto-Play targets enemies at any distance (full zone seeking).
            // Companions only target enemies within 400px to avoid running off-screen away from the player.
            const maxDetectionDist = (player === p) ? 3000 : 400;
            if (closestEnemy && chosenDist < maxDetectionDist) {
                target = closestEnemy;
            } else {
                // Target captive rescuee if present in zone and not following
                const rescuee = player.scene.activeRescuee;
                if (player === p && rescuee && rescuee.sprite && rescuee.sprite.active && rescuee.state !== 'following') {
                    target = rescuee.sprite;
                } else {
                    let isProgression = false;
                    const currentZoneIdx = player.scene.worldManager ? player.scene.worldManager.currentZoneIndex : 0;
                    const isCapital = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
                    const widthTiles = isActuallySafe ? (isCapital ? 60 : 40) : 84;
                    const totalWidth = widthTiles * 46;
                    
                    let targetZone = autoplayConfig ? autoplayConfig.targetZone : 0;
                    const isMerchantMode = autoplayConfig && autoplayConfig.preset === 'merchant_trader';
                    if (!isMerchantMode && player.quests && player.quests.length > 0) {
                        const questFocus = autoplayConfig ? autoplayConfig.questFocus : 70;
                        if (targetZone === 0 || questFocus >= 40) {
                            const questZone = this._getQuestTargetZone(player);
                            if (questZone !== null) {
                                targetZone = questZone;
                            }
                        }
                    }
                    
                    if (player === p) {
                        if (player.scene.zoneType !== 'Safe') {
                            // Check if all TARGETABLE enemies in the zone are dead
                            // (ignore enemies near zone borders — same filter as targeting)
                            let hasEnemies = false;
                            const currentZoneIdx = player.scene.worldManager ? player.scene.worldManager.currentZoneIndex : 0;
                            const isCapital = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
                            const progWidthTiles = isActuallySafe ? (isCapital ? 60 : 40) : 84;
                            const progTotalWidth = progWidthTiles * 46;
                            player.scene.enemies.getChildren().forEach(e => {
                                if (e.active && (!e.controller || !e.controller.isDead)) {
                                    if (e.x > 150 && e.x < progTotalWidth - 150) {
                                        hasEnemies = true;
                                    }
                                }
                            });
                            if (!hasEnemies && currentZoneIdx !== targetZone) {
                                isProgression = true;
                            }
                        } else {
                            // Safe town
                            if (currentZoneIndex !== targetZone) {
                                isProgression = true;
                            } else if (this._wantsToAdventure) {
                                isProgression = true;
                            }
                        }
                    }

                    // --- COMPASS DIRECTION TRANSITION ---
                    if (isProgression) {
                        const targetX = targetZone < currentZoneIndex ? -100 : totalWidth + 100;
                        target = { x: targetX, y: player.sprite.y, isVirtual: true };
                    } else {
                        let targetX = player.lastVirtualTargetX || player.sprite.x;
                        if (!player.lastVirtualTargetX || Math.abs(player.sprite.x - player.lastVirtualTargetX) < 15 || time % 8000 < 100) {
                            const leftBound = 400;
                            const rightBound = totalWidth - 400;
                            if (player.sprite.x > rightBound) targetX = player.sprite.x - 250;
                            else if (player.sprite.x < leftBound) targetX = player.sprite.x + 250;
                            else targetX = player.sprite.x + (Math.random() < 0.5 ? 250 : -250);
                            
                            targetX = Phaser.Math.Clamp(targetX, leftBound, rightBound);
                        }
                        player.lastVirtualTargetX = targetX;
                        if (player !== p) {
                            target = p.sprite;
                        } else {
                            target = { x: targetX, y: player.sprite.y, isVirtual: true };
                        }
                    }
                }
            }
        } else if (player.aiState === 'hostile') {
            target = p.sprite;
        }
        
        if (target) {
            let dx = target.x - player.sprite.x;
            let dist = Math.abs(dx);
            
            // --- GEMINI AI OVERHAUL ---
            if (player.scene.geminiService && player.scene.geminiService.isReady && player.aiState === 'hostile') {
                if (time - (player.lastTacticTime || 0) > 3000) {
                    player.lastTacticTime = time;
                    let optimalDist = 40; // Melee
                    const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                    if (isRanged) {
                        if (player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival') {
                            optimalDist = 160;
                        } else {
                            optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
                        }
                    } else if (player.classData.id && player.classData.id.startsWith('witch')) {
                        optimalDist = 65; // Account for wider body collision limits
                    } else if (player.classData.id && player.classData.id.startsWith('pyromancer')) {
                        optimalDist = 60;
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
                        const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                        if (isRanged) {
                            if (player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival') {
                                optimalDist = 160;
                            } else {
                                optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
                            }
                        } else if (player.classData.id && player.classData.id.startsWith('witch')) {
                            optimalDist = 65; // Account for wider body collision limits
                        } else if (player.classData.id && player.classData.id.startsWith('pyromancer')) {
                            optimalDist = 60;
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
                            if (typeof player.usePotion === 'function') {
                                player.usePotion();
                            } else {
                                player.inventory.potions--;
                                player.hp = Math.min(player.maxHp, player.hp + 50);
                            }
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
            const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
            if (isRanged) {
                if (player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival') {
                    optimalDist = 160;
                } else {
                    optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
                }
            } else if (player.classData.id && player.classData.id.startsWith('witch')) {
                optimalDist = 65; // Account for wider body collision limits
            } else if (player.classData.id && player.classData.id.startsWith('pyromancer')) {
                optimalDist = 60;
            }
            if (player.isCargoCarrier) {
                optimalDist = player.isCargoWagon ? 100 : 60;
            } else if ((target === p.sprite || (player.scene.partyMembers && player.scene.partyMembers.some(m => m.sprite === target))) && player.aiState === 'party') {
                optimalDist = 80; // Follow distance
            }
            
            // For virtual targets (wandering), ignore optimal distance and just walk there
            const isVirtual = target.isVirtual;
            
            // --- PART 1: COMBAT SPACING & EVASION (Kiting) ---
            if (dist > optimalDist || (isVirtual && dist > 10)) {
                if (dx > 5) player.aiInput.right = true;
                else if (dx < -5) player.aiInput.left = true;
            } else if (dist < optimalDist - 20 && !isVirtual) {
                // Back away if too close and ranged
                if (isRanged && player.classData.id !== 'knight' && player.classData.id !== 'warrior' && player.classData.id !== 'samurai') {
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

            // Dash-jump evasion when cornered
            const isMoving = player.aiInput.left || player.aiInput.right;
            const isStuckWall = player.sprite.body.blocked.left || player.sprite.body.blocked.right;
            if (!isVirtual && isMoving && isStuckWall && dist < 100) {
                player.aiInput.up = true;
                if (player.aiInput.left) player.aiInput.dashLeft = true;
                if (player.aiInput.right) player.aiInput.dashRight = true;
                if (player.scene.showFloatingText && Math.random() < 0.1) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Evade!", 0x2ddbde);
                }
            }

            // --- PART 1: WAYPOINT PATHFINDING (Vertical navigation) ---
            if (!isVirtual && target.y < player.sprite.y - 45 && player.scene.platforms) {
                let bestWaypoint = null;
                let minWaypointDist = Infinity;
                player.scene.platforms.getChildren().forEach(pBlock => {
                    // Check blocks that are higher than us, but below/near target height
                    if (pBlock.y < player.sprite.y - 30 && pBlock.y >= target.y - 30) {
                        const d = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, pBlock.x, pBlock.y);
                        if (d < minWaypointDist && Math.abs(pBlock.x - player.sprite.x) < 240) {
                            minWaypointDist = d;
                            bestWaypoint = pBlock;
                        }
                    }
                });
                if (bestWaypoint) {
                    // Steer towards the waypoint instead of the direct dx
                    dx = bestWaypoint.x - player.sprite.x;
                    dist = Math.abs(dx);
                    if (dx > 5) {
                        player.aiInput.right = true;
                        player.aiInput.left = false;
                    } else if (dx < -5) {
                        player.aiInput.left = true;
                        player.aiInput.right = false;
                    }
                }
            }

            // Vertical traversal (jumping)
            if (!isVirtual) {
                const dy = target.y - player.sprite.y;
                if (dy < -180) {
                    if (time % 4000 < 2000) player.aiInput.left = true;
                    else player.aiInput.right = true;
                    if (Math.random() < 0.05) player.aiInput.up = true;
                }
                else if (dy < -40 && dist < 150) {
                    player.aiInput.up = true;
                }
                else if (dy > 50 && dist < 30) {
                    if (target.x > player.sprite.x) player.aiInput.right = true;
                    else player.aiInput.left = true;
                }
            }

            // Attack logic - attack when in range and target is an enemy
            const isEnemy = !player.isCargoCarrier && target && !target.isVirtual && target !== p.sprite && target !== player.sprite && (!player.scene.activeRescuee || target !== player.scene.activeRescuee.sprite);
            if (player.aiState === 'hostile' || isEnemy) {
                let attackRange = optimalDist + 30;
                if (!isVirtual && target.type === 'spider') attackRange = optimalDist + 60;

                // --- PART 2: SLIDER INTEGRATION (Spell Casting Frequency) ---
                const spellRateMult = (autoplayConfig ? autoplayConfig.spellRate : 50) / 50;

                // Super Spells and Abilities
                let usedSpell = false;
                
                // Contextual spell check: vertically aligned?
                const verticallyAligned = Math.abs(target.y - player.sprite.y) < 40;

                if (player.classData.id === 'wizard' || player.classData.id === 'wizard_rival') {
                    if (player.hp < player.maxHp * 0.4 && player.mp >= 30 && Math.random() < 0.2 * spellRateMult) {
                        player.aiInput.summonSpell = true;
                        usedSpell = true;
                    } else if (player.mp >= 10 && Math.random() < 0.1 * spellRateMult) {
                        // --- PART 1: CONTEXTUAL SPELL CASTING (3 Enemies grouped for Mega Spell) ---
                        let closeEnemies = 0;
                        if (player.scene && player.scene.enemies) {
                            player.scene.enemies.getChildren().forEach(e => {
                                if (e.active && (!e.controller || !e.controller.isDead) && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y) < 200) {
                                    closeEnemies++;
                                }
                            });
                        }
                        if (closeEnemies >= 3 || (target !== p.sprite && dist < 120)) {
                            player.aiInput.megaSpell = true;
                            usedSpell = true;
                        }
                    } else if (verticallyAligned && player.mp >= 4 && dist <= attackRange && Math.random() < 0.2 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'ranger' || player.classData.id === 'ranger_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival') {
                    if (verticallyAligned && player.sp >= player.maxSp * 0.4 && dist <= attackRange + 100 && Math.random() < 0.15 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'knight' || player.classData.id === 'warrior' || player.classData.id === 'knight_rival') {
                    if (player.sp >= player.maxSp * 0.5 && dist <= attackRange && Math.random() < 0.15 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'samurai' || player.classData.id === 'samurai_rival') {
                    let costRatio = 0.8 - ((player.classData.stats.vit || 10) * 0.015);
                    if (costRatio < 0.2) costRatio = 0.2;
                    if (player.sp >= player.maxSp * costRatio && dist <= attackRange + 50 && Math.random() < 0.15 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') {
                    if (player.mp >= 8 && Math.random() < 0.1 * spellRateMult) {
                        player.aiInput.megaSpell = true;
                        usedSpell = true;
                    } else if (verticallyAligned && player.mp >= 4 && dist <= attackRange + 80 && Math.random() < 0.2 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id.startsWith('witch')) {
                    const maxSpellDist = (player.classData.id === 'witch_3_rival') ? 450 : 300;
                    if (player.mp >= 35 && dist <= maxSpellDist && Math.random() < 0.15 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id.startsWith('pyromancer')) {
                    if (player.mp >= 15 && dist <= 220 && Math.random() < 0.18 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id.startsWith('priest')) {
                    let shouldHeal = false;
                    if (player.aiState === 'hostile') {
                        if (player.hp < player.maxHp * 0.7) {
                            shouldHeal = true;
                        }
                    } else {
                        const p1 = player.scene.player;
                        if (p1 && p1.hp < p1.maxHp * 0.7) {
                            shouldHeal = true;
                        }
                        if (!shouldHeal && player.scene.partyMembers) {
                            player.scene.partyMembers.forEach(m => {
                                if (m && m.hp < m.maxHp * 0.7) {
                                    shouldHeal = true;
                                }
                            });
                        }
                    }
                    if (shouldHeal && player.mp >= 4 && Math.random() < 0.25 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                } else if (player.classData.id === 'dark_elf_queen' || player.classData.id === 'dark_elf_queen_rival') {
                    const hasSummonActive = player.scene.enemies && player.scene.enemies.getChildren().some(e => e.active && e.controller && e.controller.type === 'dark_elf_minion');
                    if (player.mp >= 40 && !hasSummonActive && Math.random() < 0.15 * spellRateMult) {
                        player.aiInput.summonSpell = true;
                        usedSpell = true;
                    } else if (player.mp >= 30 && Math.random() < 0.20 * spellRateMult) {
                        player.aiInput.megaSpell = true;
                        usedSpell = true;
                    } else if (player.mp >= 15 && Math.random() < 0.25 * spellRateMult) {
                        player.aiInput.superSpell = true;
                        usedSpell = true;
                    }
                }

                if (!usedSpell && dist <= attackRange) {
                    let attackChance = 0.3;
                    const autoplayConfig = window.autoplayConfig;
                    if (autoplayConfig && autoplayConfig.preset === 'pacifist') {
                        attackChance = 0.05;
                    }
                    if (Math.random() < attackChance) player.aiInput.attack = true;
                }
                
                const isRescuee = player.scene.activeRescuee && target === player.scene.activeRescuee.sprite;
                if (isRescuee && dist <= 80) {
                    player.aiInput.interact = true;
                }

                // Active dodging for Rivals
                if (player.aiState === 'hostile' && player.classId && player.classId.includes('rival')) {
                    if (player.inventory.potions === undefined) player.inventory.potions = 2;
                    
                    const selfPotionThresh = (autoplayConfig ? autoplayConfig.selfPotionPct : 40) / 100;
                    if (player.hp < player.maxHp * selfPotionThresh && player.inventory.potions > 0 && Math.random() < 0.05) {
                        player.inventory.potions--;
                        player.hp = Math.min(player.maxHp, player.hp + 50);
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Potion!", 0x00ff00);
                    }
                    
                    if (p.isAttacking && dist < optimalDist + 50) {
                        if (Math.random() < 0.2) {
                            if (dx > 0) player.aiInput.dashLeft = true;
                            else player.aiInput.dashRight = true;
                        } else if (Math.random() < 0.1) {
                            player.aiInput.up = true;
                        }
                    }
                }

                // --- PART 2: SLIDER INTEGRATION (Block Rate) ---
                const blockRateChance = (autoplayConfig ? autoplayConfig.blockRate : 20) / 100;
                const isEnemyAttacking = target && target.controller && target.controller.isAttacking;
                if (isEnemyAttacking && dist < 80 && Math.random() < blockRateChance) {
                    player.aiInput.down = true;
                }
            }

            // Dash logic - respect dashFreq slider
            if ((player.aiInput.left || player.aiInput.right) && !isVirtual) {
                let dashChance = 0;
                if (target === p.sprite && dist > 150) {
                    dashChance = 0.2;
                } else if (target !== p.sprite && dist > optimalDist + 20) {
                    dashChance = 0.02;
                    if (player.classData.id === 'knight' || player.classData.id === 'warrior' || player.classData.id === 'samurai') {
                        dashChance = 0.15;
                    }
                }
                const dashFreqMult = (autoplayConfig ? autoplayConfig.dashFreq : 30) / 30;
                if (Math.random() < dashChance * dashFreqMult) {
                    if (player.aiInput.left) player.aiInput.dashLeft = true;
                    if (player.aiInput.right) player.aiInput.dashRight = true;
                }
            }
            
            // --- PART 1: PREDICTIVE RAYCASTING ---
            const dir = player.sprite.body.velocity.x > 0 ? 1 : (player.sprite.body.velocity.x < 0 ? -1 : (player.aiInput.right ? 1 : (player.aiInput.left ? -1 : 0)));
            if (dir !== 0) {
                const checkX = player.sprite.x + dir * 65;
                let hasPlatformBelow = false;
                let wallAhead = false;
                
                if (player.scene.platforms) {
                    player.scene.platforms.getChildren().forEach(tile => {
                        if (Math.abs(tile.x - checkX) < 25) {
                            if (tile.y >= player.sprite.y && tile.y <= player.sprite.y + 150) {
                                hasPlatformBelow = true;
                            }
                            if (Math.abs(tile.y - player.sprite.y) < 32) {
                                wallAhead = true;
                            }
                        }
                    });
                }
                
                // If on floor and no platform ahead, jump!
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    if (!hasPlatformBelow) {
                        player.aiInput.up = true;
                        // Sprint jump
                        const dashFreqThresh = (autoplayConfig ? autoplayConfig.dashFreq : 30) / 100;
                        if (Math.random() < dashFreqThresh) {
                            if (dir > 0) player.aiInput.dashRight = true;
                            else player.aiInput.dashLeft = true;
                        }
                    } else if (wallAhead) {
                        player.aiInput.up = true;
                    }
                }
            }

            // Jump logic - stuck ticks
            if (!player._stuckTicks) player._stuckTicks = 0;
            const isMovingButStuck = (player.aiInput.left || player.aiInput.right) && Math.abs(player.sprite.body.velocity.x) < 5 && !player.aiInput.attack;
            if (isMovingButStuck) {
                player._stuckTicks++;
            } else {
                player._stuckTicks = 0;
            }
            if (player._stuckTicks >= 5) {
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    player.aiInput.up = true;
                    player._stuckTicks = 0;
                } else if (player.jumps < 2 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                    player._stuckTicks = 0;
                }
            }
            
            if (!isVirtual && target.y < player.sprite.y - 40) {
                if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                    player.aiInput.up = true;
                } else if (player.jumps < 2 && player.sprite.body.velocity.y > -50) {
                    player.aiInput.up = true;
                }
            }
            
            if (player.sprite.body.velocity.y > 50 && (player.aiInput.left || player.aiInput.right)) {
                if (player.jumps < 2) {
                    player.aiInput.up = true;
                }
            }
            
            if (player.aiState === 'party' && target === p.sprite) {
                if (dist > 1000 || Math.abs(player.sprite.y - p.sprite.y) > 600) {
                    player.sprite.setPosition(p.sprite.x, p.sprite.y - 50);
                    player.sprite.setVelocity(0, 0);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "*Catching up*", 0xaaaaff);
                    }
                }
            }

            // --- GENERAL STUCK WALL/CEILING ESCAPE ---
            if (!player._generalEscapeTicks) player._generalEscapeTicks = 0;
            if (!player._generalEscapeDir) player._generalEscapeDir = 0;
            if (!player._stuckAirTicks) player._stuckAirTicks = 0;

            const wantsToMoveX = player.aiInput.left || player.aiInput.right;
            const notOnGround = !(player.sprite.body.blocked.down || player.sprite.body.touching.down);
            const isStuckX = wantsToMoveX && Math.abs(player.sprite.body.velocity.x) < 5 && notOnGround;

            if (isStuckX) {
                player._stuckAirTicks++;
                if (player._stuckAirTicks >= 8 && player._generalEscapeTicks <= 0) {
                    player._generalEscapeTicks = 15; // 15 ticks of escape duration
                    // Escape direction is opposite to the direction they wanted to move
                    player._generalEscapeDir = player.aiInput.right ? -1 : 1;
                }
            } else {
                player._stuckAirTicks = 0;
            }

            if (player._generalEscapeTicks > 0) {
                player._generalEscapeTicks--;
                // Override inputs
                player.aiInput.left = player._generalEscapeDir === -1;
                player.aiInput.right = player._generalEscapeDir === 1;
                if (player._generalEscapeTicks === 0) {
                    player._generalEscapeDir = 0;
                }
            }

            player.aiTargetDx = dx;
        }
    }

_handleMainHeroAutoPlay(time, delta) {
    return CompanionAI_Helper._handleMainHeroAutoPlay.call(this, time, delta);
}
}

window.CompanionAI = CompanionAI;
