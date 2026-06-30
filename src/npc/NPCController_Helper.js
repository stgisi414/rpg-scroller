// src/npc/NPCController_Helper.js - Helper containing offloaded chat & activity logic for NPCController

const NPCController_Helper = {
    openChat(isIntro = false) {
        this.isChatOpen = true;
        this.isIntroCutscene = isIntro;
        this.player.isTalking = true;
        this.uiContainer.style.display = 'block';
        this.registerChatListeners();

        // Show faction emblem (both absolute top-right and inline next to the name)
        const emblemImg = document.getElementById('chat-faction-emblem');
        const emblemSrc = this.getFactionEmblemSrc();
        if (emblemSrc) {
            if (emblemImg) {
                emblemImg.src = emblemSrc;
                emblemImg.style.display = 'block';
            }
            this.npcNameDiv.innerHTML = `<img src="${emblemSrc}" style="width:22px; height:22px; vertical-align:middle; image-rendering:pixelated; margin-right:8px; display:inline-block; border:1px solid rgba(45,219,222,0.2); padding:1px; background:rgba(0,0,0,0.3); border-radius:2px;" /><span>${this.npcName}</span>`;
        } else {
            if (emblemImg) {
                emblemImg.style.display = 'none';
            }
            this.npcNameDiv.innerText = this.npcName;
        }

        // Release Phaser's key capture so ALL keys flow through to the HTML input
        if (this.player.inputManager) {
            this.scene.input.keyboard.removeCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
            this.player.inputManager.disableForInput();
        }

        if (this.chatHistory.length === 0) {
            if (isIntro) {
                this.chatInput.disabled = true;
                this.chatSubmitBtn.disabled = true;
                const hiddenPrompt = `*The player has just started a new game. Welcome them to the town of Willowbrook, explain the lore of the Elden Soul, and introduce yourself as their Game Master. Give a unique, personalized greeting.*`;
                this.triggerHiddenPrompt(hiddenPrompt, this.npcName);
            } else {
                this.chatInput.disabled = true;
                this.chatSubmitBtn.disabled = true;
                const hiddenPrompt = `*The player has just approached you. Give a short, unique, in-character greeting based on your persona. Mention their class or something random to make it feel alive! Keep it under 2 sentences.*`;
                this.triggerHiddenPrompt(hiddenPrompt, this.npcName);
            }
        }

        const luckOverride = this.checkLuckOverride();
        const isMismatched = !luckOverride && ((this.alignment === 'Good' && this.player.alignment <= -40) ||
                             (this.alignment === 'Evil' && this.player.alignment >= 40));

        if (this.chatTradeBtn) {
            const isMerchant = ['blacksmith', 'alchemist', 'ranger', 'wizard', 'samurai', 'knight'].includes(this.spriteKey);
            this.chatTradeBtn.style.display = (isMerchant && !isMismatched) ? 'inline-block' : 'none';
        }

        if (this.chatActivityBtn) {
            if (this.indoorAction && this.indoorAction !== 'spar' && !isMismatched) {
                const actionNames = {
                    'rest': 'Rest (Full Heal)',
                    'forge': 'Forge (+5 Dmg)',
                    'brew': 'Brew Potion',
                    'contracts': 'Bounty Board',
                    'pray': 'Pray (Heal + Bless)',
                    'study': 'Study Riddles',
                    'train': 'Train (Fight)',
                    'arena': 'Fight in Arena'
                };
                this.chatActivityBtn.innerText = actionNames[this.indoorAction] || 'Activity';
                this.chatActivityBtn.style.display = 'inline-block';
            } else {
                this.chatActivityBtn.style.display = 'none';
            }
        }
        
        // Add Sell Frontier Intel button if talking to a ruler and player has unsold kingdoms (Phase 10)
        if (this.factionRank === 'leader' && saveData && saveData.discoveredKingdoms) {
            const hasUnsoldIntel = Object.keys(saveData.discoveredKingdoms).some(kId => {
                const soldList = (saveData.soldIntel && saveData.soldIntel[this.faction]) || [];
                return !soldList.includes(kId);
            });
            if (hasUnsoldIntel) {
                this._addIntelButton();
            }
        }

        setTimeout(() => this.chatInput.focus(), 100);
    },

    closeChat() {
        this.isChatOpen = false;
        this.isIntroCutscene = false;
        this.player.isTalking = false;
        this.activeActivity = null;
        this.unregisterChatListeners();
        this.uiContainer.style.display = 'none';
        this.chatInput.blur();
        this._luckOverride = undefined;

        // Hide faction emblem
        const emblemImg = document.getElementById('chat-faction-emblem');
        if (emblemImg) {
            emblemImg.style.display = 'none';
        }

        // Re-enable Phaser key capture for game input
        if (this.player.inputManager) {
            this.player.inputManager.enableForInput();
            this.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
        }
    },

    startActivity() {
        if (!this.indoorAction) return;
        
        if (this.indoorAction === 'train' || this.indoorAction === 'arena') {
            this.closeChat();
            this.executeActivityEffect();
            return;
        }

        const prompts = {
            'rest': "The player wants to rest at your tavern. Roleplay asking them to sit by the fire and tell a short tale of their travels before they sleep. If they reply well, end your next message with the exact string [ACTION_SUCCESS].",
            'forge': "The player wants to forge and upgrade their weapon. Roleplay asking them to help pump the bellows or strike the hot iron. If they describe helping successfully, end your next message with the exact string [ACTION_SUCCESS].",
            'brew': "The player wants to brew a free potion. Roleplay asking them to help by stirring the cauldron clockwise, whispering a magical phrase, or regulating the heat. If they describe helping successfully in their reply, end your next message with the exact string [ACTION_SUCCESS].",
            'contracts': "The player wants to check the bounty board. Roleplay presenting a small bounty and asking them how they plan to defeat the target. If their plan is good, end your next message with the exact string [ACTION_SUCCESS].",
            'pray': "The player wants to pray for a blessing. Roleplay asking them to chant a short holy phrase or make an offering. If they do, end your next message with the exact string [ACTION_SUCCESS].",
            'study': "The player wants to study in the library. Roleplay giving them a short riddle. If they answer correctly, end your next message with the exact string [ACTION_SUCCESS]."
        };

        let prompt = prompts[this.indoorAction];
        
        if (this.indoorAction === 'contracts') {
            // Roll the quest type: 50% kill, 30% rescue, 20% delivery
            const questRoll = Math.random();
            const currentZone = (saveData && saveData.currentZone) || 0;
            const playerLevel = (saveData && saveData.level) || 1;

            if (questRoll < 0.50) {
                this.pendingQuestType = 'kill';
                
                // Select dynamic target based on current biome
                const zoneData = this.scene.worldManager && this.scene.worldManager.currentZoneData;
                const currentBiome = zoneData ? zoneData.biome : 'Forest';
                const biomeEnemies = {
                    'Forest': ['slime', 'goblin', 'mushroom', 'spider', 'bat', 'bandit', 'wolfen', 'coyle', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_orc_male', 'special_enemy_orc_female', 'troll', 'ogre', 'willowisp'],
                    'Plains': ['slime', 'goblin', 'orc', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'ogre', 'willowisp'],
                    'Cave': ['bat', 'spider', 'slime', 'goblin', 'skeleton', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'troll', 'willowisp'],
                    'Desert': ['mummy', 'scarab_beetle', 'orc', 'spider', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp'],
                    'Coastal': ['slime', 'bat', 'plague_flies', 'bandit', 'willowisp'],
                    'Winter': ['slime', 'orc', 'burning_skull_blue', 'frost_giant', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp'],
                    'Dungeon': ['slime', 'bat', 'spider', 'old_demon', 'male_damned', 'female_damned', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'willowisp'],
                    'Deadwoods': ['slime', 'bat', 'spider', 'tree_damned', 'twisted_damned', 'plague_flies', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'troll', 'ogre', 'willowisp'],
                    'Hell': ['slime', 'bat', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'the_devil', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'willowisp', 'bloated_damned'],
                    'Heaven': ['heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub', 'special_enemy_ghost_male', 'special_enemy_ghost_female']
                };
                
                const targets = biomeEnemies[currentBiome] || ['slime', 'goblin'];
                const targetKey = targets[Math.floor(Math.random() * targets.length)];
                
                this.pendingQuestTarget = targetKey;
                
                const targetName = targetKey.replace('special_enemy_', '').replace('_male', '').replace('_female', '').toUpperCase();
                prompt += `\n*The contract requires slaying 3 ${targetName}s in a nearby hostile zone. Describe this bounty. Ask them for their plan.*`;
                
            } else if (questRoll < 0.80) {
                this.pendingQuestType = 'rescue';
                
                // Determine target zone: town + direction (2-3 zones away)
                const currentZone = (saveData && saveData.currentZone) || 0;
                const offset = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2));
                let targetZoneIdx = currentZone + offset;
                
                // Prevent spawning rescue quest in town (must be hostile zone)
                if (targetZoneIdx === 0 || Math.abs(targetZoneIdx) % 4 === 0) {
                    targetZoneIdx += (offset > 0 ? 1 : -1);
                }
                
                this.pendingQuestTargetZone = targetZoneIdx;
                
                // Generate a random name and class for the rescuee
                const classes = ['knight', 'wizard', 'samurai', 'ranger', 'elven_spellblade'];
                const rescueeClass = classes[Math.floor(Math.random() * classes.length)];
                const rescueeName = window.CharacterComposer ? window.CharacterComposer.generateRandomName(rescueeClass) : "Captive Explorer";
                
                this.pendingQuestTargetName = rescueeName;
                this.pendingQuestTargetClass = rescueeClass;

                prompt += `\n*The contract requires rescuing a captive ally named ${rescueeName} (a ${rescueeClass}) who is held captive in Zone ${targetZoneIdx}. Describe this rescue bounty. Ask them for their plan.*`;
            } else {
                this.pendingQuestType = 'delivery';
                
                // Find capitals or towns in dynamic kingdoms
                const capitals = [];
                if (WORLD_KINGDOMS) {
                    for (const kId in WORLD_KINGDOMS) capitals.push(WORLD_KINGDOMS[kId].capital);
                }
                if (saveData && saveData.discoveredKingdoms) {
                    for (const kId in saveData.discoveredKingdoms) capitals.push(saveData.discoveredKingdoms[kId].capital);
                }
                // Filter to capitals other than current zone
                const otherCapitals = capitals.filter(cap => cap !== currentZone);
                
                let targetZoneIdx = currentZone + 4; // Default to 4 zones right
                if (otherCapitals.length > 0) {
                    targetZoneIdx = otherCapitals[Math.floor(Math.random() * otherCapitals.length)];
                }
                
                this.pendingQuestTargetZone = targetZoneIdx;
                
                // Get target kingdom
                const targetKingdom = window.getKingdomForZone ? window.getKingdomForZone(targetZoneIdx) : null;
                const kingdomName = targetKingdom ? targetKingdom.name : `Zone ${targetZoneIdx}`;
                
                // Get local ruler name as delivery target
                let targetNPC = "Ruling Faction Officer";
                if (targetKingdom) {
                    const rulerData = (saveData && saveData.zones && saveData.zones[targetZoneIdx] && saveData.zones[targetZoneIdx].npcs && saveData.zones[targetZoneIdx].npcs.find(n => n.factionRank === 'leader'));
                    if (rulerData) targetNPC = rulerData.name;
                    else if (targetKingdom.leaderName) targetNPC = targetKingdom.leaderName;
                }
                
                this.pendingQuestTargetNPC = targetNPC;

                prompt += `\n*The contract is a critical delivery. The player must carry trade documents to ${targetNPC} in the capital of ${kingdomName} (Zone ${targetZoneIdx}). Explain that they must protect the documents at all costs. Ask them if they accept this responsibility.*`;
            }
        }

        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        this.chatActivityBtn.disabled = true;

        this.activeActivity = this.indoorAction;

        this.triggerHiddenPrompt(prompt, this.npcName);
    },

    async handlePlayerMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.chatInput.value = '';
        this.addMessageToUI("Player", text);
        this.chatHistory.push({ sender: "Player", text: text });

        // Disable UI during generation
        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        if (this.chatActivityBtn) this.chatActivityBtn.disabled = true;

        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(this.npcName, "...", loadingId);

        let promptSuffix = "";
        
        // Parse physical action
        const actionResult = this._parseAndExecuteRoleplayAction(text);
        if (actionResult) {
            if (actionResult.success) {
                promptSuffix = "\n" + actionResult.contextNote;
            } else {
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) loadingElement.remove();
                this.addMessageToUI("System", `<span style="color:#ff4444">Action Failed: ${actionResult.reason}</span>`);
                
                this.chatInput.disabled = false;
                this.chatSubmitBtn.disabled = false;
                if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                this.chatInput.focus();
                return;
            }
        }

        if (this.activeActivity) {
            promptSuffix += `\n*The player has responded to your activity proposal. Assess if they responded correctly. If they did, end your response with [ACTION_SUCCESS].*`;
        }

        const state = this.getGameState();
        
        try {
            const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, promptSuffix, state, this.indoorAction || '');
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            // Strip action tags from shown chat speech
            let cleanResponse = response.response.replace('[ACTION_SUCCESS]', '').trim();
            this.addMessageToUI(this.npcName, cleanResponse);
            this.chatHistory.push({ sender: this.npcName, text: cleanResponse });

            // 5. Handle Action Success
            if (this.activeActivity && response.response.includes('[ACTION_SUCCESS]')) {
                this.activeActivity = null;
                this.executeActivityEffect();
            }

            // Apply Social shifts
            if (response.socialShift && response.socialShift !== 0) {
                this.socialScore = Math.max(-100, Math.min(100, this.socialScore + response.socialShift));
                const sign = response.socialShift > 0 ? "+" : "";
                const color = response.socialShift > 0 ? "#00ff00" : "#ff4444";
                this.addMessageToUI("System", `<span style="color:${color}">Social Score ${sign}${response.socialShift} (Total: ${this.socialScore})</span>`);
                
                // Phase 6: Propagate a portion of socialShift to faction standing
                if (this.faction && window.changeFactionReputation) {
                    const repShift = Math.round(response.socialShift * 0.5);
                    if (repShift !== 0) {
                        window.changeFactionReputation(this.faction, repShift, true);
                        const factionName = window.WORLD_FACTIONS[this.faction] ? window.WORLD_FACTIONS[this.faction].name : this.faction;
                        const repColor = repShift > 0 ? "#88aaff" : "#ff4444";
                        const repSign = repShift > 0 ? "+" : "";
                        this.addMessageToUI("System", `<span style="color:${repColor}">Standing with ${factionName} changed: ${repSign}${repShift}</span>`);
                    }
                }
                
                // Trigger marriage button if >= 100 (Phase 9)
                if (this.socialScore >= 100 && !document.getElementById('chat-propose') && (!saveData || !saveData.spouseData)) {
                    const isLeader = this.factionRank === 'leader';
                    const rep = this.faction && window.getFactionReputation ? window.getFactionReputation(this.faction) : 0;
                    if (!isLeader || rep >= 75) {
                        this._addMarriageButton();
                    }
                }
            }

            // 6. Accept Quests
            if (response.quest && this.player.addQuest) {
                response.quest.giverName = this.npcName;
                response.quest.giverAlignment = this.alignment;
                response.quest.factionId = this.faction || null;
                this.player.addQuest(response.quest);
                this.addMessageToUI("System", `<span style="color:#f6be3b">Quest Added: ${response.quest.title}</span>`);
            }

            // Re-enable input
            this.chatInput.disabled = false;
            this.chatSubmitBtn.disabled = false;
            if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
            this.chatInput.focus();

            // 7. Handle Party / Hostile Morphs
            const isSafeZone = this.scene.worldManager && this.scene.worldManager.currentZoneData && this.scene.worldManager.currentZoneData.type === 'Safe';
            
            if (response.turnsHostile) {
                if (isSafeZone) {
                    this.addMessageToUI("System", `<span style="color:#ff0000">They refuse to fight in town, but will remember this.</span>`);
                    this.player.updateAlignment(-5);
                } else {
                    setTimeout(() => {
                        this.closeChat();
                        if (this.scene.spawnHeroAI) {
                            this.player.updateAlignment(-10);
                            this.addMessageToUI("System", `<span style="color:#ff0000">Alignment Shifted: -10</span>`);
                            let combatClass = 'knight';
                            const lowerName = this.npcName.toLowerCase();
                            if (this.spriteKey === 'alchemist' || this.spriteKey === 'npc' || lowerName.includes('sage') || lowerName.includes('wizard') || lowerName.includes('mage')) combatClass = 'wizard';
                            else if (this.spriteKey === 'ranger' || lowerName.includes('scout') || lowerName.includes('ranger') || lowerName.includes('hunter')) combatClass = 'ranger';
                            else if (this.spriteKey === 'samurai' || lowerName.includes('samurai') || lowerName.includes('thief') || lowerName.includes('rogue')) combatClass = 'samurai';
                            else if (this.spriteKey === 'elven_spellblade' || lowerName.includes('spellblade') || lowerName.includes('elf')) combatClass = 'elven_spellblade';
                            this.scene.spawnHeroAI(combatClass, this.sprite.x, this.sprite.y, 'hostile');
                        }
                        this.removeFromWorld();
                        this.destroy();
                    }, 1500);
                }
            } else if (response.joinsParty) {
                if (isSafeZone && !this.isCustom) {
                    this.addMessageToUI("System", `<span style="color:#00ff00">They will not leave the safety of the town, but they consider you a friend.</span>`);
                    this.player.updateAlignment(5);
                } else {
                    setTimeout(() => {
                        this.closeChat();
                        if (this.scene.spawnHeroAI) {
                            if (this.isCustom) {
                                this.scene.spawnHeroAI(this.spriteKey, this.sprite.x, this.sprite.y, 'party', this.npcName, this.persona, 0, this.combatClass);
                            } else {
                                let combatClass = 'knight';
                                const lowerName = this.npcName.toLowerCase();
                                if (this.spriteKey === 'alchemist' || this.spriteKey === 'npc' || lowerName.includes('sage') || lowerName.includes('wizard') || lowerName.includes('mage')) combatClass = 'wizard';
                                else if (this.spriteKey === 'ranger' || lowerName.includes('scout') || lowerName.includes('ranger') || lowerName.includes('hunter')) combatClass = 'ranger';
                                else if (this.spriteKey === 'samurai' || lowerName.includes('samurai') || lowerName.includes('thief') || lowerName.includes('rogue')) combatClass = 'samurai';
                                else if (this.spriteKey === 'elven_spellblade' || lowerName.includes('spellblade') || lowerName.includes('elf')) combatClass = 'elven_spellblade';
                                this.scene.spawnHeroAI(combatClass, this.sprite.x, this.sprite.y, 'party', this.npcName, this.persona);
                            }
                        }
                        this.removeFromWorld();
                        this.destroy();
                    }, 1500);
                }
            }
        } catch (err) {
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            console.error("AI response failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            
            this.addMessageToUI(this.npcName, "I have nothing to say to you.");
            this.chatInput.disabled = false;
            this.chatSubmitBtn.disabled = false;
            if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
            this.chatInput.focus();
        }
    },

    _parseAndExecuteRoleplayAction(text) {
        // Only parse if the entire message is an *action*
        const match = text.match(/^\*(.+)\*$/);
        if (!match) return null; // Normal chat message, no action
        
        const action = match[1].trim().toLowerCase();
        
        // Give gold: *give 500 gold* or *give gold 500*
        const giveGoldMatch = action.match(/give\s+(\d+)\s*gold/) || action.match(/give\s+gold\s+(\d+)/);
        if (giveGoldMatch) {
            const amount = parseInt(giveGoldMatch[1]);
            const currentGold = (saveData && typeof saveData.gold === 'number') ? saveData.gold : (this.player.gold || 0);
            if (currentGold < amount) {
                return { success: false, reason: `You don't have enough gold. (Have: ${Math.floor(currentGold)} gold)` };
            }
            if (saveData && typeof saveData.gold === 'number') {
                saveData.gold -= amount;
                this.player.gold = saveData.gold;
            } else {
                this.player.gold = (this.player.gold || 0) - amount;
            }
            return {
                success: true,
                contextNote: `[PLAYER ACTION]: *${match[1]}*\n(The player physically handed you ${amount} gold coins. Their remaining gold: ${Math.floor(this.player.gold)}. React warmly or suspiciously based on your persona. This is a generous gesture — consider increasing social score via socialShift.)`
            };
        }
        
        // Give item: *give [item name]*
        const giveItemMatch = action.match(/^give\s+(.+)$/);
        if (giveItemMatch && !giveGoldMatch) {
            const itemName = giveItemMatch[1].trim();
            const inventory = this.player.inventory || [];
            const itemIdx = inventory.findIndex(i => (i.name || '').toLowerCase().includes(itemName));
            if (itemIdx === -1) {
                return { success: false, reason: `You don't have "${itemName}" in your inventory.` };
            }
            const item = inventory.splice(itemIdx, 1)[0];
            return {
                success: true,
                contextNote: `[PLAYER ACTION]: *${match[1]}*\n(The player handed you their "${item.name}". React based on the item's value and your persona. Consider a socialShift bonus.)`
            };
        }
        
        // Emotes / physical actions (bow, kneel, attack, draw sword, etc.)
        return {
            success: true,
            contextNote: `[PLAYER ACTION]: *${match[1]}*\n(The player performed this physical action in front of you. React naturally and in character — if it's aggressive, consider turnsHostile. If respectful, consider a socialShift bonus.)`
        };
    },

    removeFromWorld() {
        if (saveData && saveData.zones && saveData.currentZone !== undefined) {
            const currentZone = saveData.currentZone;
            const zoneData = saveData.zones[currentZone];
            if (zoneData) {
                if (zoneData.npcs) {
                    zoneData.npcs = zoneData.npcs.filter(n => n.name !== this.npcName);
                }
                if (zoneData.ambientNpcs) {
                    zoneData.ambientNpcs = zoneData.ambientNpcs.filter(n => n.name !== this.npcName);
                }
                
                const saves = window.getSaves();
                const idx = saves.findIndex(s => s.id === saveData.id);
                if (idx > -1) {
                    saves[idx] = saveData;
                    window.saveSaves(saves);
                }
            }
        }
    },

    async triggerHiddenPrompt(hiddenPrompt, displayName) {
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const state = this.getGameState();
        
        try {
            const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, hiddenPrompt, state, this.indoorAction || '');
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            this.addMessageToUI(displayName, response.response);
            
            this.chatHistory.push({ sender: displayName, text: response.response });
            
        } catch (err) {
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            console.error("AI Intro failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            this.addMessageToUI(displayName, "Greetings.");
        }

        if (this.chatInput) this.chatInput.disabled = false;
        if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
        if (this.chatInput) this.chatInput.focus();
    }
};
