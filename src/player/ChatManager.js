class ChatManager {
    constructor(player) {
        this.player = player;
    }

    openChat(isIntro = false) {
        const player = this.player;
        if (player.scene && player.scene.isCutscene) {
            console.warn("ChatManager: Cannot open chat during a cutscene.");
            return;
        }
        if (!player.uiContainer) {
            player.uiContainer = document.getElementById('chat-ui');
            player.chatHistoryDiv = document.getElementById('chat-history');
            player.chatInput = document.getElementById('chat-input');
            player.chatSubmitBtn = document.getElementById('chat-submit');
            player.npcNameDiv = document.getElementById('chat-npc-name');
            player.chatHistory = [];
            
            player.chatSubmitHandler = () => this.handlePlayerMessage();
            player.chatKeyHandler = (e) => { if (e.key === 'Enter') this.handlePlayerMessage(); };
            player.chatCloseHandler = () => this.closeChat();
            player.chatInputKeydownHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.closeChat();
                }
            };
            player.chatDocumentKeydownHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeChat();
                }
            };
        }

        player.isChatOpen = true;
        player.scene.player.isTalking = true;
        if (player.uiContainer) {
            player.uiContainer.style.display = 'block';
        }
        
        // Use npcName or default fallback
        const displayName = player.npcName || (player.classData ? player.classData.id : 'Ally');
        if (player.npcNameDiv) {
            player.npcNameDiv.innerText = displayName;
        }

        // Ensure we remove previous listeners to avoid double-firing
        const closeBtn = document.getElementById('chat-close');
        if (player.chatSubmitBtn) {
            player.chatSubmitBtn.removeEventListener('click', player.chatSubmitHandler);
        }
        if (player.chatInput) {
            player.chatInput.removeEventListener('keypress', player.chatKeyHandler);
            player.chatInput.removeEventListener('keydown', player.chatInputKeydownHandler);
        }
        if (closeBtn) {
            closeBtn.removeEventListener('click', player.chatCloseHandler);
        }
        document.removeEventListener('keydown', player.chatDocumentKeydownHandler);
        
        if (player.chatSubmitBtn) {
            player.chatSubmitBtn.addEventListener('click', player.chatSubmitHandler);
        }
        if (player.chatInput) {
            player.chatInput.addEventListener('keypress', player.chatKeyHandler);
            player.chatInput.addEventListener('keydown', player.chatInputKeydownHandler);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', player.chatCloseHandler);
        }
        document.addEventListener('keydown', player.chatDocumentKeydownHandler);

        // Hide shop button if present
        const tradeBtn = document.getElementById('chat-trade');
        if (tradeBtn) tradeBtn.style.display = 'none';

        if (player.scene.inputManager) {
            player.scene.input.keyboard.removeCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
            player.scene.inputManager.disableForInput();
        }

        if (player.chatHistory.length === 0) {
            if (isIntro) {
                // Automatically generate intro from the AI
                if (player.chatInput) player.chatInput.disabled = true;
                if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = true;
                const hiddenPrompt = "*The player has just started a new game. Welcome them to the town of Willowbrook, explain the lore of the Elden Soul, and introduce yourself as their Game Master.*";
                this.triggerHiddenPrompt(hiddenPrompt, displayName);
            } else {
                this.addMessageToUI(displayName, "Ready when you are, boss.");
            }
        }

        if (player.chatInput) {
            setTimeout(() => player.chatInput.focus(), 100);
        }
    }

    closeChat() {
        const player = this.player;
        player.isChatOpen = false;
        player.scene.player.isTalking = false;
        if (player.uiContainer) player.uiContainer.style.display = 'none';
        if (player.chatInput) player.chatInput.blur();

        if (player.chatSubmitBtn && player.chatSubmitHandler) {
            player.chatSubmitBtn.removeEventListener('click', player.chatSubmitHandler);
        }
        if (player.chatInput && player.chatKeyHandler) {
            player.chatInput.removeEventListener('keypress', player.chatKeyHandler);
        }
        if (player.chatInput && player.chatInputKeydownHandler) {
            player.chatInput.removeEventListener('keydown', player.chatInputKeydownHandler);
        }
        const closeBtn = document.getElementById('chat-close');
        if (closeBtn && player.chatCloseHandler) {
            closeBtn.removeEventListener('click', player.chatCloseHandler);
        }
        if (player.chatDocumentKeydownHandler) {
            document.removeEventListener('keydown', player.chatDocumentKeydownHandler);
        }

        if (player.scene.inputManager) {
            player.scene.inputManager.enableForInput();
            player.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
        }
    }

    addMessageToUI(sender, text, isAiOrId = null) {
        const player = this.player;
        if (!player.chatHistoryDiv) return;
        const msgDiv = document.createElement('div');
        if (typeof isAiOrId === 'string') {
            msgDiv.id = isAiOrId;
        } else if (isAiOrId === true) {
            msgDiv.classList.add('ai-message');
        }
        msgDiv.style.marginBottom = '8px';
        const senderColor = sender === "Player" ? "#66aaff" : (sender === "System" ? "#aaaaaa" : "#ffaa00");
        msgDiv.innerHTML = `<span style="color: ${senderColor}; font-weight: bold;">${sender}:</span> <span>${text}</span>`;
        player.chatHistoryDiv.appendChild(msgDiv);
        player.chatHistoryDiv.scrollTop = player.chatHistoryDiv.scrollHeight;
    }

    async handlePlayerMessage(textInput) {
        const player = this.player;
        const text = (typeof textInput === 'string') ? textInput.trim() : (player.chatInput ? player.chatInput.value.trim() : "");
        if (!text) return;

        this.addMessageToUI("Player", text);
        if (player.chatInput) player.chatInput.value = "";
        if (player.chatInput) player.chatInput.disabled = true;
        if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = true;

        const displayName = player.npcName || (player.classData ? player.classData.id : 'Ally');
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const wm = player.scene.worldManager;
        const p = player.scene.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: { level: saveData.level || 1, class: p.classData ? p.classData.id : "adventurer", hp: `${p.hp}/${p.maxHp}` }
        };

        const geminiService = player.scene.geminiService;
        const persona = player.persona || "A loyal adventurer traveling with the player.";
        
        try {
            const response = await geminiService.getNpcResponse(persona, player.chatHistory, text, state);
            if (!player.scene || player.scene.isSceneDestroyed) return;
            if (!player.sprite || !player.sprite.active) return;
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            this.addMessageToUI(displayName, response.response, true);
            
            player.chatHistory.push({ sender: "Player", text: text });
            player.chatHistory.push({ sender: displayName, text: response.response });

            // Process Quest if offered
            if (response && response.quest) {
                if (!response.quest.id) response.quest.id = "quest_" + Date.now();
                p.addQuest(response.quest);
                this.addMessageToUI("System", `<span style="color:#f6be3b; font-weight:bold;">New Quest: ${response.quest.title}</span>`);
            }

            // Process joining party
            if (response && response.joinsParty && player.aiState !== 'party') {
                player.aiState = 'party';
                if (player.scene.enemies && player.scene.enemies.contains(player.sprite)) {
                    player.scene.enemies.remove(player.sprite);
                }
                if (!player.scene.partyMembers.includes(player)) {
                    player.scene.partyMembers.push(player);
                }
                if (player.scene.heroGroup && !player.scene.heroGroup.contains(player.sprite)) {
                    player.scene.heroGroup.add(player.sprite);
                }
                if (player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Joined Party!", 0x00ff00);
                }
                if (p && typeof p.saveGame === 'function') {
                    p.saveGame();
                }
            }

            // Calculate camaraderie shift (fallback to +1 if not provided)
            const shift = (response && typeof response.socialShift === 'number') ? response.socialShift : 1;
            player.camaraderie = (player.camaraderie || 0) + shift;
            
            if (shift !== 0) {
                const sign = shift > 0 ? "+" : "";
                const color = shift > 0 ? "#f6be3b" : "#ff4444";
                const word = shift > 0 ? "increased" : "decreased";
                this.addMessageToUI("System", `<span style="color:${color}">Camaraderie ${word}! (${sign}${shift})</span>`);
            }

            // Check if NPC turns hostile or camaraderie drops too low
            const turnsHostile = (response && response.turnsHostile) || player.camaraderie <= -10;
            if (turnsHostile) {
                this.addMessageToUI("System", `<span style="color:#ff0000; font-weight:bold;">${displayName} has turned hostile!</span>`);
                if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = true;
                if (player.chatInput) player.chatInput.disabled = true;
                setTimeout(() => {
                    this.closeChat();
                    if (window.reclaimCompanionEquipment) {
                        window.reclaimCompanionEquipment(player.scene, player);
                    }
                    const idx = player.scene.partyMembers.indexOf(player);
                    if (idx > -1) player.scene.partyMembers.splice(idx, 1);
                    if (player.scene.spawnHeroAI) {
                        player.scene.spawnHeroAI(player.classData.id, player.sprite.x, player.sprite.y, 'hostile', player.npcName, player.persona);
                    }
                    player.destroy();
                }, 2000);
                return;
            } else if (player.camaraderie < 0) {
                this.addMessageToUI("System", `<span style="color:#ff4444; font-weight:bold;">${displayName} has left the party.</span>`);
                if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = true;
                if (player.chatInput) player.chatInput.disabled = true;
                setTimeout(() => {
                    this.closeChat();
                    if (window.reclaimCompanionEquipment) {
                        window.reclaimCompanionEquipment(player.scene, player);
                    }
                    const idx = player.scene.partyMembers.indexOf(player);
                    if (idx > -1) player.scene.partyMembers.splice(idx, 1);
                    player.destroy();
                }, 2000);
                return;
            }
            
            // Add Roleplay XP reward if granted (Phase 13)
            if (response && response.rpXpReward && response.rpXpReward > 0) {
                const xpAmt = Math.min(50, Math.max(0, parseInt(response.rpXpReward, 10)));
                if (!isNaN(xpAmt) && xpAmt > 0) {
                    player.scene.grantRewards(xpAmt, 0);
                    this.addMessageToUI("System", `<span style="color:#00ffff; font-weight:bold;">Roleplay XP Gained! (+${xpAmt} XP)</span>`);
                }
            }
            
            // Update character sheet if open
            if (player.scene.updateCharacterSheet) {
                player.scene.updateCharacterSheet();
            }
        } catch (err) {
            console.error("AI response failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            this.addMessageToUI(displayName, "Hmm... I don't know what to say.");
        }

        if (player.chatInput) player.chatInput.disabled = false;
        if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = false;
        if (player.chatInput) player.chatInput.focus();
    }

    async triggerHiddenPrompt(promptType, displayNameInput = null) {
        const player = this.player;
        const displayName = displayNameInput || player.npcName || (player.classData ? player.classData.id : 'Ally');
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const wm = player.scene.worldManager;
        const p = player.scene.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: { level: saveData.level || 1, class: p.classData ? p.classData.id : "adventurer", hp: `${p.hp}/${p.maxHp}` }
        };

        const geminiService = player.scene.geminiService;
        const persona = player.persona || "A loyal adventurer traveling with the player.";
        
        try {
            const response = await geminiService.getNpcResponse(persona, player.chatHistory, promptType, state);
            if (!player.scene || player.scene.isSceneDestroyed) return;
            if (!player.sprite || !player.sprite.active) return;
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            this.addMessageToUI(displayName, response.response, true);
            
            player.chatHistory.push({ sender: displayName, text: response.response });
            
            // Process Quest if offered
            if (response && response.quest) {
                if (!response.quest.id) response.quest.id = "quest_" + Date.now();
                p.addQuest(response.quest);
                this.addMessageToUI("System", `<span style="color:#f6be3b; font-weight:bold;">New Quest: ${response.quest.title}</span>`);
            }

            // Process joining party
            if (response && response.joinsParty && player.aiState !== 'party') {
                player.aiState = 'party';
                if (player.scene.enemies && player.scene.enemies.contains(player.sprite)) {
                    player.scene.enemies.remove(player.sprite);
                }
                if (!player.scene.partyMembers.includes(player)) {
                    player.scene.partyMembers.push(player);
                }
                if (player.scene.heroGroup && !player.scene.heroGroup.contains(player.sprite)) {
                    player.scene.heroGroup.add(player.sprite);
                }
                if (player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Joined Party!", 0x00ff00);
                }
                if (p && typeof p.saveGame === 'function') {
                    p.saveGame();
                }
            }
            
        } catch (err) {
            if (!player.scene || player.scene.isSceneDestroyed) return;
            if (!player.sprite || !player.sprite.active) return;
            console.error("AI Intro failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            this.addMessageToUI(displayName, "Welcome to Willowbrook. I am the Game Master.");
        }

        if (player.chatInput) player.chatInput.disabled = false;
        if (player.chatSubmitBtn) player.chatSubmitBtn.disabled = false;
        if (player.chatInput) player.chatInput.focus();
    }
}

window.ChatManager = ChatManager;
