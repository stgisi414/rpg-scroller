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
        if (!player.quests || player.quests.length === 0) return null;
        
        // 1. Rescue quest takes highest priority
        const rescueQuest = player.quests.find(q => q.type === 'rescue');
        if (rescueQuest) {
            if (rescueQuest.rescueState === 'captive') {
                return rescueQuest.rescueeZone; // Go to captive zone
            } else if (rescueQuest.rescueState === 'following') {
                // Return to nearest town
                const currentZone = (window.saveData && window.saveData.currentZone) || 0;
                const townZone = Math.round(currentZone / 4) * 4;
                return townZone;
            }
        }
        
        // 2. Delivery quest
        const deliveryQuest = player.quests.find(q => q.type === 'delivery');
        if (deliveryQuest && deliveryQuest.deliveryPickedUp) {
            return deliveryQuest.deliveryTargetZone; // Go to target town zone
        }

        // 3. Political quests (Phase 6 / 10)
        const politicalQuest = player.quests.find(q => ['espionage', 'diplomacy', 'assassination', 'intel_report'].includes(q.type));
        if (politicalQuest) {
            if (politicalQuest.targetZone !== undefined) return politicalQuest.targetZone;
            if (politicalQuest.deliveryTargetZone !== undefined) return politicalQuest.deliveryTargetZone;
            if (politicalQuest.assassinationTargetZone !== undefined) return politicalQuest.assassinationTargetZone;
            
            if (politicalQuest.targetKingdom) {
                const kingdomObj = window.WORLD_KINGDOMS[politicalQuest.targetKingdom] || (window.saveData && window.saveData.discoveredKingdoms && window.saveData.discoveredKingdoms[politicalQuest.targetKingdom]);
                if (kingdomObj) {
                    return kingdomObj.capital;
                }
            }
            if (politicalQuest.targetFaction) {
                const factionObj = window.WORLD_FACTIONS[politicalQuest.targetFaction];
                if (factionObj && factionObj.kingdom) {
                    const kingdomObj = window.WORLD_KINGDOMS[factionObj.kingdom];
                    if (kingdomObj) {
                        return kingdomObj.capital;
                    }
                }
            }
        }
        
        // 3. Kill quest — hunt in non-town zones, progressing toward the compass target
        const killQuest = player.quests.find(q => q.type === 'kill');
        if (killQuest) {
            let compassTarget = window.autoplayConfig ? window.autoplayConfig.targetZone : 0;
            if (compassTarget === 0 && player.quests && player.quests.length > 0) {
                const questZone = this._getQuestTargetZone(player);
                if (questZone !== null) {
                    compassTarget = questZone;
                }
            }
            const isInTown = Math.abs(currentZone) > 0 ? (Math.abs(currentZone) % 4 === 0) : currentZone === 0;

            if (isInTown) {
                // In a town — go to the next non-town zone in the compass direction
                return compassTarget > currentZone ? currentZone + 1 : currentZone - 1;
            }

            // In a non-town zone: check if there are live matching enemies here
            const scene = player.scene;
            if (scene && scene.enemies) {
                let hasMatchingEnemies = false;
                scene.enemies.getChildren().forEach(e => {
                    if (e.active && e.controller && !e.controller.isDead) {
                        const etype = (e.controller.type || '').toLowerCase();
                        const targetType = (killQuest.targetType || '').toLowerCase();
                        if (etype.includes(targetType) || targetType.includes(etype)) {
                            hasMatchingEnemies = true;
                        }
                    }
                });
                if (hasMatchingEnemies) {
                    return currentZone; // Stay and fight
                }
            }

            // No matching enemies — progress toward the compass target through non-town zones
            const direction = compassTarget >= currentZone ? 1 : -1;
            let nextZone = currentZone + direction;
            // Skip town zones
            if (Math.abs(nextZone) > 0 && Math.abs(nextZone) % 4 === 0) {
                nextZone += direction;
            }
            return nextZone;
        }
        
        return null;
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

        const hasMainHeroSafeZoneInput = player === p && isActuallySafe && (
            player.aiInput.left || 
            player.aiInput.right || 
            player.aiInput.interact ||
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
                    
                    let targetZone = window.autoplayConfig ? window.autoplayConfig.targetZone : 0;
                    const isMerchantMode = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
                    if (!isMerchantMode && player.quests && player.quests.length > 0) {
                        const questFocus = window.autoplayConfig ? window.autoplayConfig.questFocus : 70;
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
                    const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                    if (isRanged) {
                        optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
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
                        const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
                        if (isRanged) {
                            optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
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
            const isRanged = player.classData.id === 'wizard' || player.classData.id === 'ranger' || player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival' || player.classData.id === 'elven_longbowman' || player.classData.id === 'elven_longbowman_rival' || (player.classData.id && player.classData.id.startsWith('custom_npc_') && player.classData.weaponType === 'magic');
            if (isRanged) {
                optimalDist = (player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') ? 100 : 150;
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
                const spellRateMult = (window.autoplayConfig ? window.autoplayConfig.spellRate : 50) / 50;

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
                }

                if (!usedSpell && dist <= attackRange) {
                    if (Math.random() < 0.3) player.aiInput.attack = true;
                }
                
                const isRescuee = player.scene.activeRescuee && target === player.scene.activeRescuee.sprite;
                if (isRescuee && dist <= 80) {
                    player.aiInput.interact = true;
                }

                // Active dodging for Rivals
                if (player.aiState === 'hostile' && player.classId && player.classId.includes('rival')) {
                    if (player.inventory.potions === undefined) player.inventory.potions = 2;
                    
                    const selfPotionThresh = (window.autoplayConfig ? window.autoplayConfig.selfPotionPct : 40) / 100;
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
                const blockRateChance = (window.autoplayConfig ? window.autoplayConfig.blockRate : 20) / 100;
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
                const dashFreqMult = (window.autoplayConfig ? window.autoplayConfig.dashFreq : 30) / 30;
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
                        const dashFreqThresh = (window.autoplayConfig ? window.autoplayConfig.dashFreq : 30) / 100;
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

            player.aiTargetDx = dx;
        }
    }

    _handleMainHeroAutoPlay(time, delta) {
        const player = this.player;
        const scene = player.scene;
        if (!scene) return;

        const isArenaActive = scene.currentIndoorLocation === 'coliseum' && scene.arenaManager && scene.arenaManager.isActive;
        const isActuallySafe = scene.zoneType === 'Safe' && !isArenaActive;

        // Periodically check if we want to abandon/ignore quests based on questFocus slider
        if (isActuallySafe && (!this._lastQuestCheckTime || time - this._lastQuestCheckTime > 5000)) {
            this._lastQuestCheckTime = time;
            const questFocus = window.autoplayConfig ? window.autoplayConfig.questFocus : 70;
            if (player.quests && player.quests.length > 0) {
                for (let i = player.quests.length - 1; i >= 0; i--) {
                    const q = player.quests[i];
                    if (Math.random() * 100 > questFocus && q.rescueState !== 'following') {
                        if (scene.showFloatingText) {
                            scene.showFloatingText(player.sprite.x, player.sprite.y - 45, `*Ignoring Quest: ${q.title}*`, 0xffaa44);
                        }
                        player.quests.splice(i, 1);
                        if (player.questManager) {
                            player.questManager.renderQuests();
                        }
                        player._persistToLocalStorage();
                    }
                }
            }
        }

        // Target captive rescuee if present in zone and not following
        const rescuee = scene.activeRescuee;
        if (player === scene.player && rescuee && rescuee.sprite && rescuee.sprite.active && rescuee.state !== 'following') {
            const rx = rescuee.sprite.x;
            const dist = Math.abs(rx - player.sprite.x);
            if (dist > 40) {
                if (rx > player.sprite.x) player.aiInput.right = true;
                else player.aiInput.left = true;
                if (dist > 150 && Math.random() < 0.1) {
                    if (rx > player.sprite.x) player.aiInput.dashRight = true;
                    else player.aiInput.dashLeft = true;
                }
            } else {
                player.aiInput.interact = true;
            }
            return;
        }

        // 1. CHEST LOOTING & BREAKABLES
        if (scene.lootChests && scene.lootChests.length > 0) {
            const chest = scene.lootChests.find(c => !c.isOpen);
            if (chest) {
                const cx = chest.sprite.x;
                const cy = chest.sprite.y;
                const dist = Math.abs(cx - player.sprite.x);
                const verticalDist = Math.abs(cy - player.sprite.y);

                if (dist > 40 || verticalDist > 50) {
                    // Check if we are blocked by a ceiling or running into a wall horizontally while seeking a chest
                    const isHittingWall = (player.sprite.body.blocked.left && player.aiInput.left) || (player.sprite.body.blocked.right && player.aiInput.right);
                    if (player.sprite.body.blocked.up || isHittingWall) {
                        if (!player._chestCeilingEscapeTicks || player._chestCeilingEscapeTicks <= 0) {
                            // Take a running start: walk away from the wall/obstruction
                            if (player.sprite.body.blocked.left) {
                                player._chestCeilingEscapeDir = 1; // Run right
                            } else if (player.sprite.body.blocked.right) {
                                player._chestCeilingEscapeDir = -1; // Run left
                            } else {
                                player._chestCeilingEscapeDir = (player.sprite.x < cx) ? -1 : 1;
                            }
                            player._chestCeilingEscapeTicks = 45; // 45 frames of running start
                        }
                    }

                    if (player._chestCeilingEscapeTicks && player._chestCeilingEscapeTicks > 0) {
                        player._chestCeilingEscapeTicks--;
                        if (player._chestCeilingEscapeDir === 1) {
                            player.aiInput.right = true;
                            player.aiInput.left = false;
                        } else {
                            player.aiInput.left = true;
                            player.aiInput.right = false;
                        }
                        // Jump while escaping to clear any lower obstacles
                        if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                            player.aiInput.up = true;
                        }
                    } else if (dist > 5) {
                        // Move towards the chest horizontally
                        if (cx > player.sprite.x) {
                            player.aiInput.right = true;
                            player.aiInput.left = false;
                        } else {
                            player.aiInput.left = true;
                            player.aiInput.right = false;
                        }
                        
                        if (dist > 150 && Math.random() < 0.1) {
                            if (cx > player.sprite.x) player.aiInput.dashRight = true;
                            else player.aiInput.dashLeft = true;
                        }
                    }

                    // Jump if the chest is above us (only if not actively taking a running start)
                    if (cy < player.sprite.y - 40 && (!player._chestCeilingEscapeTicks || player._chestCeilingEscapeTicks <= 0)) {
                        if (player.sprite.body.blocked.down || player.sprite.body.touching.down) {
                            player.aiInput.up = true;
                        } else if (player.jumps < 2 && player.sprite.body.velocity.y > -50) {
                            player.aiInput.up = true;
                        }
                    }

                    // Stuck jump check (if horizontal movement is blocked by a wall or platform ceiling)
                    if (!player._chestStuckTicks) player._chestStuckTicks = 0;
                    const isStuck = (player.aiInput.left || player.aiInput.right) && Math.abs(player.sprite.body.velocity.x) < 5;
                    if (isStuck) {
                        player._chestStuckTicks++;
                    } else {
                        player._chestStuckTicks = 0;
                    }
                    if (player._chestStuckTicks >= 5) {
                        player.aiInput.up = true;
                        player._chestStuckTicks = 0;
                    }
                } else {
                    player.aiInput.interact = true;
                }
                return;
            }
        }

        // 2. TOWN & SAFE ZONE BEHAVIORS
        if (isActuallySafe) {
            const townFocus = window.autoplayConfig ? window.autoplayConfig.townFocus : 50;
            const partyBuildFocus = window.autoplayConfig ? window.autoplayConfig.partyBuildFocus : 50;

            // Coliseum King AutoPlay Wave Interaction Override
            if (scene.currentIndoorLocation === 'coliseum') {
                const king = scene.npcs ? scene.npcs.find(n => n.name === 'The King') : null;
                if (king && king.sprite && king.sprite.active) {
                    if (!isChatOpen) {
                        const dist = Math.abs(king.sprite.x - player.sprite.x);
                        if (dist > 60) {
                            if (king.sprite.x > player.sprite.x) player.aiInput.right = true;
                            else player.aiInput.left = true;
                        } else {
                            player.aiInput.interact = true;
                        }
                    } else {
                        // Click activity button immediately to start next wave
                        const activityBtn = document.getElementById('chat-activity');
                        if (activityBtn && activityBtn.style.display !== 'none' && !activityBtn.disabled) {
                            activityBtn.click();
                        }
                    }
                    return;
                }
            }

            // --- Coliseum & Indoor traversal duration override ---
            if (scene.isIndoors) {
                const leaveBtn = scene.indoorLeaveBtn;
                if (leaveBtn && leaveBtn.style.display !== 'none') {
                    // Do not leave Coliseum until wanted, or if townFocus is low
                    const coliseumGrind = window.autoplayConfig && window.autoplayConfig.coliseumGrind;
                    const isGuildHall = scene.currentIndoorLocation === 'guild_hall';
                    const leaveChance = coliseumGrind ? 0 : (scene.currentIndoorLocation === 'coliseum' ? 0.0001 : ((100 - townFocus) / 100) * 0.02 + 0.001);
                    // Stay in the Guild Hall while we need quests
                    if (this._wantsGuildHall && isGuildHall) {
                        // Don't leave — we need to pick up a contract
                    } else if (this._wantsToAdventure || Math.random() < leaveChance) {
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

            // --- PART 2: PARTY BUILDING COMPANIONS RECRUITMENT ---
            if (partyBuildFocus > 10 && scene.partyMembers && scene.partyMembers.length < 5 && !isChatOpen && !isShopOpen && !isDirOpen && !scene.isIndoors && Math.random() < (partyBuildFocus / 100) * 0.03) {
                const classes = ['knight', 'wizard', 'samurai', 'ranger', 'elven_spellblade'];
                const randomClass = classes[Math.floor(Math.random() * classes.length)];
                const randomName = window.CharacterComposer ? window.CharacterComposer.generateRandomName(randomClass) : "Companion";
                const px = player.sprite.x + (Math.random() < 0.5 ? 50 : -50);
                const py = player.sprite.y - 10;
                if (typeof scene.spawnHeroAI === 'function') {
                    scene.spawnHeroAI(randomClass, px, py, 'party', randomName, "Recruited by AutoPlay AI");
                    if (scene.showFloatingText) {
                        scene.showFloatingText(player.sprite.x, player.sprite.y - 45, `Recruited ${randomName}!`, 0x2ddbde);
                    }
                }
            }

            // Wants to adventure - respect townFocus
            const currentZoneIndex = scene.worldManager ? scene.worldManager.currentZoneIndex : 0;
            const questFocus = window.autoplayConfig ? window.autoplayConfig.questFocus : 70;
            let targetZone = window.autoplayConfig ? window.autoplayConfig.targetZone : 0;
            const isMerchantMode = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
            if (!isMerchantMode && player.quests && player.quests.length > 0) {
                if (targetZone === 0 || questFocus >= 40) {
                    const questZone = this._getQuestTargetZone(player);
                    if (questZone !== null) {
                        targetZone = questZone;
                    }
                }
            }

            if (currentZoneIndex !== targetZone) {
                // When coliseum grind is on, only want to adventure if not in zone 0 (town)
                const coliseumGrind = window.autoplayConfig && window.autoplayConfig.coliseumGrind;
                if (coliseumGrind) {
                    this._wantsToAdventure = false; // Stay in town for coliseum
                } else {
                    this._wantsToAdventure = true;
                }
            } else if (!isChatOpen && !isShopOpen && !isDirOpen && !scene.isIndoors && !this._wantsToAdventure) {
                const coliseumGrind = window.autoplayConfig && window.autoplayConfig.coliseumGrind;
                const isMerchantTrader = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
                if (coliseumGrind || isMerchantTrader) {
                    // In coliseum grind or merchant trader mode, never randomly adventure —
                    // merchant traders only leave town after cargo trading sets a new targetZone
                    this._wantsToAdventure = false;
                } else {
                    const adventureChance = ((100 - townFocus) / 100) * 0.01;
                    if (Math.random() < adventureChance) {
                        this._wantsToAdventure = true;
                        this._wantsToTravel = false;
                    }
                }
            }

            // Override: if questFocus is high and the player has no quests,
            // suppress _wantsToAdventure so the AI visits the Guild Hall first
            const activeQuestCountNav = player.quests ? player.quests.length : 0;
            if (this._wantsToAdventure && activeQuestCountNav < 1 && questFocus > 50 && !scene.isIndoors) {
                this._wantsToAdventure = false;
                this._wantsGuildHall = true;
            }
            // Clear the guild hall flag once we have quests
            if (this._wantsGuildHall && activeQuestCountNav >= 1) {
                this._wantsGuildHall = false;
                this._wantsToAdventure = true;
            }

            // Party Camaraderie Chat
            if (!isChatOpen && !isShopOpen && scene.partyMembers && scene.partyMembers.length > 0 && Math.random() < 0.002) {
                const chatIdx = Math.floor(Math.random() * scene.partyMembers.length);
                if (window._gameScene && window._gameScene.startPartyChat) {
                    window._gameScene.startPartyChat(chatIdx);
                }
            }

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
                
                const isMerchantTrader = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
                if (isMerchantTrader) {
                    const btnCargo = document.getElementById('btn-shop-cargo');
                    const buyCargoList = document.getElementById('buy-cargo-list');
                    if (btnCargo && !buyCargoList) {
                        // Check if we already clicked cargo tab and got refused
                        if (this._cargoTabClickTime && time - this._cargoTabClickTime > 1500) {
                            // Cargo tab was clicked but buy-cargo-list never appeared — trade refused
                            this._cargoTabClickTime = null;
                            const closeBtn = document.getElementById('btn-close-shop');
                            if (closeBtn) closeBtn.click();
                            // Force leave this town — the faction here hates us
                            this._wantsToAdventure = true;
                            // Set target to a different kingdom's capital
                            const currentZoneIdx = scene.worldManager ? scene.worldManager.currentZoneIndex : 0;
                            const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZoneIdx) : null;
                            const currentKingdomId = currentKingdom ? currentKingdom.id : null;
                            let bestTarget = currentZoneIdx + 20;
                            let bestDist = Infinity;
                            if (window.WORLD_KINGDOMS) {
                                for (const kId in window.WORLD_KINGDOMS) {
                                    if (kId === currentKingdomId) continue;
                                    const k = window.WORLD_KINGDOMS[kId];
                                    const dist = Math.abs(k.capital - currentZoneIdx);
                                    if (dist < bestDist) { bestDist = dist; bestTarget = k.capital; }
                                }
                            }
                            const config = window.autoplayConfig || {};
                            config.targetZone = bestTarget;
                            if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                                scene.hudManager._saveAutoplayConfig();
                            }
                            if (scene.showFloatingText) {
                                scene.showFloatingText(player.sprite.x, player.sprite.y - 60, 'Trade refused! Leaving kingdom...', 0xff4444);
                            }
                            return;
                        }
                        if (!this._cargoTabClickTime) {
                            this._cargoTabClickTime = time;
                        }
                        btnCargo.click(); // Switch to Cargo tab
                        return;
                    }
                    this._cargoTabClickTime = null; // Reset on success

                    if (time - (this._lastTradeTime || 0) > 800) {
                        this._lastTradeTime = time;

                        if (buyCargoList) {
                            // 1. Sell ONLY goods that are in Import Demand here (profitable sales)
                            const sellContainer = document.getElementById('sell-cargo-list');
                            if (sellContainer) {
                                // Find sell rows that have the "Import Demand" badge
                                const sellRows = Array.from(sellContainer.querySelectorAll('div.flex'));
                                for (const row of sellRows) {
                                    if (row.innerText.includes('Import Demand')) {
                                        const sellBtn = row.querySelector('[id^="btn-sell-"]');
                                        if (sellBtn) {
                                            sellBtn.click();
                                            return;
                                        }
                                    }
                                }
                            }

                            // 2. Buy local exports if cargo hold has space
                            const buyContainer = document.getElementById('buy-cargo-list');
                            if (buyContainer && window.saveData) {
                                const totalCargo = window.saveData.cargo
                                    ? Object.values(window.saveData.cargo).reduce((a, b) => a + b, 0)
                                    : 0;

                                if (totalCargo < 10) {
                                    const buyButtons = Array.from(buyContainer.querySelectorAll('[id^="btn-buy-"]')).filter(btn => {
                                        return btn.innerText.trim().toLowerCase() === 'buy';
                                    });
                                    if (buyButtons.length > 0) {
                                        buyButtons[Math.floor(Math.random() * buyButtons.length)].click();
                                        return; // Keep buying until full
                                    }
                                }
                            }

                            // 3. Done trading at this town — close shop and set next destination
                            const closeBtn = document.getElementById('btn-close-shop');
                            if (closeBtn) closeBtn.click();

                            const totalCargo = window.saveData.cargo
                                ? Object.values(window.saveData.cargo).reduce((a, b) => a + b, 0)
                                : 0;

                            // Always update target to avoid getting stuck at the current zone
                            // If carrying cargo, head to the capital of the kingdom that pays the absolute most for it!
                            // If no cargo, head to the nearest different-kingdom capital to resupply.
                            {
                                const currentZoneIdx = scene.worldManager ? scene.worldManager.currentZoneIndex : 0;
                                const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZoneIdx) : null;
                                const currentKingdomId = currentKingdom ? currentKingdom.id : null;

                                // Fallback: Find the nearest town (capital) in a DIFFERENT kingdom
                                let bestTarget = currentZoneIdx + 20; // fallback: go far enough to leave any kingdom
                                let bestDist = Infinity;

                                if (window.WORLD_KINGDOMS) {
                                    for (const kId in window.WORLD_KINGDOMS) {
                                        if (kId === currentKingdomId) continue; // skip same kingdom
                                        const k = window.WORLD_KINGDOMS[kId];
                                        const capitalZone = k.capital;
                                        const dist = Math.abs(capitalZone - currentZoneIdx);
                                        if (dist < bestDist) {
                                            bestDist = dist;
                                            bestTarget = capitalZone;
                                        }
                                    }
                                }

                                if (window.saveData && window.saveData.discoveredKingdoms) {
                                    for (const kId in window.saveData.discoveredKingdoms) {
                                        if (kId === currentKingdomId) continue;
                                        const fk = window.saveData.discoveredKingdoms[kId];
                                        const capitalZone = fk.capital;
                                        const dist = Math.abs(capitalZone - currentZoneIdx);
                                        if (dist < bestDist) {
                                            bestDist = dist;
                                            bestTarget = capitalZone;
                                        }
                                    }
                                }

                                // ARBITRAGE OPTIMIZATION: If we have cargo, calculate potential sale price at each capital
                                if (totalCargo > 0 && window.saveData && window.saveData.cargo) {
                                    let bestArbitrageTarget = null;
                                    let maxArbitrageValue = -Infinity;

                                    const evalCapital = (capZone) => {
                                        let totalVal = 0;
                                        for (const itemId in window.saveData.cargo) {
                                            const qty = window.saveData.cargo[itemId] || 0;
                                            if (qty > 0) {
                                                const unitPrice = window.getTradePrice ? window.getTradePrice(itemId, false, capZone) : 0;
                                                totalVal += unitPrice * qty;
                                            }
                                        }
                                        if (totalVal > maxArbitrageValue) {
                                            maxArbitrageValue = totalVal;
                                            bestArbitrageTarget = capZone;
                                        }
                                    };

                                    if (window.WORLD_KINGDOMS) {
                                        for (const kId in window.WORLD_KINGDOMS) {
                                            if (kId === currentKingdomId) continue;
                                            evalCapital(window.WORLD_KINGDOMS[kId].capital);
                                        }
                                    }
                                    if (window.saveData.discoveredKingdoms) {
                                        for (const kId in window.saveData.discoveredKingdoms) {
                                            if (kId === currentKingdomId) continue;
                                            evalCapital(window.saveData.discoveredKingdoms[kId].capital);
                                        }
                                    }

                                    if (bestArbitrageTarget !== null) {
                                        bestTarget = bestArbitrageTarget;
                                    }
                                }

                                const config = window.autoplayConfig || {};
                                config.targetZone = bestTarget;
                                const zoneInput = document.getElementById('ap-target-zone');
                                if (zoneInput) zoneInput.value = bestTarget;

                                if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                                    scene.hudManager._saveAutoplayConfig();
                                }

                                const targetKingdom = window.getKingdomForZone ? window.getKingdomForZone(bestTarget) : null;
                                const destName = targetKingdom ? targetKingdom.name : `Zone ${bestTarget}`;
                                if (scene.showFloatingText) {
                                    const msg = totalCargo > 0
                                        ? `Cargo loaded! Trading to ${destName}`
                                        : `Heading to ${destName} to resupply`;
                                    scene.showFloatingText(player.sprite.x, player.sprite.y - 60, msg, 0x00ffff);
                                }
                            }
                        }
                    }
                    return;
                }

                // Standard item buying fallback
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

                        const buyChance = (partyBuildFocus / 100) * 0.8 + 0.1;
                        if (affordable.length > 0 && Math.random() < buyChance) {
                            affordable[Math.floor(Math.random() * affordable.length)].click();
                            if (scene.showFloatingText) scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Bought item!", 0x00ff00);
                        } else {
                            const closeBtn = document.getElementById('btn-close-shop');
                            if (closeBtn) closeBtn.click();
                        }
                    }
                }
                return;
            }

            if (isDirOpen) {
                const currentZoneIdx = scene.worldManager ? scene.worldManager.currentZoneIndex : 0;
                const targetZone = window.autoplayConfig ? window.autoplayConfig.targetZone : 0;
                
                if (currentZoneIdx !== targetZone) {
                    const travelContainer = document.getElementById('travel-destinations-container');
                    const tabTravel = document.getElementById('tab-travel');
                    if (travelContainer && travelContainer.style.display === 'none' && tabTravel) {
                        tabTravel.click();
                        return;
                    }
                    
                    if (travelContainer && time - (this._lastTravelClickTime || 0) > 1500) {
                        this._lastTravelClickTime = time;
                        const allDescendants = Array.from(travelContainer.querySelectorAll('div'));
                        const travelCards = allDescendants.filter(el => {
                            return el.innerText.includes('Zone ') && el.innerHTML.includes('💰');
                        });
                        
                        if (travelCards.length > 0) {
                            let bestCard = null;
                            let bestDist = Math.abs(currentZoneIdx - targetZone);
                            
                            travelCards.forEach(card => {
                                const zoneMatch = card.innerText.match(/Zone\s+(-?\d+)/);
                                if (zoneMatch) {
                                    const zIdx = parseInt(zoneMatch[1]);
                                    const dist = Math.abs(zIdx - targetZone);
                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        bestCard = card;
                                    }
                                }
                            });
                            
                            if (bestCard) {
                                bestCard.click();
                                if (scene.showFloatingText) {
                                    scene.showFloatingText(player.sprite.x, player.sprite.y - 65, "Fast Traveling...", 0x00ff00);
                                }
                                return;
                            }
                        }
                    }
                }
                
                const closeBtn = document.getElementById('btn-close-directory');
                if (closeBtn) closeBtn.click();
                return;
            }

            if (isChatOpen) {
                this._wasChatOpen = true;

                const inputField = document.getElementById('chat-input');
                const submitBtn = document.getElementById('chat-submit');

                // Merchant Trader: skip chatting, go straight to trade
                const isMerchantPreset = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
                if (isMerchantPreset) {
                    // Don't try to trade while the NPC greeting is still loading
                    if (inputField && inputField.disabled) {
                        return;
                    }
                    const tradeBtn = document.getElementById('chat-trade');
                    if (tradeBtn) {
                        const computedDisplay = window.getComputedStyle(tradeBtn).display;
                        if (computedDisplay !== 'none') {
                            tradeBtn.click();
                            return;
                        }
                    }
                    // If no trade button (NPC can't trade), close chat and move on
                    const activeNpc = scene.npcs.find(n => n.isChatOpen);
                    if (activeNpc) {
                        activeNpc.closeChat();
                        this._wasChatOpen = false;
                        this._lastChatClosedTime = time;
                        this._currentChatNpc = null;
                    }
                    return;
                }

                if (inputField && inputField.disabled) {
                    return;
                }

                const npcName = document.getElementById('chat-npc-name')?.innerText || 'NPC';
                if (this._currentChatNpc !== npcName) {
                    this._currentChatNpc = npcName;
                    this._chatMessageCount = 0;
                }

                // Chat message limit based on townFocus
                const chatLimit = Math.max(2, Math.floor(townFocus / 20));
                if (this._chatMessageCount >= chatLimit && Math.random() < 0.1) {
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

                // Auto click Activity button inside dialogue (respect questFocus)
                const activityBtn = document.getElementById('chat-activity');
                if (activityBtn && activityBtn.style.display !== 'none' && !activityBtn.disabled) {
                    const isBountyBoard = activityBtn.innerText.toLowerCase().includes('bounty');
                    const questFocus = window.autoplayConfig ? window.autoplayConfig.questFocus : 70;
                    const activeQuestCount = player.quests ? player.quests.length : 0;
                    const needsQuests = activeQuestCount < 3 && questFocus > 40;

                    if (isBountyBoard && needsQuests) {
                        // High quest focus + few quests = always click the bounty board
                        activityBtn.click();
                        return;
                    } else if (isBountyBoard && Math.random() * 100 > questFocus) {
                        // Low quest focus: ignore the bounty board, close the chat
                        const activeNpc = scene.npcs.find(n => n.isChatOpen);
                        if (activeNpc) {
                            activeNpc.closeChat();
                            this._currentChatNpc = null;
                            this._chatMessageCount = 0;
                            this._wasChatOpen = false;
                            this._lastChatClosedTime = time;
                            return;
                        }
                    } else if (Math.random() < 0.3) {
                        activityBtn.click();
                        return;
                    }
                }

                // Roleplay Chat Logic
                if (time - (this._lastChatTime || 0) > 4000) {
                    this._lastChatTime = time;
                    const historyDiv = document.getElementById('chat-history');
                    const tradeBtn = document.getElementById('chat-trade');
                    
                    const isMerchantTrader = window.autoplayConfig && window.autoplayConfig.preset === 'merchant_trader';
                    if (tradeBtn && tradeBtn.style.display !== 'none' && (isMerchantTrader || Math.random() < 0.3)) {
                        tradeBtn.click(); // Open shop — merchants always trade immediately
                        return;
                    }

                    if (historyDiv && scene.geminiService) {
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

                // Prioritize delivery target NPC if active delivery quest is here
                const deliveryQuest = player.quests && player.quests.find(q => q.type === 'delivery' && q.deliveryTargetZone === currentZoneIndex);
                if (deliveryQuest) {
                    const targetNpc = scene.npcs.find(n => {
                        const nameLower = n.name.toLowerCase();
                        const targetLower = deliveryQuest.deliveryTargetNPC.toLowerCase();
                        return nameLower.includes(targetLower) || targetLower.includes(nameLower);
                    });
                    if (targetNpc && targetNpc.sprite && targetNpc.sprite.active) {
                        closestNpc = targetNpc;
                        minDist = Math.abs(targetNpc.sprite.x - player.sprite.x);
                    }
                }

                if (!closestNpc) {
                    scene.npcs.forEach(npc => {
                        if (npc && npc.sprite && npc.sprite.active) {
                            const d = Math.abs(npc.sprite.x - player.sprite.x);
                            if (d < minDist) { minDist = d; closestNpc = npc; }
                        }
                    });
                }

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
                if (time - (this._lastDirTime || 0) > 1500) {
                    const locContainer = document.getElementById('directory-locations-container');
                    if (locContainer) {
                        const cards = Array.from(locContainer.children);
                        if (cards.length > 0) {
                            this._lastDirTime = time;
                            
                            // Prefer Guild Hall if questFocus is high and we need quests
                            let cardToClick = null;
                            const coliseumGrind = window.autoplayConfig && window.autoplayConfig.coliseumGrind;
                            const questFocusDir = window.autoplayConfig ? window.autoplayConfig.questFocus : 70;
                            const activeQuestsDir = player.quests ? player.quests.length : 0;
                            const needsQuestsDir = activeQuestsDir < 3 && questFocusDir > 40;

                            if (needsQuestsDir && !coliseumGrind && Math.random() * 100 < questFocusDir) {
                                const guildCard = cards.find(card => {
                                    const headline = card.querySelector('.font-headline-sm');
                                    return headline && headline.innerText.toLowerCase().includes('guild');
                                });
                                if (guildCard) {
                                    cardToClick = guildCard;
                                }
                            }

                            // Prefer Coliseum card click if townFocus is high or coliseum grind is on
                            if (!cardToClick && (coliseumGrind || Math.random() < (townFocus / 100))) {
                                const coliseumCard = cards.find(card => {
                                    const headline = card.querySelector('.font-headline-sm');
                                    return headline && headline.innerText.toLowerCase().includes('coliseum');
                                });
                                if (coliseumCard && (coliseumGrind || Math.random() < 0.6)) {
                                    cardToClick = coliseumCard;
                                }
                            }
                            if (!cardToClick) {
                                cardToClick = cards[Math.floor(Math.random() * cards.length)];
                            }
                            cardToClick.click();
                        }
                    }
                }
                return;
            }

            if (scene.angelStatue && !isDirOpen && isActuallySafe) {
                if (!this._wantsToTravel && !this._wantsToAdventure && !this._wantsGuildHall && Math.random() < 0.001) {
                    this._wantsToTravel = true;
                }
                // Walk to angel statue when wanting to travel OR wanting to visit the Guild Hall for quests
                if ((this._wantsToTravel && !this._wantsToAdventure) || this._wantsGuildHall) {
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
            // 3. HOSTILE ZONE BEHAVIORS
            
            // Party Support (Heal Allies) - respect partyPotionPct slider
            const partyPotionThresh = (window.autoplayConfig ? window.autoplayConfig.partyPotionPct : 40) / 100;
            if (scene.partyMembers && player.inventory.potions > 0 && time - (this._lastSupportTime || 0) > 3000) {
                let lowAlly = null;
                scene.partyMembers.forEach(m => {
                    if (m.hp > 0 && m.hp < m.maxHp * partyPotionThresh) lowAlly = m;
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

        // Disable jumping and dashing for cargo caravans (Phase 11)
        if (player.isCargoCarrier) {
            player.aiInput.up = false;
            player.aiInput.dashLeft = false;
            player.aiInput.dashRight = false;
        }
    }
}

window.CompanionAI = CompanionAI;
