class ProgressionManager {
    constructor(scene) {
        this.scene = scene;
    }

    grantRewards(xpEarned, goldEarned) {
        const scene = this.scene;
        // Logic to add XP and Gold to player's save data
        if (!window.saveData) return;
        
        window.saveData.xp = (window.saveData.xp || 0) + xpEarned;
        window.saveData.gold = (window.saveData.gold || 0) + goldEarned;
        
        // Show floating text for rewards above player
        if (scene.showFloatingText && scene.player && scene.player.sprite && scene.player.sprite.active) {
            scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 40, `+${xpEarned} XP`, 0x00ffff);
        }
        
        setTimeout(() => {
            if (scene.player && scene.player.sprite && scene.player.sprite.active) {
                if (scene.showFloatingText) {
                    scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 40, `+${goldEarned} Gold`, 0xffff00);
                }
            }
        }, 500);

        // Check for Level Ups
        let currentLevel = window.saveData.level || 1;
        let xpToNextLevel = currentLevel * 100;
        let leveledUp = false;
        let gainedPoints = 0;

        while (window.saveData.xp >= xpToNextLevel) {
            window.saveData.xp -= xpToNextLevel;
            currentLevel++;
            window.saveData.level = currentLevel;
            gainedPoints++;
            leveledUp = true;
            xpToNextLevel = currentLevel * 100;
        }

        if (leveledUp) {
            // Apply percentage-accelerated stats growth formula
            const classId = window.saveData.classId || 'knight';
            const newStats = window.calculateStatsForLevel ? window.calculateStatsForLevel(classId, currentLevel) : window.classesData[classId].stats;
            newStats.migratedProgress = true;
            window.saveData.stats = newStats;
            if (window.selectedClass) {
                window.selectedClass.stats = { ...newStats };
            }
            window.saveData.skillPoints = (window.saveData.skillPoints || 0) + gainedPoints;
            console.log(`[Level Up] Reached level ${currentLevel}. Gained ${gainedPoints} skill points. Total points: ${window.saveData.skillPoints}`);
        }

        if (leveledUp) {
            setTimeout(() => {
                if (scene.player && scene.player.sprite && scene.player.sprite.active) {
                    if (scene.showFloatingText) {
                        scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 60, `LEVEL UP!`, 0x00ff00);
                    }
                    // Update Player Controller stats
                    scene.player.recalculateStats();
                    // Fully heal on level up
                    scene.player.hp = scene.player.maxHp;
                    scene.player.mp = scene.player.maxMp;
                    scene.player.sp = scene.player.maxSp;

                    // Trigger unspent points notification
                    if (scene.hudManager) {
                        scene.hudManager.showUnspentSkillPointsBanner();
                    }

                    // Also level up and heal party members!
                    if (scene.partyMembers) {
                        scene.partyMembers.forEach(member => {
                            if (member && member.sprite && member.sprite.active) {
                                // Refresh class data to apply new level scaling
                                member.classData = member._getAIClassData ? member._getAIClassData(member.classId) : member.classData;
                                member.recalculateStats();
                                member.hp = member.maxHp;
                                member.mp = member.maxMp;
                                member.sp = member.maxSp;
                                if (scene.showFloatingText) {
                                    scene.showFloatingText(member.sprite.x, member.sprite.y - 60, `LEVEL UP!`, 0x00ff00);
                                }
                            }
                        });
                    }
                }
            }, 1000);
        }

        // Add camaraderie for fighting alongside allies
        if (scene.partyMembers && scene.partyMembers.length > 0) {
            scene.partyMembers.forEach(member => {
                // 25% chance to gain 1 camaraderie per kill
                if (Math.random() < 0.25) {
                    member.camaraderie = (member.camaraderie || 0) + 1;
                    if (scene.showFloatingText && member.sprite && member.sprite.active) {
                        scene.showFloatingText(member.sprite.x, member.sprite.y - 30, "+1 Camaraderie", 0xf6be3b);
                    }
                }
            });
        }

        // Update HUD
        scene.updateHUD();
    }
}
