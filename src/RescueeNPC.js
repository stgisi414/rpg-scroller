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
        // Physics body: 36w × 48h, offset centered for 100px wide frames
        this.sprite.body.setSize(36, 48);
        this.sprite.body.setOffset(32, 16);

        // Add collider with scene platforms
        if (this.scene.platforms) {
            this.platformCollider = this.scene.physics.add.collider(this.sprite, this.scene.platforms);
        }

        // Play idle animation
        this.sprite.play(this.textureKey + '_idle');

        // --- Floating name tag ---
        this.nameTag = this.scene.add.text(x, y - 50, this.name, {
            fontSize: '11px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.nameTag.setOrigin(0.5);
        this.nameTag.setDepth(2);

        // --- Help / rescue prompt text ---
        this.helpText = this.scene.add.text(x, y - 70, 'HELP ME!', {
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
     * Idle: frames 0-5 (row 0), Walk: frames 8-15 (row 1).
     */
    _registerAnimations() {
        const idleKey = this.textureKey + '_idle';
        const walkKey = this.textureKey + '_walk';

        if (!this.scene.anims.exists(idleKey)) {
            this.scene.anims.create({
                key: idleKey,
                frames: this.scene.anims.generateFrameNumbers(this.textureKey, { start: 0, end: 5 }),
                frameRate: 6,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists(walkKey)) {
            this.scene.anims.create({
                key: walkKey,
                frames: this.scene.anims.generateFrameNumbers(this.textureKey, { start: 8, end: 15 }),
                frameRate: 10,
                repeat: -1
            });
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
        if (this.nameTag && this.sprite) {
            this.nameTag.setPosition(this.sprite.x, this.sprite.y - 50);
        }
        if (this.helpText && this.sprite) {
            this.helpText.setPosition(this.sprite.x, this.sprite.y - 70);
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

window.RescueeNPC = RescueeNPC;
