const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== STARTING RPG-SCROLLER DEEPER LOGIC & CONSTRAINT TESTS ===");

const srcDir = path.join(__dirname, 'src');
const npcControllerCode = fs.readFileSync(path.join(srcDir, 'NPCController.js'), 'utf8');
const inputManagerCode = fs.readFileSync(path.join(srcDir, 'InputManager.js'), 'utf8');
const playerControllerCode = fs.readFileSync(path.join(srcDir, 'PlayerController.js'), 'utf8');
const enemyControllerCode = fs.readFileSync(path.join(srcDir, 'EnemyController.js'), 'utf8');

// 1. Set up Sandbox Context
const PhaserMock = {
    Input: {
        Keyboard: {
            KeyCodes: {
                W: 87, A: 65, S: 83, D: 68, F: 70, I: 73,
                PERIOD: 190, ONE: 49, TWO: 50, THREE: 51,
                FOUR: 52, FIVE: 53, SIX: 54, COMMA: 188, SPACE: 32
            },
            Key: class {
                constructor(keyCode) {
                    this.keyCode = keyCode;
                    this.isDown = false;
                }
            },
            JustDown: (key) => {
                return key ? key.isDown : false;
            }
        }
    },
    Math: {
        Distance: {
            Between: (x1, y1, x2, y2) => Math.sqrt((x1-x2)**2 + (y1-y2)**2)
        },
        Angle: {
            Between: (x1, y1, x2, y2) => Math.atan2(y2-y1, x2-x1)
        }
    }
};

function createMockElement(id) {
    const listeners = {};
    return {
        id,
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        innerText: '',
        value: '',
        disabled: false,
        addEventListener: (event, cb) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(cb);
        },
        removeEventListener: (event, cb) => {
            if (listeners[event]) {
                const beforeCount = listeners[event].length;
                listeners[event] = listeners[event].filter(x => x !== cb);
                const afterCount = listeners[event].length;
                this._removedCount = (this._removedCount || 0) + (beforeCount - afterCount);
            }
        },
        appendChild: () => {},
        focus: () => {},
        blur: () => {},
        listeners,
        _removedCount: 0
    };
}

function createMockSprite() {
    const s = {
        setScale: () => {},
        setDepth: () => {},
        setCollideWorldBounds: () => {},
        setFlipX: (val) => { s.flipX = val; },
        setBounce: () => {},
        play: () => {},
        destroy: () => { s.active = false; },
        setVelocityX: (vx) => { s.body.velocity.x = vx; },
        setVelocityY: (vy) => { s.body.velocity.y = vy; },
        setPosition: (x, y) => { s.x = x; s.y = y; },
        setTint: (tint) => { s.tint = tint; },
        clearTint: () => { s.tint = null; },
        on: (event, cb) => { s.listeners[event] = cb; },
        once: (event, cb) => { s.listeners[event] = cb; },
        setSize: () => {},
        setOffset: () => {},
        x: 0,
        y: 0,
        flipX: false,
        active: true,
        tint: null,
        listeners: {},
        body: {
            width: 24,
            height: 48,
            offset: { x: 28, y: 16 },
            setSize: () => {},
            setOffset: () => {},
            immovable: true,
            velocity: { x: 0, y: 0 },
            touching: { down: true },
            blocked: { left: false, right: false },
            onFloor: () => true
        }
    };
    s.setVelocityX = s.setVelocityX.bind(s);
    s.setVelocityY = s.setVelocityY.bind(s);
    s.setPosition = s.setPosition.bind(s);
    s.setSize = s.setSize.bind(s);
    s.setOffset = s.setOffset.bind(s);
    s.body.setSize = s.body.setSize.bind(s.body);
    s.body.setOffset = s.body.setOffset.bind(s.body);
    return s;
}

const elementsMap = {};
const documentMock = {
    getElementById: (id) => {
        if (!elementsMap[id]) {
            elementsMap[id] = createMockElement(id);
        }
        return elementsMap[id];
    },
    createElement: (tag) => {
        return {
            tagName: tag,
            style: {},
            innerHTML: '',
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };
    }
};

const windowMock = {
    saveData: {
        level: 1,
        gold: 100,
        alignment: 0,
        isSavior: false,
        inventory: {
            weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 0, desc: 'A basic stick.' },
            potions: 5,
            scrolls: 2,
            artifacts: [],
            equippedArtifact: -1
        },
        quests: [],
        zones: {
            0: { name: 'Willowbrook', type: 'Safe', npcs: [] }
        },
        currentZone: 0
    },
    selectedClass: {
        id: 'knight',
        stats: { vit: 15, str: 14, dex: 9, int: 8 },
        frameWidth: 80,
        frameHeight: 64,
        isSheet: true,
        idleRow: 0,
        idleFrames: 5
    },
    localStorage: {
        getItem: () => '[]',
        setItem: () => {}
    },
    ARTIFACTS_DATA: {}
};

