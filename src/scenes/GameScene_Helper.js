// src/scenes/GameScene_Helper.js - Helper containing offloaded logic for GameScene

const GameScene_Helper = {
    transitionZone(direction) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // Safety timeout to prevent getting permanently stuck in a transition lock
        this.time.delayedCall(10000, () => {
            if (this.isTransitioning) {
                console.warn("Transition timeout reached — forcing isTransitioning = false");
                this.isTransitioning = false;
                if (this.player && this.player.sprite && this.player.sprite.body) {
                    this.player.sprite.body.setAllowGravity(true);
                }
            }
        });
        
        // STOP player immediately so they don't walk off the cliff during fade
        if (this.player && this.player.sprite && this.player.sprite.body) {
            this.player.sprite.setVelocity(0, 0);
            this.player.sprite.body.setAllowGravity(false);
        }
        if (this.partyMembers) {
            this.partyMembers.forEach(hero => {
                if (hero.sprite && hero.sprite.body) {
                    hero.sprite.setVelocity(0, 0);
                    hero.sprite.body.setAllowGravity(false);
                }
            });
        }
        
        const currentZone = (saveData && saveData.currentZone !== undefined) ? saveData.currentZone : 0;
        let nextZoneIndex = currentZone + direction;
        const spawnSide = direction === 1 ? 'left' : 'right'; // If moving right, spawn left.

        // Check for Wrath Teleportation if in a wilderness zone (not safe and not already in pocket dimension)
        const isCurrentlySafe = this.zoneType === 'Safe';
        const isPocketDimension = currentZone === 777 || currentZone === -666;
        
        let spawnedWrath = false;
        let wrathDimension = null;

        if (saveData) {
            if (typeof saveData.wrathCooldown === 'undefined') {
                saveData.wrathCooldown = 0;
            }
            if (saveData.wrathCooldown > 0) {
                saveData.wrathCooldown--;
            }
        }

        if (!isCurrentlySafe && !isPocketDimension && saveData && saveData.alignment !== undefined && saveData.wrathCooldown <= 0) {
            const align = saveData.alignment;
            const rand = Math.random() * 100;
            // Scale chance: at 20 alignment, there is an 8% chance; at 100 alignment, a 25% chance.
            const chance = Math.min(25, Math.abs(align) * 0.4);
            
            if (align >= 20 && rand < chance) {
                wrathDimension = 'Heaven';
                saveData.lastMortalZone = currentZone;
                saveData.preWrathZone = nextZoneIndex; // Store original progression target
                nextZoneIndex = 777;
                spawnedWrath = true;
                saveData.wrathCooldown = 5; // 5 normal zones cooldown
            } else if (align <= -20 && rand < chance) {
                wrathDimension = 'Hell';
                saveData.lastMortalZone = currentZone;
                saveData.preWrathZone = nextZoneIndex; // Store original progression target
                nextZoneIndex = -666;
                spawnedWrath = true;
                saveData.wrathCooldown = 5; // 5 normal zones cooldown
            }
        } else if (isPocketDimension) {
            // Exiting a pocket dimension always returns to the pre-wrath progression zone
            const fallbackZone = (saveData && typeof saveData.lastMortalZone === 'number') ? saveData.lastMortalZone : 0;
            nextZoneIndex = (saveData && typeof saveData.preWrathZone === 'number') ? saveData.preWrathZone : fallbackZone;
            if (saveData) delete saveData.preWrathZone;
            
            this.time.delayedCall(1200, () => {
                if (this.player && this.player.sprite && this.player.sprite.active) {
                    this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 100, "Returned to the mortal realm...", 0xffffff);
                }
            });
        }
        
        // Save active zone state (enemies) before transition
        if (this.worldManager) {
            this.worldManager.saveZoneState();
        }
        
        // Auto-Save all stats, inventory, quests, and alignment
        if (this.player && this.player.saveGame) {
            this.player.saveGame();
        }
        
        // Write to localStorage to persist
        if (saveData) {
            const saves = window.getSaves ? window.getSaves() : [];
            const saveIndex = saves.findIndex(s => s.id === saveData.id);
            if (saveIndex > -1) {
                saves[saveIndex] = JSON.parse(JSON.stringify(saveData));
            } else {
                saves.push(JSON.parse(JSON.stringify(saveData)));
            }
            if (window.saveSaves) window.saveSaves(saves);
        }

        // Cancel any active cutscenes so they don't bleed into the next zone
        this.cancelCutscene();

        // Fade out and Safety Timer trigger
        const performFade = () => {
            if (this.isSceneDestroyed) return;
            this.cameras.main.fadeOut(500, 0, 0, 0);
            
            // 2026-06-25 Optimization: Setup one-time animation event instead of delayedCall to prevent loading visual artifacts
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (this.isSceneDestroyed) return;
                
                // Clear previous enemies and NPCs from the scene to prevent memory leaks and rendering crashes
                if (this.enemies) {
                    this.enemies.clear(true, true);
                }
                if (this.npcs) {
                    [...this.npcs].forEach(npc => {
                        if (npc && typeof npc.destroy === 'function') {
                            npc.destroy();
                        }
                    });
                }
                
                this.cleanupDynamicTextures(false);
                
                // Clear active rescuee companion if we are leaving a pocket dimension
                if (isPocketDimension) {
                    this.activeRescuee = null;
                }
                
                this.worldManager.loadZone(nextZoneIndex, spawnSide).then(() => {
                    if (this.isSceneDestroyed) return;
                    
                    // Restore mule companion AFTER platforms are built in the new zone
                    this.spawnCargoCompanion();
                    
                    // Proximity check on load: spawn wrath combat encounter if alignment checks triggered
                    if (spawnedWrath && wrathDimension) {
                        const side = spawnSide === 'left' ? 'right' : 'left';
                        const wX = side === 'left' ? 200 : 1000;
                        const wY = 620;
                        
                        this.time.delayedCall(400, () => {
                            if (this.isSceneDestroyed) return;
                            
                            const promptLines = wrathDimension === 'Heaven' ? [
                                "[Celestial Voice] Mortals who bend the scales of fate must face judgment.",
                                "[Celestial Voice] Prepare yourself, traveler. The Seraphim will evaluate your soul."
                            ] : [
                                "[Infernal Screams] A mortal approaches the pit!",
                                "[The Devil] Welcome to the Abyss. Your dark deeds have made you ripe for harvest."
                            ];
                            
                            this.playCutscene(promptLines, () => {
                                if (this.isSceneDestroyed) return;
                                
                                if (wrathDimension === 'Heaven') {
                                    this.spawnHeroAI('heavenly_seraph', wX, wY, 'hostile', 'Heavenly Seraph', 'A divine adjudicator of cosmic balance.');
                                } else {
                                    this.spawnHeroAI('the_devil', wX, wY, 'hostile', 'The Devil', 'A dark tormentor seeking to harvest your dark alignment.');
                                }
                            });
                        });
                    }
                    
                    this.cameras.main.fadeIn(500, 0, 0, 0);
                    this.time.delayedCall(500, () => {
                        this.isTransitioning = false;
                        if (this.player && this.player.sprite && this.player.sprite.body) {
                            this.player.sprite.body.setAllowGravity(true);
                        }
                        if (this.partyMembers) {
                            this.partyMembers.forEach(hero => {
                                if (hero.sprite && hero.sprite.body) {
                                    hero.sprite.body.setAllowGravity(true);
                                }
                            });
                        }
                    });
                }).catch(err => {
                    console.error("Transition loadZone rejected:", err);
                    this.isTransitioning = false;
                    if (this.player && this.player.sprite && this.player.sprite.body) {
                        this.player.sprite.body.setAllowGravity(true);
                    }
                });
            });
        };
        
        // Cooldown timer - 1.2 seconds to allow visual feedback, flash, and audio decay
        if (spawnedWrath && wrathDimension) {
            // Flash screen celestial white or infernal red
            const flashColor = wrathDimension === 'Heaven' ? { r: 255, g: 245, b: 200 } : { r: 120, g: 0, b: 0 };
            this.cameras.main.flash(1000, flashColor.r, flashColor.g, flashColor.b);
            
            // Large floating text alert
            const alertText = wrathDimension === 'Heaven' ? "ASCENDING TO DECREE OF JUDGMENT!" : "DRAGGED DOWN TO THE ABYSS!";
            const alertColor = wrathDimension === 'Heaven' ? 0xffea9f : 0xff4422;
            this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 120, alertText, alertColor);
            
            this.time.delayedCall(1200, performFade);
        } else {
            performFade();
        }
    },

    spawnHeroAI(spriteKey, x, y, aiState, npcName = null, persona = null, camaraderie = 0, weaponType = null, faction = null) {
        if (!this.partyMembers) this.partyMembers = [];
        
        const isParty = (aiState === 'party');
        if (isParty && this.partyMembers.length >= 6) {
            this.showFloatingText(x, y - 20, "Party Full!", 0xff0000);
            return;
        }

        const spawnY = Math.min(y, 400); // Cap Y so tall sprites don't clip through the floor
        if (isNaN(x) || isNaN(spawnY)) {
            console.error(`[GameScene] spawnHeroAI received NaN! x: ${x}, y: ${y}`);
            console.trace();
            x = 400; // Fallback
        }
        const hero = new PlayerController(this, x, spawnY, this.inputManager, { 
            isAI: true, 
            aiState: aiState, 
            classId: spriteKey, 
            npcName: npcName, 
            persona: persona, 
            camaraderie: camaraderie, 
            weaponType: weaponType,
            faction: faction,
            factionRank: faction ? 'champion' : null
        });
        
        if (this.isIndoors) {
            if (typeof hero.setScaleWithPhysics === 'function') {
                hero.setScaleWithPhysics(2.5);
            } else {
                hero.sprite.setScale(2.5);
            }
        }
        
        if (isParty) {
            this.partyMembers.push(hero);
            if (this.heroGroup) this.heroGroup.add(hero.sprite);
            this.showFloatingText(x, y, "Joined Party!", 0x00ff00);
            if (this.isIndoors && this.indoorFloor) {
                this.physics.add.collider(hero.sprite, this.indoorFloor);
            } else {
                this.physics.add.collider(hero.sprite, this.platforms);
            }
        } else {
            // Hostile
            this.enemies.add(hero.sprite);
            hero.sprite.controller = hero; // So takeDamage works
            if (this.isIndoors && this.indoorFloor) {
                this.physics.add.collider(hero.sprite, this.indoorFloor);
            } else {
                this.physics.add.collider(hero.sprite, this.platforms);
            }
            this.showFloatingText(x, y, "HOSTILE!", 0xff0000);
        }
    },

    showFloatingText(x, y, message, color) {
        // Convert hex color to CSS string
        let colorStr = '#ffffff';
        if (typeof color === 'number') {
            colorStr = '#' + color.toString(16).padStart(6, '0');
        } else if (typeof color === 'string') {
            colorStr = color;
        }

        let displayMessage = message;
        if (typeof message === 'number') {
            displayMessage = String(Math.round(message));
        } else if (typeof message === 'string') {
            const num = Number(message);
            if (!isNaN(num)) {
                displayMessage = String(Math.round(num));
            }
        }

        // Slight random X offset to prevent stacking
        const offsetX = (Math.random() - 0.5) * 30;
        
        const text = this.add.text(x + offsetX, y, displayMessage, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '22px',
            fill: colorStr,
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 280, useAdvancedWrap: true }
        });
        text.setOrigin(0.5, 1.0);
        text.setScale(0.5);
        text.setDepth(1000); // Ensure text always renders on top of particles and sprites

        // Pop-in scale then float up and fade
        this.tweens.add({
            targets: text,
            scale: 1.2,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    y: y - 80,
                    scale: 0.9,
                    alpha: 0,
                    duration: 3500,
                    ease: 'Power1.easeOut',
                    onComplete: () => text.destroy()
                });
            }
        });
    },

    clearHellZone() {
        if (!this.player) return;

        // Calculate shift needed to return player alignment to 0 (Neutral)
        const currentAlignment = this.player.alignment || 0;
        const alignmentShift = -currentAlignment;
        this.player.updateAlignment(alignmentShift);

        // Play golden white flash (dramatic purge effect)
        this.cameras.main.flash(1500, 255, 255, 255);

        // Display a giant dramatic camera-fixed title and subtitle
        const title = this.add.text(640, 260, "HELL PURGED!", {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '52px',
            fill: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 8,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setScale(0);

        const subtitle = this.add.text(640, 330, "Your soul is cleansed. Alignment reversed to Neutral.", {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '22px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);

        // Scale up banner
        this.tweens.add({
            targets: title,
            scale: 1.0,
            duration: 600,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (this.isSceneDestroyed) return;
                // Fade in subtitle
                this.tweens.add({
                    targets: subtitle,
                    alpha: 1,
                    duration: 400
                });

                // Hold for 3 seconds, then fade both out and destroy
                this.time.delayedCall(3000, () => {
                    if (this.isSceneDestroyed) return;
                    this.tweens.add({
                        targets: [title, subtitle],
                        alpha: 0,
                        duration: 800,
                        onComplete: () => {
                            title.destroy();
                            subtitle.destroy();
                        }
                    });
                });
            }
        });

        // Grant epic rewards: 1000 XP, 500 Gold
        this.grantRewards(1000, 500);

        // Show reward floating text
        if (this.showFloatingText && this.player.sprite && this.player.sprite.active) {
            this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 80, "Hell Cleared Bonus!", 0xffaa00);
        }

        // Save progress immediately
        this._autoSave();
    },

    cleanupScene() {
        this.cleanupDynamicTextures(true);
        // 1. Destroy player
        if (this.player && typeof this.player.destroy === 'function') {
            this.player.destroy();
        }
        // 2. Destroy NPCs
        if (this.npcs) {
            [...this.npcs].forEach(npc => {
                if (npc && typeof npc.destroy === 'function') {
                    npc.destroy();
                }
            });
        }
        // 3. Destroy party members
        if (this.partyMembers) {
            [...this.partyMembers].forEach(member => {
                if (member && typeof member.destroy === 'function') {
                    member.destroy();
                }
            });
        }

        // 4. Remove window / document event listeners
        if (this._beforeUnloadListener) {
            window.removeEventListener('beforeunload', this._beforeUnloadListener);
            this._beforeUnloadListener = null;
        }
        if (this._csEscListener) {
            window.removeEventListener('keydown', this._csEscListener);
            this._csEscListener = null;
        }
        if (this._dirEscListener) {
            window.removeEventListener('keydown', this._dirEscListener);
            this._dirEscListener = null;
        }
        if (this._debugMouseUpListener) {
            window.removeEventListener('mouseup', this._debugMouseUpListener);
            this._debugMouseUpListener = null;
        }
        if (this._debugKeyDownListener) {
            document.removeEventListener('keydown', this._debugKeyDownListener);
            this._debugKeyDownListener = null;
        }
        window._debugKeyBound = false;

        // 5. Remove modals and panels from DOM
        const csModal = document.getElementById('char-sheet-modal');
        if (csModal) csModal.remove();
        
        const charBtn = document.getElementById('btn-char-sheet');
        if (charBtn) charBtn.remove();
        
        const apBtn = document.getElementById('btn-auto-play');
        if (apBtn) apBtn.remove();
        
        const dbPanel = document.getElementById('debug-panel');
        if (dbPanel) dbPanel.remove();

        const rebirthOverlay = document.getElementById('death-rebirth-overlay');
        if (rebirthOverlay) rebirthOverlay.remove();
        
        if (this.indoorLeaveBtn) {
            this.indoorLeaveBtn.remove();
            this.indoorLeaveBtn = null;
        }

        this.indoorBlackBg = null;
    }
};
