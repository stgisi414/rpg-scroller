// NPCController.js - AI powered roleplaying NPC

class NPCController {
    constructor(scene, x, y, player, geminiService, npcName, persona, spriteKey = 'npc', combatClass = 'sword') {
        this.scene = scene;
        this.player = player;
        this.geminiService = geminiService;
        this.npcName = npcName;
        this.persona = persona;
        this.spriteKey = spriteKey;
        this.combatClass = combatClass;
        this.npcId = spriteKey + "_" + npcName.replace(/\s+/g, '');
        
        // Load social score
        if (!saveData) saveData = {};
        if (!saveData.npcRelations) saveData.npcRelations = {};
        this.socialScore = saveData.npcRelations[this.npcId] || 0;

        // Load or assign persistent NPC alignment
        if (!saveData.npcAlignments) saveData.npcAlignments = {};
        if (!saveData.npcAlignments[this.npcId]) {
            let alignment = 'Neutral';
            const nameLower = npcName.toLowerCase();
            const personaLower = persona.toLowerCase();
            if (nameLower.includes('sage') || nameLower.includes('elara') || nameLower.includes('angel') || personaLower.includes('good') || personaLower.includes('wise') || personaLower.includes('helper')) {
                alignment = 'Good';
            } else if (nameLower.includes('shadow') || nameLower.includes('rogue') || nameLower.includes('vespera') || nameLower.includes('alchemist') || personaLower.includes('evil') || personaLower.includes('enigmatic') || personaLower.includes('dark')) {
                alignment = 'Evil';
            } else {
                const choices = ['Good', 'Neutral', 'Evil'];
                alignment = choices[Math.floor(Math.random() * choices.length)];
            }
            saveData.npcAlignments[this.npcId] = alignment;
        }
        this.alignment = saveData.npcAlignments[this.npcId];
        
        // Load or assign persistent NPC personality
        if (!saveData.npcPersonalities) saveData.npcPersonalities = {};
        if (!saveData.npcPersonalities[this.npcId]) {
            const choices = ['chatty', 'wise', 'gruff', 'greedy', 'timid'];
            saveData.npcPersonalities[this.npcId] = choices[Math.floor(Math.random() * choices.length)];
        }
        this.personality = saveData.npcPersonalities[this.npcId];
        
        // Faction awareness fields (Phase 5)
        this.faction = null;
        this.factionRank = 'commoner';
        this.politicalTitle = null;

        // Define emoji animations if they don't exist
        if (this.scene.anims && !this.scene.anims.exists('emoji_happy')) {
            const emojis = [
                { key: 'emoji_happy', row: 13 },
                { key: 'emoji_neutral', row: 5 },
                { key: 'emoji_sad', row: 10 },
                { key: 'emoji_angry', row: 6 },
                { key: 'emoji_love', row: 8 }
            ];
            emojis.forEach(e => {
                this.scene.anims.create({
                    key: e.key,
                    frames: this.scene.anims.generateFrameNumbers('emojis', { start: e.row * 19, end: e.row * 19 + 4 }),
                    frameRate: 15,
                    repeat: 0
                });
            });
        }

        // Chat state
        this.chatHistory = [];
        this.isChatOpen = false;
        this.isShopOpen = false;
        this.activeActivity = null;

        // NPC Approach States
        this.approachingPlayer = false;
        this.wasApproaching = false;
        this.approachCooldown = 0;
        this.playerIgnoreTimer = 0;
        this.lastApproachCheck = 0;

        // Create the physics sprite using the appropriate sprite key
        this.sprite = this.scene.physics.add.sprite(x, y, spriteKey, 0);
        const baseKey = spriteKey.replace('_rival', '');
        const classData = (window.classesData && window.classesData[baseKey]) ? window.classesData[baseKey] : null;

        let baseScale = classData ? (classData.spriteScale || 1.5) : 1.5;
        if (!classData) {
            if (spriteKey === 'heavenly_cherub') {
                baseScale = 0.7;
            } else if (spriteKey === 'heavenly_seraph') {
                baseScale = 1.45;
            } else if (spriteKey === 'heavenly_valkyrie') {
                baseScale = 1.45;
            } else if (spriteKey === 'heavenly_archangel') {
                baseScale = 1.6;
            }
        }
        this.baseScale = baseScale;
        this.sprite.setScale(baseScale);

        if (spriteKey.startsWith('heavenly_')) {
            // Apply a subtle celestial tint/glow to differentiate them
            const tints = [
                0xffffff, // Pure celestial white
                0xfff3cc, // Soft golden glow
                0xe0f2fe, // Soft blue glow
                0xfae8ff  // Soft magenta/purple glow
            ];
            let nameHash = 0;
            const seedString = this.npcName || spriteKey;
            for (let i = 0; i < seedString.length; i++) {
                nameHash += seedString.charCodeAt(i);
            }
            const randomTint = tints[nameHash % tints.length];
            this.sprite.setTint(randomTint);
        }
        this.sprite.setDepth(1);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.body.immovable = false;
        this.sprite.body.setAllowGravity(true);
        // Frame size can be dynamic. Use custom dynamic dimensions for modular NPCs.
        const standardKeys = [
            'npc', 'wizard', 'ranger', 'knight', 'samurai', 'blacksmith', 'alchemist', 'sage', 'king', 'human_king', 'human_queen', 'priest_1', 'priest_3', 'heavy_knight', 'knight_rival', 'megaboss_rival', 'elven_spellblade', 'elven_spellblade_rival',
            'heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub'
        ];
        const isCustom = !standardKeys.includes(spriteKey) && !classData;
        this.isCustom = isCustom;

        if (isCustom) {
            const bodyW = 36;
            const bodyH = 48;
            
            // Calculate foot Y based on frame 0 foot data to align the sprite's feet with the body bottom
            let footY = this.sprite.frame.height;
            const fd = window.npcFootData && window.npcFootData[spriteKey];
            if (fd && fd[0] != null) {
                footY = fd[0] + 1;
            }
            
            this.sprite.body.setSize(bodyW, bodyH);
            this.sprite.body.setOffset(
                (this.sprite.frame.width - bodyW) / 2,
                footY - bodyH
            );
            // Canvas textures don't have inherent bounds — the physics engine
            // can't resolve collisions without an explicit refreshBody() call
            // after setSize/setOffset/setScale to sync the body with the sprite.
            this.sprite.refreshBody();

            // Hook setFrame to handle dynamic foot anchoring on frame changes immediately
            const originalSetFrame = this.sprite.setFrame;
            const self = this;
            this.sprite.setFrame = function(frame, updateSize, updateArea) {
                const oldFrame = this.frame;
                const oldH = oldFrame ? oldFrame.height : 64;
                const oldIdx = oldFrame ? ((typeof oldFrame.name === 'number') ? oldFrame.name : parseInt(oldFrame.name, 10)) : 0;
                
                let res = null;
                try {
                    res = originalSetFrame.call(this, frame, updateSize, updateArea);
                } catch (err) {
                    console.warn("Phaser error in setFrame:", err);
                    return this;
                }
                
                const newFrame = this.frame;
                if (newFrame && newFrame !== oldFrame) {
                    const newIdx = (typeof newFrame.name === 'number') ? newFrame.name : parseInt(newFrame.name, 10);
                    self._anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx);
                }
                return res;
            };

            // Also hook the animation system's setCurrentFrame to handle animation-driven changes
            if (this.sprite.anims) {
                const originalSetCurrentFrame = this.sprite.anims.setCurrentFrame;
                this.sprite.anims.setCurrentFrame = function(parentFrame) {
                    const oldFrame = self.sprite.frame;
                    const oldH = oldFrame ? oldFrame.height : 64;
                    const oldIdx = oldFrame ? ((typeof oldFrame.name === 'number') ? oldFrame.name : parseInt(oldFrame.name, 10)) : 0;
                    
                    let res = null;
                    try {
                        res = originalSetCurrentFrame.call(this, parentFrame);
                    } catch (err) {
                        console.warn("Phaser error setting current animation frame:", err);
                        return this;
                    }
                    
                    const newFrame = self.sprite.frame;
                    if (newFrame && newFrame !== oldFrame) {
                        const newIdx = (typeof newFrame.name === 'number') ? newFrame.name : parseInt(newFrame.name, 10);
                        self._anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx);
                    }
                    return res;
                };
            }

