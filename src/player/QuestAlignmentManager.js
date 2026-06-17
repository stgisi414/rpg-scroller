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
                targetType: "skeleton",
                targetCount: 5,
                rewardGold: 50,
                currentCount: 0
            };
        }
        // Prevent duplicate quests
        if (player.quests.find(q => q.id === quest.id)) return;
        quest.currentCount = 0;
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
            if (q.targetType === questIdOrEnemyType || q.id === questIdOrEnemyType) {
                const addAmount = (typeof amount === 'number') ? amount : 1;
                q.currentCount += addAmount;
                questUpdated = true;
                
                if (q.currentCount >= q.targetCount) {
                    // Quest Complete!
                    window.saveData.gold += q.rewardGold || 50;
                    const goldDisplay = document.getElementById('hud-gold');
                    if (goldDisplay) {
                        goldDisplay.innerText = `Gold: ${window.saveData.gold}`;
                    }
                    if (player.scene && player.scene.showFloatingText) {
                        player.scene.showFloatingText(player.sprite.x, player.sprite.y - 80, `Quest Complete: ${q.title}!\n+${q.rewardGold || 50} Gold`, 0xffaa00);
                    }
                    player.quests.splice(i, 1);
                }
            }
        }
        if (questUpdated) {
            window.saveData.quests = player.quests;
            player._persistToLocalStorage();
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
            const pct = Math.min(100, Math.round((q.currentCount / q.targetCount) * 100));
            questList.innerHTML += `
                <div class="bg-surface-container border border-outline-variant p-2 rounded">
                    <div class="font-body-sm font-bold text-on-surface text-[12px] uppercase">${q.title}</div>
                    <div class="font-label-caps text-[10px] text-on-surface-variant mb-1">${q.description}</div>
                    <div class="flex justify-between items-end mb-1">
                        <span class="font-label-caps text-[9px] text-primary">Progress</span>
                        <span class="font-label-caps text-[9px] text-primary">${q.currentCount} / ${q.targetCount}</span>
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
