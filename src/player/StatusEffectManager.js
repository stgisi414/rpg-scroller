// src/player/StatusEffectManager.js - Extracts status effects and damage lifecycle from CombatController.js
window.StatusEffectManager = {
takeDamage(amount, knockbackDirection) {
        const player = this.player;
        if (player.hp <= 0) return; // Already dead
        if (player.invulnerable) return; // Immune to damage (e.g. Witch fade)

        // Evasion check (including passive skills)
        const passives = player.passiveSkills || ( saveData ? (saveData.passiveSkills || {}) : {} );
        const activeModifiers = {};
        for (const skillId in passives) {
            const rank = passives[skillId] || 0;
            if (rank > 0 && PASSIVE_SKILLS_DATA) {
                const skillDef = PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
                if (skillDef && skillDef.statsModifiers) {
                    for (const statKey in skillDef.statsModifiers) {
                        const val = skillDef.statsModifiers[statKey];
                        if (statKey.toLowerCase().includes('multiplier')) {
                            const delta = val - 1;
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + delta * rank;
                        } else {
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + val * rank;
                        }
                    }
                }
            }
        }

        let evasionChance = (activeModifiers.evasion || 0);
        let artifactDef = null;
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.evasion) {
                evasionChance += artifactDef.statBoosts.evasion;
            }
        }

        if (evasionChance > 0 && Math.random() < evasionChance) {
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, "Evaded!", 0x88ff88);
            }
            return;
        }

        // Block / Parry check — any class can block when ducking
        const isBlocking = player.wasDucking;

        // Apply damage reduction
        let finalAmount = amount;
        let dr = (activeModifiers.damage_reduction || 0) + (activeModifiers.damageReduction || 0);
        if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.damageReduction) {
            let alignmentValid = true;
            if (artifactDef.alignmentReq) {
                const align = player.alignment || 0;
                if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
            }
            if (alignmentValid) {
                dr += artifactDef.statBoosts.damageReduction;
            }
        }
        finalAmount = Math.max(1, Math.floor(amount * (1 - dr)));

        // Spiked Collar companion defense boost
        if (player.isAI && player.scene && player.scene.player) {
            const mainPlayer = player.scene.player;
            if (mainPlayer.inventory && mainPlayer.inventory.artifacts && mainPlayer.inventory.equippedArtifact >= 0) {
                const artKey = mainPlayer.inventory.artifacts[mainPlayer.inventory.equippedArtifact];
                if (artKey === 'artifact-spiked-collar') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * 0.85)); // 15% reduction
                }
            }
        }

        // Apply temporary armor / resistance potions
        if (player.statusEffects) {
            player.statusEffects.forEach(effect => {
                if (effect.type === 'armor') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * (1 - (effect.strength / 100))));
                } else if (effect.type === 'elixir_gods') {
                    finalAmount = Math.max(1, Math.floor(finalAmount * 0.80)); // 20% DR
                }
            });
        }

        // Apply parry reduction: Witch takes 50% damage (50% mitigation), Knight/Samurai take 25% damage (75% mitigation)
        if (isBlocking) {
            const classId = player.classData && player.classData.id ? player.classData.id : '';
            if (classId.startsWith('witch')) {
                finalAmount = Math.max(0, Math.floor(finalAmount * 0.50));
            } else {
                finalAmount = Math.max(0, Math.floor(finalAmount * 0.25));
            }
        }

        player.hp -= finalAmount;

        // Damage reflection (Mirror Shield)
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.reflectDamage) {
                let closestEnemy = null;
                let minDist = 300;
                if (player.scene && player.scene.enemies) {
                    player.scene.enemies.getChildren().forEach(e => {
                        if (e && e.active && e.controller && !e.controller.isDead) {
                            const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, e.x, e.y);
                            if (dist < minDist) {
                                minDist = dist;
                                closestEnemy = e.controller;
                            }
                        }
                    });
                }
                if (closestEnemy) {
                    const reflectedDmg = Math.max(1, Math.floor(finalAmount * artifactDef.statBoosts.reflectDamage));
                    closestEnemy.takeDamage(reflectedDmg, -knockbackDirection);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(closestEnemy.sprite.x, closestEnemy.sprite.y - 40, `Reflected: ${reflectedDmg}`, 0xff5555);
                    }
                }
            }
        }
        
        // Show damage text
        if (player.scene && player.scene.showFloatingText) {
            if (isBlocking) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, `Blocked! -${finalAmount}`, 0x8888ff);
            } else {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, `-${finalAmount}`, 0xff0000);
            }
        }

        // Apply knockback (negated if parrying)
        if (player.sprite && player.sprite.body) {
            if (isBlocking) {
                player.sprite.setVelocityX(0);
            } else {
                let kbDir = 1;
                if (knockbackDirection !== undefined && !isNaN(knockbackDirection)) {
                    // If the number is large, it might be a raw X coordinate passed by mistake
                    if (Math.abs(knockbackDirection) > 5) {
                        kbDir = player.sprite.x < knockbackDirection ? -1 : 1;
                    } else {
                        kbDir = knockbackDirection > 0 ? 1 : -1;
                    }
                } else {
                    // Fallback to pushing them backwards based on their current facing direction
                    kbDir = player.facingDirection === 1 ? -1 : 1;
                }
                player.sprite.setVelocityX(kbDir * 200);
                player.sprite.setVelocityY(-150);
            }
        }

        // Damage flash visual
        player.isHit = true;
        player.sprite.setTint(0xff0000);
        player.scene.time.delayedCall(150, () => {
            player.isHit = false;
            if (player.sprite && player.sprite.active) {
                player.sprite.clearTint();
            }
        });

        const hitKey = player.classData.id + '_hit';
        if (player.scene.anims.exists(hitKey) && !player.isAttacking && !isBlocking) {
            player._playAnim(hitKey);
        }


        if (!player.isAI && player.scene && player.scene.updateHUD) {
            player.scene.updateHUD();
        }

        // --- Auto-Potion Artifact: use HP potion automatically when below 30% HP ---
        if (!player.isAI && player.hp <= player.maxHp * 0.30) {
            if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
                const apKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                const apDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[apKey] : null;
                if (apDef && apDef.special === 'auto-potion') {
                    const now = player.scene ? player.scene.time.now : Date.now();
                    if (!player._lastAutoPotTime || now - player._lastAutoPotTime > 3000) {
                        if (player.inventory.potions > 0) {
                            player._lastAutoPotTime = now;
                            if (player.inventoryManager) {
                                player.inventoryManager.usePotion();
                            } else {
                                player.inventory.potions--;
                                player.hp = Math.min(player.maxHp, player.hp + 50);
                            }
                            if (player.scene && player.scene.showFloatingText) {
                                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, '+50 HP (Auto)', 0x44ff44);
                            }
                            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                        }
                    }
                }
            }
        }

        if (player.hp <= 0) {
            this.die();
        } else if (!player.isAI && player.hp <= player.maxHp * 0.15) {
            // Artifact Teleporter Trigger
            if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
                const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
                if (artifactDef && artifactDef.special === 'auto-teleport') {
                    // Find nearest town
                    if (player.scene && player.scene.biomes) {
                        let nearestTown = null;
                        let minDist = Infinity;
                        for (let key in player.scene.biomes) {
                            const biome = player.scene.biomes[key];
                            if (biome.type === 'town') {
                                const dist = Math.abs(biome.xStart - player.sprite.x);
                                if (dist < minDist) {
                                    minDist = dist;
                                    nearestTown = biome;
                                }
                            }
                        }
                        if (nearestTown) {
                            if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, 'Emergency Teleport!', 0x88ccff);
                            // Heal them a tiny bit so they don't immediately die again
                            player.hp = Math.floor(player.maxHp * 0.20);
                            player.sprite.x = nearestTown.xStart + 300;
                            player.sprite.y = 500;
                        }
                    }
                }
            }
        }
    },