            // Sync initial frame immediately
            const initFrame = this.sprite.frame;
            if (initFrame) {
                const initIdx = (typeof initFrame.name === 'number') ? initFrame.name : parseInt(initFrame.name, 10);
                this._anchorBodyOnFrameChange(initFrame.height, initIdx, initFrame, initIdx);
            }
        } else if (classData) {
            const bodyW = classData.bodyWidth || (classData.frameWidth * 0.38);
            const bodyH = classData.bodyHeight || (classData.frameHeight * 0.85);
            const offX = classData.bodyOffsetX !== undefined ? classData.bodyOffsetX : (classData.frameWidth * 0.31);
            const offY = classData.bodyOffsetY !== undefined ? classData.bodyOffsetY : (classData.frameHeight * 0.15);
            this.sprite.body.setSize(bodyW, bodyH);
            this.sprite.body.setOffset(offX, offY);
            this.sprite.refreshBody();
        } else if (spriteKey === 'knight') {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(22, 16);
            this.sprite.refreshBody();
        } else if (spriteKey === 'elven_spellblade' || spriteKey === 'elven_spellblade_rival') {
            this.sprite.body.setSize(47, 63);
            this.sprite.body.setOffset(40, 31);
            this.sprite.refreshBody();
        } else if (spriteKey === 'heavenly_archangel') {
            this.sprite.body.setSize(40, 63);
            this.sprite.body.setOffset(44, 32);
            this.sprite.refreshBody();
        } else if (spriteKey === 'heavenly_valkyrie') {
            this.sprite.body.setSize(40, 70);
            this.sprite.body.setOffset(44, 25);
            this.sprite.refreshBody();
        } else if (spriteKey === 'heavenly_seraph') {
            this.sprite.body.setSize(50, 70);
            this.sprite.body.setOffset(39, 25);
            this.sprite.refreshBody();
        } else if (spriteKey === 'heavenly_cherub') {
            this.sprite.body.setSize(30, 40);
            this.sprite.body.setOffset(49, 40);
            this.sprite.refreshBody();
        } else {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(30, 16);
            this.sprite.refreshBody();
        }
        
        // Safety net: check if the bottom of the physics body is below the default platform floor height (672)
        // If so, adjust the sprite's Y coordinate upward so it spawns safely resting on the platform.
        if (this.sprite.body && this.sprite.body.bottom > 672 && this.sprite.y <= 624) {
            const diff = this.sprite.body.bottom - 672;
            this.sprite.y -= diff;
            this.sprite.refreshBody();
        }
        
        let idleKey = spriteKey + '_idle';
        if (this.scene.anims.exists(spriteKey + '-idle')) {
            idleKey = spriteKey + '-idle';
        } else if (!this.scene.anims.exists(idleKey)) {
            // Each sheet has different layouts. Heroes must match their main.js config:
            // npc (goddess): row 0, 6 frames
            // wizard: row 1, 6 frames (cols = 6 -> starts at 6)
            // ranger: row 0, 5 frames
            // knight: row 0, 5 frames
            // samurai: row 0, 5 frames
            const idleConfig = {
                npc: { start: 0, end: 5 },
                wizard: { start: 6, end: 11 },
                ranger: { start: 0, end: 4 },
                knight: { start: 0, end: 4 },
                samurai: { start: 0, end: 4 },
                blacksmith: { start: 0, end: 4 },
                alchemist: { start: 0, end: 4 },
                sage: { start: 0, end: 5 },
                elven_spellblade: { start: 0, end: 8 },
                elven_spellblade_rival: { start: 0, end: 8 }
            };
            
            let animConfig;
            if (spriteKey === 'king') {
                // The king's frames are stacked vertically in column 8 (index 7), from row 2 (index 1) to 13 (index 12)
                // Grid is 11 columns wide (704 / 64)
                let kingFrames = [];
                for (let row = 1; row <= 12; row++) {
                    kingFrames.push({ key: 'king', frame: (row * 11) + 7 });
                }
                animConfig = {
                    key: idleKey,
                    frames: kingFrames,
                    frameRate: 6,
                    repeat: -1
                };
            } else {
                let config;
                if (idleConfig[spriteKey]) {
                    config = idleConfig[spriteKey];
                } else if (classData) {
                    let cols = classData.sheetCols;
                    if (!cols) {
                        try {
                            const tex = this.scene.textures.get(spriteKey);
                            const img = tex ? tex.getSourceImage() : null;
                            if (img && img.width) {
                                cols = Math.floor(img.width / classData.frameWidth);
                            }
                        } catch (e) {
                            console.warn("Failed to get texture dimensions for cols in NPCController:", e);
                        }
                    }
                    if (!cols) {
                        cols = classData.frameWidth === 80 ? 10 : 12;
                    }
                    const startIdle = (classData.idleRow || 0) * cols;
                    const endIdle = startIdle + (classData.idleFrames || 6) - 1;
                    config = { start: startIdle, end: endIdle };
                } else {
                    config = { start: 0, end: 4 };
                }
                
                let animFrames = [];
                const texture = this.scene.textures.get(spriteKey);
                if (texture && texture.getFrameNames().length > 0) {
                    for (let f = config.start; f <= config.end; f++) {
                        if (texture.has(f) || texture.has(f.toString())) {
                            animFrames.push({ key: spriteKey, frame: f });
                        }
                    }
                }
                
                if (animFrames.length === 0) {
                    animFrames = this.scene.anims.generateFrameNumbers(spriteKey, config);
                }
                
                animConfig = {
                    key: idleKey,
                    frames: animFrames,
                    frameRate: 6,
                    repeat: -1
                };
            }
            
            this.scene.anims.create(animConfig);
        }

        let walkKey = spriteKey + '_walk';
        if (this.scene.anims.exists(spriteKey + '-move')) {
            walkKey = spriteKey + '-move';
        } else if (!this.scene.anims.exists(walkKey)) {
            const walkConfig = {
                npc: { start: 6, end: 11 }, // Goddess NPC walk frames
                wizard: { start: 0, end: 5 }, // Row 0 (6 cols) -> starts at 0
                ranger: { start: 22, end: 29 }, // Row 2 (11 cols) -> starts at 22
                knight: { start: 10, end: 17 }, // Row 1 (10 cols) -> starts at 10
                samurai: { start: 16, end: 23 }, // Row 2 (8 cols) -> starts at 16
                blacksmith: { start: 0, end: 4 }, // Only 5 frames total, reuse idle
                alchemist: { start: 0, end: 4 }, // Only 5 frames total, reuse idle
                sage: { start: 6, end: 11 }, // Sage uses Goddess NPC sheet, so play Goddess walk frames 6 to 11!
                elven_spellblade: { start: 9, end: 17 },
                elven_spellblade_rival: { start: 9, end: 17 },
                priest: { start: 16, end: 27 },
                priest_1: { start: 16, end: 27 },
                priest_2: { start: 16, end: 27 },
                priest_3: { start: 16, end: 27 },
                priest_1_rival: { start: 16, end: 27 },
                priest_2_rival: { start: 16, end: 27 },
                priest_3_rival: { start: 16, end: 27 },
                witch: { start: 14, end: 23 },
                witch_1: { start: 14, end: 23 },
                witch_2: { start: 14, end: 23 },
                witch_3: { start: 14, end: 23 },
                witch_1_rival: { start: 14, end: 23 },
                witch_2_rival: { start: 14, end: 23 },
                witch_3_rival: { start: 14, end: 23 },
                pyromancer: { start: 16, end: 23 },
                pyromancer_1: { start: 16, end: 23 },
                pyromancer_2: { start: 16, end: 23 },
                pyromancer_3: { start: 16, end: 23 },
                pyromancer_1_rival: { start: 16, end: 23 },
                pyromancer_2_rival: { start: 16, end: 23 },
                pyromancer_3_rival: { start: 16, end: 23 }
            };
            
            if (spriteKey === 'king') {
                let kingFrames = [];
                for (let row = 1; row <= 12; row++) {
                    kingFrames.push({ key: 'king', frame: (row * 11) + 7 });
                }
                this.scene.anims.create({
                    key: walkKey,
                    frames: kingFrames,
                    frameRate: 6,
                    repeat: -1
                });
            } else {
                let config;
                if (walkConfig[spriteKey]) {
                    config = walkConfig[spriteKey];
                } else if (classData) {
                    let cols = classData.sheetCols;
                    if (!cols) {
                        try {
                            const tex = this.scene.textures.get(spriteKey);
                            const img = tex ? tex.getSourceImage() : null;
                            if (img && img.width) {
                                cols = Math.floor(img.width / classData.frameWidth);
                            }
                        } catch (e) {
                            console.warn("Failed to get texture dimensions for cols in NPCController:", e);
                        }
                    }
                    if (!cols) {
                        cols = classData.frameWidth === 80 ? 10 : 12;
                    }
                    const startWalk = (classData.walkRow !== undefined ? classData.walkRow : 1) * cols;
                    const endWalk = startWalk + cols - 1;
                    config = { start: startWalk, end: endWalk };
                } else {
                    config = { start: 0, end: 4 };
                }
                
                let animFrames = [];
                const texture = this.scene.textures.get(spriteKey);
                if (texture && texture.getFrameNames().length > 0) {
                    for (let f = config.start; f <= config.end; f++) {
                        if (texture.has(f) || texture.has(f.toString())) {
                            animFrames.push({ key: spriteKey, frame: f });
                        }
                    }
                }
                
                if (animFrames.length === 0) {
                    animFrames = this.scene.anims.generateFrameNumbers(spriteKey, config);
                }
                
                this.scene.anims.create({
                    key: walkKey,
                    frames: animFrames,
                    frameRate: 10,
                    repeat: -1
                });
            }
        }

        this.sprite.play(idleKey);

        // Name tag & prompt — positioned relative to sprite in update()
        const initialScale = 1.5;
        const initialFrameH = (this.sprite.frame && this.sprite.frame.height) ? this.sprite.frame.height : 64;
        const initialTopOfHeadY = y - (initialFrameH * initialScale) / 2;

        this.nameText = this.scene.add.text(x, initialTopOfHeadY - 15, npcName, { fontSize: '13px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(2);

        // Interaction Prompt
        this.promptText = this.scene.add.text(x, initialTopOfHeadY - 35, "Press 'F' to Talk", { fontSize: '11px', fill: '#ffff00', stroke: '#000000', strokeThickness: 2 });
        this.promptText.setOrigin(0.5);
        this.promptText.setDepth(2);
        this.promptText.setVisible(false);

        // Emoji Sprite
        this.emojiSprite = this.scene.add.sprite(x, initialTopOfHeadY - 55, 'emojis', 0);
        this.emojiSprite.setOrigin(0.5);
        this.emojiSprite.setDepth(2);
        this.emojiSprite.setScale(1.5);
        this.emojiSprite.setVisible(false);
        this.updateEmojiDisplay();

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
        this.onCloseClick = () => {
            if (this.isChatOpen) this.closeChat();
            if (this.isShopOpen) this.closeShop();
        };
        this.onInputKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (this.isChatOpen) this.closeChat();
                if (this.isShopOpen) this.closeShop();
            }
        };
        this.onDocumentKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (this.isChatOpen) this.closeChat();
                if (this.isShopOpen) this.closeShop();
            }
        };

        this.chatTradeBtn = document.getElementById('chat-trade');
        this.chatActivityBtn = document.getElementById('chat-activity');
        this.chatCloseBtn = document.getElementById('chat-close');
    }

    updateEmojiDisplay() {
        if (!this.emojiSprite) return;
        
        let animKey = '';
        if (this.socialScore <= -20) animKey = 'emoji_angry';
        else if (this.socialScore < 40) animKey = 'emoji_neutral';
        else if (this.socialScore < 80) animKey = 'emoji_happy';
        else animKey = 'emoji_love';

        if (animKey) {
            if (this.emojiSprite.anims && this.emojiSprite.anims.currentAnim?.key !== animKey) {
                this.emojiSprite.play(animKey);
                this.emojiSprite.setVisible(true);
            }
        } else {
            this.emojiSprite.setVisible(false);
        }
    }

    playEmoji(key) {
        if (!this.emojiSprite || !key) return;
        if (this.emojiSprite.anims && this.emojiSprite.anims.currentAnim?.key !== key) {
            this.emojiSprite.play(key);
            this.emojiSprite.setVisible(true);
            
            if (this.emojiTimer) {
                this.emojiTimer.remove();
            }
            this.emojiTimer = this.scene.time.delayedCall(2000, () => {
                this.updateEmojiDisplay();
            });
        }
    }

    setScaleWithPhysics(scale) {
        this.sprite.setScale(scale);
        
        const baseKey = this.spriteKey.replace('_rival', '');
        const classData = (window.classesData && window.classesData[baseKey]) ? window.classesData[baseKey] : null;
        
        if (classData) {
            const bodyW = classData.bodyWidth || (classData.frameWidth * 0.38);
            const bodyH = classData.bodyHeight || (classData.frameHeight * 0.85);
            const offX = classData.bodyOffsetX !== undefined ? classData.bodyOffsetX : (classData.frameWidth * 0.31);
            const offY = classData.bodyOffsetY !== undefined ? classData.bodyOffsetY : (classData.frameHeight * 0.15);
            this.sprite.body.setSize(bodyW, bodyH);
            this.sprite.body.setOffset(offX, offY);
        } else if (this.isCustom) {
            const bodyW = 36;
            const bodyH = 48;
            let footY = 56; // Fallback
            const fd = window.npcFootData && window.npcFootData[this.spriteKey];
            if (fd && fd[0] != null) {
                footY = fd[0] + 1;
            }
            this.sprite.body.setSize(bodyW, bodyH);
            this.sprite.body.setOffset(
                (this.sprite.frame.width - bodyW) / 2,
                footY - bodyH
            );
        } else if (this.spriteKey === 'knight') {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(22, 16);
        } else if (this.spriteKey === 'elven_spellblade' || this.spriteKey === 'elven_spellblade_rival') {
            this.sprite.body.setSize(47, 63);
            this.sprite.body.setOffset(40, 31);
        } else {
            this.sprite.body.setSize(36, 48);
            this.sprite.body.setOffset(30, 16);
        }
        if (this.sprite.refreshBody) {
            this.sprite.refreshBody();
        }
    }

    // Anchors the physics body and sprite Y position when the animation frame changes.
    // Adjusts sprite Y immediately to compensate for any changes in frame height or
    // foot offset, keeping the physics body world position completely stable.
    _anchorBodyOnFrameChange(oldH, oldIdx, newFrame, newIdx) {
        const body = this.sprite.body;
        if (!body) return;
        
        const scale = this.sprite.scaleY || 1.5;
        const bodyW = body.width / (this.sprite.scaleX || 1);
        const bodyH = body.height / (this.sprite.scaleY || 1);
        const fw = newFrame.width;
        const fh = newFrame.height;
        
        // Get old footY
        let oldFootY = oldH;
        const fd = window.npcFootData && window.npcFootData[this.spriteKey];
        if (fd) {
            if (!isNaN(oldIdx) && fd[oldIdx] != null) oldFootY = fd[oldIdx] + 1;
        }
        const oldOffset = oldFootY - bodyH;
        
        // Get new footY
        let newFootY = fh;
        if (fd) {
            if (!isNaN(newIdx) && fd[newIdx] != null) newFootY = fd[newIdx] + 1;
        }
        const newOffset = newFootY - bodyH;
             const yDiff = scale * (0.5 * (fh - oldH) - (newOffset - oldOffset));

        // Adjust sprite Y immediately to prevent body.position.y from jumping in preUpdate
        this.sprite.y += yDiff;
        
        // Update body offset only if it has changed to prevent visual artifacts
        if (body.offset.x !== (fw / 2 - bodyW / 2) || body.offset.y !== newOffset) {
            body.setOffset(fw / 2 - bodyW / 2, newOffset);
        }
    }
 
    update(time, delta) {
        if (!this.player || !this.player.sprite) return;
 
        // Floor clamp for custom NPCs — safety net against Phaser canvas-texture collision bug
        if (this.isCustom && this.sprite.body) {
            const floorBodyTop = 672;
            if (this.sprite.body.bottom > floorBodyTop + 2) {
                const targetBodyY = floorBodyTop - this.sprite.body.height;
                this.sprite.body.position.y = targetBodyY;
                this.sprite.body.velocity.y = 0;
            }
        }

        // Keep name/prompt text floating above the sprite at all times
        const scale = this.sprite.scaleY || 1.5;
        const frameH = (this.sprite.frame && this.sprite.frame.height) ? this.sprite.frame.height : 64;
        let topOfHeadY = this.sprite.y - (frameH * scale) / 2;
        if (this.sprite.body) {
            topOfHeadY = this.sprite.body.bottom - (frameH * scale);
        }

        this.nameText.setPosition(this.sprite.x, topOfHeadY - 15);
        this.promptText.setPosition(this.sprite.x, topOfHeadY - 35);
        if (this.emojiSprite) {
            this.emojiSprite.setPosition(this.sprite.x, topOfHeadY - 55);
        }

        // Calculate distance to player (horizontal 1D distance)
        const distanceToPlayer = Math.abs(this.sprite.x - this.player.sprite.x);
        const yDiff = Math.abs(this.sprite.y - this.player.sprite.y);

        // Face the player. Modular (composite) NPCs use the GandalfHardcore Character Asset
        // Pack, whose sprites face LEFT by default — same as the fixed left-facing keys below.
        const baseKey = this.spriteKey.replace('_rival', '');
        const classData = (window.classesData && window.classesData[baseKey]) ? window.classesData[baseKey] : null;
        const isLeftFacing = this.isCustom || 
                             (classData ? !!classData.flipX : ['knight', 'samurai', 'blacksmith', 'alchemist', 'npc', 'king', 'heavy_knight', 'knight_rival'].includes(this.spriteKey));

        if (this.player.sprite.x < this.sprite.x) {
            // Player is to the left
            this.sprite.setFlipX(isLeftFacing ? false : true);
        } else {
            // Player is to the right
            this.sprite.setFlipX(isLeftFacing ? true : false);
        }

        const interactDistance = 80;

        if (distanceToPlayer < interactDistance && yDiff < 50) {
            let statueCloser = false;
            const scene = this.scene;
            const dirUi = document.getElementById('ui-town-directory');
            const isDirOpen = dirUi && window.getComputedStyle(dirUi).display !== 'none';

            if (scene.angelStatue && scene.angelStatue.active && !scene.isIndoors && !isDirOpen) {
                const distToStatue = Phaser.Math.Distance.Between(
                    scene.angelStatue.x, this.player.sprite.y,
                    this.player.sprite.x, this.player.sprite.y
                );
                 if (distToStatue < 100 && (distToStatue < distanceToPlayer || distToStatue < 20)) {
                    statueCloser = true;
                }
            }

            const ai = this.player.companionAI;
            const wantsStatue = ai && !scene.isIndoors && (ai._wantsToTravel || ai._wantsGuildHall);

            if (!statueCloser && !isDirOpen && !wantsStatue) {
                if (!this.isChatOpen) {
                    this.promptText.setVisible(true);
                } else {
                    this.promptText.setVisible(false);
                }

                // Check if player presses F to interact
                const isColiseumActive = this.scene.currentIndoorLocation === 'coliseum' && this.scene.arenaManager && this.scene.arenaManager.isActive;
                const isAnyOtherChatActive = this.scene.npcs && this.scene.npcs.some(n => n !== this && (n.isChatOpen || n.isShopOpen));
                if (this.player.isInteractDown() && !this.isChatOpen && !this.isShopOpen && !isColiseumActive && !isAnyOtherChatActive && !this.player.isTalking) {
                    if (time - (this.lastInteractTime || 0) > 500) {
                        if (this.approachingPlayer) {
                            this.wasApproaching = true;
                            this.approachingPlayer = false;
                            if (this.scene.approachingNpc === this) {
                                this.scene.approachingNpc = null;
                            }
                            this.playerIgnoreTimer = 0;
                            this.approachCooldown = time + 120000;
                        }
                        // Check for delivery quest completion before opening chat
                        this._checkDeliveryQuestCompletion();
                        this.openChat();
                        this.lastInteractTime = time;
                    }
                }
            } else {
                this.promptText.setVisible(false);
            }
        } else {
            this.promptText.setVisible(false);
            if (this.isChatOpen && !this.isIntroCutscene) this.closeChat();
            if (this.isShopOpen) this.closeShop();
        }

        // NPC Approach State Machine (Safe zones only)
        const isSafeZone = this.scene.zoneType === 'Safe';
        let isPlayerStandingStill = false;
        if (this.player.sprite && this.player.sprite.body) {
            const velX = Math.abs(this.player.sprite.body.velocity.x);
            const velY = Math.abs(this.player.sprite.body.velocity.y);
            isPlayerStandingStill = velX < 5 && velY < 5;
        }

        if (isSafeZone && isPlayerStandingStill && !this.isChatOpen && !this.isShopOpen && !this.player.isTalking && !this.scene.approachingNpc) {
            const isAnyChatActive = this.scene.npcs && this.scene.npcs.some(n => n.isChatOpen || n.isShopOpen) || this.scene.partyMembers.some(m => m.isChatOpen);
            if (!isAnyChatActive && time > (this.approachCooldown || 0) && (!this.scene.globalApproachCooldown || time > this.scene.globalApproachCooldown)) {
                if (distanceToPlayer > 120 && distanceToPlayer < 400 && yDiff < 50) {
                    if (time - (this.lastApproachCheck || 0) > 6000) {
                        this.lastApproachCheck = time;
                        if (Math.random() < 0.15) {
                            this.approachingPlayer = true;
                            this.scene.approachingNpc = this;
                            this.playerIgnoreTimer = 0;
                            this.lastSpeechBubbleTime = time;
                            if (this.scene.showFloatingText) {
                                this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, "Excuse me, traveler!", 0xffff00);
                            }
                        }
                    }
                }
            }
        }

        if (this.approachingPlayer) {
            const isAnyChatActive = this.scene.npcs && this.scene.npcs.some(n => n !== this && (n.isChatOpen || n.isShopOpen)) || this.player.isTalking;
            if (isAnyChatActive || this.scene.zoneType !== 'Safe') {
                this.approachingPlayer = false;
                if (this.scene.approachingNpc === this) this.scene.approachingNpc = null;
                this.playerIgnoreTimer = 0;
            } else {
                const dir = Math.sign(this.player.sprite.x - this.sprite.x);
                if (distanceToPlayer > 80) {
                    this.sprite.setVelocityX(dir * 70);
                    let walkAnim = this.spriteKey + '_walk';
                    if (this.scene.anims.exists(this.spriteKey + '-move')) walkAnim = this.spriteKey + '-move';
                    this.sprite.anims.play(walkAnim, true);
                    this.sprite.setFlipX(isLeftFacing ? (dir > 0) : (dir < 0));
                    
                    if (time - (this.lastSpeechBubbleTime || 0) > 5000) {
                        this.lastSpeechBubbleTime = time;
                        const calls = ["Wait up!", "Pardon me!", "A word, hero!", "Excuse me!"];
                        const call = calls[Math.floor(Math.random() * calls.length)];
                        if (this.scene.showFloatingText) {
                            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, call, 0xffff00);
                        }
                    }
                } else {
                    this.sprite.setVelocityX(0);
                    let idleAnim = this.spriteKey + '_idle';
                    if (this.scene.anims.exists(this.spriteKey + '-idle')) idleAnim = this.spriteKey + '-idle';
                    this.sprite.anims.play(idleAnim, true);
                    
                    if (this.playerIgnoreTimer === 0) {
                        this.playerIgnoreTimer = time + 20000;
                        if (this.scene.showFloatingText) {
                            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, "Hey, can we talk? (F)", 0x00ffff);
                        }
                    }
                    
                    if (distanceToPlayer > 180 || time > this.playerIgnoreTimer) {
                        this.decreaseSocialScoreForIgnore(time);
                    }
                }
            }
        }

        // Handle NPC Wandering if they are not talking to the player
        const isStaticNPC = false; // Allow all NPCs to wander
        if (!this.isChatOpen && !this.isShopOpen && !isStaticNPC && !this.approachingPlayer) {
            if (!this.wanderTimer) {
                this.wanderTimer = time + Phaser.Math.Between(1000, 3000); // 1-3s initial delay
                this.wanderState = 0; // 0: idle, 1: walk left, 2: walk right
            }

            if (time > this.wanderTimer) {
                // Change state
                if (this.wanderState === 0) {
                    this.wanderState = Phaser.Math.Between(1, 2);
                    this.wanderTimer = time + Phaser.Math.Between(2000, 4000); // walk for 2-4 seconds
                } else {
                    this.wanderState = 0;
                    this.wanderTimer = time + Phaser.Math.Between(3000, 8000); // idle for 3-8s
                }
                
                // If hitting generic bounds, turn around
                if (this.sprite.x < 150) this.wanderState = 2;
                if (this.sprite.x > 1700) this.wanderState = 1;
            }

            let idleAnim = this.spriteKey + '_idle';
            let walkAnim = this.spriteKey + '_walk';
            let runAnim = this.spriteKey + '_run';
            
            if (this.scene.anims.exists(this.spriteKey + '-idle')) idleAnim = this.spriteKey + '-idle';
            if (this.scene.anims.exists(this.spriteKey + '-move')) walkAnim = this.spriteKey + '-move';
            if (this.scene.anims.exists(this.spriteKey + '-run')) runAnim = this.spriteKey + '-run';

            const activeAnim = this.scene.anims.exists(runAnim) ? runAnim : (this.scene.anims.exists(walkAnim) ? walkAnim : idleAnim);

            if (this.wanderState === 1) {
                this.sprite.setVelocityX(-60);
                this.sprite.setFlipX(isLeftFacing ? false : true);
                if (this.sprite.anims.currentAnim?.key !== activeAnim) this.sprite.play(activeAnim, true);
            } else if (this.wanderState === 2) {
                this.sprite.setVelocityX(60);
                this.sprite.setFlipX(isLeftFacing ? true : false);
                if (this.sprite.anims.currentAnim?.key !== activeAnim) this.sprite.play(activeAnim, true);
            } else {
                this.sprite.setVelocityX(0);
                // Only flip to face player if idle
                if (distanceToPlayer < 200) {
                    this.sprite.setFlipX(this.player.sprite.x < this.sprite.x ? (isLeftFacing ? false : true) : (isLeftFacing ? true : false));
                }
                if (this.sprite.anims.currentAnim?.key !== idleAnim) this.sprite.play(idleAnim, true);
            }
        } else {
            let idleAnim = this.spriteKey + '_idle';
            if (this.scene.anims.exists(this.spriteKey + '-idle')) idleAnim = this.spriteKey + '-idle';
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
            this.chatInput.addEventListener('keydown', this.onInputKeyDown);
        }
        if (this.chatTradeBtn) {
            this.chatTradeBtn.addEventListener('click', this.onTradeClick);
        }
        if (this.chatActivityBtn) {
            this.chatActivityBtn.addEventListener('click', this.onActivityClick);
        }
        if (this.chatCloseBtn) {
            this.chatCloseBtn.addEventListener('click', this.onCloseClick);
        }
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-ESC', this.onEscKeyDown);
        }
        document.addEventListener('keydown', this.onDocumentKeyDown);
    }

    unregisterChatListeners() {
        if (this.chatSubmitBtn) {
            this.chatSubmitBtn.removeEventListener('click', this.onSubmitClick);
        }
        if (this.chatInput) {
            this.chatInput.removeEventListener('keypress', this.onKeyPress);
            this.chatInput.removeEventListener('keydown', this.onInputKeyDown);
        }
        if (this.chatTradeBtn) {
            this.chatTradeBtn.removeEventListener('click', this.onTradeClick);
        }
        if (this.chatActivityBtn) {
            this.chatActivityBtn.removeEventListener('click', this.onActivityClick);
        }
        if (this.chatCloseBtn) {
            this.chatCloseBtn.removeEventListener('click', this.onCloseClick);
        }
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-ESC', this.onEscKeyDown);
        }
        document.removeEventListener('keydown', this.onDocumentKeyDown);
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
    return NPCController_Helper.openChat.call(this, isIntro);
}

