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
        if (!window.saveData) window.saveData = {};
        if (!window.saveData.npcRelations) window.saveData.npcRelations = {};
        this.socialScore = window.saveData.npcRelations[this.npcId] || 0;

        // Load or assign persistent NPC alignment
        if (!window.saveData.npcAlignments) window.saveData.npcAlignments = {};
        if (!window.saveData.npcAlignments[this.npcId]) {
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
            window.saveData.npcAlignments[this.npcId] = alignment;
        }
        this.alignment = window.saveData.npcAlignments[this.npcId];
        
        // Load or assign persistent NPC personality
        if (!window.saveData.npcPersonalities) window.saveData.npcPersonalities = {};
        if (!window.saveData.npcPersonalities[this.npcId]) {
            const choices = ['chatty', 'wise', 'gruff', 'greedy', 'timid'];
            window.saveData.npcPersonalities[this.npcId] = choices[Math.floor(Math.random() * choices.length)];
        }
        this.personality = window.saveData.npcPersonalities[this.npcId];
        
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
                
                const res = originalSetFrame.call(this, frame, updateSize, updateArea);
                
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
                    
                    const res = originalSetCurrentFrame.call(this, parentFrame);
                    
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
                
                animConfig = {
                    key: idleKey,
                    frames: this.scene.anims.generateFrameNumbers(spriteKey, config),
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
                elven_spellblade_rival: { start: 9, end: 17 }
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
                
                this.scene.anims.create({
                    key: walkKey,
                    frames: this.scene.anims.generateFrameNumbers(spriteKey, config),
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
        
        // Adjust sprite Y immediately to prevent body.position.y from jumping in preUpdate
        this.sprite.y += scale * (0.5 * (fh - oldH) - (newOffset - oldOffset));
        
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

        // Calculate distance to player
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.player.sprite.x, this.player.sprite.y
        );

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

        if (distanceToPlayer < interactDistance) {
            let statueCloser = false;
            const scene = this.scene;
            const dirUi = document.getElementById('ui-town-directory');
            const isDirOpen = dirUi && window.getComputedStyle(dirUi).display !== 'none';

            if (scene.angelStatue && scene.angelStatue.active && !scene.isIndoors && !isDirOpen) {
                const distToStatue = Phaser.Math.Distance.Between(
                    scene.angelStatue.x, scene.angelStatue.y,
                    this.player.sprite.x, this.player.sprite.y
                );
                if (distToStatue < 100 && distToStatue < distanceToPlayer) {
                    statueCloser = true;
                }
            }

            if (!statueCloser && !isDirOpen) {
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

        // Handle NPC Wandering if they are not talking to the player
        const isStaticNPC = false; // Allow all NPCs to wander
        if (!this.isChatOpen && !this.isShopOpen && !isStaticNPC) {
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

        const isMismatched = (this.alignment === 'Good' && this.player.alignment <= -40) ||
                             (this.alignment === 'Evil' && this.player.alignment >= 40);

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
        if (this.factionRank === 'leader' && window.saveData && window.saveData.discoveredKingdoms) {
            const hasUnsoldIntel = Object.keys(window.saveData.discoveredKingdoms).some(kId => {
                const soldList = (window.saveData.soldIntel && window.saveData.soldIntel[this.faction]) || [];
                return !soldList.includes(kId);
            });
            if (hasUnsoldIntel) {
                this._addIntelButton();
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
    }

    getFactionEmblemSrc() {
        if (!this.faction) return null;
        
        // Find ruling kingdom for this faction
        let kingdomId = null;
        if (window.WORLD_FACTIONS && window.WORLD_FACTIONS[this.faction]) {
            kingdomId = window.WORLD_FACTIONS[this.faction].kingdom;
        } else if (window.saveData && window.saveData.discoveredKingdoms) {
            // Check dynamic kingdoms
            for (const kId in window.saveData.discoveredKingdoms) {
                const k = window.saveData.discoveredKingdoms[kId];
                if (k.rulingFaction === this.faction) {
                    kingdomId = kId;
                    break;
                }
            }
        }

        return window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kingdomId) : null;
    }

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
            const currentZone = (window.saveData && window.saveData.currentZone) || 0;
            const playerLevel = (window.saveData && window.saveData.level) || 1;

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
                
                let targets = biomeEnemies[currentBiome] || ['slime', 'bat', 'spider', 'goblin', 'bandit'];
                const absZone = Math.abs(currentZone);
                if (playerLevel >= 15 || absZone >= 15) {
                    targets = targets.concat(['dragon', 'lich_lord', 'the_devil', 'frost_giant']);
                }
                
                this.pendingQuestTarget = targets[Math.floor(Math.random() * targets.length)];
                prompt = `The player is interacting with the bounty board. You are granting them a contract to hunt 3 ${this.pendingQuestTarget}s in the wilderness. Roleplay handing them the bounty parchment and wishing them luck or giving a tip. You MUST include the exact string [ACTION_SUCCESS] at the end of your response to formally grant the quest. Do not wait for the player to reply.`;
            } else if (questRoll < 0.80) {
                this.pendingQuestType = 'rescue';
                
                const maleNames = ['Aldric', 'Theron', 'Cedric', 'Rowan', 'Gareth', 'Eldon', 'Bram', 'Osric', 'Leif', 'Darian'];
                const femaleNames = ['Lyra', 'Mira', 'Seraphina', 'Isolde', 'Rowena', 'Brynn', 'Astrid', 'Elowen', 'Calista', 'Thea'];
                this.pendingQuestGender = Math.random() < 0.5 ? 'male' : 'female';
                const namePool = this.pendingQuestGender === 'male' ? maleNames : femaleNames;
                this.pendingQuestName = namePool[Math.floor(Math.random() * namePool.length)];
                
                // Target a nearby dangerous zone (1-3 zones away from current, NOT a town)
                let targetZone = currentZone + (Math.random() < 0.5 ? 1 : -1) * Phaser.Math.Between(1, 3);
                // Make sure it's not a town zone (towns are at multiples of 4)
                while (Math.abs(targetZone) % 4 === 0) {
                    targetZone += (targetZone >= 0 ? 1 : -1);
                }
                this.pendingQuestZone = targetZone;
                
                prompt = `The player is interacting with the bounty board. You are granting them a contract to rescue ${this.pendingQuestName} who is held captive by enemies in Zone ${this.pendingQuestZone}. Roleplay describing the dire situation of this captive and asking the player to bring them back safely. You MUST include the exact string [ACTION_SUCCESS] at the end of your response to formally grant the quest. Do not wait for the player to reply.`;
            } else {
                this.pendingQuestType = 'delivery';
                
                const items = ['Ancient Scroll', 'Sacred Relic', 'Healing Herbs', 'Royal Decree', 'Enchanted Gem', 'Trade Goods', 'Sealed Letter', 'Rare Ore'];
                const npcTargets = ['Elder', 'Master Smith', 'Apothecary', 'Sage'];
                this.pendingQuestItem = items[Math.floor(Math.random() * items.length)];
                this.pendingQuestTargetNPC = npcTargets[Math.floor(Math.random() * npcTargets.length)];
                
                // Target the next town (towns every 4 zones)
                let targetTownZone = currentZone + (Math.random() < 0.5 ? 4 : -4);
                if (targetTownZone === currentZone) {
                    targetTownZone += 4;
                }
                this.pendingQuestZone = targetTownZone;
                
                prompt = `The player is interacting with the bounty board. You are granting them a contract to deliver a ${this.pendingQuestItem} to the ${this.pendingQuestTargetNPC} in Zone ${this.pendingQuestZone}. Roleplay handing them the package and telling them where and who it needs to go to. You MUST include the exact string [ACTION_SUCCESS] at the end of your response to formally grant the quest. Do not wait for the player to reply.`;
            }
        }

        if (!prompt) return;

        this.addMessageToUI("System", "Activity Started! Wait for the NPC's response...");
        this.chatInput.disabled = true;
        this.chatSubmitBtn.disabled = true;
        this.chatActivityBtn.disabled = true;

        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(this.npcName, "...", loadingId);

        const state = this.getGameState();

        this.geminiService.getNpcResponse(this.persona, this.chatHistory, `[SYSTEM ACTIVITY TRIGGER] ${prompt}`, state)
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
                this.chatHistory.push({ sender: this.npcName, text: cleanReply });
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
            if (!this.scene.anims.exists('training_dummy-idle')) {
                this.scene.anims.create({ key: 'training_dummy-idle', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 0, end: 8 }), frameRate: 8, repeat: -1 });
                this.scene.anims.create({ key: 'training_dummy-hit', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 9, end: 13 }), frameRate: 12, repeat: 0 });
                this.scene.anims.create({ key: 'training_dummy-die', frames: this.scene.anims.generateFrameNumbers('training_dummy', { start: 9, end: 13 }), frameRate: 12, repeat: 0 });
            }
            if (EnemyController) {
                // Spawn at Y=500 so the 128px tall sprite's bottom edge starts above the Y=700 floor
                const dummy = new EnemyController(this.scene, 600, 500, this.player, this.geminiService, 'training_dummy');
                dummy.maxHp = 999999;
                dummy.hp = 999999;
                dummy.stats = { hp: 999999, maxHp: 999999, atk: 0, def: 5, spd: 0, xp: 50 }; // High HP for training
                dummy.isDummy = true;
                dummy.isHit = false;
                dummy.sprite.setScale(0.8);
                if (this.scene.enemies && this.scene.enemies.add) this.scene.enemies.add(dummy.sprite);
                if (this.scene.isIndoors && this.scene.indoorFloor) {
                    this.scene.physics.add.collider(dummy.sprite, this.scene.indoorFloor);
                } else {
                    this.scene.physics.add.collider(dummy.sprite, this.scene.platforms);
                }
                if (this.scene.showFloatingText) this.scene.showFloatingText(this.player.sprite.x, this.player.sprite.y - 50, "Training Dummy Spawned!", 0xffff00);
            }
            return;
        }

        if (this.indoorAction === 'arena') {
            this.closeChat();
            if (this.scene.arenaManager) {
                this.scene.arenaManager.startWave();
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
                const currentZone = (window.saveData && window.saveData.currentZone) || 0;
                const localFaction = window.getFactionForZone ? window.getFactionForZone(currentZone) : null;
                const factionId = localFaction ? localFaction.id : null;

                if (this.pendingQuestType === 'kill' && this.pendingQuestTarget) {
                    // KILL QUEST
                    const quest = {
                        id: `bounty_${Date.now()}`,
                        type: 'kill',
                        title: `Hunt ${this.pendingQuestTarget}s`,
                        description: `Slay 3 ${this.pendingQuestTarget}s in the wilderness.`,
                        targetType: this.pendingQuestTarget,
                        targetCount: 3,
                        currentCount: 0,
                        rewardGold: 100,
                        rewardXP: 75,
                        factionId: factionId
                    };
                    this.player.addQuest(quest);
                    rewardText = `Quest Accepted: Hunt 3 ${this.pendingQuestTarget}s!`;
                } else if (this.pendingQuestType === 'rescue' && this.pendingQuestName) {
                    // RESCUE QUEST
                    const quest = {
                        id: `rescue_${Date.now()}`,
                        type: 'rescue',
                        title: `Rescue ${this.pendingQuestName}`,
                        description: `Clear all enemies in zone ${this.pendingQuestZone} and escort ${this.pendingQuestName} back to a town.`,
                        targetCount: 1,
                        currentCount: 0,
                        rescueeName: this.pendingQuestName,
                        rescueeGender: this.pendingQuestGender,
                        rescueeZone: this.pendingQuestZone,
                        rescueState: 'captive',
                        rewardGold: 150,
                        rewardXP: 120,
                        factionId: factionId
                    };
                    this.player.addQuest(quest);
                    rewardText = `Rescue Quest: Save ${this.pendingQuestName} in Zone ${this.pendingQuestZone}!`;
                } else if (this.pendingQuestType === 'delivery' && this.pendingQuestItem) {
                    // DELIVERY QUEST
                    const quest = {
                        id: `delivery_${Date.now()}`,
                        type: 'delivery',
                        title: `Deliver ${this.pendingQuestItem}`,
                        description: `Bring the ${this.pendingQuestItem} to the ${this.pendingQuestTargetNPC} in zone ${this.pendingQuestZone}.`,
                        targetCount: 1,
                        currentCount: 0,
                        deliveryItem: this.pendingQuestItem,
                        deliveryTargetZone: this.pendingQuestZone,
                        deliveryTargetNPC: this.pendingQuestTargetNPC,
                        deliveryPickedUp: true,
                        rewardGold: 120,
                        rewardXP: 80,
                        factionId: factionId
                    };
                    this.player.addQuest(quest);
                    rewardText = `Delivery Quest: Bring ${this.pendingQuestItem} to zone ${this.pendingQuestZone}!`;
                }
                break;
            case 'pray':
                // Heal to full HP for 25 gold
                const healCost = 25;
                let didHeal = false;
                if (this.player.gold >= healCost) {
                    this.player.gold -= healCost;
                    this.player.hp = this.player.maxHp;
                    this.player.mp = this.player.maxMp;
                    didHeal = true;
                }
                // Also give +1 to a random stat as a blessing
                const stats = ['vit', 'str', 'dex', 'int'];
                const randomStat = stats[Math.floor(Math.random() * stats.length)];
                if (this.player.classData && this.player.classData.stats) {
                    this.player.classData.stats[randomStat]++;
                    this.player.recalculateStats();
                }
                if (this.scene && this.scene.updateHUD) this.scene.updateHUD();
                if (didHeal) {
                    rewardText = `Healed & Blessed (+1 ${randomStat.toUpperCase()})! -${healCost}g`;
                } else {
                    rewardText = `Blessing (+1 ${randomStat.toUpperCase()})! Need ${healCost}g for healing`;
                }
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
            if (this.scene.showFloatingText) this.scene.showFloatingText(this.player.sprite.x, this.player.sprite.y - 50, rewardText, 0x00ff00);
        }
    }

    async handlePlayerMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        // Personality behavior overrides (Phase 13)
        const hasActiveQuests = this.player.quests && this.player.quests.length > 0;
        if (hasActiveQuests && this.personality !== 'chatty' && Math.random() < 0.35) {
            let scoldReply = "";
            let emojiKey = "emoji_neutral";
            if (this.personality === 'wise') {
                scoldReply = "Why are you standing here speaking loosely, youngster? You have duties to fulfill! Go tend to your active quests and return when they are done.";
                emojiKey = "emoji_angry";
                this.socialScore = Math.max(-100, this.socialScore - 1);
            } else if (this.personality === 'gruff') {
                scoldReply = "Stop wasting breath. Get back to your task.";
                emojiKey = "emoji_neutral";
            } else if (this.personality === 'greedy') {
                scoldReply = "Time is gold, wanderer. Unless you have completed your task or seek to pay me, move along.";
                emojiKey = "emoji_sad";
            } else if (this.personality === 'timid') {
                scoldReply = "Oh! P-please... shouldn't you be focusing on your active quest? It sounds so frightfully dangerous...";
                emojiKey = "emoji_sad";
            }

            if (scoldReply) {
                this.addMessageToUI("Player", text);
                this.chatInput.value = "";
                const loadingId = "loading-" + Date.now();
                this.addMessageToUI(this.npcName, "...", loadingId);
                
                this.scene.time.delayedCall(600, () => {
                    const loadingElement = document.getElementById(loadingId);
                    if (loadingElement) loadingElement.remove();
                    this.addMessageToUI(this.npcName, scoldReply);
                    this.chatHistory.push({ sender: "Player", text: text });
                    this.chatHistory.push({ sender: this.npcName, text: scoldReply });
                    this.playEmoji(emojiKey);
                    
                    this.chatInput.disabled = false;
                    this.chatSubmitBtn.disabled = false;
                    if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                    if (this.chatInput) this.chatInput.focus();
                });
                return;
            }
        }

        if (this.personality === 'wise' && text.length < 12 && !text.includes('*')) {
            const scoldReply = "Watch your manner of speech, child! Speak with proper gravity and respect, or do not speak to me at all.";
            this.addMessageToUI("Player", text);
            this.chatInput.value = "";
            const loadingId = "loading-" + Date.now();
            this.addMessageToUI(this.npcName, "...", loadingId);
            
            this.scene.time.delayedCall(600, () => {
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) loadingElement.remove();
                this.addMessageToUI(this.npcName, scoldReply);
                this.chatHistory.push({ sender: "Player", text: text });
                this.chatHistory.push({ sender: this.npcName, text: scoldReply });
                this.playEmoji("emoji_angry");
                this.socialScore = Math.max(-100, this.socialScore - 1);
                
                this.chatInput.disabled = false;
                this.chatSubmitBtn.disabled = false;
                if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                if (this.chatInput) this.chatInput.focus();
            });
            return;
        }

        // Parse and execute *roleplay actions* typed with asterisks e.g. *give 500 gold*
        const roleplayResult = this._parseAndExecuteRoleplayAction(text);
        let actionContext = '';
        if (roleplayResult) {
            if (!roleplayResult.success) {
                // Can't execute (e.g. not enough gold) — show feedback and abort
                this.addMessageToUI('System', `<span style="color:#ff8800">${roleplayResult.reason}</span>`);
                this.chatInput.disabled = false;
                this.chatSubmitBtn.disabled = false;
                if (this.chatActivityBtn) this.chatActivityBtn.disabled = false;
                return;
            }
            actionContext = roleplayResult.contextNote;
            // Update HUD to reflect any gold changes immediately
            if (this.scene.updateHUD) this.scene.updateHUD();
        }

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

        const state = this.getGameState();

        // 3. Ask Gemini
        const response = await this.geminiService.getNpcResponse(this.persona, this.chatHistory, text, state, actionContext);
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

        // 5. Apply Alignment Shift & Social Score
        if (response.alignmentShift !== 0) {
            this.player.updateAlignment(response.alignmentShift);
            
            // Show a visual notification
            const sign = response.alignmentShift > 0 ? "+" : "";
            const color = response.alignmentShift > 0 ? "#00ff00" : "#ff0000";
            this.addMessageToUI("System", `<span style="color:${color}">Alignment Shifted: ${sign}${response.alignmentShift}</span>`);
        }
        
        if (response.socialShift && typeof response.socialShift === 'number' && response.socialShift !== 0) {
            this.socialScore += response.socialShift;
            // Cap it between -100 and 100
            this.socialScore = Math.max(-100, Math.min(100, this.socialScore));
            
            // Save it
            window.saveData.npcRelations[this.npcId] = this.socialScore;
            
            // Update UI/Emoji
            this.updateEmojiDisplay();
            
            const sign = response.socialShift > 0 ? "+" : "";
            const color = response.socialShift > 0 ? "#ff69b4" : "#8b0000";
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
            if (this.socialScore >= 100 && !document.getElementById('chat-propose') && (!window.saveData || !window.saveData.spouseData)) {
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
    }

    _parseAndExecuteRoleplayAction(text) {
        // Only parse if the entire message is an *action*
        const match = text.match(/^\*(.+)\*$/);
        if (!match) return null; // Normal chat message, no action
        
        const action = match[1].trim().toLowerCase();
        
        // Give gold: *give 500 gold* or *give gold 500*
        const giveGoldMatch = action.match(/give\s+(\d+)\s*gold/) || action.match(/give\s+gold\s+(\d+)/);
        if (giveGoldMatch) {
            const amount = parseInt(giveGoldMatch[1]);
            if (!this.player.gold || this.player.gold < amount) {
                return { success: false, reason: `You don't have enough gold. (Have: ${Math.floor(this.player.gold || 0)} gold)` };
            }
            this.player.gold -= amount;
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
    }

    removeFromWorld() {
        if (window.saveData && window.saveData.zones && window.saveData.currentZone !== undefined) {
            const currentZone = window.saveData.currentZone;
            const zoneData = window.saveData.zones[currentZone];
            if (zoneData) {
                if (zoneData.npcs) {
                    zoneData.npcs = zoneData.npcs.filter(n => n.name !== this.npcName);
                }
                if (zoneData.ambientNpcs) {
                    zoneData.ambientNpcs = zoneData.ambientNpcs.filter(n => n.name !== this.npcName);
                }
                
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
        const zoneIdx = (window.saveData && window.saveData.currentZone) || 0;
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
        const known = (window.saveData && window.saveData.knownLanguages) || ['common'];
        
        if (known.includes(langInfo.language)) {
            return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
        }

        // Check if player themselves can translate/understand it based on their class
        const player = this.player;
        if (player && player.classData) {
            const pClass = player.classData.id;
            if (langInfo.language === 'elvish' && (pClass === 'ranger' || pClass === 'elven_spellblade' || pClass === 'elven_spellblade_rival')) {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
            if (langInfo.language === 'celestial' && pClass === 'wizard') {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
            if (langInfo.language === 'dwarvish' && pClass === 'knight') {
                return { understands: true, translator: null, language: langInfo.language, dialect: langInfo.dialect };
            }
        }

        // Active party companion translation check
        if (this.scene && this.scene.partyMembers) {
            for (const member of this.scene.partyMembers) {
                const companionClass = member.classId || member.spriteKey;
                const name = member.npcName || 'your Companion';
                if (langInfo.language === 'elvish' && companionClass === 'ranger') {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
                if (langInfo.language === 'celestial' && companionClass === 'wizard') {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
                if (langInfo.language === 'dwarvish' && companionClass === 'knight') {
                    return { understands: true, translator: name, language: langInfo.language, dialect: langInfo.dialect };
                }
            }
        }

        return { understands: false, translator: null, language: langInfo.language, dialect: langInfo.dialect };
    }

    getGameState() {
        const wm = this.scene.worldManager;
        const p = this.player;
        return {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome } : null,
            weather: this.scene.weatherManager ? this.scene.weatherManager.currentWeather : 'clear',
            player: {
                level: p.level || (window.saveData && window.saveData.level) || 1,
                class: p.classData ? p.classData.id : "adventurer",
                hp: `${p.hp}/${p.maxHp}`,
                gold: p.inventory ? p.inventory.gold : 0,
                alignment: p.alignment || 0,
                isSavior: (window.saveData && window.saveData.isSavior) || false,
                inventory: p.inventory,
                quests: p.quests,
                coliseumReputation: p.coliseumReputation || 0
            },
            npc: {
                alignment: this.alignment,
                socialScore: this.socialScore,
                isMismatched: (this.alignment === 'Good' && p.alignment <= -40) || (this.alignment === 'Evil' && p.alignment >= 40),
                faction: this.faction,
                factionRank: this.factionRank,
                politicalTitle: this.politicalTitle,
                personality: this.personality,
                languageInfo: this.getLanguageInfo(),
                playerUnderstandsLanguage: this.checkPlayerUnderstanding().understands
            },
            politicalContext: this.getPoliticalContext()
        };
    }

    getPoliticalContext() {
        const zoneIdx = (window.saveData && window.saveData.currentZone) || 0;
        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIdx) : null;
        const rulingFaction = window.getFactionForZone ? window.getFactionForZone(zoneIdx) : null;
        
        let npcFactionData = null;
        let npcFactionRep = 0;
        if (this.faction && window.WORLD_FACTIONS && window.WORLD_FACTIONS[this.faction]) {
            npcFactionData = window.WORLD_FACTIONS[this.faction];
            npcFactionRep = window.getFactionReputation ? window.getFactionReputation(this.faction) : 0;
        }

        let rulingFactionRep = 0;
        if (rulingFaction) {
            rulingFactionRep = window.getFactionReputation ? window.getFactionReputation(rulingFaction.id) : 0;
        }

        // Gather ruling faction relations
        const relations = {};
        if (rulingFaction && rulingFaction.relations) {
            for (const fId in rulingFaction.relations) {
                const score = rulingFaction.relations[fId];
                const otherFactionName = window.WORLD_FACTIONS[fId] ? window.WORLD_FACTIONS[fId].name : fId;
                relations[otherFactionName] = score;
            }
        }

        // Discovered frontier kingdoms
        const discovered = [];
        if (window.saveData && window.saveData.discoveredKingdoms) {
            for (const kId in window.saveData.discoveredKingdoms) {
                discovered.push(window.saveData.discoveredKingdoms[kId].name);
            }
        }

        return {
            kingdom: kingdom ? kingdom.name : "Frontier",
            rulingFaction: rulingFaction ? { name: rulingFaction.name, alignment: rulingFaction.alignment } : null,
            rulingFactionReputation: rulingFactionRep,
            npcFaction: npcFactionData ? { name: npcFactionData.name, alignment: npcFactionData.alignment } : null,
            npcFactionReputation: npcFactionRep,
            rulingFactionRelations: relations,
            discoveredFrontierKingdoms: discovered
        };
    }

    async triggerHiddenPrompt(hiddenPrompt, displayName) {
        const loadingId = "loading-" + Date.now();
        this.addMessageToUI(displayName, "...", loadingId);

        const state = this.getGameState();
        
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
            this.addMessageToUI(displayName, "Greetings.");
        }

        if (this.chatInput) this.chatInput.disabled = false;
        if (this.chatSubmitBtn) this.chatSubmitBtn.disabled = false;
        if (this.chatInput) this.chatInput.focus();
    }

    _checkDeliveryQuestCompletion() {
        if (!this.player || !this.player.quests) return;
        const currentZone = (window.saveData && window.saveData.currentZone) || 0;
        
        for (const quest of this.player.quests) {
            // Standard Delivery
            if (quest.type === 'delivery' && 
                quest.deliveryPickedUp === true && 
                quest.deliveryTargetZone === currentZone) {
                if (this.player.progressQuest) {
                    this.player.progressQuest('delivery_complete', quest.id);
                }
                if (this.scene && this.scene.showFloatingText) {
                    this.scene.showFloatingText(
                        this.sprite.x, this.sprite.y - 60,
                        `📦 ${quest.deliveryItem} Delivered!`, 0x44ff44
                    );
                }
                break;
            }
            
            // Diplomacy Treaty Delivery
            if (quest.type === 'diplomacy' && quest.targetRuler === this.npcName) {
                if (this.player.progressQuest) {
                    this.player.progressQuest('diplomacy_complete', quest.id);
                }
                if (this.scene && this.scene.showFloatingText) {
                    this.scene.showFloatingText(
                        this.sprite.x, this.sprite.y - 60,
                        `📜 Treaty Delivered to ${this.npcName}!`, 0x44ff44
                    );
                }
                break;
            }
            
            // Intel Report Delivery
            if (quest.type === 'intel_report') {
                const isLeaderOrOfficer = this.factionRank === 'leader' || this.factionRank === 'officer';
                if (isLeaderOrOfficer) {
                    if (this.player.progressQuest) {
                        this.player.progressQuest('intel_report_complete', quest.id);
                    }
                    if (this.scene && this.scene.showFloatingText) {
                        this.scene.showFloatingText(
                            this.sprite.x, this.sprite.y - 60,
                            `🗺️ Frontier Intel Delivered!`, 0x44ff44
                        );
                    }
                    break;
                }
            }
        }
    }

    _addMarriageButton() {
        if (document.getElementById('chat-propose')) return;
        
        const container = document.getElementById('chat-input-container');
        if (!container) return;
        
        const button = document.createElement('button');
        button.id = 'chat-propose';
        button.innerText = '💍 Propose Marriage';
        button.style.backgroundColor = '#ec4899';
        button.style.color = '#ffffff';
        button.style.marginLeft = '5px';
        button.style.fontWeight = 'bold';
        button.style.border = '1px solid #db2777';
        button.style.borderRadius = '4px';
        button.style.padding = '0 12px';
        button.style.cursor = 'pointer';
        
        container.appendChild(button);
        
        button.onclick = () => {
            this.handleProposal();
        };
    }

    handleProposal() {
        if (window.saveData && window.saveData.spouseData) {
            this.addMessageToUI("System", `<span style="color:#ff4444">You are already married to ${window.saveData.spouseData.name}!</span>`);
            return;
        }

        const isLeader = this.factionRank === 'leader';
        const rep = this.faction && window.getFactionReputation ? window.getFactionReputation(this.faction) : 0;
        
        if (isLeader && rep < 75) {
            this.addMessageToUI(this.npcName, "A member of the royalty cannot marry outside their rank without high political standing. Earn the trust of my kingdom first.");
            return;
        }

        // Close proposal button immediately
        const btn = document.getElementById('chat-propose');
        if (btn) btn.remove();

        this.closeChat();

        // Wedding cutscene lines
        const dialogue = [
            {
                speaker: "Narrator",
                text: `The grand cathedral bells begin to ring, echoing across the land in celebration of a historic union.`
            },
            {
                speaker: this.npcName,
                portrait: this.spriteKey,
                side: 'right',
                text: `I do. In times of battle and peace, I bind my soul to yours. Together, we shall face whatever comes next.`
            },
            {
                speaker: "Narrator",
                text: `The priest raises his hands, blessing the bond. With vows sealed and rings exchanged, the ceremony concludes.`
            }
        ];

        if (this.scene.cutsceneController) {
            this.scene.cutsceneController.playCutscene(dialogue, () => {
                // Save spouse data
                window.saveData.spouseData = {
                    name: this.npcName,
                    spriteKey: this.spriteKey,
                    faction: this.faction || null
                };
                
                // Persist
                if (this.player && this.player._persistToLocalStorage) {
                    this.player._persistToLocalStorage();
                }

                // Visual celebrations
                if (this.scene.showFloatingText && this.player && this.player.sprite && this.player.sprite.active) {
                    this.scene.showFloatingText(
                        this.player.sprite.x, this.player.sprite.y - 80,
                        `💍 Married to ${this.npcName}!`, 0xec4899
                    );
                }
            });
        }
    }

    _addIntelButton() {
        if (document.getElementById('chat-sell-intel')) return;
        
        const container = document.getElementById('chat-input-container');
        if (!container) return;
        
        const button = document.createElement('button');
        button.id = 'chat-sell-intel';
        button.innerText = '🗺️ Sell Frontier Intel';
        button.style.backgroundColor = '#10b981';
        button.style.color = '#ffffff';
        button.style.marginLeft = '5px';
        button.style.fontWeight = 'bold';
        button.style.border = '1px solid #059669';
        button.style.borderRadius = '4px';
        button.style.padding = '0 12px';
        button.style.cursor = 'pointer';
        
        container.appendChild(button);
        
        button.onclick = () => {
            this.handleSellIntel();
        };
    }

    handleSellIntel() {
        if (!window.saveData || !window.saveData.discoveredKingdoms) return;
        
        const unsoldKingdom = Object.values(window.saveData.discoveredKingdoms).find(k => {
            const soldList = (window.saveData.soldIntel && window.saveData.soldIntel[this.faction]) || [];
            return !soldList.includes(k.id);
        });
        
        if (!unsoldKingdom) return;
        
        // Save sold state
        window.saveData.soldIntel = window.saveData.soldIntel || {};
        window.saveData.soldIntel[this.faction] = window.saveData.soldIntel[this.faction] || [];
        window.saveData.soldIntel[this.faction].push(unsoldKingdom.id);
        
        // Reward
        const rewardGold = 250;
        const rewardRep = 15;
        window.saveData.gold += rewardGold;
        
        const goldDisplay = document.getElementById('hud-gold');
        if (goldDisplay) goldDisplay.innerText = `Gold: ${window.saveData.gold}`;
        
        if (window.changeFactionReputation) {
            window.changeFactionReputation(this.faction, rewardRep, true);
        }
        
        // Persist
        if (this.player && this.player._persistToLocalStorage) {
            this.player._persistToLocalStorage();
        }
        
        const btn = document.getElementById('chat-sell-intel');
        if (btn) btn.remove();
        
        this.closeChat();
        
        const dialogue = [
            {
                speaker: "Narrator",
                text: `You present the map and findings of the procedural frontier kingdom of ${unsoldKingdom.name} to the court.`
            },
            {
                speaker: `${this.politicalTitle} ${this.npcName}`,
                portrait: this.spriteKey,
                side: 'right',
                text: `This map is of incredible importance to the ${window.WORLD_FACTIONS[this.faction].name}. Knowing who holds the lands beyond is a massive advantage. Take this gold reward for your discovery.`
            }
        ];
        
        if (this.scene.cutsceneController) {
            this.scene.cutsceneController.playCutscene(dialogue, () => {
                if (this.scene.showFloatingText && this.player && this.player.sprite && this.player.sprite.active) {
                    this.scene.showFloatingText(
                        this.player.sprite.x, this.player.sprite.y - 80,
                        `🗺️ Intel Sold: +250g, +15 rep!`, 0x10b981
                    );
                }
            });
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