const sandbox = {
    Phaser: PhaserMock,
    document: documentMock,
    window: windowMock,
    localStorage: windowMock.localStorage,
    console: {
        log: console.log,
        error: console.error,
        warn: console.warn
    },
    setTimeout: setTimeout,
    Date: Date,
    Math: Math,
    NPCController: null,
    InputManager: null,
    PlayerController: null,
    EnemyController: null
};

vm.createContext(sandbox);

// Evaluate scripts in the sandbox
try {
    vm.runInContext(npcControllerCode, sandbox, { filename: 'NPCController.js' });
    sandbox.NPCController = vm.runInContext('NPCController', sandbox);
    vm.runInContext(inputManagerCode, sandbox, { filename: 'InputManager.js' });
    sandbox.InputManager = vm.runInContext('InputManager', sandbox);
    vm.runInContext(playerControllerCode, sandbox, { filename: 'PlayerController.js' });
    sandbox.PlayerController = vm.runInContext('PlayerController', sandbox);
    vm.runInContext(enemyControllerCode, sandbox, { filename: 'EnemyController.js' });
    sandbox.EnemyController = vm.runInContext('EnemyController', sandbox);
} catch (e) {
    console.error("Evaluation error:", e);
    process.exit(1);
}

// Global assert helper
function assert(condition, message) {
    if (!condition) {
        throw new Error("Assertion Failed: " + message);
    }
}

// ----------------------------------------------------
// TEST 1: Key Mappings & InputManager Keys
// ----------------------------------------------------
console.log("\nRunning Test 1: Key Mappings & InputManager Keys...");
(function testKeyMappings() {
    const mockKeyboardListeners = {};
    const mockScene = {
        time: { now: 1000 },
        input: {
            keyboard: {
                addKeys: (config) => {
                    const keys = {};
                    for (const [k, code] of Object.entries(config)) {
                        keys[k] = { isDown: false, keyCode: code };
                    }
                    return keys;
                },
                on: (event, cb) => {
                    mockKeyboardListeners[event] = cb;
                },
                removeCapture: (keys) => {
                    mockScene.lastRemovedCapture = keys;
                },
                addCapture: (keys) => {
                    mockScene.lastAddedCapture = keys;
                }
            },
            activePointer: {
                leftButtonDown: () => false,
                rightButtonDown: () => false
            }
        }
    };

    const im = new sandbox.InputManager(mockScene);
    
    // Check all keys mapped
    const expectedKeys = ['up', 'down', 'left', 'right', 'attack', 'interact', 'inventory', 'skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6', 'superSpell', 'space'];
    for (const key of expectedKeys) {
        assert(im.keys[key] !== undefined, `Key '${key}' is missing from InputManager.keys`);
    }

    // Check space key code
    assert(im.keys.space.keyCode === PhaserMock.Input.Keyboard.KeyCodes.SPACE, "Space key mapped incorrectly");

    // Check captured keys array
    assert(im._capturedKeys.includes(PhaserMock.Input.Keyboard.KeyCodes.W), "W key missing from captured keys");
    assert(im._capturedKeys.includes(PhaserMock.Input.Keyboard.KeyCodes.SPACE) === false, "SPACE key should not be in captured keys as default or matches expected captured keys array");

    // Check disable/enable captured keys
    im.disableForInput();
    assert(mockScene.lastRemovedCapture === im._capturedKeys, "disableForInput did not remove captured keys correctly");
    im.enableForInput();
    assert(mockScene.lastAddedCapture === im._capturedKeys, "enableForInput did not add captured keys correctly");

    // Check double-tap event listeners logic
    assert(mockKeyboardListeners['keydown-A'] !== undefined, "keydown-A listener not registered");
    assert(mockKeyboardListeners['keydown-D'] !== undefined, "keydown-D listener not registered");

    // Trigger double tap left
    mockScene.time.now = 1000;
    mockKeyboardListeners['keydown-A']();
    assert(im.dashLeft === false, "dashLeft should be false on first tap");
    
    mockScene.time.now = 1100; // 100ms later (within threshold of 250ms)
    mockKeyboardListeners['keydown-A']();
    assert(im.dashLeft === true, "dashLeft should be true on double tap");

    assert(im.consumeDashLeft() === true, "consumeDashLeft should return true");
    assert(im.dashLeft === false, "consumeDashLeft should reset dashLeft to false");
    assert(im.consumeDashLeft() === false, "consumeDashLeft should return false when not active");

    console.log("Test 1 Passed!");
})();

