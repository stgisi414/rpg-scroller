// TitleScene.js - Phaser scene for animated title screen background with random AI battles
class TitleCombatant {
    constructor(scene, side, type) {
        this.scene = scene;
        this.side = side; // 'left' or 'right'
        this.type = type; // 'warrior', 'goblin', 'slime'
        this.maxHp = type === 'warrior' ? 100 : (type === 'goblin' ? 60 : 40);
        this.hp = this.maxHp;
        this.state = 'walk'; // 'walk', 'combat', 'attacking', 'hit', 'dead'
        this.attackCooldown = 0;

        const w = scene.scale.width;
        const h = scene.scale.height;

        // Spawn position
        let startX = side === 'left' ? -150 : w + 150;
        let startY = h * 0.72;
        if (type === 'slime') startY = h * 0.78; // Slime is slightly shorter

        let sheetKey = `title-${type}`;
        this.sprite = scene.add.sprite(startX, startY, sheetKey);
        this.sprite.setScale(type === 'slime' ? 3.5 : 3);
        
        // Orientation: Left faction (warrior) faces right (flipX = true). Right faction (goblin/slime) faces left (flipX = false).
        this.sprite.setFlipX(side === 'left');

        this.playAnim('walk');

        // Graphics for HP bar
        this.hpBar = scene.add.graphics();
        this.updateHpBar();
    }

    playAnim(stateName) {
        let key = `${this.type}-${stateName}`;
        if (this.type === 'goblin' && stateName === 'walk') key = 'goblin-move';
        if (this.type === 'slime' && stateName === 'walk') key = 'slime-bounce';
        if (this.type === 'slime' && stateName === 'idle') key = 'slime-idle';
        
        if (this.scene.anims.exists(key)) {
            this.sprite.play(key);
        }
    }

    updateHpBar() {
        this.hpBar.clear();
        if (this.state === 'dead' || !this.sprite.active) return;

        const bx = this.sprite.x - 30;
        const by = this.sprite.y - (this.type === 'slime' ? 35 : 65);

        // Black background
        this.hpBar.fillStyle(0x000000, 0.6);
        this.hpBar.fillRect(bx, by, 60, 6);

        // Color based on HP percentage
        const hpPct = Math.max(0, this.hp / this.maxHp);
        const color = hpPct > 0.5 ? 0x28a745 : (hpPct > 0.25 ? 0xffc107 : 0xdc3545);
        this.hpBar.fillStyle(color, 0.9);
        this.hpBar.fillRect(bx + 1, by + 1, 58 * hpPct, 4);
    }

