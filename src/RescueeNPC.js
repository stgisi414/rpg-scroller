// RescueeNPC.js - Rescuee NPC game object for escort/rescue quests

class RescueeNPC {
    /**
     * @param {Phaser.Scene} scene - The game scene
     * @param {number} x - Spawn X position
     * @param {number} y - Spawn Y position
     * @param {string} textureKey - The composite spritesheet texture key
     * @param {Object} rescueeData - { name, gender, questId, config }
     */
    constructor(scene, x, y, textureKey, rescueeData) {
        this.scene = scene;
        this.textureKey = textureKey;
        this.name = rescueeData.name;
        this.gender = rescueeData.gender || 'male';
        this.questId = rescueeData.questId;
        this.rescueeData = rescueeData;
        this.state = 'captive'; // captive | following | rescued

        // Interaction debounce
        this._interactCooldown = 0;

        // --- Register animations for this texture ---
        this._registerAnimations();

        // --- Create the physics sprite ---
        this.sprite = this.scene.physics.add.sprite(x, y, textureKey);
        this.sprite.setScale(1.5);
        this.sprite.setDepth(1);
        this.sprite.setCollideWorldBounds(true);
        
        // Physics body: 36w × 48h, offset centered dynamically using measured foot data
        const frameW = (this.sprite.frame && this.sprite.frame.width) ? this.sprite.frame.width : 80;
        const frameH = (this.sprite.frame && this.sprite.frame.height) ? this.sprite.frame.height : 64;
        const bodyW = 36;
        const bodyH = 48;
        
        let footY = frameH;
        const fd = window.npcFootData && window.npcFootData[this.textureKey];
        if (fd && fd[0] != null) {
            footY = fd[0] + 1;
        }
        const offsetX = (frameW - bodyW) / 2;
        const offsetY = footY - bodyH;
        this.sprite.body.setSize(bodyW, bodyH);
        this.sprite.body.setOffset(offsetX, offsetY);
        if (this.sprite.refreshBody) {
            this.sprite.refreshBody();
        }

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

        // Add collider with scene platforms
        if (this.scene.platforms) {
            this.platformCollider = this.scene.physics.add.collider(this.sprite, this.scene.platforms);
        }

        // Play idle animation
        this.sprite.play(this.textureKey + '_idle');

        // Dynamic initial positions for floating text
        const initialScale = 1.5;
        const initialTopOfHeadY = y - (frameH * initialScale) / 2;

        // --- Floating name tag ---
        this.nameTag = this.scene.add.text(x, initialTopOfHeadY - 15, this.name, {
            fontSize: '11px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.nameTag.setOrigin(0.5);
        this.nameTag.setDepth(2);

        // --- Help / rescue prompt text ---
        this.helpText = this.scene.add.text(x, initialTopOfHeadY - 35, 'HELP ME!', {
            fontSize: '14px',
            fontStyle: 'bold',
            fill: '#ff4444',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.helpText.setOrigin(0.5);
        this.helpText.setDepth(10);

        // Pulse tween for help text
        this._helpPulseTween = this.scene.tweens.add({
            targets: this.helpText,
            alpha: { from: 0.5, to: 1.0 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // Track whether enemies are cleared (so we only transition prompt once)
        this._enemiesCleared = false;
        // Track whether the rescue prompt is showing
        this._rescuePromptShowing = false;
    }

    /**
     * Registers idle and walk animations for this rescuee's unique texture.
     * Checks window.npcAnimData for dynamically detected frame counts to avoid flashing/skipping.
     */
    _registerAnimations() {
        const idleKey = this.textureKey + '_idle';
        const walkKey = this.textureKey + '_walk';

        let idleStart = 0;
        let idleEnd = 4; // Col 0-4 (5 frames)
        let walkStart = 10; // Row 1 Col 0 (assuming 10-column layout)
        let walkEnd = 17; // Row 1 Col 7 (8 frames)

        const animData = window.npcAnimData && window.npcAnimData[this.textureKey];
        if (animData) {
            const rowStarts = animData.rowStarts;
            const rowNonEmptyCounts = animData.rowNonEmptyCounts;
            
            if (rowStarts && rowStarts[0] != null) {
                idleStart = rowStarts[0];
                const idleCount = Math.max(1, (rowNonEmptyCounts[0] || 5));
                idleEnd = idleStart + idleCount - 1;
            }
            if (rowStarts && rowStarts[1] != null) {
                walkStart = rowStarts[1];
                const walkCount = Math.max(1, (rowNonEmptyCounts[1] || 8));
                walkEnd = walkStart + walkCount - 1;
            }
        }

        if (!this.scene.anims.exists(idleKey)) {
            this.scene.anims.create({
                key: idleKey,
                frames: this.scene.anims.generateFrameNumbers(this.textureKey, { start: idleStart, end: idleEnd }),
                frameRate: 6,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists(walkKey)) {
            this.scene.anims.create({
                key: walkKey,
                frames: this.scene.anims.generateFrameNumbers(this.textureKey, { start: walkStart, end: walkEnd }),
                frameRate: 10,
                repeat: -1
            });
        }
    }

    /**
     * Adjusts the sprite's physics body offsets and Y position on frame changes
     * to keep the feet aligned perfectly with the ground.
     */
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
        const fd = window.npcFootData && window.npcFootData[this.textureKey];
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

    /**
     * Main update loop — called every frame from the scene.
     * @param {number} time - Current time in ms
     * @param {number} delta - Delta time since last frame in ms
     */
    update(time, delta) {
        if (this.state === 'rescued' || !this.sprite || !this.sprite.active) {
            return;
        }

        // Safety: if rescuee falls below the world, teleport back to player
        if (this.sprite.y > 700 && this.scene.player && this.scene.player.sprite) {
            this.sprite.setPosition(this.scene.player.sprite.x, this.scene.player.sprite.y - 20);
            this.sprite.setVelocity(0, 0);
            // Re-establish platform collider if lost
            if (!this.platformCollider && this.scene.platforms) {
                this.platformCollider = this.scene.physics.add.collider(this.sprite, this.scene.platforms);
            }
        }

        // Update text positions above sprite
        this._updateTextPositions();

        if (this.state === 'captive') {
            this._updateCaptive(time, delta);
        } else if (this.state === 'following') {
            this._updateFollowing(time, delta);
        }
    }

    /**
     * Updates floating text positions to track above the sprite.
     */
    _updateTextPositions() {
        if (!this.sprite) return;
        const scale = this.sprite.scaleY || 1.5;
        const frameH = (this.sprite.frame && this.sprite.frame.height) ? this.sprite.frame.height : 74;
        let topOfHeadY = this.sprite.y - (frameH * scale) / 2;
        if (this.sprite.body) {
            topOfHeadY = this.sprite.body.bottom - (frameH * scale);
        }

        if (this.nameTag) {
            this.nameTag.setPosition(this.sprite.x, topOfHeadY - 15);
        }
        if (this.helpText) {
            this.helpText.setPosition(this.sprite.x, topOfHeadY - 35);
        }
    }

    /**
     * Captive state logic:
     * - Play idle animation
     * - Pulse "HELP ME!" text
     * - Check if all enemies are dead → switch prompt to "Press 'F' to Rescue"
     * - Detect F key press when player is within 80px
     */
    _updateCaptive(time, delta) {
        // Ensure idle anim is playing
        const idleKey = this.textureKey + '_idle';
        if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== idleKey) {
            this.sprite.play(idleKey);
        }

        // Check if all enemies are dead
        if (!this._enemiesCleared) {
            const livingEnemies = this.scene.enemies
                ? this.scene.enemies.getChildren().filter(
                    e => e.active && e.controller && !e.controller.isDead
                ).length
                : 0;

            if (livingEnemies === 0) {
                this._enemiesCleared = true;
                this._showRescuePrompt();
            }
        }

        // If enemies cleared, check for F key interaction
        if (this._enemiesCleared && this.scene.player && this.scene.player.inputManager) {
            const playerSprite = this.scene.player.sprite;
            const dist = Phaser.Math.Distance.Between(
                playerSprite.x, playerSprite.y,
                this.sprite.x, this.sprite.y
            );

            if (dist <= 80) {
                // Check for F key press with debounce
                if (this.scene.player.inputManager.keys.interact.isDown && time > this._interactCooldown) {
                    this._interactCooldown = time + 500; // 500ms debounce
                    this.startFollowing();
                }
            }
        }
    }

    /**
     * Switches the help text to the rescue prompt.
     */
    _showRescuePrompt() {
        if (this._rescuePromptShowing) return;
        this._rescuePromptShowing = true;

        // Stop the pulsing tween
        if (this._helpPulseTween) {
            this._helpPulseTween.stop();
            this._helpPulseTween = null;
        }

        // Update help text to rescue prompt
        if (this.helpText) {
            this.helpText.setText("Press 'F' to Rescue");
            this.helpText.setStyle({
                fontSize: '14px',
                fontStyle: 'bold',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2
            });
            this.helpText.setAlpha(1);

            // Add a gentle pulse to the rescue prompt too
            this._helpPulseTween = this.scene.tweens.add({
                targets: this.helpText,
                alpha: { from: 0.7, to: 1.0 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }
    }

    /**
     * Following state logic:
     * - Target position: 80px behind the player
     * - Walk toward target when > 20px away, idle when close
     * - FlipX based on movement direction
     */
    _updateFollowing(time, delta) {
        if (!this.scene.player || !this.scene.player.sprite) return;

        const playerSprite = this.scene.player.sprite;
        const facingDir = this.scene.player.facingDirection || 1; // 1 = right, -1 = left

        // Target: 80px behind the player (opposite of facing direction)
        const targetX = playerSprite.x + (-facingDir * 80);
        const targetY = playerSprite.y;

        const dx = targetX - this.sprite.x;
        const dist = Math.abs(dx);

        const walkKey = this.textureKey + '_walk';
        const idleKey = this.textureKey + '_idle';

        if (dist > 20) {
            // Move toward target
            const moveSpeed = 120;
            const velX = dx > 0 ? moveSpeed : -moveSpeed;
            this.sprite.setVelocityX(velX);

            // Play walk animation
            if (!this.sprite.anims.currentAnim || this.sprite.anims.currentAnim.key !== walkKey) {
                this.sprite.play(walkKey);
            }

            // FlipX based on movement direction (moving right = no flip)
            this.sprite.setFlipX(dx < 0);
        } else {
            // Close enough — stop and idle
            this.sprite.setVelocityX(0);

            if (!this.sprite.anims.currentAnim || this.sprite.anims.currentAnim.key !== idleKey) {
                this.sprite.play(idleKey);
            }
        }
    }

    /**
     * Transitions the rescuee from captive to following state.
     */
    startFollowing() {
        if (this.state !== 'captive') return;

        this.state = 'following';

        // Remove help text
        if (this._helpPulseTween) {
            this._helpPulseTween.stop();
            this._helpPulseTween = null;
        }
        if (this.helpText) {
            this.helpText.destroy();
            this.helpText = null;
        }

        // Show a brief acknowledgement via floating text
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(
                this.sprite.x,
                this.sprite.y - 40,
                `${this.name} is following you!`,
                0x44ff44
            );
        }

        // Play idle initially (will switch to walk in update)
        this.sprite.play(this.textureKey + '_idle');
    }

    /**
     * Completes the rescue — shows floating text, fades out, and destroys.
     */
    completeRescue() {
        if (this.state === 'rescued') return;

        this.state = 'rescued';

        // Stop movement
        if (this.sprite && this.sprite.body) {
            this.sprite.setVelocityX(0);
            this.sprite.setVelocityY(0);
        }

        // Show floating rescue text
        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(
                this.sprite.x,
                this.sprite.y - 40,
                'Rescued!',
                0x00ff00
            );
        }

        // Fade out the sprite then destroy
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.destroy();
            }
        });

        // Also fade name tag
        if (this.nameTag) {
            this.scene.tweens.add({
                targets: this.nameTag,
                alpha: 0,
                duration: 1000
            });
        }
    }

    /**
     * Returns serializable data for save/load persistence.
     * @returns {Object} Save data including config for texture regeneration
     */
    getSaveData() {
        return {
            name: this.name,
            gender: this.gender,
            questId: this.questId,
            config: this.rescueeData.config,
            state: this.state,
            textureKey: this.textureKey,
            x: this.sprite ? this.sprite.x : 0,
            y: this.sprite ? this.sprite.y : 0
        };
    }

    /**
     * Recreates a RescueeNPC from saved data. Regenerates the composite texture
     * using the factory, then constructs a new RescueeNPC in the FOLLOWING state.
     * @param {Phaser.Scene} scene - The game scene
     * @param {Object} saveData - Data from getSaveData()
     * @param {RescueeNPCFactory} factory - Factory instance for texture regeneration
     * @returns {RescueeNPC} The recreated rescuee NPC
     */
    static fromSaveData(scene, saveData, factory) {
        // Regenerate the composite texture from config
        factory.regenerateTexture(saveData.config);

        // Build rescuee data
        const rescueeData = {
            name: saveData.name,
            gender: saveData.gender,
            questId: saveData.questId,
            config: saveData.config
        };

        // Spawn position (use saved position or default)
        const x = saveData.x || 100;
        const y = saveData.y || 500;

        // Create new RescueeNPC
        const rescuee = new RescueeNPC(scene, x, y, saveData.textureKey, rescueeData);

        // If the saved state was 'following', transition immediately
        if (saveData.state === 'following') {
            rescuee.state = 'following';

            // Clean up captive-state UI
            if (rescuee._helpPulseTween) {
                rescuee._helpPulseTween.stop();
                rescuee._helpPulseTween = null;
            }
            if (rescuee.helpText) {
                rescuee.helpText.destroy();
                rescuee.helpText = null;
            }
        }

        return rescuee;
    }

    /**
     * Cleans up all game objects owned by this rescuee.
     */
    destroy() {
        // Stop tweens
        if (this._helpPulseTween) {
            this._helpPulseTween.stop();
            this._helpPulseTween = null;
        }

        // Remove platform collider
        if (this.platformCollider) {
            this.scene.physics.world.removeCollider(this.platformCollider);
            this.platformCollider = null;
        }

        // Destroy texts
        if (this.helpText) {
            this.helpText.destroy();
            this.helpText = null;
        }
        if (this.nameTag) {
            this.nameTag.destroy();
            this.nameTag = null;
        }

        // Destroy sprite
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}