applyLifesteal(damageDealt) {
        const player = this.player;
        if (player.hp <= 0 || damageDealt <= 0 || typeof damageDealt !== 'number' || isNaN(damageDealt)) return;
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.statBoosts && artifactDef.statBoosts.lifesteal) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    const healAmount = Math.max(1, Math.floor(damageDealt * artifactDef.statBoosts.lifesteal));
                    player.hp = Math.min(player.maxHp, player.hp + healAmount);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmount} HP`, 0x00ff00);
                    }
            
                    if (!player.isAI && player.scene && player.scene.updateHUD) {
                        player.scene.updateHUD();
                    }
                }
            }
        }

        // Potion lifesteal boost
        if (player.statusEffects) {
            const lBoost = player.statusEffects.find(e => e.type === 'lifesteal_boost');
            if (lBoost) {
                const healAmount = Math.max(1, Math.floor(damageDealt * (lBoost.strength / 100)));
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
                if (player.scene && player.scene.showFloatingText) {
                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+${healAmount} HP`, 0x00ff00);
                }
                if (!player.isAI && player.scene && player.scene.updateHUD) {
                    player.scene.updateHUD();
                }
            }
        }
    },

applyStatusEffect(type, durationMs, strength) {
        const player = this.player;
        if (player.hp <= 0) return;
        
        // Artifact Immunities
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.immunities && artifactDef.immunities.includes(type)) {
                let alignmentValid = true;
                if (artifactDef.alignmentReq) {
                    const align = player.alignment || 0;
                    if (align < artifactDef.alignmentReq.min || align > artifactDef.alignmentReq.max) alignmentValid = false;
                }
                if (alignmentValid) {
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 50, 'Immune!', 0xaaaaaa);
                    }
                    return; // Prevent effect
                }
            }
        }
        
        // Check if effect already exists
        const existing = player.statusEffects.find(e => e.type === type);
        if (existing) {
            existing.duration = durationMs;
            if (strength > existing.strength) existing.strength = strength;
        } else {
            player.statusEffects.push({
                type: type,
                duration: durationMs,
                strength: strength,
                tickTimer: 0
            });
        }
    },

