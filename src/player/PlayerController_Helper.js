// src/player/PlayerController_Helper.js - Helper containing offloaded logic for PlayerController

const PlayerController_Helper = {
    getDamageMultiplier() {
        let mult = 1.0;
        if (this.queenDamageBuffActive) {
            mult *= 2.66; // 166% health & damage buff
        }
        if (this.isAI && this.aiState === 'party' && this.camaraderie) {
            // Ally gets +5% per 10 camaraderie (max +50%)
            mult += Math.min(0.5, Math.floor(this.camaraderie / 10) * 0.05);
        } else if (!this.isAI && this.scene && this.scene.partyMembers) {
            // Player gets +2% per total 10 camaraderie across party
            let totalCamaraderie = 0;
            this.scene.partyMembers.forEach(m => totalCamaraderie += (m.camaraderie || 0));
            mult += Math.min(0.5, Math.floor(totalCamaraderie / 10) * 0.02);
        }

        // Spiked Collar companion damage boost
        if (this.isAI && this.scene && this.scene.player) {
            const mainPlayer = this.scene.player;
            if (mainPlayer.inventory && mainPlayer.inventory.artifacts && mainPlayer.inventory.equippedArtifact >= 0) {
                const artKey = mainPlayer.inventory.artifacts[mainPlayer.inventory.equippedArtifact];
                if (artKey === 'artifact-spiked-collar') {
                    mult *= 1.15;
                }
            }
        }

        // Apply Artifact Boosts
        if (this.inventory && this.inventory.artifacts && this.inventory.equippedArtifact >= 0) {
            const artifactKey = this.inventory.artifacts[this.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageMultiplier) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = this.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    mult *= artifactDef.statBoosts.damageMultiplier;
                }
            }
            if (artifactKey === 'artifact-berserk-horn' && this.hp <= this.maxHp * 0.4) {
                mult *= 1.30;
            }
        }

        // Apply Potion/Food status effect buffs
        if (this.statusEffects) {
            this.statusEffects.forEach(effect => {
                if (effect.type === 'damage_boost') {
                    mult *= (1 + (effect.strength / 100));
                } else if (effect.type === 'elixir_gods') {
                    mult *= 1.20;
                }
            });
        }
        return mult;
    },

    saveGame() {
        const isFighterScene = this.scene && this.scene.sys && this.scene.sys.settings && this.scene.sys.settings.key === 'FighterScene';
        if (isFighterScene) return;

        if (saveData) {
            saveData = JSON.parse(JSON.stringify(saveData));
        } else {
            saveData = {};
        }
        saveData.narrativeJournal = saveData.narrativeJournal || [];
        
        if (this.sessionStartTime) {
            const now = Date.now();
            // Accurately track ms so rapid auto-saves don't lose fractional minutes
            saveData.playTimeMs = (saveData.playTimeMs || (saveData.playTime * 60000) || 0) + (now - this.sessionStartTime);
            saveData.playTime = Math.floor(saveData.playTimeMs / 60000);
            this.sessionStartTime = now;
        }
        
        saveData.inventory = JSON.parse(JSON.stringify(this.inventory));
        saveData.quests = JSON.parse(JSON.stringify(this.quests));
        saveData.coliseumReputation = this.coliseumReputation;
        saveData.coliseumHighestWave = this.coliseumHighestWave;
        saveData.alignment = this.alignment;
        saveData.hp = this.hp;
        saveData.mp = this.mp;
        saveData.sp = this.sp;
        saveData.stats = JSON.parse(JSON.stringify(this.classData.stats));
        
        // Save party members (allies)
        if (!this.isAI && this.scene && this.scene.partyMembers) {
            saveData.party = this.scene.partyMembers
                .filter(hero => !hero.isCargoCarrier && !hero.owner && hero.classData.id !== 'flame_elemental')
                .map(hero => ({
                    classId: hero.classData.id,
                    hp: hero.hp,
                    npcName: hero.npcName,
                    persona: hero.persona,
                    camaraderie: hero.camaraderie || 0,
                    weaponType: hero.classData.weaponType || hero.weaponType || 'sword',
                    equippedWeapon: hero.inventory && hero.inventory.weapon ? hero.inventory.weapon : null,
                    customConfig: hero.customConfig || (window.npcLayers && window.npcLayers[hero.classId] ? { layers: window.npcLayers[hero.classId], weaponType: hero.classData.weaponType || hero.weaponType || 'sword' } : null)
                }));
        }
    },

    update(time, delta) {
        if (!this.sprite || !this.sprite.active || !this.classData) return;
        
        if (isNaN(this.sprite.x)) {
            if (!this.nanLogged) {
                console.error(`[PlayerController] X is NaN for ${this.classData ? this.classData.id : 'unknown'}. AI: ${this.isAI}`);
                console.trace();
                this.nanLogged = true;
            }
        } else {
            this.lastValidX = this.sprite.x;
        }

        if (this.hp <= 0) {
            this.sprite.setVelocityX(0);
            return;
        }

        // Instant death if falling into the deep abyss
        if (this.sprite.y > 800) {
            console.error(`%c[DIAGNOSTIC] PlayerController detected y > 800! Y: ${this.sprite.y}. HP: ${this.hp}. Platforms count: ${this.scene.platforms.getLength()}`, "color: #ff3333; font-weight: bold;");
            // Cargo carriers (mules) get teleported back to safety instead of dying
            if (this.isCargoCarrier && this.scene && this.scene.player && this.scene.player.sprite) {
                this.sprite.setPosition(this.scene.player.sprite.x, this.scene.player.sprite.y - 20);
                this.sprite.setVelocity(0, 0);
                return;
            }
            this.takeDamage(this.hp);
            return;
        }

        if (this.scene.isCutscene) {
            this.sprite.setVelocityX(0);
            return;
        }

        // --- Cloak of Shadows: Invisibility Artifact ---
        let hasInvisArtifact = false;
        if (!this.isAI && this.inventory && this.inventory.artifacts && this.inventory.equippedArtifact >= 0) {
            const eqKey = this.inventory.artifacts[this.inventory.equippedArtifact];
            const eqDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[eqKey] : null;
            if (eqDef && eqDef.special === 'invisibility') {
                hasInvisArtifact = true;
                if (!this.isInvisible) {
                    this.isInvisible = true;
                    this.sprite.setAlpha(0.3);
                    if (this.scene.showFloatingText) {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 50, '🫥 Cloaked', 0xaabbff);
                    }
                }
            }
        }

        // Witch Temporary Invisibility on Down/S Key Hold
        const isWitch = this.classData && this.classData.id === 'witch';
        let isWitchInvis = false;
        if (isWitch && this.isDownDown() && this.mp > 0) {
            if (!this.isInvisible) {
                // Must have at least 10 MP to activate the Fade
                if (this.mp >= 10) {
                    this.mp -= 10;
                    this.isInvisible = true;
                    this.sprite.setAlpha(0.3);
                    if (this.scene.showFloatingText) {
                        this.scene.showFloatingText(this.sprite.x, this.sprite.y - 50, '🫥 Fade', 0xaabbff);
                    }
                    isWitchInvis = true;
                    this.invulnerable = true;
                }
            } else {
                isWitchInvis = true;
                // Drain MP continuously: 15 MP per second
                const mpDrain = (15 * delta) / 1000;
                this.mp = Math.max(0, this.mp - mpDrain);
                this.invulnerable = true;
            }
        } else if (isWitch && !hasInvisArtifact && this.isInvisible) {
            this.invulnerable = false;
        }

        if (!hasInvisArtifact && !isWitchInvis && this.isInvisible) {
            this.isInvisible = false;
            this.sprite.setAlpha(1.0);
            this.invulnerable = false;
        }

        // Town Portal (Wizard only)
        if (!this.isAI && this.classData && this.classData.id === 'wizard') {
            if (Phaser.Input.Keyboard.JustDown(this.inputManager.keys.down)) {
                if (time - (this.lastDownPressTime || 0) < 500) {
                    this.downPressCount = (this.downPressCount || 0) + 1;
                } else {
                    this.downPressCount = 1;
                }
                this.lastDownPressTime = time;

                if (this.downPressCount >= 3) {
                    this.downPressCount = 0;
                    if (this.mp >= 80) {
                        let currentZone = this.scene.worldManager.currentZoneIndex || 0;
                        let closestTown = Math.round(currentZone / 4) * 4;
                        if (closestTown === currentZone) {
                            if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Already in a town!", 0xff4444);
                        } else {
                            this.mp -= 80;
                            // (Removed dead updatePlayerUI)
                            if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Town Portal!", 0x4488ff);
                            
                            this.scene.isTransitioning = true;
                            this.scene.cameras.main.fadeOut(500, 255, 255, 255);
                            this.scene.time.delayedCall(500, () => {
                                this.scene.worldManager.loadZone(closestTown, 'center').then(() => {
                                    this.scene.isTransitioning = false;
                                    this.scene.cameras.main.fadeIn(500, 255, 255, 255);
                                }).catch(err => {
                                    console.error("Town Portal failed:", err);
                                    this.scene.isTransitioning = false;
                                    this.scene.cameras.main.fadeIn(500, 255, 255, 255);
                                });
                            });
                        }
                    } else {
                        if (this.scene.showFloatingText) this.scene.showFloatingText(this.sprite.x, this.sprite.y - 60, "Not enough Mana!", 0xff4444);
                    }
                }
            }
        }

        if (this.isAI) {
            this.updateAI(time, delta);
        }

        if (this.scene.isTransitioning) {
            this.sprite.setVelocity(0, 0);
            this.sprite.body.setAllowGravity(false);
            if (this.classData && this.classData.isSheet) this._playAnim();
            return;
        } else if (this.sprite.body && !this.sprite.body.allowGravity) {
            this.sprite.body.setAllowGravity(true);
        }

        // Apply status effects
        this.updateStatusEffects(delta);
        // If stunned, cannot move
        const isStunned = this.statusEffects.some(e => e.type === 'stun' || e.type === 'mind_control');
        if (isStunned) {
            this.sprite.setVelocityX(0);
            return; // Skip input processing while stunned or mind controlled
        }

        let speedMultiplier = 1.0;
        const freezeEffect = this.statusEffects.find(e => e.type === 'freeze');
        if (freezeEffect) speedMultiplier = 1.0 - (freezeEffect.strength / 100);

        // Cancel dash early if stuck against a wall to prevent transparent lock-up
        if (this.isDashing && Math.abs(this.sprite.body.velocity.x) < 5) {
            this.isDashing = false;
            this.sprite.body.setAllowGravity(true);
            if (!this.invulnerable) this.sprite.setAlpha(1.0);
        }

        if (this.isDashing) return;
        
        if (this.isTalking) {
            this.sprite.setVelocityX(0);
            return;
        }
        if (this.isDashing) {
            if (this.classData.isSheet && this.classData.dashRow !== undefined) {
                this._playAnim();
            }
            return;
        }

        const keys = this.inputManager.keys;
        const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
        const cd = this.classData;

        // Dash detection
        if (this.consumeDashLeft()) { this.startDash(-1); return; }
        if (this.consumeDashRight()) { this.startDash(1); return; }

        // Attack
        if (this.consumeAttack()) {
            const now = this.scene.time.now;
            const canComboChain = !this.isAI && this.isAttacking && this.classData.attack2Frames && (!this._lastAttackTime || (now - this._lastAttackTime > 150));
            if (!this.isAttacking || canComboChain) {
                this.attack();
            }
        }

        // Super Spell
        if (this.consumeSuperSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.superComboSpell();
        }
        // Mega Spell (Wizard AoE)
        if (this.consumeMegaSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.megaComboSpell();
        }
        // Summon Spell (Wizard Angel Heal)
        if (this.consumeSummonSpell() && !this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            this.summonComboSpell();
        }
        if (this.isAttacking) {
            if (onGround) {
                this.sprite.setVelocityX(0);
            }
            return; // Don't process movement during attack
        }

        // Duck / Block (S key, only on ground) — disabled for ranger (infinite ranged attacks, no need to block) and priest
        const isRanger = cd.id === 'ranger';
        const isPriest = cd.id && cd.id.startsWith('priest');
        const isWitchClass = cd.id && cd.id.startsWith('witch');
        const isDucking = !isRanger && !isPriest && this.isDownDown() && onGround;
        if (isDucking) {
            this.sprite.setVelocityX(0);
            const firstFrameOfDuck = !this.wasDucking;
            this.wasDucking = true;
            if (cd.isSheet) {
                this._playAnim();
                if (isWitchClass) {
                    this.sprite.setFrame(60);
                }
            }
            // Shrink hitbox
            if (firstFrameOfDuck) {
                if (cd.id && cd.id.startsWith('custom_npc_')) {
                    const bodyW = 24;
                    const bodyH = 20;
                    this.sprite.body.setSize(bodyW, bodyH);
                    const currentFrame = this.sprite.frame;
                    const currentIdx = (typeof currentFrame.name === 'number') ? currentFrame.name : parseInt(currentFrame.name, 10);
                    this._anchorBodyOnFrameChange(currentFrame.height, currentIdx, currentFrame, currentIdx);
                } else if (isWitchClass) {
                    this.sprite.body.setSize(48, 54);
                    this.sprite.body.setOffset(40, 74);
                } else if (cd.id === 'elven_spellblade' || cd.id === 'elven_spellblade_rival') {
                    this.sprite.body.setSize(31, 31);
                    this.sprite.body.setOffset(48, 63);
                } else if (cd.id === 'knight' || cd.id === 'warrior') {
                    this.sprite.body.setSize(24, 24);
                    this.sprite.body.setOffset(28, 40);
                } else {
                    this.sprite.body.setSize(24, 24);
                    this.sprite.body.setOffset(20, 40);
                }

                // Wizard magic dome shield effect
                if (cd.id === 'wizard' || cd.id === 'wizard_rival') {
                    this._createBlockDome();
                }
            }

            // Update dome position while ducking
            if (this._blockDome && this._blockDome.active) {
                this._blockDome.setPosition(this.sprite.x, this.sprite.y);
            }
            return;
        } else {
            // Restore hitbox if was ducking
            if (this.wasDucking) {
                this.setScaleWithPhysics(this.sprite.scaleX);
                this.wasDucking = false;
                if (cd.id && cd.id.startsWith('custom_npc_')) {
                    const currentFrame = this.sprite.frame;
                    const currentIdx = (typeof currentFrame.name === 'number') ? currentFrame.name : parseInt(currentFrame.name, 10);
                    this._anchorBodyOnFrameChange(currentFrame.height, currentIdx, currentFrame, currentIdx);
                }
                // Destroy magic dome
                this._destroyBlockDome();
            }
        }

        // Horizontal movement
        let movingX = false;
        const spd = ((typeof this.speed === 'number' && !isNaN(this.speed)) ? this.speed : 200) * (this.speedMultiplier || 1.0);
        if (this.isLeftDown()) {
            this.sprite.setVelocityX(-spd);
            movingX = true;
        } else if (this.isRightDown()) {
            this.sprite.setVelocityX(spd);
            movingX = true;
        }

        // Set facing direction
        if (this.isAI && this.aiTargetDx !== undefined && this.aiTargetDx !== 0) {
            // AI always faces its target if it has one
            this.facingDirection = this.aiTargetDx > 0 ? 1 : -1;
            this.sprite.setFlipX(this.facingDirection === 1 ? (cd.flipX ? true : false) : (cd.flipX ? false : true));
        } else if (movingX) {
            // Player faces movement direction
            if (this.sprite.body.velocity.x < 0) {
                this.sprite.setFlipX(cd.flipX ? false : true);
                this.facingDirection = -1;
            } else if (this.sprite.body.velocity.x > 0) {
                this.sprite.setFlipX(cd.flipX ? true : false);
                this.facingDirection = 1;
            }
        } else if (this.isAI && this.scene && this.scene.player && this.scene.player.sprite) {
            // Idle companion faces the player!
            const playerX = this.scene.player.sprite.x;
            const myX = this.sprite.x;
            if (Math.abs(playerX - myX) > 15) {
                this.facingDirection = playerX > myX ? 1 : -1;
                this.sprite.setFlipX(this.facingDirection === 1 ? (cd.flipX ? true : false) : (cd.flipX ? false : true));
            }
        }

        if (!movingX && !this.isAttacking && !isDucking) {
            this.sprite.setVelocityX(0);
        }

        // Reset jump counter on ground
        if (onGround) {
            this.jumps = 0;
        } else if (this.jumps === 0) {
            this.jumps = 1;
        }
        // Detect jump input (discrete press)
        let jumpPressed = false;
        if (this.isAI) {
            if (this.aiInput.up) {
                jumpPressed = true;
                this.aiInput.up = false; // Consume the jump request
            }
        } else {
            const upJustDown = keys.up ? Phaser.Input.Keyboard.JustDown(keys.up) : false;
            const spaceJustDown = keys.space ? Phaser.Input.Keyboard.JustDown(keys.space) : false;
            if (upJustDown || spaceJustDown) {
                jumpPressed = true;
            }
        }

        if (jumpPressed) {
            const jSpd = (typeof this.jumpVelocity === 'number' && !isNaN(this.jumpVelocity)) ? this.jumpVelocity : -400;
            if (onGround) {
                this.sprite.setVelocityY(jSpd);
                this.jumps = 1;
            } else if (this.jumps < 2) {
                this.sprite.setVelocityY(jSpd);
                this.jumps++;
            }
        }

        // Animation state machine
        if (cd.isSheet) {
            if (!onGround) {
                const vy = this.sprite.body.velocity.y;
                if (vy < -10) {
                    // Rising after a jump — hold the jump pose
                    this._playAnim();
                } else {
                    // Falling — gravity has taken over (after jump apex or walking off a ledge)
                    this._playAnim();
                }
            } else if (movingX) {
                this._playAnim();
            } else {
                this._playAnim();
            }
        }

        this.updateAiming();
        
        // Passive MP/SP/HP regen (MP: 1 every 5s = 0.2/sec. SP: 8/sec)
        if (typeof delta === 'number') {
            const regenRate = delta / 1000; // delta is ms
            let statsChanged = false;

            let passiveHpRegen = 0;
            let passiveSpRegen = 8; // base 8/sec
            
            if (this.inventory && this.inventory.artifacts && this.inventory.equippedArtifact >= 0) {
                const artKey = this.inventory.artifacts[this.inventory.equippedArtifact];
                if (artKey === 'artifact-heart-pendant') passiveHpRegen += 3;
                if (artKey === 'artifact-spirit-stone') passiveSpRegen += 5;
            }

            let passiveMpRegen = 0.2; // base MP regen
            if (this.statusEffects) {
                const mpFlow = this.statusEffects.find(e => e.type === 'mana_flow');
                if (mpFlow) passiveMpRegen += mpFlow.strength;
                if (this.statusEffects.some(e => e.type === 'elixir_gods')) passiveMpRegen += 2.0; // +2 MP/sec
                
                const spFlow = this.statusEffects.find(e => e.type === 'stamina_flow');
                if (spFlow) passiveSpRegen += spFlow.strength;
                if (this.statusEffects.some(e => e.type === 'elixir_gods')) passiveSpRegen += 4.0; // +4 SP/sec
            }

            if (passiveHpRegen > 0 && this.hp !== undefined && this.maxHp !== undefined && this.hp < this.maxHp) {
                this.hp += passiveHpRegen * regenRate;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
                statsChanged = true;
            }
            const isWitchFade = this.classData && this.classData.id === 'witch' && this.isInvisible;
            if (this.mp !== undefined && this.maxMp !== undefined && this.mp < this.maxMp && !isWitchFade) {
                this.mp += passiveMpRegen * regenRate;
                if (this.mp > this.maxMp) this.mp = this.maxMp;
                statsChanged = true;
            }
            if (this.sp !== undefined && this.maxSp !== undefined && this.sp < this.maxSp) {
                this.sp += passiveSpRegen * regenRate;
                if (this.sp > this.maxSp) this.sp = this.maxSp;
                statsChanged = true;
            }
            
            // Safety check in case anything made it NaN
            if (isNaN(this.mp)) this.mp = this.maxMp;
            if (isNaN(this.sp)) this.sp = this.maxSp;
            
            if (statsChanged && !this.isAI) {
                const now = this.scene.time.now;
                if (!this.lastStatUIRefresh || now - this.lastStatUIRefresh > 100) {
                    this.lastStatUIRefresh = now;
                    // (Removed dead updatePlayerUI)
                }
            }
            
            if (!this.isAI && this.scene && this.scene.updateHUD) this.scene.updateHUD();
        }
    }
};