// ----------------------------------------------------
// TEST 2: Spacebar Controls and PlayerController isUpDown
// ----------------------------------------------------
console.log("\nRunning Test 2: Spacebar Controls...");
(function testSpacebarControls() {
    const mockScene = {
        input: {
            keyboard: {
                addKeys: (config) => {
                    const keys = {};
                    for (const [k, code] of Object.entries(config)) {
                        keys[k] = { isDown: false, keyCode: code };
                    }
                    return keys;
                },
                on: () => {}
            },
            activePointer: {
                leftButtonDown: () => false,
                rightButtonDown: () => false
            }
        },
        textures: { exists: () => true },
        physics: { add: { sprite: createMockSprite } },
        anims: { exists: () => true, create: () => {} },
        add: {
            text: () => ({ setOrigin: () => {}, setDepth: () => {}, setVisible: () => {}, setPosition: () => {} }),
            graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, setVisible: () => {}, clear: () => {}, lineStyle: () => {}, strokeCircle: () => {}, destroy: () => {} })
        }
    };

    const im = new sandbox.InputManager(mockScene);
    const playerReal = new sandbox.PlayerController(mockScene, 0, 0, im, { isAI: false });

    // Both up and space are not down
    im.keys.up.isDown = false;
    im.keys.space.isDown = false;
    assert(playerReal.isUpDown() === false, "isUpDown should be false when keys are not pressed");

    // Space is down
    im.keys.space.isDown = true;
    assert(playerReal.isUpDown() === true, "isUpDown should be true when space is pressed");

    // Space is false, up is down
    im.keys.space.isDown = false;
    im.keys.up.isDown = true;
    assert(playerReal.isUpDown() === true, "isUpDown should be true when up key is pressed");

    // AI PlayerController
    const playerAI = new sandbox.PlayerController(mockScene, 0, 0, null, { isAI: true, classId: 'knight' });
    playerAI.aiInput.up = false;
    assert(playerAI.isUpDown() === false, "AI isUpDown should be false when aiInput.up is false");
    playerAI.aiInput.up = true;
    assert(playerAI.isUpDown() === true, "AI isUpDown should be true when aiInput.up is true");

    console.log("Test 2 Passed!");
})();