updateStatusEffects(delta) {
        const player = this.player;
        if (!player.sprite || !player.sprite.active || player.hp <= 0) return;

        let hasTint = false;
        
        for (let i = player.statusEffects.length - 1; i >= 0; i--) {
            const effect = player.statusEffects[i];
            effect.duration -= delta;

            // Process tick damage
            if (effect.type === 'poison' || effect.type === 'burn') {
                effect.tickTimer += delta;
                const tickRate = effect.type === 'poison' ? 1000 : 500;
                
                if (effect.tickTimer >= tickRate) {
                    effect.tickTimer -= tickRate;
                    
                    const isFighterScene = player.scene && player.scene.sys && player.scene.sys.settings && player.scene.sys.settings.key === 'FighterScene';
                    const shouldDamage = !isFighterScene || player.scene.matchActive;
                    
                    if (shouldDamage) {
                        player.hp -= effect.strength;
                    }
                    
                    if (player.scene && player.scene.showFloatingText) {
                        const color = effect.type === 'poison' ? 0xbf00ff : 0xff6600;
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `-${effect.strength}`, color);
                    }
            
                    if (!player.isAI && player.scene && player.scene.updateHUD) player.scene.updateHUD();
 
                    if (shouldDamage && player.hp <= 0) {
                        this.die();
                        return;
                    }
                }
            }

            // Process regen tick
            if (effect.type === 'regen') {
                effect.tickTimer += delta;
                if (effect.tickTimer >= 1000) {
                    effect.tickTimer -= 1000;
                    player.hp = Math.min(player.maxHp, player.hp + effect.strength);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 45, `+${effect.strength}`, 0x00ff00);
                    }
                    if (!player.isAI && player.scene && player.scene.updateHUD) player.scene.updateHUD();
                }
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                player.statusEffects.splice(i, 1);
            }
        }

        // Apply visual tints with cycling for multiple active effects
        const STATUS_TINTS = {
            mind_control: 0x32cd32, // lime green
            stun: 0xffff00,         // yellow
            freeze: 0x88ccff,       // light blue
            bless: 0x00d2ff,        // sky blue
            burn: 0xff6600,         // orange
            poison: 0xbf00ff,       // purple
            regen: 0x88ff88,        // light green
            elixir_gods: 0xffd700,  // gold
            haste: 0xffffff         // white
        };

        const activeTints = player.statusEffects
            .map(e => e.type)
            .filter(type => STATUS_TINTS[type] !== undefined);

        if (activeTints.length > 0) {
            if (!player.isHit) {
                this.tintCycleTimer = (this.tintCycleTimer || 0) + delta;
                const cycleIndex = Math.floor(this.tintCycleTimer / 1000) % activeTints.length;
                const currentTintType = activeTints[cycleIndex];
                player.sprite.setTint(STATUS_TINTS[currentTintType]);
                hasTint = true;
            }
        } else {
            this.tintCycleTimer = 0;
        }
        
        if (!hasTint && !player.isHit) {
            player.sprite.clearTint();
        }
    },

