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

        // Class-specific stat growth per level
        const growthTable = {
            knight:   { vit: 2, str: 2, dex: 1, int: 0 },
            wizard:   { vit: 1, str: 0, dex: 1, int: 3 },
            samurai: { vit: 1, str: 1, dex: 3, int: 0 },
            ranger:   { vit: 1, str: 1, dex: 2, int: 1 }
        };
        const classId = window.saveData.classId || 'knight';
        const growth = growthTable[classId] || growthTable.knight;

        while (window.saveData.xp >= xpToNextLevel) {
            window.saveData.xp -= xpToNextLevel;
            currentLevel++;
            window.saveData.level = currentLevel;
            
            // Apply class-specific stat growth
            if (window.selectedClass && window.selectedClass.stats) {
                window.selectedClass.stats.vit += growth.vit;
                window.selectedClass.stats.str += growth.str;
                window.selectedClass.stats.dex += growth.dex;
                window.selectedClass.stats.int += growth.int;
            }

            xpToNextLevel = currentLevel * 100;
            leveledUp = true;
        }

        // Persist stats to saveData so they survive reload
        if (window.selectedClass && window.selectedClass.stats) {
            window.saveData.stats = { ...window.selectedClass.stats };
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
