// InputManager.js - Handles all keyboard, mouse, and special inputs (like double-taps)

class InputManager {
    constructor(scene) {
        this.scene = scene;
        
        // WASD
        this.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attack: Phaser.Input.Keyboard.KeyCodes.PERIOD,
            interact: Phaser.Input.Keyboard.KeyCodes.F,
            inventory: Phaser.Input.Keyboard.KeyCodes.I,
            skill1: Phaser.Input.Keyboard.KeyCodes.ONE,
            skill2: Phaser.Input.Keyboard.KeyCodes.TWO,
            skill3: Phaser.Input.Keyboard.KeyCodes.THREE,
            skill4: Phaser.Input.Keyboard.KeyCodes.FOUR,
            skill5: Phaser.Input.Keyboard.KeyCodes.FIVE,
            skill6: Phaser.Input.Keyboard.KeyCodes.SIX,
            superSpell: Phaser.Input.Keyboard.KeyCodes.COMMA,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // Mouse pointer for aiming
        this.pointer = this.scene.input.activePointer;

        // Double tap detection variables
        this.doubleTapThreshold = 250; // ms window for double tap
        this.lastLeftTap = 0;
        this.lastRightTap = 0;
        this.dashLeft = false;
        this.dashRight = false;

        // Setup event listeners for double tap
        this.scene.input.keyboard.on('keydown-A', () => {
            const timeNow = this.scene.time.now;
            if (timeNow - this.lastLeftTap < this.doubleTapThreshold) {
                this.dashLeft = true;
            }
            this.lastLeftTap = timeNow;
        });

        this.scene.input.keyboard.on('keydown-D', () => {
            const timeNow = this.scene.time.now;
            if (timeNow - this.lastRightTap < this.doubleTapThreshold) {
                this.dashRight = true;
            }
            this.lastRightTap = timeNow;
        });
        // Store all captured key codes so we can release/restore them
        this._capturedKeys = [
            Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.A,
            Phaser.Input.Keyboard.KeyCodes.S,
            Phaser.Input.Keyboard.KeyCodes.D,
            Phaser.Input.Keyboard.KeyCodes.F,
            Phaser.Input.Keyboard.KeyCodes.I,
            Phaser.Input.Keyboard.KeyCodes.PERIOD,
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
            Phaser.Input.Keyboard.KeyCodes.FOUR,
            Phaser.Input.Keyboard.KeyCodes.COMMA
        ];
    }

    /** Call this when an HTML text input gains focus (e.g. chat box opens). */
    disableForInput() {
        this.scene.input.keyboard.removeCapture(this._capturedKeys);
    }

    /** Call this when the HTML text input loses focus (e.g. chat box closes). */
    enableForInput() {
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