    takeDamage(amount) {
        if (this.state === 'dead') return;

        const isCrit = Math.random() < 0.15;
        const finalDamage = isCrit ? Math.round(amount * 1.8) : amount;
        this.hp = Math.max(0, this.hp - finalDamage);
        this.updateHpBar();

        // Floating damage text
        const textStr = isCrit ? `CRIT! -${finalDamage}` : `-${finalDamage}`;
        const color = isCrit ? '#ff3333' : '#ffff33';
        const fontSize = isCrit ? '22px' : '16px';

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, textStr, {
            fontFamily: 'Courier',
            fontSize: fontSize,
            fontWeight: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        txt.setOrigin(0.5);

        this.scene.tweens.add({
            targets: txt,
            y: txt.y - 60,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy()
        });

        // Flash red effect
        this.sprite.setTint(0xff8888);
        this.scene.time.delayedCall(150, () => {
            if (this.sprite.active) this.sprite.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        } else if (this.state !== 'attacking') {
            this.state = 'hit';
            this.playAnim('hit');
            this.scene.time.delayedCall(300, () => {
                if (this.state === 'hit') {
                    this.state = 'combat';
                    this.playAnim('idle');
                }
            });
        }
    }

    die() {
        this.state = 'dead';
        this.hpBar.clear();
        this.playAnim('death');

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 1500,
            delay: 800,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    destroy() {
        if (this.side === 'left') {
            this.scene.leftCombatant = null;
        } else {
            this.scene.rightCombatant = null;
        }
        this.sprite.destroy();
        this.hpBar.destroy();
    }
}

class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    preload() {
        // Warrior spritesheet (800x1088) — characters spaced 80px apart
        this.load.spritesheet('title-warrior',
            'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png',
            { frameWidth: 80, frameHeight: 64 }
        );

        // Goblin spritesheet (504x640)
        this.load.spritesheet('title-goblin',
            'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png',
            { frameWidth: 84, frameHeight: 64 }
        );

        // Slime spritesheet (256x96)
        this.load.spritesheet('title-slime',
            'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png',
            { frameWidth: 32, frameHeight: 32 }
        );
    }

    create() {
        // --- Create Animations ---
        // Warrior animations
        this.anims.create({
            key: 'warrior-idle',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'warrior-walk',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 10, end: 17 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'warrior-attack',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 140, end: 145 }),
            frameRate: 12,
            repeat: 0
        });
        this.anims.create({
            key: 'warrior-hit',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 160, end: 164 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'warrior-death',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 150, end: 157 }),
            frameRate: 8,
            repeat: 0
        });

        // Goblin animations
        this.anims.create({
            key: 'goblin-idle',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'goblin-move',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 6, end: 9 }),
            frameRate: 12,
            repeat: -1
        });
        this.anims.create({
            key: 'goblin-attack',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 12, end: 17 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'goblin-hit',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 18, end: 19 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'goblin-death',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 24, end: 27 }),
            frameRate: 8,
            repeat: 0
        });

        // Slime animations
        this.anims.create({
            key: 'slime-idle',
            frames: this.anims.generateFrameNumbers('title-slime', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'slime-bounce',
            frames: this.anims.generateFrameNumbers('title-slime', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'slime-hit',
            frames: this.anims.generateFrameNumbers('title-slime', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'slime-death',
            frames: this.anims.generateFrameNumbers('title-slime', { start: 16, end: 20 }),
            frameRate: 8,
            repeat: 0
        });

        // Initialize combatants
        this.leftCombatant = null;
        this.rightCombatant = null;
        this.spawningNextRound = false;

        this.spawnNextRound();
    }

    spawnNextRound() {
        this.leftCombatant = new TitleCombatant(this, 'left', 'warrior');
        this.rightCombatant = new TitleCombatant(this, 'right', Math.random() < 0.5 ? 'goblin' : 'slime');
        this.spawningNextRound = false;
    }

    update(time, delta) {
        // Handle respawning if both died
        if (this.leftCombatant === null && this.rightCombatant === null && !this.spawningNextRound) {
            this.spawningNextRound = true;
            this.time.delayedCall(2000, () => {
                this.spawnNextRound();
            });
            return;
        }

        const left = this.leftCombatant;
        const right = this.rightCombatant;

        // Skip behaviors if one of them is already dead
        if (!left || !right || left.state === 'dead' || right.state === 'dead') {
            return;
        }

        // Walk State: March towards each other
        if (left.state === 'walk' && right.state === 'walk') {
            left.sprite.x += 80 * (delta / 1000);
            right.sprite.x -= 80 * (delta / 1000);

            left.updateHpBar();
            right.updateHpBar();

            const dist = Math.abs(left.sprite.x - right.sprite.x);
            if (dist < 90) {
                left.state = 'combat';
                left.playAnim('idle');
                left.attackCooldown = 500 + Math.random() * 500;

                right.state = 'combat';
                right.playAnim('idle');
                right.attackCooldown = 800 + Math.random() * 500;
            }
        }

        // Combat State: Attack & cooldown loops
        if (left.state !== 'walk' && right.state !== 'walk') {
            // Left attack tick
            if (left.state === 'combat') {
                left.attackCooldown -= delta;
                if (left.attackCooldown <= 0) {
                    left.state = 'attacking';
                    left.playAnim('attack');
                    
                    this.time.delayedCall(500, () => {
                        if (left && left.state === 'attacking') {
                            left.state = 'combat';
                            left.playAnim('idle');
                        }
                    });

                    this.time.delayedCall(250, () => {
                        if (left && right && right.state !== 'dead') {
                            right.takeDamage(10 + Math.floor(Math.random() * 8));
                        }
                    });
                    left.attackCooldown = 1200 + Math.random() * 800;
                }
            }

            // Right attack tick
            if (right.state === 'combat') {
                right.attackCooldown -= delta;
                if (right.attackCooldown <= 0) {
                    right.state = 'attacking';
                    right.playAnim('attack');

                    this.time.delayedCall(500, () => {
                        if (right && right.state === 'attacking') {
                            right.state = 'combat';
                            right.playAnim('idle');
                        }
                    });

                    this.time.delayedCall(250, () => {
                        if (right && left && left.state !== 'dead') {
                            left.takeDamage(8 + Math.floor(Math.random() * 6));
                        }
                    });
                    right.attackCooldown = 1200 + Math.random() * 800;
                }
            }
        }
    }
}
