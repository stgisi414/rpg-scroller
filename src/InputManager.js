// InputManager.js - Handles all keyboard, mouse, and special inputs (like double-taps)

class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.blocked = false; // True while any HTML UI (chat, party builder, etc.) is open
        
        // WASD
        const wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // Cursors (Arrow Keys, Space, Shift)
        const cursors = this.scene.input.keyboard.createCursorKeys();
        
        // Combat and Utility Keys
        const otherKeys = this.scene.input.keyboard.addKeys({
            attack: Phaser.Input.Keyboard.KeyCodes.PERIOD,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            interact: Phaser.Input.Keyboard.KeyCodes.F,
            inventory: Phaser.Input.Keyboard.KeyCodes.I,
            skill1: Phaser.Input.Keyboard.KeyCodes.ONE,
            skill2: Phaser.Input.Keyboard.KeyCodes.TWO,
            skill3: Phaser.Input.Keyboard.KeyCodes.THREE,
            skill4: Phaser.Input.Keyboard.KeyCodes.FOUR,
            skill5: Phaser.Input.Keyboard.KeyCodes.FIVE,
            skill6: Phaser.Input.Keyboard.KeyCodes.SIX,
            superSpell: Phaser.Input.Keyboard.KeyCodes.COMMA,
            megaSpell: Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH,
            summonSpell: Phaser.Input.Keyboard.KeyCodes.M,
            spawnParty: Phaser.Input.Keyboard.KeyCodes.P
        });

        // Unified keys mappings matching Phaser's key API structure
        this.keys = {
            left: {
                get isDown() { return wasd.left.isDown || cursors.left.isDown; },
                get justDown() { return wasd.left.justDown || cursors.left.justDown; },
                set justDown(val) { wasd.left.justDown = val; cursors.left.justDown = val; }
            },
            right: {
                get isDown() { return wasd.right.isDown || cursors.right.isDown; },
                get justDown() { return wasd.right.justDown || cursors.right.justDown; },
                set justDown(val) { wasd.right.justDown = val; cursors.right.justDown = val; }
            },
            up: {
                get isDown() { return wasd.up.isDown || cursors.up.isDown; },
                get justDown() { return wasd.up.justDown || cursors.up.justDown; },
                set justDown(val) { wasd.up.justDown = val; cursors.up.justDown = val; }
            },
            down: {
                get isDown() { return wasd.down.isDown || cursors.down.isDown; },
                get justDown() { return wasd.down.justDown || cursors.down.justDown; },
                set justDown(val) { wasd.down.justDown = val; cursors.down.justDown = val; }
            },
            space: cursors.space,
            attack: otherKeys.attack,
            enter: otherKeys.enter,
            interact: otherKeys.interact,
            inventory: otherKeys.inventory,
            skill1: otherKeys.skill1,
            skill2: otherKeys.skill2,
            skill3: otherKeys.skill3,
            skill4: otherKeys.skill4,
            skill5: otherKeys.skill5,
            skill6: otherKeys.skill6,
            superSpell: otherKeys.superSpell,
            megaSpell: otherKeys.megaSpell,
            summonSpell: otherKeys.summonSpell,
            spawnParty: otherKeys.spawnParty
        };

        // Pointer click detection
        this.pointer = this.scene.input.activePointer;
        this.leftClicked = false;
        
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown() && !this.blocked) {
                this.leftClicked = true;
            }
        });

        // Double tap detection variables
        this.doubleTapThreshold = 250; // ms window for double tap
        this.lastLeftTap = 0;
        this.lastRightTap = 0;
        this.dashLeft = false;
        this.dashRight = false;

        // Setup event listeners for double tap (WASD + Arrows)
        const registerLeftTap = () => {
            const timeNow = this.scene.time.now;
            if (timeNow - this.lastLeftTap < this.doubleTapThreshold) {
                this.dashLeft = true;
            }
            this.lastLeftTap = timeNow;
        };
        const registerRightTap = () => {
            const timeNow = this.scene.time.now;
            if (timeNow - this.lastRightTap < this.doubleTapThreshold) {
                this.dashRight = true;
            }
            this.lastRightTap = timeNow;
        };

        this.scene.input.keyboard.on('keydown-A', registerLeftTap);
        this.scene.input.keyboard.on('keydown-LEFT', registerLeftTap);
        this.scene.input.keyboard.on('keydown-D', registerRightTap);
        this.scene.input.keyboard.on('keydown-RIGHT', registerRightTap);

        // Store all captured key codes so we can release/restore them
        this._capturedKeys = [
            Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.A,
            Phaser.Input.Keyboard.KeyCodes.S,
            Phaser.Input.Keyboard.KeyCodes.D,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.F,
            Phaser.Input.Keyboard.KeyCodes.I,
            Phaser.Input.Keyboard.KeyCodes.PERIOD,
            Phaser.Input.Keyboard.KeyCodes.ENTER,
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
            Phaser.Input.Keyboard.KeyCodes.FOUR,
            Phaser.Input.Keyboard.KeyCodes.FIVE,
            Phaser.Input.Keyboard.KeyCodes.SIX,
            Phaser.Input.Keyboard.KeyCodes.SPACE,
            Phaser.Input.Keyboard.KeyCodes.COMMA,
            Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH,
            Phaser.Input.Keyboard.KeyCodes.M,
            Phaser.Input.Keyboard.KeyCodes.P,
            Phaser.Input.Keyboard.KeyCodes.Z
        ];
    }

    /** Call this when an HTML text input gains focus (e.g. chat box opens). */
    disableForInput() {
        this.blocked = true;
        this.scene.input.keyboard.removeCapture(this._capturedKeys);
    }

    /** Call this when the HTML text input loses focus (e.g. chat box closes). */
    enableForInput() {
        this.blocked = false;
        this.scene.input.keyboard.addCapture(this._capturedKeys);
    }

    update() {
        // Reset dash flags — consumed by PlayerController each frame
    }

    consumeDashLeft() {
        if (this.dashLeft) {
            this.dashLeft = false;
            return true;
        }
        return false;
    }

    consumeDashRight() {
        if (this.dashRight) {
            this.dashRight = false;
            return true;
        }
        return false;
    }

    consumeClick() {
        if (this.leftClicked) {
            this.leftClicked = false;
            return true;
        }
        return false;
    }

    isLeftClickDown() {
        return this.pointer.leftButtonDown();
    }

    isRightClickDown() {
        return this.pointer.rightButtonDown();
    }

    getAimAngle(playerX, playerY) {
        // Get angle between player and mouse cursor
        return Phaser.Math.Angle.Between(playerX, playerY, this.pointer.worldX, this.pointer.worldY);
    }
}
