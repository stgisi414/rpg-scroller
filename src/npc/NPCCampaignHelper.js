/**
 * NPCCampaignHelper.js - Handles NPC relationship states, campaign contexts,
 * marriage proposals, and intelligence sales interactions.
 * Extracted from NPCController.js to modularize class code.
 */
window.NPCCampaignHelper = {
    getGameState(npc) {
        const p = npc.player;
        const wm = npc.scene.worldManager;
        
        let luckOverride = typeof npc.checkLuckOverride === 'function' ? npc.checkLuckOverride() : false;
        if (p && p.inventory && p.inventory.artifacts && p.inventory.equippedArtifact >= 0) {
            const artKey = p.inventory.artifacts[p.inventory.equippedArtifact];
            if (artKey === 'artifact-clover') {
                luckOverride = true;
            }
        }

        const pc = this.getPoliticalContext(npc);
        if (luckOverride) {
            if (pc.npcFactionReputation < 0) pc.npcFactionReputation = 0;
            if (pc.rulingFactionReputation < 0) pc.rulingFactionReputation = 0;
        }

        return {
            zone: wm && wm.currentZoneData ? { name: wm.currentZoneData.name, lore: wm.currentZoneData.loreText, biome: wm.currentZoneData.biome, zoneIndex: wm.currentZoneIndex } : null,
            weather: npc.scene.weatherManager ? npc.scene.weatherManager.currentWeather : 'clear',
            luckOverride: luckOverride,
            player: {
                level: p.level || (saveData && saveData.level) || 1,
                class: p.classData ? p.classData.id : "adventurer",
                hp: `${p.hp}/${p.maxHp}`,
                gold: (saveData && typeof saveData.gold === 'number') ? saveData.gold : (p.inventory ? p.inventory.gold : 0),
                alignment: p.alignment || 0,
                isSavior: (saveData && saveData.isSavior) || false,
                inventory: p.inventory,
                quests: p.quests,
                coliseumReputation: p.coliseumReputation || 0
            },
            npc: {
                alignment: npc.alignment,
                socialScore: luckOverride ? Math.max(20, npc.socialScore) : npc.socialScore,
                isMismatched: !luckOverride && ((npc.alignment === 'Good' && p.alignment <= -40) || (npc.alignment === 'Evil' && p.alignment >= 40)),
                faction: npc.faction,
                factionRank: npc.factionRank,
                politicalTitle: npc.politicalTitle,
                personality: npc.personality,
                languageInfo: npc.getLanguageInfo(),
                playerUnderstandsLanguage: npc.checkPlayerUnderstanding().understands
            },
            politicalContext: pc
        };
    },

    getPoliticalContext(npc) {
        const zoneIdx = (saveData && saveData.currentZone) || 0;
        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIdx) : null;
        const rulingFaction = window.getFactionForZone ? window.getFactionForZone(zoneIdx) : null;
        
        let npcFactionData = null;
        let npcFactionRep = 0;
        if (npc.faction && window.WORLD_FACTIONS && window.WORLD_FACTIONS[npc.faction]) {
            npcFactionData = window.WORLD_FACTIONS[npc.faction];
            npcFactionRep = window.getFactionReputation ? window.getFactionReputation(npc.faction) : 0;
        }

        let rulingFactionRep = 0;
        if (rulingFaction) {
            rulingFactionRep = window.getFactionReputation ? window.getFactionReputation(rulingFaction.id) : 0;
        }

        const relations = {};
        if (rulingFaction && rulingFaction.relations) {
            for (const fId in rulingFaction.relations) {
                const score = rulingFaction.relations[fId];
                const otherFactionName = window.WORLD_FACTIONS[fId] ? window.WORLD_FACTIONS[fId].name : fId;
                relations[otherFactionName] = score;
            }
        }

        const discovered = [];
        if (saveData && saveData.discoveredKingdoms) {
            for (const kId in saveData.discoveredKingdoms) {
                discovered.push(saveData.discoveredKingdoms[kId].name);
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
    },

    checkDeliveryQuestCompletion(npc) {
        if (!npc.player || !npc.player.quests) return;
        const currentZone = (saveData && saveData.currentZone) || 0;
        
        for (const quest of npc.player.quests) {
            if (quest.type === 'delivery' && 
                quest.deliveryPickedUp === true && 
                quest.deliveryTargetZone === currentZone) {
                if (npc.player.progressQuest) {
                    npc.player.progressQuest('delivery_complete', quest.id);
                }
                if (npc.scene && npc.scene.showFloatingText) {
                    npc.scene.showFloatingText(
                        npc.sprite.x, npc.sprite.y - 60,
                        `📦 ${quest.deliveryItem} Delivered!`, 0x44ff44
                    );
                }
                break;
            }
            
            if (quest.type === 'diplomacy' && quest.targetRuler === npc.npcName) {
                if (npc.player.progressQuest) {
                    npc.player.progressQuest('diplomacy_complete', quest.id);
                }
                if (npc.scene && npc.scene.showFloatingText) {
                    npc.scene.showFloatingText(
                        npc.sprite.x, npc.sprite.y - 60,
                        `📜 Treaty Delivered to ${npc.npcName}!`, 0x44ff44
                    );
                }
                break;
            }
            
            if (quest.type === 'intel_report') {
                const isLeaderOrOfficer = npc.factionRank === 'leader' || npc.factionRank === 'officer';
                if (isLeaderOrOfficer) {
                    if (npc.player.progressQuest) {
                        npc.player.progressQuest('intel_report_complete', quest.id);
                    }
                    if (npc.scene && npc.scene.showFloatingText) {
                        npc.scene.showFloatingText(
                            npc.sprite.x, npc.sprite.y - 60,
                            `🗺️ Frontier Intel Delivered!`, 0x44ff44
                        );
                    }
                    break;
                }
            }
        }
    },

    handleProposal(npc) {
        if (saveData && saveData.spouseData) {
            npc.addMessageToUI("System", `<span style="color:#ff4444">You are already married to ${saveData.spouseData.name}!</span>`);
            return;
        }

        const isLeader = npc.factionRank === 'leader';
        const rep = npc.faction && window.getFactionReputation ? window.getFactionReputation(npc.faction) : 0;
        
        if (isLeader && rep < 75) {
            npc.addMessageToUI(npc.npcName, "A member of the royalty cannot marry outside their rank without high political standing. Earn the trust of my kingdom first.");
            return;
        }

        const btn = document.getElementById('chat-propose');
        if (btn) btn.remove();

        npc.closeChat();

        const dialogue = [
            {
                speaker: "Narrator",
                text: `The grand cathedral bells begin to ring, echoing across the land in celebration of a historic union.`
            },
            {
                speaker: npc.npcName,
                portrait: npc.spriteKey,
                side: 'right',
                text: `I do. In times of battle and peace, I bind my soul to yours. Together, we shall face whatever comes next.`
            },
            {
                speaker: "Narrator",
                text: `The priest raises his hands, blessing the bond. With vows sealed and rings exchanged, the ceremony concludes.`
            }
        ];

        if (npc.scene.cutsceneController) {
            npc.scene.cutsceneController.playCutscene(dialogue, () => {
                saveData.spouseData = {
                    name: npc.npcName,
                    spriteKey: npc.spriteKey,
                    faction: npc.faction || null
                };
                
                if (npc.player && npc.player._persistToLocalStorage) {
                    npc.player._persistToLocalStorage();
                }

                if (npc.scene.showFloatingText && npc.player && npc.player.sprite && npc.player.sprite.active) {
                    npc.scene.showFloatingText(
                        npc.player.sprite.x, npc.player.sprite.y - 80,
                        `💍 Married to ${npc.npcName}!`, 0xec4899
                    );
                }
            });
        }
    },

    handleSellIntel(npc) {
        if (!saveData || !saveData.discoveredKingdoms) return;
        
        const unsoldKingdom = Object.values(saveData.discoveredKingdoms).find(k => {
            const soldList = (saveData.soldIntel && saveData.soldIntel[npc.faction]) || [];
            return !soldList.includes(k.id);
        });
        
        if (!unsoldKingdom) return;
        
        saveData.soldIntel = saveData.soldIntel || {};
        saveData.soldIntel[npc.faction] = saveData.soldIntel[npc.faction] || [];
        saveData.soldIntel[npc.faction].push(unsoldKingdom.id);
        
        const rewardGold = 250;
        const rewardRep = 15;
        saveData.gold += rewardGold;
        
        const goldDisplay = document.getElementById('hud-gold');
        if (goldDisplay) goldDisplay.innerText = `Gold: ${saveData.gold}`;
        
        if (window.changeFactionReputation) {
            window.changeFactionReputation(npc.faction, rewardRep, true);
        }
        
        if (npc.player && npc.player._persistToLocalStorage) {
            npc.player._persistToLocalStorage();
        }
        
        const btn = document.getElementById('chat-sell-intel');
        if (btn) btn.remove();
        
        npc.closeChat();
        
        const dialogue = [
            {
                speaker: "Narrator",
                text: `You present the map and findings of the procedural frontier kingdom of ${unsoldKingdom.name} to the court.`
            },
            {
                speaker: `${npc.politicalTitle} ${npc.npcName}`,
                portrait: npc.spriteKey,
                side: 'right',
                text: `This map is of incredible importance to the ${window.WORLD_FACTIONS[npc.faction].name}. Knowing who holds the lands beyond is a massive advantage. Take this gold reward for your discovery.`
            }
        ];
        
        if (npc.scene.cutsceneController) {
            npc.scene.cutsceneController.playCutscene(dialogue, () => {
                if (npc.scene.showFloatingText && npc.player && npc.player.sprite && npc.player.sprite.active) {
                    npc.scene.showFloatingText(
                        npc.player.sprite.x, npc.player.sprite.y - 80,
                        `🗺️ Intel Sold: +250g, +15 rep!`, 0x10b981
                    );
                }
            });
        }
    },

    addMarriageButton(npc) {
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
            npc.handleProposal();
        };
    },

    addIntelButton(npc) {
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
            npc.handleSellIntel();
        };
    },

    executeActivityEffect(npc, targetParam = null) {
        npc.activeActivity = null;
        
        let rewardText = "";
        const tryRecruit = (classId, cost, alignmentReq = null) => {
            const party = npc.scene.partyMembers || [];
            if (party.length >= 6) {
                rewardText = "Party is full (max 6 members)!";
                return;
            }
            const alignment = (saveData && saveData.alignment !== undefined) ? saveData.alignment : 0;
            
            // Check if alignment requirement is met for free recruitment
            let meetsAlignment = false;
            if (alignmentReq !== null) {
                if (alignmentReq > 0 && alignment >= alignmentReq) meetsAlignment = true;
                if (alignmentReq < 0 && alignment <= alignmentReq) meetsAlignment = true;
            }
            
            const finalCost = meetsAlignment ? 0 : cost;
            
            if (saveData && typeof saveData.gold === 'number' && saveData.gold >= finalCost) {
                saveData.gold -= finalCost;
                if (npc.player) npc.player.gold = saveData.gold;
                
                // Spawn companion
                if (npc.scene.spawnHeroAI) {
                    const companionName = window.CharacterComposer ? window.CharacterComposer.generateRandomName(classId) : classId.toUpperCase();
                    npc.scene.spawnHeroAI(classId, npc.player.sprite.x, npc.player.sprite.y, 'party', companionName);
                }
                
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                npc.closeChat();
                rewardText = `Recruited ${classId.toUpperCase()}!${finalCost > 0 ? ` -${finalCost}g` : ' (Alignment Bonus!)'}`;
            } else {
                rewardText = `Need ${finalCost}g to recruit ${classId.toUpperCase()}!`;
            }
        };
        if (npc.indoorAction === 'train') {
            if (!npc.scene.anims.exists('training_dummy-idle')) {
                npc.scene.anims.create({ key: 'training_dummy-idle', frames: npc.scene.anims.generateFrameNumbers('training_dummy', { start: 0, end: 8 }), frameRate: 8, repeat: -1 });
                npc.scene.anims.create({ key: 'training_dummy-hit', frames: npc.scene.anims.generateFrameNumbers('training_dummy', { start: 9, end: 13 }), frameRate: 12, repeat: 0 });
                npc.scene.anims.create({ key: 'training_dummy-die', frames: npc.scene.anims.generateFrameNumbers('training_dummy', { start: 9, end: 13 }), frameRate: 12, repeat: 0 });
            }
            if (window.EnemyController) {
                const dummy = new window.EnemyController(npc.scene, 600, 500, npc.player, npc.geminiService, 'training_dummy');
                dummy.maxHp = 999999;
                dummy.hp = 999999;
                dummy.stats = { hp: 999999, maxHp: 999999, atk: 0, def: 5, spd: 0, xp: 50 };
                dummy.isDummy = true;
                dummy.isHit = false;
                dummy.sprite.setScale(0.8);
                if (npc.scene.enemies && npc.scene.enemies.add) npc.scene.enemies.add(dummy.sprite);
                if (npc.scene.isIndoors && npc.scene.indoorFloor) {
                    npc.scene.physics.add.collider(dummy.sprite, npc.scene.indoorFloor);
                } else {
                    npc.scene.physics.add.collider(dummy.sprite, npc.scene.platforms);
                }
                if (npc.scene.showFloatingText) npc.scene.showFloatingText(npc.player.sprite.x, npc.player.sprite.y - 50, "Training Dummy Spawned!", 0xffff00);
            }
            return;
        }

        if (npc.indoorAction === 'arena') {
            npc.closeChat();
            if (npc.scene.arenaManager) {
                npc.scene.arenaManager.startWave();
            }
            return;
        }

        rewardText = "";
        switch (npc.indoorAction) {
            case 'rest':
                npc.player.hp = npc.player.maxHp;
                npc.player.mp = npc.player.maxMp;
                npc.player.sp = npc.player.maxSp;
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                rewardText = "Fully Rested!";
                break;
            case 'forge':
                if (npc.player.inventory.weapon) {
                    npc.player.inventory.weapon.damageBonus = (npc.player.inventory.weapon.damageBonus || 0) + 5;
                    rewardText = "Weapon Upgraded (+5 Dmg)!";
                }
                break;
            case 'brew':
                npc.player.inventory.potions = (npc.player.inventory.potions || 0) + 1;
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                rewardText = "Received 1 HP Potion!";
                break;
            case 'contracts':
                const currentZone = (saveData && saveData.currentZone) || 0;
                const localFaction = window.getFactionForZone ? window.getFactionForZone(currentZone) : null;
                const factionId = localFaction ? localFaction.id : null;

                if (npc.pendingQuestType === 'kill' && npc.pendingQuestTarget) {
                    const quest = {
                        id: `bounty_${Date.now()}`,
                        type: 'kill',
                        title: `Hunt ${npc.pendingQuestTarget}s`,
                        description: `Slay 3 ${npc.pendingQuestTarget}s in the wilderness.`,
                        targetType: npc.pendingQuestTarget,
                        targetCount: 3,
                        currentCount: 0,
                        rewardGold: 100,
                        rewardXP: 75,
                        factionId: factionId
                    };
                    npc.player.addQuest(quest);
                    rewardText = `Quest Accepted: Hunt 3 ${npc.pendingQuestTarget}s!`;
                } else if (npc.pendingQuestType === 'rescue' && npc.pendingQuestName) {
                    const quest = {
                        id: `rescue_${Date.now()}`,
                        type: 'rescue',
                        title: `Rescue ${npc.pendingQuestName}`,
                        description: `Clear all enemies in zone ${npc.pendingQuestZone} and escort ${npc.pendingQuestName} back to a town.`,
                        targetCount: 1,
                        currentCount: 0,
                        rescueeName: npc.pendingQuestName,
                        rescueeGender: npc.pendingQuestGender,
                        rescueeZone: npc.pendingQuestZone,
                        rescueState: 'captive',
                        rewardGold: 150,
                        rewardXP: 120,
                        factionId: factionId
                    };
                    npc.player.addQuest(quest);
                    rewardText = `Rescue Quest: Save ${npc.pendingQuestName} in Zone ${npc.pendingQuestZone}!`;
                } else if (npc.pendingQuestType === 'delivery' && npc.pendingQuestItem) {
                    const quest = {
                        id: `delivery_${Date.now()}`,
                        type: 'delivery',
                        title: `Deliver ${npc.pendingQuestItem}`,
                        description: `Bring the ${npc.pendingQuestItem} to the ${npc.pendingQuestTargetNPC} in zone ${npc.pendingQuestZone}.`,
                        targetCount: 1,
                        currentCount: 0,
                        deliveryItem: npc.pendingQuestItem,
                        deliveryTargetZone: npc.pendingQuestZone,
                        deliveryTargetNPC: npc.pendingQuestTargetNPC,
                        deliveryPickedUp: true,
                        rewardGold: 120,
                        rewardXP: 80,
                        factionId: factionId
                    };
                    npc.player.addQuest(quest);
                    rewardText = `Delivery Quest: Bring ${npc.pendingQuestItem} to zone ${npc.pendingQuestZone}!`;
                }
                break;
            case 'pray':
                const healCost = 25;
                let didHeal = false;
                const stats = ['vit', 'str', 'dex', 'int'];
                const randomStat = stats[Math.floor(Math.random() * stats.length)];
                if (saveData && typeof saveData.gold === 'number' && saveData.gold >= healCost) {
                    saveData.gold -= healCost;
                    if (npc.player) {
                        npc.player.gold = saveData.gold;
                        npc.player.hp = npc.player.maxHp;
                        npc.player.mp = npc.player.maxMp;
                        if (npc.player.classData && npc.player.classData.stats) {
                            npc.player.classData.stats[randomStat]++;
                            npc.player.recalculateStats();
                        }
                    }
                    didHeal = true;
                }
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                if (didHeal) {
                    rewardText = `Healed & Blessed (+1 ${randomStat.toUpperCase()})! -${healCost}g`;
                } else {
                    rewardText = `Need ${healCost}g for healing and blessing!`;
                }
                break;
            case 'study':
                if (npc.player.tempStats) {
                    npc.player.tempStats.int += 1;
                    npc.player.recalculateStats();
                }
                if (npc.scene && npc.scene.updateHUD) npc.scene.updateHUD();
                rewardText = "Temporary +1 INT Buff!";
                break;
            case 'recruit_warrior':
                if (targetParam === 'knight') {
                    tryRecruit('knight', 100);
                } else if (targetParam === 'samurai') {
                    tryRecruit('samurai', 150);
                } else {
                    rewardText = "Choose Knight or Samurai to recruit.";
                }
                break;
            case 'recruit_mage':
                if (targetParam === 'wizard') {
                    tryRecruit('wizard', 150);
                } else if (targetParam === 'pyromancer') {
                    tryRecruit('pyromancer', 200);
                } else {
                    rewardText = "Choose Wizard or Pyromancer to recruit.";
                }
                break;
            case 'recruit_priest':
                tryRecruit('priest', 150, 30);
                break;
            case 'recruit_ranger':
                tryRecruit('ranger', 120, 20);
                break;
            case 'recruit_spellblade':
                tryRecruit('elven_spellblade', 180, 40);
                break;
            case 'recruit_witch':
                tryRecruit('witch', 200, -30);
                break;
        }

        if (rewardText) {
            if (npc.scene.showFloatingText) npc.scene.showFloatingText(npc.player.sprite.x, npc.player.sprite.y - 50, rewardText, 0x00ff00);
        }
    }
};
