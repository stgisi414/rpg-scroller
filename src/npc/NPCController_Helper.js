// src/npc/NPCController_Helper.js - Helper containing offloaded chat & activity logic for NPCController

const NPCController_Helper = {
    openChat(isIntro = false) {
        if (this.scene && this.scene.isCutscene) {
            console.warn("NPCController: Cannot open chat during a cutscene.");
            return;
        }
        this.isChatOpen = true;
        this.isIntroCutscene = isIntro;
        this.player.isTalking = true;
        this.uiContainer.style.display = 'flex';
        this.registerChatListeners();
        this._chatHistoryLengthOnOpen = this.chatHistory.length;

        // Clear stale DOM messages and re-render this NPC's own chat history
        if (this.chatHistoryDiv) {
            this.chatHistoryDiv.innerHTML = '';
            for (const msg of this.chatHistory) {
                this.addMessageToUI(msg.sender, msg.text);
            }
        }

        // Draw detailed portrait or fallback
        const chatCanvas = document.getElementById('chat-portrait-canvas');
        if (chatCanvas && this.sprite && this.sprite.active) {
            let classId = this.spriteKey;
            if (this.politicalTitle === 'Guard' && classId === 'heavy_knight') {
                classId = 'heavy_guard';
            }
            const baseKey = classId.replace('_rival', '');
            const classData = (window.classesData && window.classesData[baseKey]) ? window.classesData[baseKey] : null;
            const shouldFlip = (classData && classData.flipX) || false;
            let success = false;
            if (window.drawDetailedPortrait) {
                success = window.drawDetailedPortrait(chatCanvas, classId, this.config || null, shouldFlip, this.scene);
            }
            if (!success && window.drawFallbackSpriteToCanvas) {
                window.drawFallbackSpriteToCanvas(chatCanvas, this.sprite, shouldFlip, this.scene);
            }
        }

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
            if (this.wasApproaching) {
                this.wasApproaching = false; // Reset the flag
                this.chatInput.disabled = true;
                this.chatSubmitBtn.disabled = true;
                const hiddenPrompt = `*You approached the player in town to strike up a conversation. Give a unique, personalized greeting based on your persona, share a local rumor or ask them a question about their adventures, and invite them to chat.*`;
                this.triggerHiddenPrompt(hiddenPrompt, this.npcName);
            } else if (isIntro) {
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
                    'arena': 'Fight in Arena',
                    'recruit_warrior': 'Recruit Warrior',
                    'recruit_mage': 'Recruit Mage',
                    'recruit_priest': 'Recruit Priest',
                    'recruit_ranger': 'Recruit Ranger',
                    'recruit_spellblade': 'Recruit Spellblade',
                    'recruit_witch': 'Recruit Witch'
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
        // Block closing while AI response is in-flight
        if (this._isAwaitingResponse) return;

        // Summarize chat if new messages were sent
        if (this.chatHistory && this._chatHistoryLengthOnOpen !== undefined && this.chatHistory.length > this._chatHistoryLengthOnOpen) {
            this.summarizeAndSaveJournal();
        }

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
            'study': "The player wants to study in the library. Roleplay giving them a short riddle. If they answer correctly, end your next message with the exact string [ACTION_SUCCESS].",
            'recruit_warrior': "The player wants to recruit a warrior companion. Introduce yourself and ask if they wish to hire a Knight (100 gold) or a Samurai (150 gold) for their party. Ask them to explain why they deserve their loyalty or what battles they will face. Assess their reply. If they choose Knight and reply well, end your response with [ACTION_SUCCESS:knight]. If they choose Samurai and reply well, end your response with [ACTION_SUCCESS:samurai].",
            'recruit_mage': "The player wants to recruit a spellcaster companion. Introduce yourself and ask if they wish to hire a Wizard (150 gold) or a Pyromancer (200 gold) for their party. Ask them to describe how they will employ the arcane arts. Assess their reply. If they choose Wizard and reply well, end your response with [ACTION_SUCCESS:wizard]. If they choose Pyromancer and reply well, end your response with [ACTION_SUCCESS:pyromancer].",
            'recruit_priest': "The player wants to recruit a holy Priest. Ask them to make a temple donation of 150 gold or demonstrate high holy virtues (Good Alignment >= 30). Ask them how they will honor the light. Assess their reply. If they reply well, end your response with [ACTION_SUCCESS:priest].",
            'recruit_ranger': "The player wants to recruit a wilderness Ranger. Ask them to pay 120 gold or demonstrate deep connection to nature (Good Alignment >= 20). Ask them how they will protect the wildlands. Assess their reply. If they reply well, end your response with [ACTION_SUCCESS:ranger].",
            'recruit_spellblade': "The player wants to recruit an Elven Spellblade. Ask them to pay 180 gold or show high elven faction trust (Good Alignment >= 40). Ask them to pledge their sword to the light. Assess their reply. If they reply well, end your response with [ACTION_SUCCESS:elven_spellblade].",
            'recruit_witch': "The player wants to recruit a dark Witch. Ask them to make a dark sacrifice of 200 gold or prove their chaotic/evil nature (Negative Alignment <= -30). Ask them to embrace the shadows. Assess their reply. If they reply well, end your response with [ACTION_SUCCESS:witch]."
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
                this.pendingQuestName = rescueeName;
                this.pendingQuestZone = targetZoneIdx;
                this.pendingQuestGender = Math.random() < 0.5 ? 'male' : 'female';

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
                this.pendingQuestItem = "Trade Documents";
                this.pendingQuestZone = targetZoneIdx;

                prompt += `\n*The contract is a critical delivery. The player must carry trade documents to ${targetNPC} in the capital of ${kingdomName} (Zone ${targetZoneIdx}). Explain that they must protect the documents at all costs. Ask them if they accept this responsibility.*`;
            }
        }

        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        this.chatActivityBtn.disabled = true;

        this.activeActivity = this.indoorAction;

        const hints = {
            'rest': "Tell the innkeeper a short story/adventure about your travels to successfully rest.",
            'forge': "Describe helping the blacksmith pump the bellows or strike the hot iron to upgrade your weapon.",
            'brew': "Describe stirring the cauldron, regulating the heat, or chanting a magic phrase to brew a potion.",
            'contracts': "Explain your combat plan to defeat the bounty target to accept the quest.",
            'pray': "Chant a short holy phrase or describe making an offering to receive a blessing.",
            'study': "Answer the riddle correctly to complete your library study session.",
            'recruit_warrior': "Choose between Knight (100g) or Samurai (150g) and explain why you deserve their loyalty.",
            'recruit_mage': "Choose between Wizard (150g) or Pyromancer (200g) and explain how you will use magic.",
            'recruit_priest': "Donate 150 gold or have Good Alignment >= 30, and explain how you will honor the light.",
            'recruit_ranger': "Pay 120 gold or have Good Alignment >= 20, and explain how you will protect the wildlands.",
            'recruit_spellblade': "Pay 180 gold or have Good Alignment >= 40, and explain how you will pledge your blade.",
            'recruit_witch': "Pay 200 gold or have Evil Alignment <= -30, and explain how you will embrace the dark.",
        };
        const hint = hints[this.indoorAction];
        if (hint) {
            this.addMessageToUI("System", `<span style="color:#ffaa00; font-weight:bold;">Activity Hint: ${hint}</span>`);
        }

        this.triggerHiddenPrompt(prompt, this.npcName);
    },

    async handlePlayerMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.chatInput.value = '';
        this.addMessageToUI("Player", text);
        this.chatHistory.push({ sender: "Player", text: text });
        if (this.chatHistory.length > 10) this.chatHistory.shift();

        // Disable UI during generation and block chat close
        this._isAwaitingResponse = true;
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

        const startZoneIndex = this.scene.worldManager ? this.scene.worldManager.currentZoneIndex : null;
        const state = this.getGameState();
        
        try {
            const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, promptSuffix, state, this.indoorAction || '');
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            
            const currentZoneIndex = this.scene.worldManager ? this.scene.worldManager.currentZoneIndex : null;
            if (startZoneIndex !== currentZoneIndex) {
                console.log("NPCController: Zone changed during API call. Aborting response.");
                return;
            }
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            // Strip action tags from shown chat speech
            let cleanResponse = response.response.replace(/\[ACTION_SUCCESS(?::\w+)?\]/g, '').trim();
            this.addMessageToUI(this.npcName, cleanResponse);
            this.chatHistory.push({ sender: this.npcName, text: cleanResponse });
            if (this.chatHistory.length > 10) this.chatHistory.shift();

            // 5. Handle Action Success
            const successMatch = response.response.match(/\[ACTION_SUCCESS(?::(\w+))?\]/);
            if (this.activeActivity && successMatch) {
                this.activeActivity = null;
                this.executeActivityEffect(successMatch[1] || null);
            }

            this._isAwaitingResponse = false;

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
                        if (!this.scene || this.scene.isSceneDestroyed || !this.sprite || !this.sprite.active) return;
                        this._isAwaitingResponse = false;
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
                        if (!this.scene || this.scene.isSceneDestroyed || !this.sprite || !this.sprite.active) return;
                        this._isAwaitingResponse = false;
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
            this._isAwaitingResponse = false;
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
        
        // Give gold: *give 500 gold* or *give gold 500* or *give the archmage 200 gold*
        const giveGoldMatch = action.match(/give\s+(?:.*\s+)?(\d+)\s*gold/i) || 
                              action.match(/give\s+gold\s+(\d+)/i) || 
                              action.match(/give\s+(?:.*\s+)?gold\s+(\d+)/i);
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
        if (giveItemMatch) {
            const itemName = giveItemMatch[1].trim();
            
            // Gather all giveable items from the inventory object
            const giveableItems = [];
            const inv = this.player.inventory || {};
            
            // 1. Equipped Weapon
            if (inv.weapon) {
                giveableItems.push({
                    type: 'weapon',
                    name: inv.weapon.name,
                    ref: inv.weapon
                });
            }
            
            // 2. Cargo
            if (Array.isArray(inv.cargo)) {
                inv.cargo.forEach(c => {
                    giveableItems.push({
                        type: 'cargo',
                        name: c.name,
                        ref: c
                    });
                });
            }
            
            // 3. Potion/Food Lists
            const lists = [
                { key: 'potionList', name: 'Health Potion' },
                { key: 'mpPotionList', name: 'Mana Potion' },
                { key: 'spPotionList', name: 'Stamina Potion' },
                { key: 'meatList', name: 'Boar Meat' },
                { key: 'miscPotionList', name: 'Utility Potion' }
            ];
            
            lists.forEach(listInfo => {
                const list = inv[listInfo.key];
                if (Array.isArray(list) && list.length > 0) {
                    const topItem = list[list.length - 1];
                    giveableItems.push({
                        type: 'list_item',
                        listKey: listInfo.key,
                        name: topItem.name,
                        ref: topItem
                    });
                }
            });
            
            // Find match (bidirectional name inclusion for natural roleplay phrasing)
            const matchItem = giveableItems.find(i => {
                const itemLabel = (i.name || '').toLowerCase();
                return itemLabel.includes(itemName) || itemName.includes(itemLabel);
            });
            
            if (!matchItem) {
                return { success: false, reason: `You don't have "${itemName}" in your inventory.` };
            }
            
            // Remove item from inventory
            if (matchItem.type === 'weapon') {
                inv.weapon = null;
                this.player.recalculateStats();
            } else if (matchItem.type === 'cargo') {
                inv.cargo = inv.cargo.filter(c => c !== matchItem.ref);
            } else if (matchItem.type === 'list_item') {
                const list = inv[matchItem.listKey];
                const idx = list.indexOf(matchItem.ref);
                if (idx !== -1) {
                    list.splice(idx, 1);
                }
                
                // Adjust fast counters
                if (matchItem.listKey === 'potionList') inv.potions = Math.max(0, (inv.potions || 0) - 1);
                else if (matchItem.listKey === 'mpPotionList') inv.mpPotions = Math.max(0, (inv.mpPotions || 0) - 1);
                else if (matchItem.listKey === 'spPotionList') inv.spPotions = Math.max(0, (inv.spPotions || 0) - 1);
                else if (matchItem.listKey === 'meatList') inv.meat = Math.max(0, (inv.meat || 0) - 1);
                else if (matchItem.listKey === 'miscPotionList') inv.miscPotions = Math.max(0, (inv.miscPotions || 0) - 1);
            }
            
            if (this.player.inventoryManager) {
                this.player.inventoryManager.updateInventoryUI();
            }
            if (this.scene && this.scene.updateHUD) {
                this.scene.updateHUD();
            }
            
            return {
                success: true,
                contextNote: `[PLAYER ACTION]: *${match[1]}*\n(The player handed you their "${matchItem.name}". React based on the item's value and your persona. Consider a socialShift bonus.)`
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
        this._isAwaitingResponse = true;
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);
        const startZoneIndex = this.scene.worldManager ? this.scene.worldManager.currentZoneIndex : null;

        const state = this.getGameState();
        
        try {
            const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, hiddenPrompt, state, this.indoorAction || '');
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            
            const currentZoneIndex = this.scene.worldManager ? this.scene.worldManager.currentZoneIndex : null;
            if (startZoneIndex !== currentZoneIndex) {
                console.log("NPCController: Zone changed during AI intro. Aborting.");
                return;
            }
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            this.addMessageToUI(displayName, response.response);
            
            this.chatHistory.push({ sender: displayName, text: response.response });
            if (this.chatHistory.length > 10) this.chatHistory.shift();
            
        } catch (err) {
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            console.error("AI Intro failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            this.addMessageToUI(displayName, "Greetings.");
        }

        this._isAwaitingResponse = false;
        if (this.chatInput) this.chatInput.disabled = false;
        if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
        if (this.chatInput) this.chatInput.focus();
    },

    async summarizeAndSaveJournal() {
        const newMsgs = this.chatHistory.slice(this._chatHistoryLengthOnOpen);
        if (newMsgs.length === 0) return;
        
        try {
            const summary = await this.geminiService.summarizeConversation(newMsgs);
            if (summary && saveData) {
                if (!saveData.narrativeJournal) saveData.narrativeJournal = [];
                saveData.narrativeJournal.push(summary);
                if (saveData.narrativeJournal.length > 30) {
                    saveData.narrativeJournal.shift();
                }
                console.log("Narrative journal updated:", saveData.narrativeJournal);
                if (this.scene && typeof this.scene._autoSave === 'function') {
                    this.scene._autoSave();
                }
            }
        } catch (e) {
            console.error("Failed to summarize and save journal:", e);
        }
    }
};
