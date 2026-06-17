// NPCController.js - AI powered roleplaying NPC

class NPCController {
    constructor(scene, x, y, player, geminiService, npcName, persona, spriteKey = 'npc') {
        this.scene = scene;
        this.player = player;
        this.geminiService = geminiService;
        this.npcName = npcName;
        this.persona = persona;
        this.spriteKey = spriteKey;
        
        // Chat state
        this.chatHistory = [];
        this.isChatOpen = false;

        // Create the physics sprite using the appropriate sprite key
        this.sprite = this.scene.physics.add.sprite(x, y, spriteKey);
        this.sprite.setScale(1.5);
        this.sprite.setDepth(1);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.body.immovable = false;
        this.sprite.body.setAllowGravity(true);
        // Frame is 64x64 (or 80x64 for knight), displayed at 1.5x.
        // Body: 36w × 80h, offset (30, 16) keeps feet on the ground.
        if (spriteKey === 'knight') {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(22, 16);
        } else {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(30, 16);
        }
        
        // Play idle animation for this sprite
        const idleKey = spriteKey + '_idle';
        if (!this.scene.anims.exists(idleKey)) {
            // Each sheet has different layouts. Heroes must match their main.js config:
            // npc (goddess): row 0, 6 frames
            // wizard: row 0, 6 frames
            // ranger: row 0, 5 frames
            // knight: row 0, 5 frames
            // samurai: row 7, 5 frames (12 cols per row -> starts at 84)
            const idleConfig = {
                npc: { start: 0, end: 5 },
                wizard: { start: 0, end: 5 },
                ranger: { start: 0, end: 4 },
                knight: { start: 0, end: 4 },
                samurai: { start: 84, end: 88 },
                blacksmith: { start: 0, end: 4 },
                alchemist: { start: 0, end: 4 }
            };
            const config = idleConfig[spriteKey] || { start: 0, end: 4 };
            
            this.scene.anims.create({
                key: idleKey,
                frames: this.scene.anims.generateFrameNumbers(spriteKey, config),
                frameRate: 6,
                repeat: -1
            });
        }
        this.sprite.play(idleKey);

        // Name tag & prompt — positioned relative to sprite in update()
        this.nameText = this.scene.add.text(x, 300, npcName, { fontSize: '13px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(2);

        // Interaction Prompt
        this.promptText = this.scene.add.text(x, 280, "Press 'F' to Talk", { fontSize: '11px', fill: '#ffff00', stroke: '#000000', strokeThickness: 2 });
        this.promptText.setOrigin(0.5);
        this.promptText.setDepth(2);
        this.promptText.setVisible(false);

        // Bind UI Elements
        this.uiContainer = document.getElementById('chat-ui');
        this.chatHistoryDiv = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        this.chatSubmitBtn = document.getElementById('chat-submit');
        this.npcNameDiv = document.getElementById('chat-npc-name');

        // Setup Event Listeners for UI
        this.onSubmitClick = () => this.handlePlayerMessage();
        this.onKeyPress = (e) => {
            if (e.key === 'Enter') this.handlePlayerMessage();
        };
        this.onTradeClick = () => {
            if (this.isChatOpen) {
                this.closeChat();
                this.openShop();
            }
        };
        this.onActivityClick = () => {
            if (this.isChatOpen && this.indoorAction) {
                this.startActivity();
            }
        };
        this.onEscKeyDown = () => {
            if (this.isChatOpen) this.closeChat();
            if (this.isShopOpen) this.closeShop();
        };

        this.chatTradeBtn = document.getElementById('chat-trade');
        this.chatActivityBtn = document.getElementById('chat-activity');
    }

    update(time, delta) {
        if (!this.player || !this.player.sprite) return;

        // Keep name/prompt text floating above the sprite at all times
        this.nameText.setPosition(this.sprite.x, this.sprite.y - 70);
        this.promptText.setPosition(this.sprite.x, this.sprite.y - 90);

        // Calculate distance to player
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.player.sprite.x, this.player.sprite.y
        );

        // Face the player
        const isLeftFacing = ['knight', 'samurai', 'blacksmith', 'alchemist', 'npc'].includes(this.spriteKey);

        if (this.player.sprite.x < this.sprite.x) {
            // Player is to the left
            this.sprite.setFlipX(isLeftFacing ? false : true);
        } else {
            // Player is to the right
            this.sprite.setFlipX(isLeftFacing ? true : false);
        }

        const interactDistance = 80;

        if (distanceToPlayer < interactDistance) {
            if (!this.isChatOpen) {
                this.promptText.setVisible(true);
            } else {
                this.promptText.setVisible(false);
            }

            // Check if player presses F to interact
            if (this.player.inputManager.keys.interact.isDown && !this.isChatOpen && !this.isShopOpen) {
                if (time - (this.lastInteractTime || 0) > 500) {
                    this.openChat();
                    this.lastInteractTime = time;
                }
            }
        } else {
            this.promptText.setVisible(false);
            if (this.isChatOpen && !this.isIntroCutscene) this.closeChat();
            if (this.isShopOpen) this.closeShop();
        }

        // Handle NPC Wandering if they are indoors and not talking to the player
        if (this.isIndoorNPC && !this.isChatOpen && !this.isShopOpen) {
            if (!this.wanderTimer) {
                this.wanderTimer = time + Phaser.Math.Between(2000, 5000);
                this.wanderState = 0; // 0: idle, 1: walk left, 2: walk right
            }

            if (time > this.wanderTimer) {
                // Change state
                this.wanderState = Phaser.Math.Between(0, 2);
                this.wanderTimer = time + Phaser.Math.Between(1500, 4000);
                
                // If hitting walls, bounce
                if (this.sprite.x < 300) this.wanderState = 2;
                if (this.sprite.x > 1000) this.wanderState = 1;
            }

            // Only run if the run animation exists, otherwise fallback to idle
            const runAnim = this.spriteKey + '_run';
            const hasRunAnim = this.scene.anims.exists(runAnim);

            if (this.wanderState === 1 && hasRunAnim) {
                this.sprite.setVelocityX(-60);
                this.sprite.setFlipX(isLeftFacing ? false : true);
                if (this.sprite.anims.currentAnim?.key !== runAnim) this.sprite.play(runAnim, true);
            } else if (this.wanderState === 2 && hasRunAnim) {
                this.sprite.setVelocityX(60);
                this.sprite.setFlipX(isLeftFacing ? true : false);
                if (this.sprite.anims.currentAnim?.key !== runAnim) this.sprite.play(runAnim, true);
            } else {
                this.sprite.setVelocityX(0);
                // Only flip to face player if idle
                if (distanceToPlayer < 200) {
                    this.sprite.setFlipX(this.player.sprite.x < this.sprite.x ? (isLeftFacing ? false : true) : (isLeftFacing ? true : false));
                }
                const idleAnim = this.spriteKey + '_idle';
                if (this.sprite.anims.currentAnim?.key !== idleAnim) this.sprite.play(idleAnim, true);
            }
        } else {
            this.sprite.setVelocityX(0);
            const idleAnim = this.spriteKey + '_idle';
            if (this.sprite.anims.currentAnim?.key !== idleAnim) this.sprite.play(idleAnim, true);
        }
    }

    registerChatListeners() {
        this.unregisterChatListeners(); // Avoid duplicate registrations
        if (this.chatSubmitBtn) {
            this.chatSubmitBtn.addEventListener('click', this.onSubmitClick);
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', this.onKeyPress);
        }
        if (this.chatTradeBtn) {
            this.chatTradeBtn.addEventListener('click', this.onTradeClick);
        }
        if (this.chatActivityBtn) {
            this.chatActivityBtn.addEventListener('click', this.onActivityClick);
        }
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-ESC', this.onEscKeyDown);
        }
    }