// ----------------------------------------------------
// TEST 3: Potion Logic (HP, MP, SP, Meat) & sharing
// ----------------------------------------------------
console.log("\nRunning Test 3: Potion Logic...");
(function testPotionLogic() {
    let floatingTexts = [];
    const mockScene = {
        input: {
            keyboard: { addKeys: () => ({}), on: () => {} }
        },
        textures: { exists: () => true },
        physics: { add: { sprite: createMockSprite } },
        anims: { exists: () => true, create: () => {} },
        add: {
            text: () => ({ setOrigin: () => {}, setDepth: () => {}, setVisible: () => {}, setPosition: () => {} }),
            graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, setVisible: () => {}, clear: () => {}, lineStyle: () => {}, strokeCircle: () => {}, destroy: () => {} })
        },
        showFloatingText: (x, y, text, color) => {
            floatingTexts.push({ x, y, text, color });
        },
        partyMembers: []
    };

    const player = new sandbox.PlayerController(mockScene, 0, 0, { keys: { attack: {}, superSpell: {} } }, { isAI: false });
    
    // Set attributes
    player.maxHp = 100;
    player.hp = 40;
    player.maxMp = 50;
    player.mp = 10;
    player.maxSp = 50;
    player.sp = 10;

    player.inventory = {
        potions: 2,
        mpPotions: 1,
        spPotions: 1,
        meat: 1
    };

    // 1. HP Potion on player
    assert(player.usePotion() === true, "usePotion should return true when player is hurt");
    assert(player.inventory.potions === 1, "potion count should decrement");
    assert(player.hp === 90, "hp should increase by 50");
    assert(floatingTexts.some(t => t.text === '+50 HP'), "Floating text for HP potion should be displayed");

    // 2. MP Potion on player
    assert(player.useMpPotion() === true, "useMpPotion should return true when player is low on mana");
    assert(player.inventory.mpPotions === 0, "mpPotion count should decrement");
    assert(player.mp === 50, "mp should increase by 50 and cap at maxMp");

    // 3. SP Potion on player
    assert(player.useSpPotion() === true, "useSpPotion should return true when player is low on stamina");
    assert(player.inventory.spPotions === 0, "spPotion count should decrement");
    assert(player.sp === 50, "sp should increase by 50 and cap at maxSp");

    // 4. Meat on player
    player.hp = 70;
    assert(player.useMeat() === true, "useMeat should return true");
    assert(player.inventory.meat === 0, "meat should decrement");
    assert(player.hp === 90, "hp should increase by 20");

    // 5. HP potion when player is at max HP -> Share with party
    player.hp = 100;
    player.inventory.potions = 1;
    // Without party members, sharing should return false/falsy and keep potion count
    assert(!player.usePotion(), "usePotion should return false/falsy if no one needs healing");
    assert(player.inventory.potions === 1, "potions should not decrement when sharing fails");

    // Add party members
    const hero1 = {
        sprite: createMockSprite(),
        hp: 30, maxHp: 100,
        mp: 10, maxMp: 50,
        sp: 10, maxSp: 50,
        camaraderie: 0,
        classData: { id: 'knight_rival' }
    };
    hero1.sprite.setPosition(100, 0); // distance 100
    
    const hero2 = {
        sprite: createMockSprite(),
        hp: 40, maxHp: 100,
        mp: 10, maxMp: 50,
        sp: 10, maxSp: 50,
        camaraderie: 0,
        classData: { id: 'knight_rival' }
    };
    hero2.sprite.setPosition(200, 0); // distance 200

    mockScene.partyMembers = [hero1, hero2];
    player.sprite.setPosition(0, 0);

    // Share HP potion with party. hero1 is closer (100 vs 200 px) and needs HP.
    assert(player.usePotion() === true, "usePotion should return true since hero1 needs it");
    assert(player.inventory.potions === 0, "potion should decrement after successful sharing");
    assert(hero1.hp === 80, "hero1 hp should increase by 50");
    assert(hero2.hp === 40, "hero2 hp should remain unchanged");
    assert(hero1.camaraderie === 2, "hero1 camaraderie should increase by 2");

    console.log("Test 3 Passed!");
})();

// ----------------------------------------------------
// TEST 4: classesData and RecalculateStats (NaN/Math issues)
// ----------------------------------------------------
console.log("\nRunning Test 4: classesData & RecalculateStats (NaN Safety)...");
(function testNaNShielding() {
    const mockScene = {
        input: { keyboard: { addKeys: () => ({}), on: () => {} } },
        textures: { exists: () => true },
        physics: { add: { sprite: createMockSprite } },
        anims: { exists: () => true, create: () => {} },
        add: {
            text: () => ({ setOrigin: () => {}, setDepth: () => {}, setVisible: () => {}, setPosition: () => {} }),
            graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, setVisible: () => {}, clear: () => {}, lineStyle: () => {}, strokeCircle: () => {}, destroy: () => {} })
        }
    };

    // Normal calculations check
    const player = new sandbox.PlayerController(mockScene, 0, 0, { keys: { attack: {}, superSpell: {} } }, { isAI: false, classId: 'knight' });
    player.recalculateStats();

    assert(player.speed === 245, "Knight movement speed calculation incorrect");
    assert(player.maxHp === 150, "Knight maxHp calculation incorrect");
    assert(player.jumpVelocity === -540, "Knight jump velocity calculation incorrect");
    assert(player.dashSpeed === 535, "Knight dash speed calculation incorrect");
    assert(player.maxMp === 36, "Knight maxMp calculation incorrect");
    assert(player.maxSp === 77, "Knight maxSp calculation incorrect");

    // Corrupt baseStats with NaN/undefined/invalid types
    player.classData.stats = {
        vit: NaN,
        str: undefined,
        dex: "ten",
        int: null
    };

    player.recalculateStats();

    // Verify sanitization replaced invalid values with default (10)
    assert(Number.isFinite(player.speed), "speed is NaN");
    assert(Number.isFinite(player.jumpVelocity), "jumpVelocity is NaN");
    assert(Number.isFinite(player.dashSpeed), "dashSpeed is NaN");
    assert(Number.isFinite(player.maxHp), "maxHp is NaN");
    assert(Number.isFinite(player.maxMp), "maxMp is NaN");
    assert(Number.isFinite(player.maxSp), "maxSp is NaN");
    assert(Number.isFinite(player.hp), "hp is NaN");
    assert(Number.isFinite(player.mp), "mp is NaN");
    assert(Number.isFinite(player.sp), "sp is NaN");

    assert(player.maxHp === 100, "vit was not fallback-initialized to 10");
    assert(player.speed === 250, "dex was not fallback-initialized to 10");
    assert(player.jumpVelocity === -500, "str was not fallback-initialized to 10");

    // Corrupt window.saveData with NaN / null
    windowMock.saveData = {
        stats: { vit: NaN, str: NaN, dex: NaN, int: NaN },
        hp: NaN,
        mp: null,
        sp: undefined
    };

    const corruptPlayer = new sandbox.PlayerController(mockScene, 0, 0, { keys: { attack: {}, superSpell: {} } }, { isAI: false, classId: 'wizard' });
    corruptPlayer.recalculateStats();

    assert(Number.isFinite(corruptPlayer.maxHp) && corruptPlayer.maxHp > 0, "SaveData NaN vit was not handled");
    assert(Number.isFinite(corruptPlayer.hp) && corruptPlayer.hp > 0, "SaveData NaN hp was not handled");
    assert(Number.isFinite(corruptPlayer.mp) && corruptPlayer.mp > 0, "SaveData null mp was not handled");
    assert(Number.isFinite(corruptPlayer.sp) && corruptPlayer.sp > 0, "SaveData undefined sp was not handled");

    // Test AI player with unknown classId
    const aiPlayer = new sandbox.PlayerController(mockScene, 0, 0, null, { isAI: true, classId: 'non_existent_class' });
    assert(aiPlayer.classData !== undefined, "AI player did not fall back gracefully with invalid class ID");
    assert(aiPlayer.classData.id === 'non_existent_class', "AI player class ID was not assigned");

    console.log("Test 4 Passed!");
})();

