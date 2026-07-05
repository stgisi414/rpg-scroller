// src/player/CompanionAI_Helper.js - Helper containing offloaded logic for CompanionAI

const CompanionAI_Helper = {
    _getQuestTargetZone(player) {
        if (!player.quests || player.quests.length === 0) return null;
        
        const currentZoneIndex = player.scene.worldManager ? player.scene.worldManager.currentZoneIndex : 0;
        const currentZone = (saveData && saveData.currentZone) || 0;

        // 1. Rescue quest takes highest priority
        const rescueQuest = player.quests.find(q => q.type === 'rescue');
        if (rescueQuest) {
            if (rescueQuest.rescueState === 'captive') {
                return rescueQuest.rescueeZone; // Go to captive zone
            } else if (rescueQuest.rescueState === 'following') {
                // Return to nearest town
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
                const kingdomObj = WORLD_KINGDOMS[politicalQuest.targetKingdom] || (saveData && saveData.discoveredKingdoms && saveData.discoveredKingdoms[politicalQuest.targetKingdom]);
                if (kingdomObj) {
                    return kingdomObj.capital;
                }
            }
            if (politicalQuest.targetFaction) {
                const factionObj = window.WORLD_FACTIONS[politicalQuest.targetFaction];
                if (factionObj && factionObj.kingdom) {
                    const kingdomObj = WORLD_KINGDOMS[factionObj.kingdom];
                    if (kingdomObj) {
                        return kingdomObj.capital;
                    }
                }
            }
        }
        
        // 3. Kill quest — hunt in non-town zones, progressing toward the compass target
        const killQuest = player.quests.find(q => q.type === 'kill');
        if (killQuest) {
            let compassTarget = autoplayConfig ? autoplayConfig.targetZone : 0;
            // NOTE: never recurse into _getQuestTargetZone here to resolve an unset compass —
            // every higher-priority quest type already RETURNED above, so a recursive call
            // re-enters this same kill branch with identical state and overflows the stack
            // (which froze autoplay whenever the hero held only a kill quest with compass 0).
            // Default instead to hunting in the next wild zone toward world progression.
            if (compassTarget === 0 && currentZone === 0) {
                compassTarget = currentZone + 1;
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
    },

    _getIdealAutoplayZone(player) {
        const level = saveData ? (saveData.level || 1) : 1;
        
        // 1. Quests are the highest priority. If we have a quest target, go there!
        const questZone = this._getQuestTargetZone(player);
        if (questZone !== null) {
            return questZone;
        }

        // 2. Otherwise, calculate ideal zone index based on power levels:
        // Base zone based on level: level 1-3 -> Tier 0, level 4-7 -> Tier 1, etc.
        let idealZone = Math.floor((level - 1) / 4) * 4; // Start at the town of that level tier

        // Progress into the wild zones based on level progression within the tier
        const tierProgress = (level - 1) % 4;
        idealZone += Math.min(3, tierProgress);

        // Adjust based on party size
        const partySize = (player.scene.partyMembers ? player.scene.partyMembers.length : 0) + 1; // including player
        if (partySize === 1) {
            idealZone = Math.max(0, idealZone - 1); // Solo is safer playing slightly lower
        } else if (partySize >= 3) {
            idealZone += 1; // Large party can push +1 zone
        }

        // Adjust based on equipment strength
        const weaponBonus = (player.inventory && player.inventory.weapon) ? (player.inventory.weapon.damageBonus || 0) : 0;
        if (weaponBonus >= 20) {
            idealZone += 1;
        }
        if (weaponBonus >= 40) {
            idealZone += 1;
        }

        const hasArtifact = player.inventory && player.inventory.equippedArtifact !== undefined && player.inventory.equippedArtifact >= 0;
        if (hasArtifact) {
            idealZone += 1;
        }

        // Clamp to maximum available zone in the world map (currently zone 19/20)
        const maxWorldZone = 19;
        idealZone = Phaser.Math.Clamp(idealZone, 0, maxWorldZone);

        // If it's a town zone, and we want to adventure, target the wild zones after it
        const coliseumGrind = autoplayConfig && autoplayConfig.coliseumGrind;
        if (coliseumGrind && idealZone === 0) {
            idealZone = 1;
        }

        return idealZone;
    },

    _handleMainHeroAutoPlay(time, delta) {
        const player = this.player;
        const scene = player.scene;
        if (!scene) return;

        const isArenaActive = scene.currentIndoorLocation === 'coliseum' && scene.arenaManager && scene.arenaManager.isActive;
        const isActuallySafe = scene.zoneType === 'Safe' && !isArenaActive;

        // Periodically check if we want to abandon/ignore quests based on questFocus slider
        if (isActuallySafe && (!this._lastQuestCheckTime || time - this._lastQuestCheckTime > 5000)) {
            this._lastQuestCheckTime = time;
            const questFocus = autoplayConfig ? autoplayConfig.questFocus : 70;
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
            const townFocus = autoplayConfig ? autoplayConfig.townFocus : 50;
            const partyBuildFocus = autoplayConfig ? autoplayConfig.partyBuildFocus : 50;

            // Coliseum AutoPlay wave grinding: between waves (isActuallySafe is false while a
            // wave is active, so this never runs mid-fight), walk to the arena master (the NPC
            // with indoorAction 'arena') and start the next wave via the chat activity button.
            // NOTE: NPCs expose npcName, not .name — and chat visibility must be computed here,
            // because the shared isChatOpen const is declared further down this function (TDZ).
            if (scene.currentIndoorLocation === 'coliseum') {
                const arenaNpc = scene.npcs ? scene.npcs.find(n => n && n.indoorAction === 'arena' && n.sprite && n.sprite.active) : null;
                if (arenaNpc) {
                    const isArenaChatOpen = this._isElementVisible('chat-ui');
                    if (!isArenaChatOpen) {
                        const dist = Math.abs(arenaNpc.sprite.x - player.sprite.x);
                        if (dist > 60) {
                            if (arenaNpc.sprite.x > player.sprite.x) player.aiInput.right = true;
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
                    const coliseumGrind = autoplayConfig && autoplayConfig.coliseumGrind;
                    const isGuildHall = scene.currentIndoorLocation === 'guild_hall';
                    const leaveChance = coliseumGrind ? 0 : (scene.currentIndoorLocation === 'coliseum' ? 0.0001 : ((100 - townFocus) / 100) * 0.02 + 0.001);
                    // Stay in the Guild Hall while we need quests
                    if (this._wantsGuildHall && isGuildHall) {
                        // Don't leave — we need to pick up a contract
                    } else if (this._wantsThroneRoom && scene.currentIndoorLocation === 'throne_room') {
                        // Don't leave — we need an audience with the ruler first
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
            const questFocus = autoplayConfig ? autoplayConfig.questFocus : 70;
            let targetZone = autoplayConfig ? autoplayConfig.targetZone : 0;
            const isMerchantMode = autoplayConfig && autoplayConfig.preset === 'merchant_trader';

            // Periodically (every 5 seconds) update targetZone intelligently if preset is not custom/merchant/pacifist
            if (isActuallySafe && (!this._lastTargetZoneUpdateTime || time - this._lastTargetZoneUpdateTime > 5000)) {
                this._lastTargetZoneUpdateTime = time;
                const preset = autoplayConfig ? autoplayConfig.preset : 'custom';
                if (preset !== 'custom' && preset !== 'merchant_trader' && preset !== 'pacifist' && preset !== 'faction_politician') {
                    // (politician has its own court-driven targeting below — nearest capital)
                    const ideal = this._getIdealAutoplayZone(player);
                    if (ideal !== targetZone) {
                        autoplayConfig.targetZone = ideal;
                        targetZone = ideal;
                        if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                            scene.hudManager._saveAutoplayConfig();
                        }
                        if (scene.showFloatingText) {
                            scene.showFloatingText(player.sprite.x, player.sprite.y - 60, `Target updated to Zone ${ideal}!`, 0x00ff88);
                        }
                    }
                }
            }

            if (!isMerchantMode && player.quests && player.quests.length > 0) {
                if (targetZone === 0 || questFocus >= 40) {
                    const questZone = this._getQuestTargetZone(player);
                    if (questZone !== null) {
                        targetZone = questZone;
                    }
                }
            }

            // --- FACTION POLITICIAN PRESET: court-driven play ---
            // Political quests (espionage/diplomacy/assassination/intel_report) are granted by
            // throne-room rulers in LLM chat, so the politician's loop is: travel to a capital,
            // seek an audience (_wantsThroneRoom -> statue -> directory -> Throne Room), ask the
            // ruler for a court contract, execute it, then return to a court to turn it in
            // (diplomacy/intel_report complete via the pre-chat delivery check on the ruler).
            const isPoliticianPreset = autoplayConfig && autoplayConfig.preset === 'faction_politician';
            if (isPoliticianPreset && !scene.isIndoors) {
                const POLITICAL_TYPES = ['espionage', 'diplomacy', 'assassination', 'intel_report'];
                const politicalQuests = player.quests ? player.quests.filter(q => POLITICAL_TYPES.includes(q.type)) : [];
                const isCapitalHere = window.isCapitalCity ? window.isCapitalCity(currentZoneIndex) : false;
                const throneCooldown = this._lastThroneRoomVisitTime && (time - this._lastThroneRoomVisitTime < 60000);

                // Turn-in: diplomacy completes by chatting with the target ruler (their capital),
                // intel_report by chatting with any faction leader — the throne room covers both.
                const hasTurnInHere = politicalQuests.some(q => {
                    if (q.type === 'intel_report') return isCapitalHere;
                    if (q.type === 'diplomacy' && q.targetKingdom) {
                        const kObj = (typeof WORLD_KINGDOMS !== 'undefined' && WORLD_KINGDOMS[q.targetKingdom]) ||
                            (saveData && saveData.discoveredKingdoms && saveData.discoveredKingdoms[q.targetKingdom]);
                        return !!(kObj && kObj.capital === currentZoneIndex);
                    }
                    return false;
                });

                if (isCapitalHere && !this._wantsThroneRoom && !throneCooldown && (hasTurnInHere || politicalQuests.length < 1)) {
                    this._wantsThroneRoom = true;
                    this._wantsToAdventure = false;
                } else if (!isCapitalHere && politicalQuests.length < 1 &&
                           (!this._lastPoliticianRetarget || time - this._lastPoliticianRetarget > 5000)) {
                    // No court work and no court here — set course for the nearest capital
                    this._lastPoliticianRetarget = time;
                    let bestCapital = null, bestCapDist = Infinity;
                    const evalCap = (cap) => {
                        if (typeof cap !== 'number') return;
                        const d = Math.abs(cap - currentZoneIndex);
                        if (d < bestCapDist) { bestCapDist = d; bestCapital = cap; }
                    };
                    if (typeof WORLD_KINGDOMS !== 'undefined') {
                        for (const kId in WORLD_KINGDOMS) evalCap(WORLD_KINGDOMS[kId].capital);
                    }
                    if (saveData && saveData.discoveredKingdoms) {
                        for (const kId in saveData.discoveredKingdoms) evalCap(saveData.discoveredKingdoms[kId].capital);
                    }
                    if (bestCapital !== null && bestCapital !== targetZone) {
                        const config = autoplayConfig || {};
                        config.targetZone = bestCapital;
                        targetZone = bestCapital;
                        if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                            scene.hudManager._saveAutoplayConfig();
                        }
                        if (scene.showFloatingText) {
                            scene.showFloatingText(player.sprite.x, player.sprite.y - 60, 'Seeking an audience at court...', 0xbb88ff);
                        }
                    }
                }
                // Throne rooms only exist in capitals — never chase one elsewhere
                if (this._wantsThroneRoom && !isCapitalHere) this._wantsThroneRoom = false;
            }

            if (!scene.isIndoors && currentZoneIndex !== targetZone) {
                // When coliseum grind is on, only want to adventure if not in zone 0 (town)
                const coliseumGrind = autoplayConfig && autoplayConfig.coliseumGrind;
                // Merchants restock potions inside their shop flow; once that's done (or
                // impossible in this town) the resupply hold must release, or the merchant
                // never leaves town and loops trades forever.
                const potionHoldDone = isMerchantMode && this._merchantPotionRestockDone;
                const needsPotions = player.inventory && (player.inventory.potions || 0) < 5 && saveData && saveData.gold >= 50 && !potionHoldDone;
                if (coliseumGrind || needsPotions) {
                    this._wantsToAdventure = false; // Stay in town for coliseum or potion resupply
                } else if (this._wantsToTravel && scene.angelStatue) {
                    // Keep _wantsToAdventure false so the angel-statue fast-travel path can run
                    // (it requires !_wantsToAdventure). The statue interact clears _wantsToTravel,
                    // after which this branch stops matching and normal walking resumes.
                    this._wantsToAdventure = false;
                } else {
                    this._wantsToAdventure = true;
                }
            } else if (!isChatOpen && !isShopOpen && !isDirOpen && !scene.isIndoors && !this._wantsToAdventure && !this._wantsGuildHall && !this._wantsToTravel && !this._wantsThroneRoom) {
                const coliseumGrind = autoplayConfig && autoplayConfig.coliseumGrind;
                const isMerchantTrader = autoplayConfig && autoplayConfig.preset === 'merchant_trader';
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
            const isGuildCooldown = this._lastGuildHallVisitTime && (time - this._lastGuildHallVisitTime < 60000);
            // Politicians take contracts from throne rooms, not the adventurers' guild
            if (this._wantsToAdventure && activeQuestCountNav < 1 && questFocus > 50 && !scene.isIndoors && !isGuildCooldown && !isPoliticianPreset && !this._wantsThroneRoom) {
                this._wantsToAdventure = false;
                this._wantsGuildHall = true;
            } else if (questFocus <= 50 || activeQuestCountNav >= 1 || isGuildCooldown || isPoliticianPreset) {
                this._wantsGuildHall = false;
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
                
                const isMerchantTrader = autoplayConfig && autoplayConfig.preset === 'merchant_trader';
                if (isMerchantTrader) {
                    // Restock potions from the goods tab BEFORE cargo trading. The cargo logic
                    // below always returns before the standard buy fallback, so without this
                    // step merchants never resupply, and the needsPotions hold (town logic
                    // above) keeps _wantsToAdventure false — deadlocking the merchant into an
                    // endless trade loop in a single town.
                    const potionsNow = player.inventory ? (player.inventory.potions || 0) : 0;
                    const cargoUIOpen = !!document.getElementById('buy-cargo-list');
                    if (potionsNow < 5 && !this._merchantPotionRestockDone && !cargoUIOpen) {
                        if (time - (this._lastTradeTime || 0) > 800) {
                            this._lastTradeTime = time;
                            const goodsContainer = document.getElementById('shop-items-container');
                            let potionCard = null;
                            if (goodsContainer && saveData) {
                                potionCard = Array.from(goodsContainer.children).find(card => {
                                    const nameEl = card.querySelector('.font-label-caps');
                                    const priceEl = card.querySelector('.font-headline-sm');
                                    if (!nameEl || !priceEl) return false;
                                    if (!nameEl.innerText.toLowerCase().includes('health potion')) return false;
                                    const costMatch = priceEl.innerText.match(/(\d+)g/);
                                    return costMatch && parseInt(costMatch[1]) <= saveData.gold;
                                });
                            }
                            if (potionCard) {
                                potionCard.click();
                                if (scene.showFloatingText) scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Restocking potions!", 0x00ff00);
                            } else {
                                // No affordable potion in this shop — stop holding the caravan
                                // for restock so the merchant can move on. Reset on zone change.
                                this._merchantPotionRestockDone = true;
                            }
                        }
                        return;
                    }

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
                            if (WORLD_KINGDOMS) {
                                for (const kId in WORLD_KINGDOMS) {
                                    if (kId === currentKingdomId) continue;
                                    const k = WORLD_KINGDOMS[kId];
                                    const dist = Math.abs(k.capital - currentZoneIdx);
                                    if (dist < bestDist) { bestDist = dist; bestTarget = k.capital; }
                                }
                            }
                            const config = autoplayConfig || {};
                            config.targetZone = bestTarget;
                            if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                                scene.hudManager._saveAutoplayConfig();
                            }
                            // Prefer fast travel out of the hostile kingdom (walking fallback intact)
                            this._wantsToTravel = true;
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
                            if (buyContainer && saveData) {
                                const totalCargo = saveData.cargo
                                    ? Object.values(saveData.cargo).reduce((a, b) => a + b, 0)
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

                            const totalCargo = saveData.cargo
                                ? Object.values(saveData.cargo).reduce((a, b) => a + b, 0)
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

                                if (WORLD_KINGDOMS) {
                                    for (const kId in WORLD_KINGDOMS) {
                                        if (kId === currentKingdomId) continue; // skip same kingdom
                                        const k = WORLD_KINGDOMS[kId];
                                        const capitalZone = k.capital;
                                        const dist = Math.abs(capitalZone - currentZoneIdx);
                                        if (dist < bestDist) {
                                            bestDist = dist;
                                            bestTarget = capitalZone;
                                        }
                                    }
                                }

                                if (saveData && saveData.discoveredKingdoms) {
                                    for (const kId in saveData.discoveredKingdoms) {
                                        if (kId === currentKingdomId) continue;
                                        const fk = saveData.discoveredKingdoms[kId];
                                        const capitalZone = fk.capital;
                                        const dist = Math.abs(capitalZone - currentZoneIdx);
                                        if (dist < bestDist) {
                                            bestDist = dist;
                                            bestTarget = capitalZone;
                                        }
                                    }
                                }

                                // ARBITRAGE OPTIMIZATION: If we have cargo, calculate potential sale price at each capital
                                if (totalCargo > 0 && saveData && saveData.cargo) {
                                    let bestArbitrageTarget = null;
                                    let maxArbitrageValue = -Infinity;

                                    const evalCapital = (capZone) => {
                                        let totalVal = 0;
                                        for (const itemId in saveData.cargo) {
                                            const qty = saveData.cargo[itemId] || 0;
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

                                    if (WORLD_KINGDOMS) {
                                        for (const kId in WORLD_KINGDOMS) {
                                            if (kId === currentKingdomId) continue;
                                            evalCapital(WORLD_KINGDOMS[kId].capital);
                                        }
                                    }
                                    if (saveData.discoveredKingdoms) {
                                        for (const kId in saveData.discoveredKingdoms) {
                                            if (kId === currentKingdomId) continue;
                                            evalCapital(saveData.discoveredKingdoms[kId].capital);
                                        }
                                    }

                                    if (bestArbitrageTarget !== null) {
                                        bestTarget = bestArbitrageTarget;
                                    }
                                }

                                const config = autoplayConfig || {};
                                config.targetZone = bestTarget;
                                const zoneInput = document.getElementById('ap-target-zone');
                                if (zoneInput) zoneInput.value = bestTarget;

                                if (scene.hudManager && typeof scene.hudManager._saveAutoplayConfig === 'function') {
                                    scene.hudManager._saveAutoplayConfig();
                                }

                                // Capitals can be many zones away — head straight for the angel
                                // statue and fast travel instead of waiting on the rare random
                                // travel impulse. Walking remains the fallback if travel fails.
                                this._wantsToTravel = true;

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
                    if (itemsContainer && saveData) {
                        const itemCards = Array.from(itemsContainer.children);
                        const affordable = itemCards.filter(card => {
                            const priceEl = card.querySelector('.font-headline-sm');
                            if (!priceEl) return false;
                            const costMatch = priceEl.innerText.match(/(\d+)g/);
                            return costMatch && parseInt(costMatch[1]) <= saveData.gold;
                        });

                        let cardToClick = null;
                        const needsPotions = player.inventory && (player.inventory.potions || 0) < 5;
                        if (needsPotions) {
                            const potionCard = affordable.find(card => {
                                const nameEl = card.querySelector('.font-label-caps');
                                return nameEl && nameEl.innerText.toLowerCase().includes('health potion');
                            });
                            if (potionCard) {
                                cardToClick = potionCard;
                            }
                        }

                        if (!cardToClick) {
                            const buyChance = (partyBuildFocus / 100) * 0.8 + 0.1;
                            if (affordable.length > 0 && Math.random() < buyChance) {
                                cardToClick = affordable[Math.floor(Math.random() * affordable.length)];
                            }
                        }

                        if (cardToClick) {
                            cardToClick.click();
                            if (scene.showFloatingText) scene.showFloatingText(player.sprite.x, player.sprite.y - 40, "Bought item!", 0x00ff00);
                        } else {
                            const closeBtn = document.getElementById('btn-close-shop');
                            if (closeBtn) closeBtn.click();
                        }
                    }
                }
                return;
            }

            const currentZoneIdx = scene.worldManager ? scene.worldManager.currentZoneIndex : 0;

            if (isDirOpen) {
                // 1. Travel Navigation
                if (currentZoneIdx !== targetZone && !this._wantsGuildHall && !this._wantsThroneRoom) {
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
                            return el.innerText.includes('Zone ') && el.innerHTML.includes('💰') && !el.className.includes('opacity-40');
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
                    
                    const closeBtn = document.getElementById('btn-close-directory');
                    if (closeBtn) closeBtn.click();
                    return;
                }
                
                // 2. Local Directory Navigation
                if (currentZoneIdx === targetZone || this._wantsGuildHall || this._wantsThroneRoom) {
                    if (this._wantsToAdventure && !this._wantsGuildHall && !this._wantsThroneRoom) {
                        const closeBtn = document.getElementById('btn-close-directory');
                        if (closeBtn) closeBtn.click();
                        return;
                    }
                    if (time - (this._lastDirTime || 0) > 1500) {
                        const locContainer = document.getElementById('directory-locations-container');
                        if (locContainer) {
                            const cards = Array.from(locContainer.children || []);
                            if (cards.length > 0) {
                                this._lastDirTime = time;
                                
                                let cardToClick = null;
                                const coliseumGrind = autoplayConfig && autoplayConfig.coliseumGrind;
                                const questFocusDir = autoplayConfig ? autoplayConfig.questFocus : 70;
                                const activeQuestsDir = player.quests ? player.quests.length : 0;
                                const needsQuestsDir = activeQuestsDir < 3 && questFocusDir > 40;

                                // Politician: an audience with the ruler takes priority over everything
                                if (this._wantsThroneRoom) {
                                    const throneCard = cards.find(card => {
                                        const headline = card.querySelector('.font-headline-sm');
                                        return headline && headline.innerText.toLowerCase().includes('throne');
                                    });
                                    if (throneCard) {
                                        cardToClick = throneCard;
                                    } else {
                                        // No throne room listed here (not a capital) — stop seeking one
                                        this._wantsThroneRoom = false;
                                    }
                                }

                                if (!cardToClick && needsQuestsDir && !coliseumGrind && !this._wantsThroneRoom && Math.random() * 100 < questFocusDir) {
                                    const guildCard = cards.find(card => {
                                        const headline = card.querySelector('.font-headline-sm');
                                        return headline && headline.innerText.toLowerCase().includes('guild');
                                    });
                                    if (guildCard) {
                                        cardToClick = guildCard;
                                    }
                                }

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

                                if (cardToClick) {
                                    cardToClick.click();
                                    return;
                                }
                            }
                        }
                    }
                    
                    const closeBtn = document.getElementById('btn-close-directory');
                    if (closeBtn) closeBtn.click();
                    return;
                }
            }

            if (isChatOpen) {
                // If we want the Guild Hall, but we are talking to someone else, close chat immediately
                if (this._wantsGuildHall && !scene.isIndoors) {
                    const activityBtn = document.getElementById('chat-activity');
                    const hasBounty = activityBtn && activityBtn.innerText.toLowerCase().includes('bounty');
                    if (!hasBounty) {
                        const activeNpc = scene.npcs ? scene.npcs.find(n => n.isChatOpen) : null;
                        if (activeNpc && typeof activeNpc.closeChat === 'function') {
                            activeNpc.closeChat();
                            this._wasChatOpen = false;
                            this._lastChatClosedTime = time;
                            this._currentChatNpc = null;
                            return;
                        }
                    }
                }
                if (this._wantsToAdventure || ((this._wantsGuildHall || this._wantsToTravel || this._wantsThroneRoom) && !scene.isIndoors)) {
                    const chatCloseBtn = document.getElementById('chat-close');
                    if (chatCloseBtn && typeof chatCloseBtn.click === 'function') {
                        chatCloseBtn.click();
                    } else {
                        const activeNpc = scene.npcs ? scene.npcs.find(n => n.isChatOpen) : null;
                        if (activeNpc && typeof activeNpc.closeChat === 'function') {
                            activeNpc.closeChat();
                        } else if (typeof player.closeChat === 'function') {
                            player.closeChat();
                        }
                    }
                    this._wasChatOpen = false;
                    this._currentChatNpc = null;
                    this._chatMessageCount = 0;
                    this._lastChatClosedTime = time;
                    return;
                }

                if (!this._wasChatOpen) {
                    this._wasChatOpen = true;
                    this._chatOpenedTime = time;
                    this._askedCourtContract = false;
                }

                // Safety timeout: if chat is open for more than 10 seconds, close it
                if (this._chatOpenedTime && time - this._chatOpenedTime > 10000) {
                    const chatCloseBtn = document.getElementById('chat-close');
                    if (chatCloseBtn && typeof chatCloseBtn.click === 'function') {
                        chatCloseBtn.click();
                    } else {
                        const activeNpc = scene.npcs ? scene.npcs.find(n => n.isChatOpen) : null;
                        if (activeNpc && typeof activeNpc.closeChat === 'function') {
                            activeNpc.closeChat();
                        } else if (typeof player.closeChat === 'function') {
                            player.closeChat();
                        }
                    }
                    this._wasChatOpen = false;
                    this._currentChatNpc = null;
                    this._chatMessageCount = 0;
                    this._lastChatClosedTime = time;
                    return;
                }

                const inputField = document.getElementById('chat-input');
                const submitBtn = document.getElementById('chat-submit');

                // Merchant Trader: skip chatting, go straight to trade
                const isMerchantPreset = autoplayConfig && autoplayConfig.preset === 'merchant_trader';
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
                    const questFocus = autoplayConfig ? autoplayConfig.questFocus : 70;
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
                    
                    const isMerchantTrader = autoplayConfig && autoplayConfig.preset === 'merchant_trader';
                    if (tradeBtn && tradeBtn.style.display !== 'none' && (isMerchantTrader || Math.random() < 0.3)) {
                        tradeBtn.click(); // Open shop — merchants always trade immediately
                        return;
                    }

                    if (historyDiv && scene.geminiService) {
                        const chatLines = Array.from(historyDiv.querySelectorAll('div')).map(d => d.innerText);
                        const chatContext = chatLines.slice(-3).join('\n');

                        if (inputField && submitBtn && !this._isFetchingHeroChat) {
                            if (submitBtn.disabled) {
                                return; // Wait for button to be enabled
                            }

                            // Politician in the throne room with no court contract yet: ask the
                            // ruler for political work directly (the NPC prompt offers quests
                            // "if they ask for work"). Scripted — deterministic and immediate.
                            const isPoliticianChat = autoplayConfig && autoplayConfig.preset === 'faction_politician';
                            if (isPoliticianChat && scene.currentIndoorLocation === 'throne_room' && !this._askedCourtContract && !inputField.value) {
                                const politicalCount = player.quests ? player.quests.filter(q => ['espionage', 'diplomacy', 'assassination', 'intel_report'].includes(q.type)).length : 0;
                                if (politicalCount < 1) {
                                    this._askedCourtContract = true;
                                    this._chatMessageCount = (this._chatMessageCount || 0) + 1;
                                    inputField.value = "*bows deeply* Your Majesty, I place my blade and my discretion at the crown's service. Have you any court contracts — espionage, diplomacy, or intelligence work — that require a subtle hand?";
                                    submitBtn.click();
                                    return;
                                }
                            }

                            if (!inputField.value) {
                                this._isFetchingHeroChat = true;
                                this._chatMessageCount = (this._chatMessageCount || 0) + 1;
                                scene.geminiService.getHeroAutoPlayResponse(player.classData.id, npcName, chatContext).then(reply => {
                                    inputField.value = reply;
                                    submitBtn.click();
                                }).catch(err => {
                                    inputField.value = "Interesting.";
                                    submitBtn.click();
                                }).finally(() => {
                                    this._isFetchingHeroChat = false;
                                });
                            }
                        }
                    }
                }
                return;
            }
            if (this._wasChatOpen) {
                this._wasChatOpen = false;
                if (this._wantsGuildHall) {
                    this._wantsGuildHall = false;
                    this._wantsToAdventure = true;
                    this._lastGuildHallVisitTime = time;
                }
                // Audience held (chat with the ruler closed) — cool down so the politician
                // doesn't immediately re-enter the throne room if no contract was granted.
                if (this._wantsThroneRoom && scene.isIndoors && scene.currentIndoorLocation === 'throne_room') {
                    this._wantsThroneRoom = false;
                    this._lastThroneRoomVisitTime = time;
                }
            }

            // Find NPCs to talk to
            const blockNpc = !scene.isIndoors && (this._wantsGuildHall || this._wantsToTravel || this._wantsThroneRoom);
            const canInteractNpc = scene.isIndoors || (!this._wantsToAdventure && !blockNpc);
            if (scene.npcs && !isChatOpen && !isShopOpen && canInteractNpc && time - (this._lastChatClosedTime || 0) > 8000) {
                let closestNpc = this._targetNpc;
                
                if (!closestNpc || !closestNpc.sprite || !closestNpc.sprite.active) {
                    closestNpc = null;
                    let minDist = Infinity;

                    // Prioritize delivery target NPC if active delivery quest is here.
                    // NPCs expose npcName (NOT .name) — and LLM-generated quests can omit
                    // deliveryTargetNPC, so guard both or this find() throws every AI tick
                    // and freezes autoplay in the delivery town.
                    const deliveryQuest = player.quests && player.quests.find(q => q.type === 'delivery' && q.deliveryTargetZone === currentZoneIndex);
                    if (deliveryQuest && deliveryQuest.deliveryTargetNPC) {
                        const targetLower = String(deliveryQuest.deliveryTargetNPC).toLowerCase();
                        const targetNpc = scene.npcs.find(n => {
                            if (!n || !n.npcName) return false;
                            const nameLower = String(n.npcName).toLowerCase();
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
                    this._targetNpc = closestNpc;
                }

                if (closestNpc) {
                    const dist = Math.abs(closestNpc.sprite.x - player.sprite.x);
                    const maxSearchDist = scene.isIndoors ? 1000 : 200;
                    if (dist < maxSearchDist) {
                        if (dist > 60) {
                            if (closestNpc.sprite.x > player.sprite.x) {
                                player.aiInput.right = true;
                            } else {
                                player.aiInput.left = true;
                            }
                        } else {
                            player.aiInput.interact = true;
                            this._targetNpc = null; // Clear target lock on interaction
                        }
                    } else {
                        this._targetNpc = null; // Clear lock if they are too far away
                    }
                }
            } else {
                this._targetNpc = null; // Clear target lock if we want to adventure/chat is open
            }

            // End of Directory Navigation

            if (!scene.isIndoors && scene.angelStatue && !isDirOpen && !isChatOpen && isActuallySafe) {
                if (!this._wantsToTravel && !this._wantsToAdventure && !this._wantsGuildHall && !this._wantsThroneRoom && Math.random() < 0.001) {
                    this._wantsToTravel = true;
                }
                // Walk to angel statue when wanting to travel OR wanting to visit the Guild Hall / Throne Room
                if ((this._wantsToTravel && !this._wantsToAdventure) || this._wantsGuildHall || this._wantsThroneRoom) {
                    const ax = scene.angelStatue.x;
                    const dist = Math.abs(ax - player.sprite.x);
                    if (dist > 10) {
                        if (ax > player.sprite.x) player.aiInput.right = true;
                        else player.aiInput.left = true;
                    } else {
                        if (time - (this._lastChatClosedTime || 0) > 4000) {
                            if (!this._lastInteractPressTime || time - this._lastInteractPressTime > 2000) {
                                player.aiInput.interact = true;
                                this._lastInteractPressTime = time;
                                this._wantsToTravel = false;
                            }
                        }
                    }
                }
            }

        } else {
            // 3. HOSTILE ZONE BEHAVIORS
            
            // Party Support (Heal Allies) - respect partyPotionPct slider
            const partyPotionThresh = (autoplayConfig ? autoplayConfig.partyPotionPct : 40) / 100;
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
};