    unregisterChatListeners() {
        if (this.chatSubmitBtn) {
            this.chatSubmitBtn.removeEventListener('click', this.onSubmitClick);
        }
        if (this.chatInput) {
            this.chatInput.removeEventListener('keypress', this.onKeyPress);
        }
        if (this.chatTradeBtn) {
            this.chatTradeBtn.removeEventListener('click', this.onTradeClick);
        }
        if (this.chatActivityBtn) {
            this.chatActivityBtn.removeEventListener('click', this.onActivityClick);
        }
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-ESC', this.onEscKeyDown);
        }
    }

    openShop() {
        this.isShopOpen = true;
        this.player.isTalking = true;
        this.registerChatListeners();
        if (this.player.inputManager) {
            this.scene.input.keyboard.removeCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
        }
        
        // Let PlayerController populate the items
        this.player.openShopUI(this.spriteKey, this.npcName);
    }

    closeShop() {
        this.isShopOpen = false;
        this.player.isTalking = false;
        this.unregisterChatListeners();
        document.getElementById('ui-shop').style.display = 'none';
        if (this.player.inputManager) {
            this.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
        }
    }

    openChat(isIntro = false) {
        this.isChatOpen = true;
        this.isIntroCutscene = isIntro;
        this.player.isTalking = true;
        this.uiContainer.style.display = 'block';
        this.npcNameDiv.innerText = this.npcName;
        this.registerChatListeners();

        // Release Phaser's key capture so ALL keys flow through to the HTML input
        if (this.player.inputManager) {
            this.scene.input.keyboard.removeCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
            this.player.inputManager.disableForInput();
        }

        if (this.chatHistory.length === 0) {
            if (isIntro) {
                this.chatInput.disabled = true;
                this.chatSubmitBtn.disabled = true;
                const hiddenPrompt = "*The player has just started a new game. Welcome them to the town of Willowbrook, explain the lore of the Elden Soul, and introduce yourself as their Game Master.*";
                this.triggerHiddenPrompt(hiddenPrompt, this.npcName);
            } else {
                this.addMessageToUI(this.npcName, "Greetings, traveler. What brings you to these parts?");
            }
        }

        if (this.chatActivityBtn) {
            if (this.indoorAction && this.indoorAction !== 'spar') { // spar spawns enemy directly instead of using chat RP
                const actionNames = {
                    'rest': 'Rest (Full Heal)',
                    'forge': 'Forge (+5 Dmg)',
                    'brew': 'Brew Potion',
                    'contracts': 'Bounty Board',
                    'pray': 'Pray (+1 Stat)',
                    'study': 'Study Riddles',
                    'train': 'Train (Fight)'
                };
                this.chatActivityBtn.innerText = actionNames[this.indoorAction] || 'Activity';
                this.chatActivityBtn.style.display = 'inline-block';
            } else {
                this.chatActivityBtn.style.display = 'none';
            }
        }

        setTimeout(() => this.chatInput.focus(), 100);
    }

    closeChat() {
        this.isChatOpen = false;
        this.isIntroCutscene = false;
        this.player.isTalking = false;
        this.unregisterChatListeners();
        this.uiContainer.style.display = 'none';
        this.chatInput.blur();

        // Re-enable Phaser key capture for game input
        if (this.player.inputManager) {
            this.player.inputManager.enableForInput();
            this.scene.input.keyboard.addCapture('W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT');
        }
    }

    startActivity() {
        if (!this.indoorAction) return;
        
        if (this.indoorAction === 'train') {
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
            const targets = ['slime', 'bat', 'spider', 'goblin', 'bandit'];
            this.pendingQuestTarget = targets[Math.floor(Math.random() * targets.length)];
            prompt = `The player is interacting with the bounty board. You are granting them a contract to hunt 3 ${this.pendingQuestTarget}s. Roleplay handing them the bounty parchment and wishing them luck or giving a tip. You MUST include the exact string [ACTION_SUCCESS] at the end of your response to formally grant the quest. Do not wait for the player to reply.`;
        }

        if (!prompt) return;

        this.addMessageToUI("System", "Activity Started! Wait for the NPC's response...");
        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        this.chatActivityBtn.disabled = true;

        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(this.npcName, "...", loadingId);

        const wm = this.scene.worldManager;
        const p = this.scene.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: {
                level: (window.saveData && window.saveData.level) || 1,
                class: p.classData ? p.classData.id : "adventurer",
                hp: `${p.hp}/${p.maxHp}`,
                gold: (window.saveData && window.saveData.gold) || 0,
                alignment: (window.saveData && window.saveData.alignment) || 0,
                isSavior: (window.saveData && window.saveData.isSavior) || false,
                inventory: p.inventory,
                quests: p.quests
            }
        };

        this.geminiService.getNpcResponse(this.npcPersona, this.chatHistory, `[SYSTEM ACTIVITY TRIGGER] ${prompt}`, state)
            .then(res => {
                if (!this.scene || this.scene.isSceneDestroyed) return;
                if (!this.sprite || !this.sprite.active) return;
                const reply = res.response;
                const cleanReply = reply.replace(/\[ACTION_SUCCESS\]/g, '').trim();
                if (reply.includes('[ACTION_SUCCESS]')) {
                    this.executeActivityEffect();
                }
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) {
                    loadingElement.innerText = cleanReply;
                }
                this.chatHistory.push({ role: 'model', content: cleanReply });
                if (this.chatInput) this.chatInput.disabled = false;
                if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
                if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                if (this.chatInput) this.chatInput.focus();
                // If there's a UI scroll method
                const chatHistoryDiv = document.getElementById('chat-history');
                if (chatHistoryDiv) chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
            })
            .catch(err => {
                if (!this.scene || this.scene.isSceneDestroyed) return;
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) {
                    loadingElement.innerText = "[Error generating response]";
                }
                if (this.chatInput) this.chatInput.disabled = false;
                if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
                if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                console.error(err);
            });
    }

    executeActivityEffect() {
        if (this.indoorAction === 'train') {
            const EnemyController = window.EnemyController || this.scene.EnemyController; // Assuming EnemyController is accessible globally or on scene
            if (!this.scene.anims.exists('training_dummy-idle')) {
                this.scene.anims.create({ key: 'training_dummy-idle', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
                this.scene.anims.create({ key: 'training_dummy-hit', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 8, end: 15 }), frameRate: 12, repeat: 0 });
                this.scene.anims.create({ key: 'training_dummy-die', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 8, end: 15 }), frameRate: 12, repeat: 0 });
            }
            if (this.scene.EnemyController) {
                const dummy = new this.scene.EnemyController(this.scene, 600, 680, 'training_dummy', this.player);
                dummy.stats = { hp: 5000, maxHp: 5000, atk: 0, def: 5, spd: 0, xp: 50 }; // High HP for training
                dummy.isDummy = true;
                dummy.isHit = false;
                dummy.sprite.setScale(0.8);
                this.scene.enemies.push(dummy);
                this.scene.createDamageText(this.player.sprite.x, this.player.sprite.y - 50, "Training Dummy Spawned!", '#ffff00');
            }
            return;
        }

        let rewardText = "";
        switch (this.indoorAction) {
            case 'rest':
                this.player.hp = this.player.maxHp;
                this.player.mp = this.player.maxMp;
                this.player.sp = this.player.maxSp;
                if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
                rewardText = "Fully Rested!";
                break;
            case 'forge':
                if (this.player.inventory.weapon) {
                    this.player.inventory.weapon.damageBonus = (this.player.inventory.weapon.damageBonus || 0) + 5;
                    rewardText = "Weapon Upgraded (+5 Dmg)!";
                }
                break;
            case 'brew':
                this.player.inventory.potions = (this.player.inventory.potions || 0) + 1;
                if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
                rewardText = "Received 1 HP Potion!";
                break;
            case 'contracts':
                if (this.pendingQuestTarget) {
                    const quest = {
                        id: `bounty_${Date.now()}`,
                        title: `Hunt ${this.pendingQuestTarget}s`,
                        targetType: this.pendingQuestTarget,
                        targetCount: 3,
                        currentCount: 0,
                        rewardGold: 100
                    };
                    this.player.addQuest(quest);
                    rewardText = `Quest Accepted: Hunt 3 ${this.pendingQuestTarget}s!`;
                } else {
                    rewardText = "Bounty Completed (+50 Gold)!"; // Fallback
                }
                break;
            case 'pray':
                const stats = ['vit', 'str', 'dex', 'int'];
                const randomStat = stats[Math.floor(Math.random() * stats.length)];
                if (this.player.classData && this.player.classData.stats) {
                    this.player.classData.stats[randomStat]++;
                    this.player.recalculateStats();
                }
                if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
                rewardText = `Blessing Received (+1 ${randomStat.toUpperCase()})!`;
                break;
            case 'study':
                if (this.player.tempStats) {
                    this.player.tempStats.int += 1;
                    this.player.recalculateStats();
                }
                if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
                rewardText = "Temporary +1 INT Buff!";
                break;
        }

        if (rewardText) {
            this.scene.createDamageText(this.player.sprite.x, this.player.sprite.y - 50, rewardText, '#00ff00');
        }
    }

    async handlePlayerMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        // 1. Display player message
        this.addMessageToUI("Player", text);
        this.chatInput.value = "";
        
        // Disable input while generating
        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        if (this.chatActivityBtn) this.chatActivityBtn.disabled = true;

        // 2. Add loading indicator
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(this.npcName, "...", loadingId);


        // Gather RAG Context
        const wm = this.scene.worldManager;
        const p = this.scene.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: {
                level: (window.saveData && window.saveData.level) || 1,
                class: p.classData ? p.classData.id : "adventurer",
                hp: `${p.hp}/${p.maxHp}`,
                gold: (window.saveData && window.saveData.gold) || 0,
                alignment: (window.saveData && window.saveData.alignment) || 0,
                isSavior: (window.saveData && window.saveData.isSavior) || false,
                inventory: p.inventory,
                quests: p.quests
            }
        };

        // 3. Ask Gemini
        const response = await this.geminiService.getNpcResponse(this.npcPersona, this.chatHistory, text, state);
        if (!this.scene || this.scene.isSceneDestroyed) return;
        if (!this.sprite || !this.sprite.active) return;
        
        // Handle activity success from normal chat
        const cleanReply = response.response.replace(/\[ACTION_SUCCESS\]/g, '').trim();
        if (response.response.includes('[ACTION_SUCCESS]')) {
            this.executeActivityEffect();
        }
        
        response.response = cleanReply;

        // 4. Update UI and History
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        this.addMessageToUI(this.npcName, response.response);
        
        // Store in history for context
        this.chatHistory.push({ sender: "Player", text: text });
        this.chatHistory.push({ sender: this.npcName, text: response.response });

        // 5. Apply Alignment Shift
        if (response.alignmentShift !== 0) {
            this.player.updateAlignment(response.alignmentShift);
            
            // Show a visual notification
            const sign = response.alignmentShift > 0 ? "+" : "";
            const color = response.alignmentShift > 0 ? "#00ff00" : "#ff0000";
            this.addMessageToUI("System", `<span style="color:${color}">Alignment Shifted: ${sign}${response.alignmentShift}</span>`);
        }

        // 6. Accept Quests
        if (response.quest && this.player.addQuest) {
            this.player.addQuest(response.quest);
            this.addMessageToUI("System", `<span style="color:#f6be3b">Quest Added: ${response.quest.title}</span>`);
        }

        // Re-enable input
        this.chatInput.disabled = false;
        this.chatSubmitBtn.disabled = false;
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
                        this.scene.spawnHeroAI(combatClass, this.sprite.x, this.sprite.y, 'hostile');
                    }
                    this.removeFromWorld();
                    this.destroy();
                }, 1500);
            }
        } else if (response.joinsParty) {
            if (isSafeZone) {
                this.addMessageToUI("System", `<span style="color:#00ff00">They will not leave the safety of the town, but they consider you a friend.</span>`);
                this.player.updateAlignment(5);
            } else {
                setTimeout(() => {
                    this.closeChat();
                    if (this.scene.spawnHeroAI) {
                        let combatClass = 'knight';
                        const lowerName = this.npcName.toLowerCase();
                        if (this.spriteKey === 'alchemist' || this.spriteKey === 'npc' || lowerName.includes('sage') || lowerName.includes('wizard') || lowerName.includes('mage')) combatClass = 'wizard';
                        else if (this.spriteKey === 'ranger' || lowerName.includes('scout') || lowerName.includes('ranger') || lowerName.includes('hunter')) combatClass = 'ranger';
                        else if (this.spriteKey === 'samurai' || lowerName.includes('samurai') || lowerName.includes('thief') || lowerName.includes('rogue')) combatClass = 'samurai';
                        this.scene.spawnHeroAI(combatClass, this.sprite.x, this.sprite.y, 'party', this.npcName, this.persona);
                    }
                    this.removeFromWorld();
                    this.destroy();
                }, 1500);
            }
        }
    }

    removeFromWorld() {
        if (window.saveData && window.saveData.zones && window.saveData.currentZone !== undefined) {
            const currentZone = window.saveData.currentZone;
            const zoneData = window.saveData.zones[currentZone];
            if (zoneData && zoneData.npcs) {
                zoneData.npcs = zoneData.npcs.filter(n => n.name !== this.npcName);
                
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                const idx = saves.findIndex(s => s.id === window.saveData.id);
                if (idx > -1) {
                    saves[idx] = window.saveData;
                    localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
                }
            }
        }
    }

    addMessageToUI(sender, text, id = null) {
        const msgDiv = document.createElement('div');
        if (id) msgDiv.id = id;
        msgDiv.style.marginBottom = '8px';
        
        const senderColor = sender === "Player" ? "#66aaff" : (sender === "System" ? "#aaaaaa" : "#ffaa00");
        
        msgDiv.innerHTML = `<span style="color: ${senderColor}; font-weight: bold;">${sender}:</span> <span>${text}</span>`;
        this.chatHistoryDiv.appendChild(msgDiv);
        
        this.chatHistoryDiv.scrollTop = this.chatHistoryDiv.scrollHeight;
    }

    async triggerHiddenPrompt(hiddenPrompt, displayName) {
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const wm = this.scene.worldManager;
        const p = this.player;
        const state = {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            player: { level: (window.saveData && window.saveData.level) || 1, class: p.classData ? p.classData.id : "adventurer", hp: `${p.hp}/${p.maxHp}` },
            inventory: p.inventory ? { gold: p.inventory.gold, items: "Potions" } : null,
            alignment: p.alignment
        };
        
        try {
            const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, hiddenPrompt, state);
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();

            this.addMessageToUI(displayName, response.response);
            
            // Do not add the hidden prompt to the chat history, so the user doesn't see it
            // Only add the AI's response so it has context of its own words
            this.chatHistory.push({ sender: displayName, text: response.response });
            
        } catch (err) {
            if (!this.scene || this.scene.isSceneDestroyed) return;
            if (!this.sprite || !this.sprite.active) return;
            console.error("AI Intro failed:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) loadingElement.remove();
            this.addMessageToUI(displayName, "Welcome to Willowbrook. I am the Sage.");
        }

        if (this.chatInput) this.chatInput.disabled = false;
        if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
        if (this.chatInput) this.chatInput.focus();
    }

    destroy() {
        this.unregisterChatListeners();

        if (this.nameText) this.nameText.destroy();
        if (this.promptText) this.promptText.destroy();
        if (this.sprite) this.sprite.destroy();
        const index = this.scene.npcs.indexOf(this);
        if (index > -1) this.scene.npcs.splice(index, 1);
    }
}
