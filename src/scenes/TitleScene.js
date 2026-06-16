// TitleScene.js - Phaser scene for animated title screen background
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
        const w = this.scale.width;
        const h = this.scale.height;

        // --- Create Animations ---
        // Warrior: 800/80 = 10 cols per row. Row 1 walk = frames 10..17 (8 frames)
        this.anims.create({
            key: 'warrior-walk',
            frames: this.anims.generateFrameNumbers('title-warrior', { start: 10, end: 17 }),
            frameRate: 10,
            repeat: -1
        });

        // Goblin idle: row 2 = frames 12..17 (6 cols per row)
        this.anims.create({
            key: 'goblin-idle',
            frames: this.anims.generateFrameNumbers('title-goblin', { start: 12, end: 17 }),
            frameRate: 8,
            repeat: -1
        });

        // Slime bounce: row 0 has 5 filled frames (frames 0..4)
        this.anims.create({
            key: 'slime-bounce',
            frames: this.anims.generateFrameNumbers('title-slime', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });

        // --- Spawn Sprites ---

        // Warrior: walks across the screen L → R
        this.warrior = this.add.sprite(-200, h * 0.72, 'title-warrior');
        this.warrior.setScale(3);
        this.warrior.setFlipX(true); // Sprite faces left in sheet, flip to face right
        this.warrior.play('warrior-walk');

        // Goblin: idles on the right side near where the menu is
        this.goblin = this.add.sprite(w * 0.75, h * 0.55, 'title-goblin');
        this.goblin.setScale(2.5);
        this.goblin.setFlipX(true);
        this.goblin.play('goblin-idle');

        // Slime: roams across the bottom of the screen
        this.slime = this.add.sprite(-100, h * 0.88, 'title-slime');
        this.slime.setScale(3);
        this.slime.play('slime-bounce');
    }

    update(time, delta) {
        // Move warrior (approx 100 pixels per second)
        this.warrior.x += 100 * (delta / 1000);
        if (this.warrior.x > this.scale.width + 200) {
            this.warrior.x = -200;
        }

        // Move slime (approx 60 pixels per second)
        this.slime.x += 60 * (delta / 1000);
        if (this.slime.x > this.scale.width + 100) {
            this.slime.x = -100;
        }
    }


}
