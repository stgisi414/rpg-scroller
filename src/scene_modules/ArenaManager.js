// ArenaManager.js - Handles the infinite scaling Coliseum mode

class ArenaManager {
    constructor(scene) {
        this.scene = scene;
        this.currentWave = 1;
        this.isActive = false;
        this.enemiesRemaining = 0;
        this.waveEnemies = [];
    }

    startWave() {
        if (this.isActive) return;

        this.isActive = true;
        this.enemiesRemaining = 0;
        this.waveEnemies = [];

        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(640, 300, `ARENA WAVE ${this.currentWave} BEGINS!`, 0xff0000);
        }

        // Determine enemy composition based on wave
        // Start easy, get progressively harder
        let enemyTypes = ['slime', 'bat', 'mushroom', 'goblin'];
        let bossTypes = ['orc', 'bandit', 'skeleton', 'mummy'];
        let epicBosses = ['spider', 'frost_giant', 'lich_lord', 'the_devil'];

        let numEnemies = Math.min(3 + Math.floor(this.currentWave / 2), 25); // Scale up to 25 enemies
        let hpMultiplier = Math.pow(1.15, this.currentWave - 1);
        let dmgMultiplier = Math.pow(1.08, this.currentWave - 1);

        let spawnList = [];

        // Every 5 waves is a boss wave
        if (this.currentWave % 5 === 0) {
            const numBosses = Math.min(1 + Math.floor((this.currentWave - 5) / 5), 4);
            for (let b = 0; b < numBosses; b++) {
                // Cycle through epic bosses
                const bossIdx = (Math.floor(this.currentWave / 5) - 1 + b) % epicBosses.length;
                spawnList.push({ type: epicBosses[bossIdx], isBoss: true });
            }
            numEnemies = Math.max(1, numEnemies - (3 * numBosses)); // Fewer adds on boss waves
        }

        for (let i = 0; i < numEnemies; i++) {
            let list = this.currentWave > 10 ? bossTypes : enemyTypes;
            if (this.currentWave > 20) list = list.concat(bossTypes);
            let type = list[Math.floor(Math.random() * list.length)];
            spawnList.push({ type: type, isBoss: false });
        }

        this.enemiesRemaining = spawnList.length;

        // Spawn them staggered
        spawnList.forEach((enemyData, index) => {
            this.scene.time.delayedCall(index * 500, () => {
                this.spawnArenaEnemy(enemyData.type, hpMultiplier, dmgMultiplier, enemyData.isBoss);
            });
        });
    }

    spawnArenaEnemy(type, hpMult, dmgMult, isBoss) {
        // Spawn randomly left or right of the room
        let x = Math.random() < 0.5 ? 200 + Math.random() * 200 : 880 + Math.random() * 200;
        let y = 500;

        const enemy = new EnemyController(this.scene, x, y, this.scene.player, this.scene.geminiService, type, isBoss);
        
        // Scale stats
        enemy.maxHp = Math.floor(enemy.maxHp * hpMult);
        enemy.hp = enemy.maxHp;
        enemy.damageMultiplier = dmgMult;
        
        // Let's attach a flag so we know it's an arena enemy
        enemy.isArenaEnemy = true;
        
        if (this.scene.enemies && this.scene.enemies.add) {
            this.scene.enemies.add(enemy.sprite);
        }
        if (this.scene.isIndoors && this.scene.indoorFloor) {
            this.scene.physics.add.collider(enemy.sprite, this.scene.indoorFloor);
        } else {
            this.scene.physics.add.collider(enemy.sprite, this.scene.platforms);
        }

        // We need to listen to when it dies
        this.waveEnemies.push(enemy);
    }

    update() {
        if (!this.isActive) return;

        let aliveCount = 0;
        for (let i = this.waveEnemies.length - 1; i >= 0; i--) {
            let enemy = this.waveEnemies[i];
            if (enemy && enemy.sprite && enemy.sprite.active && !enemy.isDead && enemy.hp > 0) {
                aliveCount++;
            }
        }

        // Only check win condition if we have finished spawning and all are dead
        if (this.waveEnemies.length > 0 && aliveCount === 0) {
            this.waveComplete();
        }
    }

    waveComplete() {
        this.isActive = false;
        this.waveEnemies = [];

        // Rewards
        let xpReward = 100 * this.currentWave * (1 + (this.currentWave * 0.1));
        let goldReward = 50 * this.currentWave;
        
        this.scene.grantRewards(xpReward, goldReward);
        
        if (this.scene.player) {
            this.scene.player.coliseumReputation = (this.scene.player.coliseumReputation || 0) + this.currentWave;
            this.scene.player.coliseumHighestWave = Math.max(this.scene.player.coliseumHighestWave || 0, this.currentWave);
            if (this.scene.player.saveGame) this.scene.player.saveGame();
        }

        this.currentWave++;

        if (this.scene.showFloatingText) {
            this.scene.showFloatingText(640, 300, `WAVE CLEARED!\nTalk to King for next wave.`, 0xffff00);
        }
        
        // Heal player slightly as a reward
        if (this.scene.player) {
            this.scene.player.hp = Math.min(this.scene.player.maxHp, this.scene.player.hp + (this.scene.player.maxHp * 0.25));
            if (this.scene.updateHUD) this.scene.updateHUD();
        }
    }
}

window.ArenaManager = ArenaManager;