closeChat() {
    return NPCController_Helper.closeChat.call(this);
}

    getFactionEmblemSrc() {
        if (!this.faction) return null;
        
        // Find ruling kingdom for this faction
        let kingdomId = null;
        if (window.WORLD_FACTIONS && window.WORLD_FACTIONS[this.faction]) {
            kingdomId = window.WORLD_FACTIONS[this.faction].kingdom;
        } else if (saveData && saveData.discoveredKingdoms) {
            // Check dynamic kingdoms
            for (const kId in saveData.discoveredKingdoms) {
                const k = saveData.discoveredKingdoms[kId];
                if (k.rulingFaction === this.faction) {
                    kingdomId = kId;
                    break;
                }
            }
        }

        return window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kingdomId) : null;
    }

startActivity() {
    return NPCController_Helper.startActivity.call(this);
}

    executeActivityEffect(targetParam = null) {
        window.NPCCampaignHelper.executeActivityEffect(this, targetParam);
    }

async handlePlayerMessage() {
    return NPCController_Helper.handlePlayerMessage.call(this);
}

_parseAndExecuteRoleplayAction(text) {
    return NPCController_Helper._parseAndExecuteRoleplayAction.call(this, text);
}

removeFromWorld() {
    return NPCController_Helper.removeFromWorld.call(this);
}

