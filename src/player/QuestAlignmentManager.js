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
        if (!window.saveData) {
            window.saveData = {};
        }
        window.saveData = JSON.parse(JSON.stringify(window.saveData));
        window.saveData.quests = JSON.parse(JSON.stringify(player.quests));
        player._persistToLocalStorage();
        this.renderQuests();
        console.log("Quest Added:", quest);
    }

    progressQuest(questIdOrEnemyType, objectiveIndex, amount) {
        const player = this.player;
        if (!window.saveData) {
            window.saveData = {};
        }
        window.saveData = JSON.parse(JSON.stringify(window.saveData));
        let questUpdated = false;
        
        for (let i = player.quests.length - 1; i >= 0; i--) {
            const q = player.quests[i];
            const questType = q.type || 'kill';

            // Kill quests: match by targetType or quest ID
            if (questType === 'kill') {
                if (q.targetType === questIdOrEnemyType || q.id === questIdOrEnemyType) {
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
        }
        if (questUpdated) {
            window.saveData.quests = player.quests;
            player._persistToLocalStorage();
            this.renderQuests();
        }
    }

    _completeQuest(quest, index) {
        const player = this.player;
        const rewardGold = quest.rewardGold || 50;
        const rewardXP = quest.rewardXP || 0;

        // Grant gold
        window.saveData.gold += rewardGold;
        const goldDisplay = document.getElementById('hud-gold');
        if (goldDisplay) {
            goldDisplay.innerText = `Gold: ${window.saveData.gold}`;
        }

        // Grant XP
        if (rewardXP > 0 && player.scene && typeof player.scene.grantRewards === 'function') {
            player.scene.grantRewards(rewardXP, 0); // XP only, gold already added
        }

        // Grant alignment for rescue quests
        if (quest.type === 'rescue') {
            this.updateAlignment(5);
        }

        // Show completion floating text
        let rewardText = `Quest Complete: ${quest.title}!\n+${rewardGold} Gold`;
        if (rewardXP > 0) rewardText += ` +${rewardXP} XP`;
        if (player.scene && player.scene.showFloatingText) {
            player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, rewardText, 0xffaa00);
        }

        player.quests.splice(index, 1);
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
            window.saveData.quests = JSON.parse(JSON.stringify(this.player.quests));
            this.player._persistToLocalStorage();
            this.renderQuests();
        }
    }

    renderQuests() {
        const player = this.player;
        const questList = document.getElementById('quest-list');
        const uiQuests = document.getElementById('ui-quests');
        if (!questList || !uiQuests) return;

        if (player.quests.length === 0) {
            uiQuests.classList.add('translate-x-full');
            return;
        }

        uiQuests.classList.remove('translate-x-full');
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
