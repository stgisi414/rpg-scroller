class QuestAlignmentManager {
    constructor(player) {
        this.player = player;
    }

    updateAlignment(amount) {
        const player = this.player;
        player.alignment += amount;
        
        let alignmentTitle = "Neutral";
        if (player.alignment >= 20) alignmentTitle = "Heroic";
        else if (player.alignment >= 10) alignmentTitle = "Good";
        else if (player.alignment <= -20) alignmentTitle = "Villainous";
        else if (player.alignment <= -10) alignmentTitle = "Evil";

        if (player.alignmentDisplay) {
            player.alignmentDisplay.innerText = `Alignment: ${player.alignment} (${alignmentTitle})`;
        }
    }

    addQuest(questOrId) {
        const player = this.player;
        let quest = questOrId;
        if (typeof questOrId === 'string' || typeof questOrId === 'number') {
            quest = {
                id: questOrId,
                title: "Quest " + questOrId,
                description: "Complete objective for quest " + questOrId,
                type: 'kill',
                targetType: "skeleton",
                targetCount: 5,
                rewardGold: 50,
                rewardXP: 50,
                currentCount: 0
            };
        }
        // Prevent duplicate quests
        if (player.quests.find(q => q.id === quest.id)) return;
        quest.currentCount = quest.currentCount || 0;
        // Default type to 'kill' for backward compatibility
        if (!quest.type) quest.type = 'kill';
        player.quests.push(quest);
        if (!saveData) {
            saveData = {};
        }
        saveData = JSON.parse(JSON.stringify(saveData));
        saveData.quests = JSON.parse(JSON.stringify(player.quests));
        player._persistToLocalStorage();
        this.renderQuests();
        console.log("Quest Added:", quest);
    }

    progressQuest(questIdOrEnemyType, objectiveIndex, amount) {
        const player = this.player;
        if (!saveData) {
            saveData = {};
        }
        saveData = JSON.parse(JSON.stringify(saveData));
        let questUpdated = false;
        
        for (let i = player.quests.length - 1; i >= 0; i--) {
            const q = player.quests[i];
            const questType = q.type || 'kill';

            // Kill quests: match by targetType or quest ID
            if (questType === 'kill') {
                const targetLower = (q.targetType || '').toLowerCase().trim();
                const enemyLower = (questIdOrEnemyType || '').toLowerCase().trim();
                
                const isMatch = targetLower === enemyLower ||
                                targetLower === enemyLower + 's' ||
                                enemyLower === targetLower + 's' ||
                                (targetLower.length > 2 && enemyLower.length > 2 && (targetLower.includes(enemyLower) || enemyLower.includes(targetLower))) ||
                                q.id === questIdOrEnemyType;

                if (isMatch) {
                    const addAmount = (typeof amount === 'number') ? amount : 1;
                    q.currentCount += addAmount;
                    questUpdated = true;
                    
                    if (q.currentCount >= q.targetCount) {
                        this._completeQuest(q, i);
                    }
                }
            }
            // Rescue quests: triggered by 'rescue_complete' + questId match
            else if (questType === 'rescue') {
                if (questIdOrEnemyType === 'rescue_complete' && q.id === (objectiveIndex || q.id)) {
                    q.rescueState = 'rescued';
                    q.currentCount = q.targetCount; // Mark as complete
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
            // Delivery quests: triggered by 'delivery_complete' + questId match
            else if (questType === 'delivery') {
                if (questIdOrEnemyType === 'delivery_complete' && q.id === (objectiveIndex || q.id)) {
                    q.currentCount = q.targetCount;
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
            // Diplomacy quests (Phase 6)
            else if (questType === 'diplomacy') {
                if (questIdOrEnemyType === 'diplomacy_complete' && q.id === (objectiveIndex || q.id)) {
                    q.currentCount = q.targetCount;
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
            // Espionage quests (Phase 6)
            else if (questType === 'espionage') {
                if (questIdOrEnemyType === 'espionage_complete' && q.targetKingdom === objectiveIndex) {
                    q.currentCount = q.targetCount;
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
            // Assassination quests (Phase 6)
            else if (questType === 'assassination') {
                if (questIdOrEnemyType === 'assassination_complete' && q.targetFaction === objectiveIndex) {
                    q.currentCount = q.targetCount;
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
            // Intel Report quests (Phase 6)
            else if (questType === 'intel_report') {
                if (questIdOrEnemyType === 'intel_report_complete' && q.id === (objectiveIndex || q.id)) {
                    q.currentCount = q.targetCount;
                    questUpdated = true;
                    this._completeQuest(q, i);
                }
            }
        }
        if (questUpdated) {
            saveData.quests = player.quests;
            player._persistToLocalStorage();
            this.renderQuests();
        }
    }

    _completeQuest(quest, index) {
        const player = this.player;
        let rewardGold = quest.rewardGold || 50;
        const rewardXP = quest.rewardXP || 0;

        // Apply alignment multiplier to gold reward
        if (quest.giverAlignment) {
            let playerAlignType = 'Neutral';
            if (player.alignment >= 10) playerAlignType = 'Good';
            else if (player.alignment <= -10) playerAlignType = 'Evil';
            
            if (quest.giverAlignment === 'Good') {
                if (playerAlignType === 'Good') {
                    rewardGold = Math.round(rewardGold * 1.3); // 30% bonus
                } else if (playerAlignType === 'Evil') {
                    rewardGold = Math.round(rewardGold * 0.7); // 30% reduction
                }
            } else if (quest.giverAlignment === 'Evil') {
                if (playerAlignType === 'Evil') {
                    rewardGold = Math.round(rewardGold * 1.3); // 30% bonus
                } else if (playerAlignType === 'Good') {
                    rewardGold = Math.round(rewardGold * 0.7); // 30% reduction
                }
            }
        }

        // Grant gold
        saveData.gold += rewardGold;
        const goldDisplay = document.getElementById('hud-gold');
        if (goldDisplay) {
            goldDisplay.innerText = `Gold: ${saveData.gold}`;
        }

        // Grant XP
        if (rewardXP > 0 && player.scene && typeof player.scene.grantRewards === 'function') {
            player.scene.grantRewards(rewardXP, 0); // XP only, gold already added
        }

        // Grant alignment for rescue quests
        if (quest.type === 'rescue') {
            this.updateAlignment(5);
        }

        // Grant faction reputation (Phase 6)
        const rewardRep = quest.rewardReputation || 15;
        if (quest.factionId && window.changeFactionReputation) {
            window.changeFactionReputation(quest.factionId, rewardRep, true);
            
            const factionName = window.WORLD_FACTIONS[quest.factionId] ? window.WORLD_FACTIONS[quest.factionId].name : quest.factionId;
            if (player.scene && player.scene.showFloatingText) {
                player.scene.time.delayedCall(1000, () => {
                    if (player.sprite && player.sprite.active) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 120, `🤝 +${rewardRep} reputation with ${factionName}`, 0x88aaff);
                    }
                });
            }
        }

        // Faction reputation penalties for specific quest completions
        if (quest.type === 'assassination' && quest.targetFaction && window.changeFactionReputation) {
            window.changeFactionReputation(quest.targetFaction, -35, true);
            
            const targetFactName = window.WORLD_FACTIONS[quest.targetFaction] ? window.WORLD_FACTIONS[quest.targetFaction].name : quest.targetFaction;
            if (player.scene && player.scene.showFloatingText) {
                player.scene.time.delayedCall(2000, () => {
                    if (player.sprite && player.sprite.active) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 140, `⚠️ -35 reputation with ${targetFactName} (Assassination)`, 0xff4444);
                    }
                });
            }
        }

        // Show completion floating text
        let rewardText = `Quest Complete: ${quest.title}!\n+${rewardGold} Gold`;
        if (rewardXP > 0) rewardText += ` +${rewardXP} XP`;
        if (player.scene && player.scene.showFloatingText) {
            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, rewardText, 0xffaa00);
        }

        player.quests.splice(index, 1);
        saveData.quests = player.quests;
        player._persistToLocalStorage();
    }

    // Check if player has a rescue quest for a specific zone
    getRescueQuestForZone(zoneIndex) {
        return this.player.quests.find(q => 
            q.type === 'rescue' && 
            q.rescueeZone === zoneIndex && 
            q.rescueState !== 'rescued'
        );
    }

    // Check if player has any active rescue quest with a following rescuee
    getActiveFollowingRescue() {
        return this.player.quests.find(q => 
            q.type === 'rescue' && 
            q.rescueState === 'following'
        );
    }

    // Check if player has a delivery quest targeting a specific zone
    getDeliveryQuestForZone(zoneIndex) {
        return this.player.quests.find(q => 
            q.type === 'delivery' && 
            q.deliveryTargetZone === zoneIndex &&
            q.deliveryPickedUp === true
        );
    }

    // Mark a rescue quest's rescuee as following
    setRescueFollowing(questId) {
        const quest = this.player.quests.find(q => q.id === questId);
        if (quest) {
            quest.rescueState = 'following';
            saveData.quests = JSON.parse(JSON.stringify(this.player.quests));
            this.player._persistToLocalStorage();
            this.renderQuests();
        }
    }

    renderQuests() {
        const player = this.player;
        const questList = document.getElementById('quest-list');
        const uiQuests = document.getElementById('ui-quests');
        if (!questList || !uiQuests) return;

        // Initialize toggle button event listener
        const toggleBtn = document.getElementById('btn-toggle-quests');
        if (toggleBtn && !toggleBtn.hasListener) {
            toggleBtn.hasListener = true;
            toggleBtn.onclick = () => {
                window.questsCollapsed = !window.questsCollapsed;
                this.renderQuests();
            };
        }

        if (player.quests.length === 0) {
            uiQuests.classList.add('translate-x-full');
            return;
        }

        uiQuests.classList.remove('translate-x-full');
        
        // Apply collapsed state
        if (window.questsCollapsed) {
            questList.style.display = 'none';
            if (toggleBtn) toggleBtn.innerText = 'Show';
        } else {
            questList.style.display = 'flex';
            if (toggleBtn) toggleBtn.innerText = 'Hide';
        }

        questList.innerHTML = '';
        player.quests.forEach(q => {
            const questType = q.type || 'kill';
            let typeIcon = '⚔️';
            let statusText = '';
            let pct = 0;

            if (questType === 'kill') {
                typeIcon = '⚔️';
                pct = Math.min(100, Math.round((q.currentCount / q.targetCount) * 100));
                statusText = `${q.currentCount} / ${q.targetCount}`;
            } else if (questType === 'rescue') {
                typeIcon = '🆘';
                const state = q.rescueState || 'captive';
                if (state === 'captive') {
                    statusText = 'Clear enemies & rescue';
                    pct = 0;
                } else if (state === 'following') {
                    statusText = 'Escort to town';
                    pct = 66;
                } else {
                    statusText = 'Complete!';
                    pct = 100;
                }
            } else if (questType === 'delivery') {
                typeIcon = '📦';
                if (q.deliveryPickedUp) {
                    statusText = `Deliver to ${q.deliveryTargetNPC}`;
                    pct = 50;
                } else {
                    statusText = 'Pick up package';
                    pct = 0;
                }
            }

            const description = q.description || '';
            questList.innerHTML += `
                <div class="bg-surface-container border border-outline-variant p-2 rounded">
                    <div class="font-body-sm font-bold text-on-surface text-[12px] uppercase">${typeIcon} ${q.title}</div>
                    <div class="font-label-caps text-[10px] text-on-surface-variant mb-1">${description}</div>
                    <div class="flex justify-between items-end mb-1">
                        <span class="font-label-caps text-[9px] text-primary">Progress</span>
                        <span class="font-label-caps text-[9px] text-primary">${statusText}</span>
                    </div>
                    <div class="h-1 w-full bg-surface-container-highest rounded overflow-hidden">
                        <div class="h-full bg-primary" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        });
    }
}

window.QuestAlignmentManager = QuestAlignmentManager;