// ----------------------------------------------------
// TEST 5: EnemyController statistics calculations
// ----------------------------------------------------
console.log("\nRunning Test 5: EnemyController Statistics...");
(function testEnemyController() {
    const mockScene = {
        time: { now: 1000, delayedCall: () => {} },
        physics: {
            add: {
                sprite: createMockSprite
            }
        },
        anims: {
            exists: () => true
        },
        add: {
            text: () => ({ setOrigin: () => {}, setDepth: () => {}, setVisible: () => {}, setPosition: () => {}, destroy: () => {} })
        },
        npcs: [],
        enemyProjectiles: {
            create: () => createMockSprite()
        }
    };

    const mockPlayer = {
        sprite: createMockSprite(),
        takeDamage: (amount) => {
            mockPlayer.lastDmg = amount;
        }
    };

    // Check health mapping for various enemy types
    const slime = new sandbox.EnemyController(mockScene, 0, 0, mockPlayer, null, 'slime');
    assert(slime.maxHp === 100, "Slime health should be 100");
    assert(slime.hp === 100, "Slime current HP should match max HP");

    const lich = new sandbox.EnemyController(mockScene, 0, 0, mockPlayer, null, 'lich_lord');
    assert(lich.maxHp === 2000, "Lich Lord health should be 2000");

    const devil = new sandbox.EnemyController(mockScene, 0, 0, mockPlayer, null, 'the_devil');
    assert(devil.maxHp === 1500, "The Devil health should be 1500");

    // Status effect updates and NaN protection
    slime.applyStatusEffect('freeze', 3000, 50); // 50% freeze for 3s
    assert(slime.statusEffects.length === 1, "Status effect should be added");
    
    // Trigger update status effects
    slime.update(1000, 1000); // delta = 1000ms
    assert(slime.speed === 50, "Speed should be reduced by 50% under freeze");
    assert(slime.statusEffects[0].duration === 2000, "Duration should decrement by delta");

    // Apply poison tick damage
    slime.applyStatusEffect('poison', 5000, 5); // 5 poison strength
    assert(slime.statusEffects.length === 2, "Poison should be added");

    slime.update(2000, 1000); // delta = 1000ms -> triggers 1s tick
    assert(slime.hp === 95, "Poison tick should reduce HP by 5");
    assert(Number.isFinite(slime.hp), "HP became NaN during poison tick");

    // Apply damage with knockback direction
    slime.takeDamage(20, -1);
    assert(slime.hp === 75, "HP should decrease by damage amount");
    assert(slime.sprite.body.velocity.x === -200, "Knockback velocity X should be negative");
    assert(slime.sprite.body.velocity.y === -200, "Knockback velocity Y should be negative");
    assert(Number.isFinite(slime.hp), "HP became NaN after damage");

    console.log("Test 5 Passed!");
})();

console.log("\nAll logic & constraint checks completed successfully without error.");
process.exit(0);