die() {
        const player = this.player;
        if (!player.sprite || !player.sprite.active) return;

        // Phoenix Feather Revive
        if (!player.isAI && player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef && artifactDef.special === 'phoenix-revive') {
                if (!player.phoenixReviveUsedInZone) {
                    player.phoenixReviveUsedInZone = true;
                    player.hp = Math.floor(player.maxHp * 0.3);
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Phoenix Rebirth!", 0xffaa00);
                    }
                    if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                    return;
                }
            }
        }

        if (player.scene.anims.exists(player.classData.id + '_die')) {
            player._playAnim();
            player.sprite.body.enable = false;
        }

        if (saveData) {
            saveData = JSON.parse(JSON.stringify(saveData));
        }
        if (player.isAI && player !== player.scene.player) {
            // AI dies
            player.isDead = true;
            player.sprite.setVelocity(0, 0);
            player.sprite.body.enable = false;
            
            if (player.aiState === 'hostile') {
                if (player.classId && player.classId.includes('rival') && saveData) {
                    if (!saveData.defeatedRivals) saveData.defeatedRivals = [];
                    if (!saveData.defeatedRivals.includes(player.classId)) {
                        saveData.defeatedRivals.push(player.classId);
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 60, "Rival Defeated!", 0xffa500);
                    }
                    if (player.classId === 'megaboss_rival') {
                        saveData.isSavior = true;
                        if (player.scene.showFloatingText) player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, "SAVIOR OF THE REALM", 0xffff00);
                    }

                    // Apply faction reputation changes on defeating a Rival (Phase 8)
                    if (player.faction && window.changeFactionReputation) {
                        window.changeFactionReputation(player.faction, -10, true);
                        const rivalFactionData = window.WORLD_FACTIONS[player.faction];
                        if (rivalFactionData && rivalFactionData.relations) {
                            const enemyFactions = Object.keys(rivalFactionData.relations).filter(fid => rivalFactionData.relations[fid] <= -30);
                            enemyFactions.forEach(fid => {
                                window.changeFactionReputation(fid, 10, true);
                                const fName = window.WORLD_FACTIONS[fid] ? window.WORLD_FACTIONS[fid].name : fid;
                                if (player.scene && player.scene.showFloatingText) {
                                    player.scene.time.delayedCall(1000, () => {
                                        if (player.sprite && player.sprite.active) {
                                            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 100, `🤝 +10 rep with ${fName}`, 0x88aaff);
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
                // Drop loot
                if (player.scene && player.scene.grantRewards) {
                    player.scene.grantRewards(50, 20); // 50 XP, 20 Gold
                }
            } else if (player.aiState === 'party') {
                // Reclaim equipment back to player inventory
                if (window.reclaimCompanionEquipment) {
                    window.reclaimCompanionEquipment(player.scene, player);
                }
                // Remove from party
                const idx = player.scene.partyMembers.indexOf(player);
                if (idx > -1) player.scene.partyMembers.splice(idx, 1);
                if (player.isCargoCarrier) {
                    if (saveData.cargo) {
                        let remaining = 2;
                        for (const itemId in saveData.cargo) {
                            if (remaining <= 0) break;
                            const qty = saveData.cargo[itemId] || 0;
                            if (qty > 0) {
                                const toSubtract = Math.min(qty, remaining);
                                saveData.cargo[itemId] -= toSubtract;
                                remaining -= toSubtract;
                                if (saveData.cargo[itemId] <= 0) {
                                    delete saveData.cargo[itemId];
                                }
                            }
                        }
                    }
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, "MULE LOST! -2 CARGO!", 0xff4444);
                    }
                    if (player.scene && player.scene.spawnCargoCompanion) {
                        player.scene.time.delayedCall(100, () => {
                            player.scene.spawnCargoCompanion();
                        });
                    }
                }
            }
            if (player.chatSubmitBtn && player.chatSubmitHandler) {
                player.chatSubmitBtn.removeEventListener('click', player.chatSubmitHandler);
            }
            if (player.chatInput && player.chatKeyHandler) {
                player.chatInput.removeEventListener('keypress', player.chatKeyHandler);
            }
            const dieKey = player.classData.id + '_die';
            if (player.scene.anims.exists(dieKey)) {
                player.sprite.off('animationcomplete-' + dieKey);
                player.sprite.once('animationcomplete-' + dieKey, () => {
                    if (player.sprite) player.sprite.destroy();
                });
            } else {
                player.sprite.destroy();
            }
        } else {
            // ═══════════════════════════════════════════
            // PLAYER DEATH → REBIRTH CUTSCENE
            // ═══════════════════════════════════════════
            const scene = player.scene;
            scene.isCutscene = true;
            scene.isIndoors = false;
            scene.currentIndoorLocation = null;
            if (scene.indoorLeaveBtn) scene.indoorLeaveBtn.style.display = 'none';

            // --- 1. WIPE ALL PARTY MEMBERS & MULES ---
            if (scene.partyMembers) {
                [...scene.partyMembers].forEach(member => {
                    if (member.sprite) member.sprite.destroy();
                });
                scene.partyMembers = [];
            }
            // Clear saved party
            if (saveData) {
                saveData.party = [];
                // Wipe all cargo (mules are gone)
                saveData.cargo = {};
            }
            // Respawn cargo companion (removes mule sprites)
            if (scene.spawnCargoCompanion) scene.spawnCargoCompanion();

            // --- 2. XP PENALTY ---
            let xpLoss = 0;
            if (saveData) {
                const currentZone = saveData.currentZone || 0;
                const isHell = currentZone === -666 || (scene.worldManager && scene.worldManager.currentZoneData && scene.worldManager.currentZoneData.biome === 'Hell');
                const lossPct = isHell ? 0.10 : 0.01;
                const currentXp = saveData.xp || 0;
                xpLoss = Math.floor(currentXp * lossPct);
                saveData.xp = Math.max(0, currentXp - xpLoss);
            }

            // --- 3. CALCULATE RESPAWN ZONE ---
            let respawnZone = 0;
            if (saveData) {
                const currentZone = saveData.currentZone || 0;
                const isHell = currentZone === -666;
                if (!isHell && saveData.zones) {
                    for (let i = currentZone; i >= 0; i--) {
                        if (i % 4 === 0) { respawnZone = i; break; }
                    }
                }
                saveData.currentZone = respawnZone;
                if (saveData.preWrathZone !== undefined) {
                    delete saveData.preWrathZone;
                }
                saveData.hp = saveData.maxHp || player.maxHp || 100;
                player.hp = saveData.hp;
                player.saveGame();
                player._persistToLocalStorage();
            }

            // --- 4. SHOW REBIRTH CUTSCENE OVERLAY ---
            const overlay = document.createElement('div');
            overlay.id = 'death-rebirth-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0); display: flex; flex-direction: column;
                align-items: center; justify-content: center; gap: 16px;
                font-family: 'Cinzel', 'Georgia', serif;
                pointer-events: none; transition: background 2s ease;
            `;
            document.body.appendChild(overlay);

            // Fade to black
            requestAnimationFrame(() => { overlay.style.background = 'rgba(0,0,0,1)'; });

            // Show death text after fade
            scene.time.delayedCall(2000, () => {
                if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
                const deathText = document.createElement('div');
                deathText.style.cssText = `
                    font-size: 56px; font-weight: 900; color: #cc0000;
                    text-shadow: 0 0 30px #ff0000, 0 0 60px #880000;
                    letter-spacing: 12px; text-transform: uppercase;
                    opacity: 0; transition: opacity 1.5s ease;
                `;
                deathText.textContent = 'YOU HAVE FALLEN';
                overlay.appendChild(deathText);
                requestAnimationFrame(() => { deathText.style.opacity = '1'; });

                // Show penalties
                scene.time.delayedCall(1500, () => {
                    if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
                    const penaltyContainer = document.createElement('div');
                    penaltyContainer.style.cssText = `
                        display: flex; flex-direction: column; align-items: center; gap: 8px;
                        opacity: 0; transition: opacity 1s ease;
                    `;

                    const penalties = [];
                    if (xpLoss > 0) penalties.push(`⚔️ Lost ${xpLoss} XP`);
                    penalties.push('💀 All party members perished');
                    penalties.push('📦 All cargo lost');

                    penalties.forEach(p => {
                        const line = document.createElement('div');
                        line.style.cssText = `font-size: 18px; color: #ff6666; letter-spacing: 2px;`;
                        line.textContent = p;
                        penaltyContainer.appendChild(line);
                    });

                    overlay.appendChild(penaltyContainer);
                    requestAnimationFrame(() => { penaltyContainer.style.opacity = '1'; });
                });

                // Show rebirth text
                scene.time.delayedCall(4000, () => {
                    if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
                    deathText.style.transition = 'opacity 1s ease, color 1.5s ease, text-shadow 1.5s ease';
                    deathText.textContent = 'REBORN';
                    deathText.style.color = '#44ddff';
                    deathText.style.textShadow = '0 0 30px #00aaff, 0 0 60px #0066aa';
                    deathText.style.letterSpacing = '16px';

                    const subtitleText = document.createElement('div');
                    subtitleText.style.cssText = `
                        font-size: 16px; color: #aaddff; letter-spacing: 4px;
                        font-style: italic; margin-top: 12px;
                        opacity: 0; transition: opacity 1s ease;
                    `;
                    const kingdom = window.getKingdomForZone ? window.getKingdomForZone(respawnZone) : null;
                    const townName = kingdom ? kingdom.name : 'the nearest town';
                    subtitleText.textContent = `Awakening in ${townName}...`;
                    overlay.appendChild(subtitleText);
                    requestAnimationFrame(() => { subtitleText.style.opacity = '1'; });
                });

                // Fade out and restart
                scene.time.delayedCall(6000, () => {
                    if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
                    overlay.style.transition = 'background 1.5s ease';
                    overlay.style.background = 'rgba(0,0,0,0)';
                    scene.time.delayedCall(1600, () => {
                        if (!scene || !scene.scene || !scene.sys || !scene.sys.isActive()) return;
                        overlay.remove();
                        scene.scene.restart();
                    });
                });

            });
        }
    }
};