async triggerHiddenPrompt(hiddenPrompt, displayName) {
    return NPCController_Helper.triggerHiddenPrompt.call(this, hiddenPrompt, displayName);
}

    addMessageToUI(sender, text, id = null) {
        const msgDiv = document.createElement('div');
        if (id) msgDiv.id = id;
        msgDiv.style.marginBottom = '8px';
        
        const senderColor = sender === "Player" ? "#66aaff" : (sender === "System" ? "#aaaaaa" : "#ffaa00");
        
        let displayText = text;
        if (sender === this.npcName && text !== "..." && text !== "Greetings.") {
            const understanding = this.checkPlayerUnderstanding();
            if (!understanding.understands) {
                displayText = `<span style="font-style: italic; color: #d18fd6; font-size: 11px; display: block; margin-bottom: 2px;">(${understanding.dialect} - Unknown)</span> <span style="font-family: 'Courier New', monospace; font-size: 13px; color: #e8c0ed;">"${text}"</span>`;
            } else if (understanding.translator) {
                displayText = `<span style="font-style: italic; color: #4fa3a5; font-size: 11px; display: block; margin-bottom: 2px;">*Translated by ${understanding.translator}*</span> "${text}"`;
            } else if (understanding.language !== 'common') {
                displayText = `<span style="font-style: italic; color: #8a8ab5; font-size: 11px; display: block; margin-bottom: 2px;">*Translated from ${understanding.dialect}*</span> "${text}"`;
            }
        }
        
        msgDiv.innerHTML = `<span style="color: ${senderColor}; font-weight: bold;">${sender}:</span> <span>${displayText}</span>`;
        this.chatHistoryDiv.appendChild(msgDiv);
        
        this.chatHistoryDiv.scrollTop = this.chatHistoryDiv.scrollHeight;
    }

    getLanguageInfo() {
        const zoneIdx = (saveData && saveData.currentZone) || 0;
        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIdx) : null;
        
        let language = 'common';
        let dialect = 'Frontier Jargon';

        // Check if Celestial or Infernal zone
        if (zoneIdx === 777) {
            return { language: 'celestial', dialect: 'Seraphic Enochian' };
        } else if (zoneIdx === -666) {
            return { language: 'infernal', dialect: 'Abyssal Whispers' };
        }

        // Map known kingdoms
        if (kingdom) {
            if (kingdom.id === 'willowbrook') {
                language = 'common';
                dialect = 'West Elden';
            } else if (kingdom.id === 'embercrown') {
                language = 'dwarvish';
                dialect = 'High Volcanic';
            } else if (kingdom.id === 'duskveil') {
                language = 'elvish';
                dialect = 'Dune Elven';
            } else if (kingdom.id === 'ashenmoor') {
                language = 'elvish';
                dialect = 'Old Spell Sylvan';
            } else if (kingdom.id === 'frosthold') {
                language = 'dwarvish';
                dialect = 'High Northern';
            } else if (kingdom.id === 'tidereach') {
                language = 'common';
                dialect = 'Coastal Cant';
            } else if (kingdom.id.startsWith('frontier_kingdom')) {
                const isElven = kingdom.biomes && (
                    kingdom.biomes.includes('Deadwoods') || 
                    (kingdom.name && kingdom.name.toLowerCase().includes('elven')) || 
                    (kingdom.factionName && kingdom.factionName.toLowerCase().includes('elven')) ||
                    (kingdom.factionName && kingdom.factionName.toLowerCase().includes('sylvan'))
                );
                const isDwarven = kingdom.biomes && (
                    kingdom.biomes.includes('Cave') || 
                    (kingdom.name && kingdom.name.toLowerCase().includes('dwarf')) || 
                    (kingdom.name && kingdom.name.toLowerCase().includes('dwarven')) || 
                    (kingdom.name && kingdom.name.toLowerCase().includes('underrealm')) || 
                    (kingdom.name && kingdom.name.toLowerCase().includes('stronghold')) || 
                    (kingdom.factionName && kingdom.factionName.toLowerCase().includes('dwarf')) ||
                    (kingdom.factionName && kingdom.factionName.toLowerCase().includes('dwarven'))
                );

                if (isElven) {
                    language = 'elvish';
                    dialect = 'Sylvan Dialect';
                } else if (isDwarven) {
                    language = 'dwarvish';
                    dialect = 'Khuzdul Runic';
                } else {
                    const firstBiome = (kingdom.biomes && kingdom.biomes[0]) || 'Forest';
                    if (firstBiome === 'Hell') {
                        language = 'infernal';
                        dialect = 'Abyssal Whispers';
                    } else if (firstBiome === 'Dungeon' || firstBiome === 'Cave') {
                        language = 'dwarvish';
                        dialect = 'Khuzdul Runic';
                    } else if (firstBiome === 'Deadwoods') {
                        language = 'elvish';
                        dialect = 'Deepwood Elven';
                    } else if (firstBiome === 'Desert') {
                        language = 'common';
                        dialect = 'Desert Oasis Cant';
                    } else if (firstBiome === 'Winter') {
                        language = 'dwarvish';
                        dialect = 'Runic Mountain';
                    } else {
                        language = 'common';
                        dialect = 'Frontier Jargon';
                    }
                }
            }
        }
        
        // Faction-based overrides
        if (this.faction) {
            if (this.faction.toLowerCase().includes('angel') || this.faction.toLowerCase().includes('seraph')) {
                language = 'celestial';
                dialect = 'Seraphic Enochian';
            } else if (this.faction.toLowerCase().includes('demon') || this.faction.toLowerCase().includes('infernal')) {
                language = 'infernal';
                dialect = 'Abyssal Whispers';
            } else if (this.faction.toLowerCase().includes('elven') || this.faction.toLowerCase().includes('sylvan')) {
                language = 'elvish';
                dialect = 'Celestial Sylvan';
            }
        }

        return { language, dialect };
    }

    checkPlayerUnderstanding() {
        const langInfo = this.getLanguageInfo();
        const known = (saveData && saveData.knownLanguages) || ['common'];
        
        if (known.includes(langInfo.language)) {
            return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
        }

        // Check if player themselves can translate/understand it based on their class
        const player = this.player;
        if (player && player.classData) {
            const pClass = player.classData.id;
            const isElven = pClass === 'ranger' || pClass.startsWith('elven_');
            const isDwarven = pClass === 'knight' || pClass.startsWith('dwarf_');
            const isWitch = pClass === 'witch' || pClass.startsWith('witch_');
            
            if (langInfo.language === 'elvish' && isElven) {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
            if (langInfo.language === 'celestial' && pClass === 'wizard') {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
            if (langInfo.language === 'dwarvish' && isDwarven) {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
            if (langInfo.language === 'infernal' && isWitch) {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
        }

        // Active party companion translation check
        if (this.scene && this.scene.partyMembers) {
            for (const member of this.scene.partyMembers) {
                const companionClass = member.classId || member.spriteKey;
                const name = member.npcName || 'your Companion';
                const isElvenComp = companionClass === 'ranger' || (companionClass && companionClass.startsWith('elven_'));
                const isDwarvenComp = companionClass === 'knight' || (companionClass && companionClass.startsWith('dwarf_'));
                const isWitchComp = companionClass === 'witch' || (companionClass && companionClass.startsWith('witch_'));
                
                if (langInfo.language === 'elvish' && isElvenComp) {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
                if (langInfo.language === 'celestial' && companionClass === 'wizard') {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
                if (langInfo.language === 'dwarvish' && isDwarvenComp) {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
                if (langInfo.language === 'infernal' && isWitchComp) {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
            }
        }

        return { understands: false, translator: null, language: langInfo.language, dialect: langInfo.dialect };
    }

    checkLuckOverride() {
        if (!this.player || this.player.luck === undefined) return false;
        if (this._luckOverride !== undefined) {
            return this._luckOverride;
        }
        this._luckOverride = Math.random() * 100 < this.player.luck;
        if (this._luckOverride) {
            console.log(`[Luck Override] Player luck of ${this.player.luck} successfully bypassed NPC barriers!`);
        }
        return this._luckOverride;
    }

    getGameState() {
        return window.NPCCampaignHelper.getGameState(this);
    }

    getPoliticalContext() {
        return window.NPCCampaignHelper.getPoliticalContext(this);
    }

    _checkDeliveryQuestCompletion() {
        window.NPCCampaignHelper.checkDeliveryQuestCompletion(this);
    }

    handleProposal() {
        window.NPCCampaignHelper.handleProposal(this);
    }

    handleSellIntel() {
        window.NPCCampaignHelper.handleSellIntel(this);
    }

    _addMarriageButton() {
        window.NPCCampaignHelper.addMarriageButton(this);
    }

    _addIntelButton() {
        window.NPCCampaignHelper.addIntelButton(this);
    }


    decreaseSocialScoreForIgnore(time) {
        this.approachingPlayer = false;
        if (this.scene.approachingNpc === this) {
            this.scene.approachingNpc = null;
        }
        this.playerIgnoreTimer = 0;
        this.approachCooldown = time + 120000; // 2 minutes NPC cooldown
        this.scene.globalApproachCooldown = time + 60000; // 1 minute town global cooldown
        
        // Halved decreases: social score -5, faction rep -2
        this.socialScore = Math.max(-100, this.socialScore - 5);
        if (saveData && saveData.npcRelations) {
            saveData.npcRelations[this.npcId] = this.socialScore;
        }
        
        if (this.faction && saveData && saveData.factionReputation) {
            if (saveData.factionReputation[this.faction] !== undefined) {
                saveData.factionReputation[this.faction] = Math.max(-1000, saveData.factionReputation[this.faction] - 2);
            }
        }
        
        const reacts = ["Hmph, how rude...", "Fine, ignore me then.", "Too busy for commoners?", "Typical adventurer..."];
        const react = reacts[Math.floor(Math.random() * reacts.length)];
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(this.sprite.x, this.sprite.y - 40, react, 0xff4444);
            this.scene.showFloatingText(this.player.sprite.x, this.player.sprite.y - 60, "Social Score -5 (Ignored Citizen)", 0xff4444);
        }
        
        // Auto-save
        if (this.player && typeof this.player.saveGame === 'function') {
            this.player.saveGame();
        }
    }

    destroy() {
        if (this.isChatOpen) this.closeChat();
        if (this.isShopOpen) this.closeShop();
        
        this.unregisterChatListeners();

        if (this.nameText) this.nameText.destroy();
        if (this.promptText) this.promptText.destroy();
        if (this.emojiSprite) this.emojiSprite.destroy();
        if (this.sprite) this.sprite.destroy();
        const index = this.scene.npcs.indexOf(this);
        if (index > -1) this.scene.npcs.splice(index, 1);
    }
}
window.NPCController = NPCController;
